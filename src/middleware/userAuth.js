const User = require("../model/user");
const jwt = require("jsonwebtoken");

const userAuth = async (req, res, next) => {
  try {
    // ✅ Ensure req.cookies is defined before accessing `token`
    const token = req.cookies?.token 
   

    if (!token) {
      return res.status(401).json({ error: "Please login first" }); // ✅ Send 401 Unauthorized
    }
    

    // ✅ Verify Token
    console.log("verifying JWT token")
    const decodedData = jwt.verify(token, 'goRailway@123');
    console.log(decodedData)
   
    const { _id } = decodedData;

    // ✅ Find User in Database
    const user = await User.findById(_id);
   
    if (!user) {
      return res.status(401).json({ error: "Invalid User!!!!" });
    }
    if(user.role!="user"){
      return res.status(401).json({error:"Cant access this page!!"})
    }
console.log(user)
    req.user = user;
    next(); // ✅ Pass control to the next middleware


  } 
  catch (err) {
    return res.status(401).json({ error: "Invalid or Expired Token" });
  }
};

module.exports = { userAuth };
