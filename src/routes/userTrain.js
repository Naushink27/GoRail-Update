const express= require('express')
const {userAuth}=require('../middleware/userAuth');
const Train = require('../model/train');
const Booking= require('../model/booking')
const trainRouter=express.Router();
const Razorpay = require("razorpay");

const instance = new Razorpay({
  key_id: 'rzp_test_Ajos5K0E47aZxK',
  key_secret:'wUKfsQDoLPx0JBpCiHHIdQ2D',
});

trainRouter.get('/train', userAuth, async (req, res) => {
    try {
      let { source, destination, number, journeyDate } = req.body;
  
    
      // Construct the query object for source, destination, number
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
      if(journeyDate){
        query.journeyDate=journeyDate
      }
  
      // Perform the query
      const train = await Train.find(query);
  
      // Send the result back
      res.send(train);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
 
trainRouter.post("/train/book/:trainId", userAuth, async (req, res) => {
  try {
    const user = req.user;
    const { _id } = user;
    const { trainId } = req.params;
    const { journeyDate, seatType } = req.body;

    const train = await Train.findById(trainId);
    if (!train) return res.status(404).json({ message: "Train not found" });
    console.log(train);

    if (train.trainStatus !== "available")
      return res.status(400).json({ message: "Train not available" });

    const seat = train.seats.find(seat => seat.type === seatType);
    if (!seat || seat.count <= 0)
      return res.status(400).json({ message: "Seat not available" });

    let amount= train.amount.find(seat => seat.type === seatType).amount;
    if (!amount) return res.status(400).json({ message: "Amount not found" });

 ``
    const order = await instance.orders.create({
      amount:amount*100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // 👇 Save booking to DB with Razorpay Order ID
    const booking = new Booking({
      userId: _id,
      trainId: train._id,
      journeyDate,
      seatType,
      paymentStatus: "pending",
      razorpayOrderId: order.id, // ✅ Store Razorpay order ID
      amount: amount,
      name: user.firstName,
      email: user.email,
      source: train.source,
      destination: train.destination,
    });

    seat.count -= 1;
    await train.save();
    await booking.save();

    res.status(200).json({
      message: "Booking created. Complete payment to confirm.",
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      bookingId: booking._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
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







module.exports = trainRouter;


  
module.exports=trainRouter;