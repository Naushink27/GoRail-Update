const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema= new mongoose.Schema({

    firstName: {
        type: String,
        required: [true, "First name is required"],
        maxlength: [50, "First name should be less than 50 characters"],
        minlength: [3, "First name should be greater than 3 characters"],
        validate(value){
            if(!validator.isAlpha(value)){
                throw new Error("Invalid First Name")
            }
        }

    },
    lastName: {
        type: String,
        maxlength: [50, "Last name should be less than 50 characters"],
        minlength: [3, "Last name should be greater than 3 characters"],
        validate(value){
            if(!validator.isAlpha(value)){
                throw new Error("Invalid Last Name")
            }
    }
},
    email: {
        type: String,
        required: [true],
        trim: true,
        lowercase: true,
        unique: [true,"Email already exists"],
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Invalid Email")
            }
        }
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        trim: true,
       
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Password is weak")
            }
        }
    },
    role:{
        type:String,
        default: "user",
    }
},{timestamps:true})

userSchema.methods.validatePassword= async function(passwordInputByUser){
const user= this;
const passwordHashed= user.password;
const isPasswordValid= await bcrypt.compare(passwordInputByUser, passwordHashed)
return isPasswordValid;
}
userSchema.methods.getJWT= async function(){
    const user= this;

    const token = await jwt.sign({_id: user._id,role:user.role},process.env.JWT_SECRET, {
        expiresIn:'1d'
    })
    return token;
}
const User= mongoose.model('User',userSchema);
module.exports= User;