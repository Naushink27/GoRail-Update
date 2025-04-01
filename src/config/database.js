const mongoose= require('mongoose');

const connectDB= async()=>{
    try{
       await mongoose.connect('mongodb+srv://naushink2709:QGYdB7tZ43JNz9Nt@namastenode.gvret.mongodb.net/GoRail')
      
    }catch(err){
        console.error(err.message);
        
    }
}
module.exports= connectDB;