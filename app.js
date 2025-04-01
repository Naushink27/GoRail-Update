const express= require('express');
const app= express();
const connectDB= require('./src/config/database')
const userRouter= require('./src/routes/user')
const cookieParser=require("cookie-parser");

app.use(express.json())
app.use(cookieParser())
app.use('/', userRouter)


connectDB().then(()=>{
    console.log("MongoDB connected successfully")
  
    app.listen(7777,()=>{
        console.log("Server is running on port 7777")
    })
}).catch((err)=>{
    console.error(err.message);
})
