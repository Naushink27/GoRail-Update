const mongoose= require('mongoose');
const paymentSchema= new mongoose.Schema({
    userId:{
        type:String,
        required:true
    },
    trainId:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    orderId:{
        type:String,
        required:true
    },
    paymentId:{
        type:String,
        required:true
    }
    
},{
    timestamps:true
})

const Payment= mongoose.model('Payment',paymentSchema)
module.exports= Payment;