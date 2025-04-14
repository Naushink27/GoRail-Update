const express= require('express');
const userRouter= express.Router();
const bcrypt= require('bcrypt')
const User= require('../model/user');
const { userAuth } = require('../middleware/userAuth');
userRouter.post('/signup',async(req, res)=>{
    try{
          const {firstName,lastName,email,password}= req.body;
           if(!firstName||!lastName||!email||!password){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
           }
           const hashedPassword= await bcrypt.hash(password, 10)
                   const user= await new User({
            firstName,
            lastName,
            email,
            password: hashedPassword
        })
        console.log(user)
        await user.save()
        res.send(user)
        
    }
catch(err){
    res.status(500).json({
        success:false,
        message:err.message
    })
}
})
userRouter.post('/login',async(req, res)=>{

    try{

        const{ email, password}=req.body;
        if(!email||!password){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
        }
       const user= await User.findOne({email:email})
       if(!user){
        return res.status(400).json({
            success:false,
            message:"Invalid credentials"
        })
       }
     const isPassword= await user.validatePassword(password)

         if(!isPassword){
          return res.status(400).json({
                success:false,
                message:"Invalid credentials"
          })
         }
           const token= await user.getJWT()
          res.cookie("token",token)

         res.status(200).json({
            success:true,
            message:"Login successful",
            user:user
         })
    }catch(err){
        res.status(500).json({
            success:false,
            message:err.message
        })
    }
})
userRouter.post('/logout',userAuth,async(req, res)=>{
    try{
        res.cookie("token",null,{
            expires: new Date(Date.now())
        })
        res.status(200).json({
            success:true,
            message:"Logout successful"
        })
    }catch(err){
        res.status(500).json({
            success:false,
            message:err.message
        })
    }
})
module.exports= userRouter;