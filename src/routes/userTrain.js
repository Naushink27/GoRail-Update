const express= require('express')
const {userAuth}=require('../middleware/userAuth');
const Train = require('../model/train');

const trainRouter=express.Router();



trainRouter.get('/train', userAuth, async (req, res) => {
    try {
      let { source, destination, number, journeyDate } = req.body;
  
    
      // Construct the query object for source, destination, number
      const query = {};
      if (source) {
        query.source = { $regex: new RegExp(source, 'i') };
      }
      if (destination) {
        query.destination = { $regex: new RegExp(destination, 'i') };
      }
      if (number) {
        query.number = number;
      }
      if(journeyDate){
        query.journeyDate=journeyDate
      }
  
      // Perform the query
      const train = await Train.find(query);
  
      // Send the result back
      res.send(train);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
  
module.exports=trainRouter;