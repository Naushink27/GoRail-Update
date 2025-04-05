const mongoose= require('mongoose');
const bookingSchema= new mongoose.Schema({

    userId:{
        type:String,
        required:true,
        
    },
    trainId:{
        type:String,
        required:true,
    },
    journeyDate:{
        type:Date,
        required:true,
    },
    seatType:{
        type:String,
        required:true,
        enum:['Sleeper','AC'],
    },
    razorpayOrderId: {
        type: String,
        required: true,
      },
    journeyStatus:{
        type:String,
        required:true,
        enum:['waiting','confirmed','cancelled'],
        default:'waiting'
      
    },
    paymentStatus:{
        type:String,
        required:true,
        enum: ['N/A','pending', 'completed', 'failed'],
        default: 'N/A'   
    }
})

const Booking= mongoose.model('Booking', bookingSchema);
module.exports= Booking;