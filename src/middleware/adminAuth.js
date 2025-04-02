const jwt = require('jsonwebtoken');
const User = require('../model/user');
const adminAuth=async(req , res,next)=>{
    try{
        const token= req.cookies?.token;
        
    if (!token) {
        return res.status(401).json({ error: "Please login first" }); // ✅ Send 401 Unauthorized
      }
    const decodedData= jwt.verify(token,'goRailway@123')
    console.log(decodedData)

    const {_id}=decodedData;
    const user= await User.findById(_id)
    if(!user){
        return res.status(401).json({ error: "Invalid User!!!!" });
    }
    if(user.role!="admin"){
        return res.status(401).json({ error: "Cant access this page" });
    }
    req.user=user;
    next();
    }  catch (err) {
        return res.status(401).json({ error: "Invalid or Expired Token" });
      }
}
module.exports={adminAuth};