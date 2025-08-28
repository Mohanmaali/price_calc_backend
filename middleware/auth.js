const jwt = require("jsonwebtoken");
const User_model = require("../models/user_model");

const auth = async (req, res, next) => {
  try {
    const header = req.header("Authorization"); 
    const token = header.split(" ")[1];
    const verify = await jwt.verify(token, process.env.JWT);
    if (verify) {
      // const user = await User_model.findById(verify.id).populate("department");
      const user = await User_model.findById(verify.id);
      if (!user) {
        return res.status(401).json({ mssg: "Unauthorized: User not found" });
      }
      req.user = verify;
    }
    // console.log(verify);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
module.exports = auth;
