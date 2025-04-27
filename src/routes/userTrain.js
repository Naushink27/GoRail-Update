const express= require('express')
const {userAuth}=require('../middleware/userAuth');
const Train = require('../model/train');
const Booking= require('../model/booking')
const trainRouter=express.Router();
const Razorpay = require("razorpay");
const mongoose = require('mongoose');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET,
});

trainRouter.post('/train', async (req, res) => {
  try {
    let { source, destination, number, journeyDate ,seatType} = req.body;
if(!source && !destination && !number && !journeyDate && !seatType) {
      return res.status(500).json({ message: "Please provide at least one search parameter." });
}
    const query = {};
    if (source) {
      query.source = { $regex: new RegExp(source, 'i') };
    }
    if (destination) {
      query.destination = { $regex: new RegExp(destination, 'i') };
    }
    if (number) {
      query.number = number;
    }

  if(journeyDate){  if (!/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
      return res.status(500).json({ message: "Invalid journeyDate format. Use YYYY-MM-DD." });

    }

    const parsedJourneyDate = new Date(`${journeyDate}T00:00:00Z`);
    if (parsedJourneyDate) {
      query.journeyDate = parsedJourneyDate;
    }

  }
  if(seatType) {
      if (!["Sleeper", "AC"].includes(seatType)) {
        return res.status(400).json({ message: "Invalid seat type. Use 'Sleeper' or 'AC'." });
      }
    query.seatType= seatType.type;
  }

   

    const train = await Train.find(query);
    res.status(200).json({ message: "Trains fetched", train });

  } catch (err) {
    res.status(500).send(err.message);}
});


 
trainRouter.post("/train/book/:trainId", userAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const { _id: userId } = user;
    const { trainId } = req.params;
    const { journeyDate, seatType, passengers } = req.body;

    // Input validation
    if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
      return res.status(400).json({ message: 'Invalid train ID' });
    }
    if (!journeyDate || !seatType || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({ message: 'Journey date, seat type, and at least one passenger are required' });
    }
    const validSeatTypes = ['General', 'AC', 'Sleeper', 'First Class'];
    if (!validSeatTypes.includes(seatType)) {
      return res.status(400).json({ message: 'Invalid seat type' });
    }
    const parsedJourneyDate = new Date(journeyDate);
    if (isNaN(parsedJourneyDate.getTime())) {
      return res.status(400).json({ message: 'Invalid journey date' });
    }

    // Validate passengers
    for (const passenger of passengers) {
      if (!passenger.firstName || !passenger.lastName || !passenger.age) {
        return res.status(400).json({ message: 'Each passenger must have a first name, last name, and age' });
      }
    }

    // Find train
    const train = await Train.findById(trainId).session(session);
    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }
    if (train.trainStatus !== 'available') {
      return res.status(400).json({ message: 'Train not available' });
    }

    // Check seat availability
    const seat = train.seats.find((seat) => seat.type === seatType);
    if (!seat || seat.count < passengers.length) {
      return res.status(400).json({ message: `Not enough seats available. Requested: ${passengers.length}, Available: ${seat ? seat.count : 0}` });
    }

    // Get amount
    const amountObj = train.amount.find((item) => item.type === seatType);
    if (!amountObj || !amountObj.amount) {
      return res.status(400).json({ message: 'Amount not found for seat type' });
    }
    const amount = amountObj.amount * passengers.length; // Total amount for all passengers

    // Create Razorpay order
    const order = await instance.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    // Create booking
    const booking = new Booking({
      userId,
      trainId: train._id,
      journeyDate: parsedJourneyDate,
      seatType,
      paymentStatus: 'pending',
      razorpayOrderId: order.id,
      amount,
      name: user.firstName,
      email: user.email,
      source: train.source,
      destination: train.destination,
      passengers, // Store passenger details
    });

    // Update seat count
    seat.count -= passengers.length;

    // If no seats are left, update train status to 'unavailable'
    if (seat.count <= 0) {
      train.trainStatus = 'unavailable'; // Mark train as unavailable
    }

    // Save changes
    await train.save({ session });
    await booking.save({ session });

    // Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      message: 'Booking created. Complete payment to confirm.',
      razorpayOrderId: order.id,
      amount,
      currency: 'INR',
      bookingId: booking._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Booking error:', err);
    res.status(500).json({ message: err.message || 'An error occurred during booking' });
  } finally {
    session.endSession();
  }
});


trainRouter.get("/train/bookings", userAuth, async (req, res) => {

  try{
    const user=req.user;

    const { _id } = user;

    const bookings=await Booking.find({userId:_id})
    res.status(200).json({message:"Bookings fetched",bookings})
  }catch(err){
    res.status(500).json({message:err.message})
  }
})

trainRouter.get("/allbookings/:userId",userAuth,async(req,res)=>{
try{
const userId=req.params.userId;
console.log(userId)
const data= await Booking.find({userId:userId})
res.status(200).json({message:"Success",data})
console.log(data)

}catch(err){
  res.status(500).json({message:err.message})
}
})

trainRouter.post("/train/orders/:bookingId",userAuth,async(req,res)=>{
  try{ 
       const bookingId=req.params.bookingId;
      const data= await Booking.find({_id:bookingId})
      res.status(200).json({messgae:'success',data:data})

  }catch(err){
  
    res.status(500).json({message:err.message})
  }
})










  
module.exports=trainRouter;