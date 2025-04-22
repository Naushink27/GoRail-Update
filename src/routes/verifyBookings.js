const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const Booking = require('../model/booking');
const sendMail = require('../utils/sendMail'); 
const verifyBookingsRouter = express.Router();

verifyBookingsRouter.get('/bookings',adminAuth,async(req,res)=>{

    try{
         const bookings= await Booking.find()
            res.status(200).json({message:"All bookings fetched",bookings})
    }catch(err){
        res.status(500).json({message:err.message})
    }
})

verifyBookingsRouter.post('/verifybooking/:status/:bookingId',adminAuth,async(req,res)=>{
    try{

        const {status,bookingId}= req.params;
        const allowedStatuses=['confirmed','cancelled']
        if(!allowedStatuses.includes(status)){
            return res.status(400).json({message:"Invalid status"})
        }
        const booking= await Booking.findById(bookingId);
        if(!booking){
            return res.status(404).json({message:"Booking not found"})
        }
        if(booking.journeyStatus==='waiting'){
            if(status==='confirmed'){
                if(booking.paymentStatus==='completed'){
                    booking.journeyStatus='confirmed'
                }
                else if(booking.paymentStatus==='pending'){
                    throw new Error("Payment is pending")
                    
                }
                else{
                    booking.journeyStatus='cancelled'
                }}
                else if (status === 'cancelled') {
                    booking.journeyStatus = 'cancelled'; // ✅ Properly handle this!
                }
            
        await booking.save();
        await sendMail(booking, status);
        res.status(200).json({message:"Booking status updated",booking})
        }
        else{
            throw new Error("Booking already verified")
        }
        
       
    }catch(err){
        res.status(500).json({message:err.message})
    }
})

module.exports = verifyBookingsRouter;