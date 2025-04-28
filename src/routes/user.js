const express= require('express');
const userRouter= express.Router();
const bcrypt= require('bcrypt')
const User= require('../model/user');
const { userAuth } = require('../middleware/userAuth');
const nodemailer = require('nodemailer');
require('dotenv').config()
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
          res.cookie("token",token, {
            httpOnly: true,
            secure: true,       // must be true because Netlify is HTTPS
            sameSite: 'None',   // must be 'None' for cross-origin cookies
            maxAge: 24 * 60 * 60 * 1000  // 1 day
          })

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
userRouter.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    try {
      // Create transporter
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL, // Your Gmail address
          pass: process.env.EMAIL_PASS, // App password (NOT your normal Gmail password)
        },
      });
  
      // Email options
      let mailOptions = {
        from: email, // Sender's email
        to: process.env.EMAIL, // Your Gmail where you want to receive the message
        subject: `Contact Us Message from ${name}`,
        html: `
          <h2>New Contact Form Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      }
      await transporter.sendMail(mailOptions);

      res.json({ success: 'Message sent successfully!' });
    } catch (error) {
      console.error('Error sending mail:', error);
      res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
  });
module.exports= userRouter;