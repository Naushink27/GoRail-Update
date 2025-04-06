const mongoose = require('mongoose');
const validator = require('validator'); // ✅ Importing validator

const trainSchema = new mongoose.Schema({
    number: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isAlpha(value, 'en-US', { ignore: " " })) {
                throw new Error("Invalid Train Name");
            }
        }
    },
    source: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isAlpha(value, 'en-US', { ignore: " " })) {
                throw new Error("Invalid Source Name");
            }
        }
    },
    destination: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isAlpha(value, 'en-US', { ignore: " " })) {
                throw new Error("Invalid Destination Name");
            }
        }
    },
    journeyDate: {  // ✅ Renamed "Date" field to "journeyDate"
        type: Date,
        required: true
    },
    departureTime: {
        type: Date,
        required: true
    },
    arrivalTime: {
        type: Date,
        required: true
    },
    seats: [
        {
            type: { type: String, required: true }, // ✅ Correctly defining the object structure
            count: { type: Number, required: true }
        }
    ],
amount:[{
    type:{type:String, required:true},
    amount:{type:Number, required:true}
}],
    trainStatus:{
        type: String,
        required: true,
        enum: ['available', 'unavailable']
    }
},{timestamps:true});

const Train = mongoose.model("Train", trainSchema);
module.exports = Train;
