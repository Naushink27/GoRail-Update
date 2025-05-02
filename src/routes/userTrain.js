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

console.log("Razorpay Key:", process.env.RAZORPAY_KEY_ID);
console.log("Razorpay Secret:", process.env.RAZORPAY_SECRET);

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


 
trainRouter.post("/train/book/:trainId",userAuth,  async (req, res) => {
  
  

  try {
    const user = req.user;
    console.log("User details from book train API"+user)
    const { _id} = user;
    const { trainId } = req.params;
    const { journeyDate, seatType, passengers } = req.body;
    console.log("Booking request:", req.body); // Log the booking request

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
    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }
    console.log("Debugging", train); // Log the train details
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
    console.log("Razorpay order created:", order); // Log the Razorpay order
    if(!order){
      return res.status(500).json({ message: 'Failed to create Razorpay order' });
    }

    // Create booking
    const booking = new Booking({
      userId: _id,
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
  console.log("Booking is:"+booking)
    // Update seat count
    seat.count -= passengers.length;

    // If no seats are left, update train status to 'unavailable'
    if (seat.count <= 0) {
      train.trainStatus = 'unavailable'; // Mark train as unavailable
    }

    // Save changes
    await train.save();
    console.log("User details:", JSON.stringify(user, null, 2));
console.log("Booking request:", JSON.stringify(req.body, null, 2));
console.log("Train details:", JSON.stringify(train, null, 2));

    await booking.save();


    res.status(200).json({
      message: 'Booking created. Complete payment to confirm.',
      razorpayOrderId: order.id,
      amount,
      currency: 'INR',
      bookingId: booking._id,
    });
  } catch (err) {
    
    console.error('Booking error:', err);
    res.status(500).json({ message: err.message || 'An error occurred during booking' });
  } 
});


trainRouter.get("/train/bookings", userAuth, async (req, res) => {

  try{
    const user=req.user;
    console.log(user)

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



trainRouter.get('/api/cities',async(req,res)=>{
  const indianCities = [
    { City: 'Mumbai', State: 'Maharashtra' },
    { City: 'Delhi', State: 'Delhi' },
    { City: 'Kolkata', State: 'West Bengal' },
    { City: 'Chennai', State: 'Tamil Nadu' },
    { City: 'Bangalore', State: 'Karnataka' },
    { City: 'Hyderabad', State: 'Telangana' },
    { City: 'Ahmedabad', State: 'Gujarat' },
    { City: 'Pune', State: 'Maharashtra' },
    { City: 'Surat', State: 'Gujarat' },
    { City: 'Jaipur', State: 'Rajasthan' },
    { City: 'Lucknow', State: 'Uttar Pradesh' },
    { City: 'Indore', State: 'Madhya Pradesh' },
    { City: 'Vadodara', State: 'Gujarat' },
    { City: 'Nagpur', State: 'Maharashtra' },
    { City: 'Patna', State: 'Bihar' },
    { City: 'Bhopal', State: 'Madhya Pradesh' },
    { City: 'Kanpur', State: 'Uttar Pradesh' },
    { City: 'Chandigarh', State: 'Chandigarh' },
    { City: 'Coimbatore', State: 'Tamil Nadu' },
    { City: 'Visakhapatnam', State: 'Andhra Pradesh' },
    { City: 'Faridabad', State: 'Haryana' },
    { City: 'Rajkot', State: 'Gujarat' },
    { City: 'Mysuru', State: 'Karnataka' },
    { City: 'Gurugram', State: 'Haryana' },
    { City: 'Noida', State: 'Uttar Pradesh' },
    { City: 'Vijayawada', State: 'Andhra Pradesh' },
    { City: 'Ghaziabad', State: 'Uttar Pradesh' },
    { City: 'Srinagar', State: 'Jammu and Kashmir' },
    { City: 'Kochi', State: 'Kerala' },
    { City: 'Allahabad', State: 'Uttar Pradesh' },
    { City: 'Bhubaneswar', State: 'Odisha' },
    { City: 'Chandrapur', State: 'Maharashtra' },
    { City: 'Jabalpur', State: 'Madhya Pradesh' },
    { City: 'Ranchi', State: 'Jharkhand' },
    { City: 'Jammu', State: 'Jammu and Kashmir' },
    { City: 'Guwahati', State: 'Assam' },
    { City: 'Udaipur', State: 'Rajasthan' },
    { City: 'Tirunelveli', State: 'Tamil Nadu' },
    { City: 'Solapur', State: 'Maharashtra' },
    { City: 'Trichy', State: 'Tamil Nadu' },
    { City: 'Bikaner', State: 'Rajasthan' },
    { City: 'Amritsar', State: 'Punjab' },
    { City: 'Jodhpur', State: 'Rajasthan' },
    { City: 'Mangalore', State: 'Karnataka' },
    { City: 'Tirupati', State: 'Andhra Pradesh' },
    { City: 'Rudrapur', State: 'Uttarakhand' },
    { City: 'Chittoor', State: 'Andhra Pradesh' },
    { City: 'Dhanbad', State: 'Jharkhand' },
    { City: 'Nashik', State: 'Maharashtra' },
    { City: 'Vellore', State: 'Tamil Nadu' },
    { City: 'Pondicherry', State: 'Puducherry' },
    { City: 'Kolkata', State: 'West Bengal' },
    { City: 'Muzaffarpur', State: 'Bihar' },
    { City: 'Meerut', State: 'Uttar Pradesh' },
    { City: 'Belgaum', State: 'Karnataka' },
    { City: 'Kolhapur', State: 'Maharashtra' },
    { City: 'Durgapur', State: 'West Bengal' },
    { City: 'Kollam', State: 'Kerala' },
    { City: 'Bhilai', State: 'Chhattisgarh' },
    { City: 'Bihar Sharif', State: 'Bihar' },
    { City: 'Kota', State: 'Rajasthan' },
    { City: 'Aligarh', State: 'Uttar Pradesh' },
    { City: 'Dibrugarh', State: 'Assam' },
    { City: 'Ambala', State: 'Haryana' },
    { City: 'Erode', State: 'Tamil Nadu' },
    { City: 'Tiruvannamalai', State: 'Tamil Nadu' },
    { City: 'Kozhikode', State: 'Kerala' },
    { City: 'Haridwar', State: 'Uttarakhand' },
    { City: 'Siliguri', State: 'West Bengal' },
    { City: 'Shimla', State: 'Himachal Pradesh' },
    { City: 'Agra', State: 'Uttar Pradesh' },
    { City: 'Bilaspur', State: 'Chhattisgarh' },
    { City: 'Jalgaon', State: 'Maharashtra' },
    { City: 'Anantapur', State: 'Andhra Pradesh' },
    { City: 'Khammam', State: 'Telangana' },
    { City: 'Haldia', State: 'West Bengal' },
    { City: 'Karnal', State: 'Haryana' },
    { City: 'Bhopal', State: 'Madhya Pradesh' },
    { City: 'Muzaffarnagar', State: 'Uttar Pradesh' },
    { City: 'Rajahmundry', State: 'Andhra Pradesh' },
    { City: 'Satna', State: 'Madhya Pradesh' },
    { City: 'Navi Mumbai', State: 'Maharashtra' },
    { City: 'Vapi', State: 'Gujarat' },
    { City: 'Ajmer', State: 'Rajasthan' },
    { City: 'Jamnagar', State: 'Gujarat' },
    { City: 'Surendranagar', State: 'Gujarat' },
    { City: 'Ambala', State: 'Haryana' },
    { City: 'Farrukhabad', State: 'Uttar Pradesh' },
    { City: 'Baran', State: 'Rajasthan' },
    { City: 'Sangli', State: 'Maharashtra' },
    { City: 'Panipat', State: 'Haryana' },
    { City: 'Vadodara', State: 'Gujarat' },
    { City: 'Chhattisgarh', State: 'Chhattisgarh' },
    { City: 'Imphal', State: 'Manipur' },
    { City: 'Muzaffarpur', State: 'Bihar' },
    { City: 'Bilaspur', State: 'Chhattisgarh' },
    { City: 'Jamshedpur', State: 'Jharkhand' },
    { City: 'Tiruvannamalai', State: 'Tamil Nadu' },
    { City: 'Sikar', State: 'Rajasthan' },
    { City: 'Solapur', State: 'Maharashtra' },
    { City: 'Chhattisgarh', State: 'Chhattisgarh' },
    { City: 'Bhubaneshwar', State: 'Odisha' },
    { City: 'Moradabad', State: 'Uttar Pradesh' },
    { City: 'Puducherry', State: 'Puducherry' },
    { City: 'Chikmagalur', State: 'Karnataka' },
    { City: 'Pune', State: 'Maharashtra' },
    { City: 'Bareilly', State: 'Uttar Pradesh' },
    { City: 'Madhubani', State: 'Bihar' },
    { City: 'Faridabad', State: 'Haryana' },
    { City: 'Kochi', State: 'Kerala' },
    { City: 'Nagapattinam', State: 'Tamil Nadu' },
    { City: 'Bikaner', State: 'Rajasthan' },
    { City: 'Chandrapur', State: 'Maharashtra' },
    { City: 'Srinagar', State: 'Jammu and Kashmir' },
    { City: 'Kalyan', State: 'Maharashtra' },
    { City: 'Palakkad', State: 'Kerala' },
    { City: 'Satara', State: 'Maharashtra' },
    { City: 'Jhansi', State: 'Uttar Pradesh' },
    { City: 'Bhubaneshwar', State: 'Odisha' },
    { City: 'Bhilai', State: 'Chhattisgarh' },
    { City: 'Raipur', State: 'Chhattisgarh' },
    { City: 'Tirunelveli', State: 'Tamil Nadu' },
    {City:'Bhusawal', State:'Maharashtra'},
      { City: 'Nellore', State: 'Andhra Pradesh' },
      { City: 'Vellore', State: 'Tamil Nadu' },
      { City: 'Shivpuri', State: 'Madhya Pradesh' },
      { City: 'Karimnagar', State: 'Telangana' },
      { City: 'Dharwad', State: 'Karnataka' },
      { City: 'Warangal', State: 'Telangana' },
      { City: 'Jalandhar', State: 'Punjab' },
      { City: 'Ambikapur', State: 'Chhattisgarh' },
      { City: 'Bilaspur', State: 'Chhattisgarh' },
      { City: 'Anand', State: 'Gujarat' },
      { City: 'Hosur', State: 'Tamil Nadu' },
      { City: 'Bundi', State: 'Rajasthan' },
      { City: 'Buxar', State: 'Bihar' },
      { City: 'Purnia', State: 'Bihar' },
      { City: 'Karur', State: 'Tamil Nadu' },
      { City: 'Madurai', State: 'Tamil Nadu' },
      { City: 'Gwalior', State: 'Madhya Pradesh' },
      { City: 'Jamshedpur', State: 'Jharkhand' },
      { City: 'Siliguri', State: 'West Bengal' },
      { City: 'Chhapra', State: 'Bihar' },
      { City: 'Pudukkottai', State: 'Tamil Nadu' },
      { City: 'Suratgarh', State: 'Rajasthan' },
      { City: 'Mysuru', State: 'Karnataka' },
      { City: 'Bangalore', State: 'Karnataka' },
      { City: 'Sangrur', State: 'Punjab' },
      { City: 'Bokaro', State: 'Jharkhand' },
      { City: 'Churachandpur', State: 'Manipur' },
      { City: 'Kochi', State: 'Kerala' },
      { City: 'Raichur', State: 'Karnataka' },
      { City: 'Amroha', State: 'Uttar Pradesh' },
      { City: 'Katihar', State: 'Bihar' },
      { City: 'Rishikesh', State: 'Uttarakhand' },
      { City: 'Cuttack', State: 'Odisha' },
      { City: 'Vijayawada', State: 'Andhra Pradesh' },
      { City: 'Sambalpur', State: 'Odisha' },
      { City: 'Chikmagalur', State: 'Karnataka' },
      { City: 'Jorhat', State: 'Assam' },
      { City: 'Dibrugarh', State: 'Assam' },
      { City: 'Agra', State: 'Uttar Pradesh' },
      { City: 'Vadodara', State: 'Gujarat' },
      { City: 'Kolhapur', State: 'Maharashtra' },
      { City: 'Gurgaon', State: 'Haryana' },
      { City: 'Ranchi', State: 'Jharkhand' },
      { City: 'Srinagar', State: 'Jammu and Kashmir' },
      { City: 'Bhubaneswar', State: 'Odisha' },
      { City: 'Raipur', State: 'Chhattisgarh' },
      { City: 'Udaipur', State: 'Rajasthan' },
      { City: 'Firozabad', State: 'Uttar Pradesh' },
      { City: 'Bhiwandi', State: 'Maharashtra' },
      { City: 'Shahjahanpur', State: 'Uttar Pradesh' },
      { City: 'Kollam', State: 'Kerala' },
      { City: 'Nanded', State: 'Maharashtra' },
      { City: 'Jammu', State: 'Jammu and Kashmir' },
      { City: 'Dehradun', State: 'Uttarakhand' },
      { City: 'Muzaffarnagar', State: 'Uttar Pradesh' },
      { City: 'Pali', State: 'Rajasthan' },
      { City: 'Hazaribagh', State: 'Jharkhand' },
      { City: 'Malkangiri', State: 'Odisha' },
      { City: 'Hingoli', State: 'Maharashtra' },
      { City: 'Nagapattinam', State: 'Tamil Nadu' },
      { City: 'Balasore', State: 'Odisha' },
      { City: 'Mandvi', State: 'Gujarat' },
      { City: 'Kota', State: 'Rajasthan' },
      { City: 'Dhamtari', State: 'Chhattisgarh' },
      { City: 'Ambala', State: 'Haryana' },
      { City: 'Shirdi', State: 'Maharashtra' },
      { City: 'Alwar', State: 'Rajasthan' },
      { City: 'Chhindwara', State: 'Madhya Pradesh' },
      { City: 'Baharampur', State: 'West Bengal' },
      { City: 'Khajuraho', State: 'Madhya Pradesh' },
      { City: 'Haldwani', State: 'Uttarakhand' },
      { City: 'Mau', State: 'Uttar Pradesh' },
      { City: 'Bhagalpur', State: 'Bihar' },
      { City: 'Mandi', State: 'Himachal Pradesh' },
      { City: 'Kollam', State: 'Kerala' },
      { City: 'Guwahati', State: 'Assam' },
      { City: 'Panipat', State: 'Haryana' },
      { City: 'Bokaro Steel City', State: 'Jharkhand' },
      { City: 'Rae Bareli', State: 'Uttar Pradesh' },
      { City: 'Solapur', State: 'Maharashtra' },
      { City: 'Patiala', State: 'Punjab' },
      { City: 'Chennai', State: 'Tamil Nadu' },
      { City: 'Nagapattinam', State: 'Tamil Nadu' },
      { City: 'Tirunelveli', State: 'Tamil Nadu' },
      { City: 'Jodhpur', State: 'Rajasthan' },
      { City: 'Tirupur', State: 'Tamil Nadu' },
      { City: 'Baripada', State: 'Odisha' },
      { City: 'Bhubaneshwar', State: 'Odisha' },
      { City: 'Aurangabad', State: 'Maharashtra' },
      { City: 'Chandrapur', State: 'Maharashtra' },
      { City: 'Ahmednagar', State: 'Maharashtra' },
      { City: 'Madurai', State: 'Tamil Nadu' },
      { City: 'Udhampur', State: 'Jammu and Kashmir' },
      { City: 'Meerut', State: 'Uttar Pradesh' },
      { City: 'Karwar', State: 'Karnataka' },
      { City: 'Fatehpur', State: 'Uttar Pradesh' },
      { City: 'Siwan', State: 'Bihar' },
      { City: 'Tirupati', State: 'Andhra Pradesh' },
      { City: 'Jalgaon', State: 'Maharashtra' },
      { City: 'Sambhal', State: 'Uttar Pradesh' },
      { City: 'Pali', State: 'Rajasthan' },
      { City: 'Puducherry', State: 'Puducherry' },
      { City: 'Patna', State: 'Bihar' },
      { City: 'Dindigul', State: 'Tamil Nadu' },
      { City: 'Kanchipuram', State: 'Tamil Nadu' },
      { City: 'Panvel', State: 'Maharashtra' },
      { City: 'Rajahmundry', State: 'Andhra Pradesh' },
      { City: 'Kochi', State: 'Kerala' },
      { City: 'Nizamabad', State: 'Telangana' },
      { City: 'Akola', State: 'Maharashtra' },
      { City: 'Aurangabad', State: 'Bihar' },
      { City: 'Bikaner', State: 'Rajasthan' },
      { City: 'Sagar', State: 'Madhya Pradesh' },
      { City: 'Gaya', State: 'Bihar' },
      { City: 'Tiruvallur', State: 'Tamil Nadu' },
      { City: 'Bhagalpur', State: 'Bihar' },
      { City: 'Shimla', State: 'Himachal Pradesh' },
      { City: 'Chilakaluripet', State: 'Andhra Pradesh' },
      { City: 'Buxar', State: 'Bihar' },
      { City: 'Munger', State: 'Bihar' },
      { City: 'Durg', State: 'Chhattisgarh' },
      { City: 'Chhindwara', State: 'Madhya Pradesh' },
  { City: 'Dibrugarh', State: 'Assam' },
  { City: 'Hoshiarpur', State: 'Punjab' },
  { City: 'Sikar', State: 'Rajasthan' },
  { City: 'Madhubani', State: 'Bihar' },
  { City: 'Chandigarh', State: 'Chandigarh' },
  { City: 'Nanded', State: 'Maharashtra' },
  { City: 'Shimla', State: 'Himachal Pradesh' },
  { City: 'Meerut', State: 'Uttar Pradesh' },
  { City: 'Surat', State: 'Gujarat' },
  { City: 'Jamnagar', State: 'Gujarat' },
  { City: 'Nellore', State: 'Andhra Pradesh' },
  { City: 'Udupi', State: 'Karnataka' },
  { City: 'Firozabad', State: 'Uttar Pradesh' },
  { City: 'Vapi', State: 'Gujarat' },
  { City: 'Nagapattinam', State: 'Tamil Nadu' },
  { City: 'Chennai', State: 'Tamil Nadu' },
  { City: 'Jodhpur', State: 'Rajasthan' },
  { City: 'Patiala', State: 'Punjab' },
  { City: 'Udupi', State: 'Karnataka' },
  { City: 'Sonipat', State: 'Haryana' },
  { City: 'Panipat', State: 'Haryana' },
  { City: 'Bhiwani', State: 'Haryana' },
  { City: 'Chhindwara', State: 'Madhya Pradesh' },
  { City: 'Bokaro Steel City', State: 'Jharkhand' },
  { City: 'Jamshedpur', State: 'Jharkhand' },
  { City: 'Kochi', State: 'Kerala' },
  { City: 'Lucknow', State: 'Uttar Pradesh' },
  { City: 'Jabalpur', State: 'Madhya Pradesh' },
  { City: 'Ambala', State: 'Haryana' },
  { City: 'Udhampur', State: 'Jammu and Kashmir' },
  { City: 'Vijayawada', State: 'Andhra Pradesh' },
  { City: 'Moradabad', State: 'Uttar Pradesh' },
  { City: 'Gandhinagar', State: 'Gujarat' },
  { City: 'Kochi', State: 'Kerala' },
  { City: 'Ludhiana', State: 'Punjab' },
  { City: 'Jalna', State: 'Maharashtra' },
  { City: 'Yamunanagar', State: 'Haryana' },
  { City: 'Mysuru', State: 'Karnataka' },
  { City: 'Nagapattinam', State: 'Tamil Nadu' },
  { City: 'Satna', State: 'Madhya Pradesh' },
  { City: 'Satara', State: 'Maharashtra' },
  { City: 'Ranchi', State: 'Jharkhand' },
  { City: 'Alwar', State: 'Rajasthan' },
  { City: 'Jorhat', State: 'Assam' },
  { City: 'Madurai', State: 'Tamil Nadu' },
  { City: 'Bhubaneswar', State: 'Odisha' },
  { City: 'Kochi', State: 'Kerala' },
  { City: 'Morbi', State: 'Gujarat' },
  { City: 'Silchar', State: 'Assam' },
  { City: 'Puducherry', State: 'Puducherry' },
  { City: 'Dhanbad', State: 'Jharkhand' },
  { City: 'Siliguri', State: 'West Bengal' },
  { City: 'Bhopal', State: 'Madhya Pradesh' },
  { City: 'Gurugram', State: 'Haryana' },
  { City: 'Solapur', State: 'Maharashtra' },
  { City: 'Aurangabad', State: 'Maharashtra' },
  { City: 'Nagpur', State: 'Maharashtra' },
  { City: 'Haridwar', State: 'Uttarakhand' },
  { City: 'Rishikesh', State: 'Uttarakhand' },
  { City: 'Udupi', State: 'Karnataka' },
  { City: 'Jamnagar', State: 'Gujarat' },
  { City: 'Tirunelveli', State: 'Tamil Nadu' },
  { City: 'Moradabad', State: 'Uttar Pradesh' },
  { City: 'Dehradun', State: 'Uttarakhand' },
  { City: 'Agra', State: 'Uttar Pradesh' },
  { City: 'Muzaffarpur', State: 'Bihar' },
  { City: 'Tirupati', State: 'Andhra Pradesh' },
  { City: 'Nanded', State: 'Maharashtra' },
  { City: 'Vapi', State: 'Gujarat' },
  { City: 'Latur', State: 'Maharashtra' },
  { City: 'Aligarh', State: 'Uttar Pradesh' },
  { City: 'Bilaspur', State: 'Chhattisgarh' },
  { City: 'Sambalpur', State: 'Odisha' },
  { City: 'Fatehabad', State: 'Haryana' },
  { City: 'Panchgani', State: 'Maharashtra' },
  { City: 'Jalandhar', State: 'Punjab' },
  { City: 'Kanpur', State: 'Uttar Pradesh' },
  { City: 'Gaya', State: 'Bihar' },
  { City: 'Kolkata', State: 'West Bengal' },
  { City: 'Rajkot', State: 'Gujarat' },
  { City: 'Kota', State: 'Rajasthan' },
  { City: 'Morbi', State: 'Gujarat' },
  { City: 'Nellore', State: 'Andhra Pradesh' },
  { City: 'Saharanpur', State: 'Uttar Pradesh' },
  { City: 'Vellore', State: 'Tamil Nadu' },
  { City: 'Kollam', State: 'Kerala' },
  { City: 'Haldwani', State: 'Uttarakhand' },
  { City: 'Shivpuri', State: 'Madhya Pradesh' },
  { City: 'Vapi', State: 'Gujarat' },
  { City: 'Thiruvananthapuram', State: 'Kerala' },
  { City: 'Rishikesh', State: 'Uttarakhand' },
  { City: 'Bikaner', State: 'Rajasthan' },
  { City: 'Jodhpur', State: 'Rajasthan' },
  { City: 'Bhubaneswar', State: 'Odisha' },
  { City: 'Gurgaon', State: 'Haryana' },
  { City: 'Pune', State: 'Maharashtra' },
  { City: 'Panipat', State: 'Haryana' },
  { City: 'Tirunelveli', State: 'Tamil Nadu' },
  { City: 'Nashik', State: 'Maharashtra' }
  ];
  res.json(indianCities);
})






  
module.exports=trainRouter;