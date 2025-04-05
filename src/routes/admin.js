const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const Train = require('../model/train');
const adminRouter = express.Router();
const moment= require('moment-timezone')


adminRouter.post("/add/train", adminAuth, async (req, res) => {
    try {
        let { number, name, source, destination, journeyDate, departureTime, arrivalTime, seats ,amount} = req.body;
        let trainStatus="unavailable"

        // ✅ Validating fields
        if (!number || !name || !source || !destination || !journeyDate || !departureTime || !arrivalTime || !seats||!amount) {
            return res.status(400).json({ message: "All fields are mandatory!!" });
        }

        // ✅ Convert string date values into Date objects
        const defaultTime = "00:00:00"; // Default time to midnight if not provided

        // Step 1: Ensure journeyDate is in the correct format (DD-MM-YYYY)
        // Combine date with default time (00:00:00)
        const adminDateTime = `${journeyDate} ${defaultTime}`;

        // Convert the date to UTC and then to a JavaScript Date object
        const formattedJourneyDate = moment.tz(adminDateTime, "DD-MM-YYYY HH:mm:ss", "Asia/Kolkata").utc().toDate();

        // Check if formattedJourneyDate is valid
        if (isNaN(formattedJourneyDate)) {
            return res.status(400).json({ message: "Invalid date format for journeyDate" });
        }

        // Step 2: Convert departureTime and arrivalTime to valid Date objects
        const formattedDepartureTime = new Date(departureTime); // Ensure valid Date object
        const formattedArrivalTime = new Date(arrivalTime); // Ensure valid Date object

        // Validate departureTime and arrivalTime
        if (isNaN(formattedDepartureTime) || isNaN(formattedArrivalTime)) {
            return res.status(400).json({ message: "Invalid date format for departureTime or arrivalTime" });
        }
        if(seats.length!=0){
           trainStatus="available"
        }

        // Step 3: Create the train document
        const train = new Train({
            number,
            name,
            source,
            destination,
            journeyDate: formattedJourneyDate,
            departureTime: formattedDepartureTime,
            arrivalTime: formattedArrivalTime,
            seats,
            trainStatus,
            amount
        });

        // Save the train document
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
