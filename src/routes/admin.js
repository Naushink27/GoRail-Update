const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const Train = require('../model/train');
const adminRouter = express.Router();

adminRouter.post("/add/train", adminAuth, async (req, res) => {
    try {
        let { number, name, source, destination, journeyDate, departureTime, arrivalTime, seats } = req.body;

        // ✅ Validating fields
        if (!number || !name || !source || !destination || !journeyDate || !departureTime || !arrivalTime || !seats) {
            return res.status(400).json({ message: "All fields are mandatory!!" });
        }

        // ✅ Convert string date values into Date objects
        journeyDate = new Date(journeyDate);
        departureTime = new Date(departureTime);
        arrivalTime = new Date(arrivalTime);

        const train = new Train({
            number,
            name,
            source,
            destination,
            journeyDate,
            departureTime,
            arrivalTime,
            seats
        });

        await train.save();
        res.status(201).json({ message: "Train added successfully!", train });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

adminRouter.patch("/update/train/:id",adminAuth,async(req,res)=>{
    try{
        const {id}=req.params;
        const {departureTime,arrivalTime,journeyDate,seats}=req.body;
        const train=await Train.findByIdAndUpdate(id,{
            departureTime,
            arrivalTime,
            journeyDate,
            seats
        })
        await train.save();
        res.status(200).json({message:"Train details updated succesfully!!"})

    }
    catch(err){
        res.status(500).json({message:err.message})
    }
})

adminRouter.get("/view/trains",adminAuth,async(req,res)=>{
    try{
      const trains= await Train.find();
      res.status(200).json({message:"All trains fetched",trains})

    }catch(err){
        res.status(500).json({message:err.message})
    }
})

module.exports = adminRouter;
