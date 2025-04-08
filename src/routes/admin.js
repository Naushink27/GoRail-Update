const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const Train = require('../model/train');
const adminRouter = express.Router();



adminRouter.post("/add/train", adminAuth, async (req, res) => {
    try {
        let { number, name, source, destination, journeyDate, departureTime, arrivalTime, seats, amount } = req.body;
        let trainStatus = "unavailable";

        // ✅ 1. Validate all required fields
        if (!number || !name || !source || !destination || !journeyDate || !departureTime || !arrivalTime || !seats || !amount) {
            return res.status(400).json({ message: "All fields are mandatory!" });
        }

        // ✅ 2. Check journeyDate format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
            return res.status(400).json({ message: "Invalid journeyDate format. Use YYYY-MM-DD." });
        }

        // ✅ 3. Check time format (HH:MM:SS)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
        if (!timeRegex.test(departureTime) || !timeRegex.test(arrivalTime)) {
            return res.status(400).json({ message: "Invalid time format. Use HH:MM:SS." });
        }

        // ✅ 4. Convert date and time to UTC
        const parsedJourneyDate = new Date(`${journeyDate}T00:00:00Z`);
        const parsedDepartureTime = new Date(`1970-01-01T${departureTime}Z`);
        const parsedArrivalTime = new Date(`1970-01-01T${arrivalTime}Z`);

        // ✅ 5. Validate actual conversion
        if (isNaN(parsedJourneyDate) || isNaN(parsedDepartureTime) || isNaN(parsedArrivalTime)) {
            return res.status(400).json({ message: "Invalid date or time format." });
        }

        // ✅ 6. Set train status
        if (Array.isArray(seats) && seats.length > 0) {
            trainStatus = "available";
        }

        // ✅ 7. Create train document
        const train = new Train({
            number,
            name,
            source,
            destination,
            journeyDate: parsedJourneyDate,
            departureTime: parsedDepartureTime,
            arrivalTime: parsedArrivalTime,
            seats,
            trainStatus,
            amount
        });

        await train.save();

        res.status(201).json({ message: "Train added successfully!", train });

    } catch (err) {
        console.error("Error adding train:", err);
        res.status(500).json({ message: "Something went wrong on the server." });
    }
});



adminRouter.patch("/update/train/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      let { departureTime, arrivalTime, journeyDate, seats } = req.body;
  
      let parsedJourneyDate, parsedDepartureTime, parsedArrivalTime;
  
      if (journeyDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) {
          return res.status(400).json({ message: "Invalid journeyDate format. Use YYYY-MM-DD." });
        }
        parsedJourneyDate = new Date(`${journeyDate}T00:00:00Z`);
      }
  
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  
      if (departureTime) {
        if (!timeRegex.test(departureTime)) {
          return res.status(400).json({ message: "Invalid departureTime format. Use HH:MM:SS." });
        }
        parsedDepartureTime = new Date(`1970-01-01T${departureTime}Z`);
      }
  
      if (arrivalTime) {
        if (!timeRegex.test(arrivalTime)) {
          return res.status(400).json({ message: "Invalid arrivalTime format. Use HH:MM:SS." });
        }
        parsedArrivalTime = new Date(`1970-01-01T${arrivalTime}Z`);
      }
  
      const updateObj = {};
      if (parsedJourneyDate) updateObj.journeyDate = parsedJourneyDate;
      if (parsedDepartureTime) updateObj.departureTime = parsedDepartureTime;
      if (parsedArrivalTime) updateObj.arrivalTime = parsedArrivalTime;
      if (seats) updateObj.seats = seats;
  
      await Train.findByIdAndUpdate(id, updateObj);
  
      res.status(200).json({ message: "Train details updated successfully!" });
  
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

adminRouter.get("/view/trains",adminAuth,async(req,res)=>{
    try{
      const trains= await Train.find();
      res.status(200).json({message:"All trains fetched",trains})

    }catch(err){
        res.status(500).json({message:err.message})
    }
})

module.exports = adminRouter;
