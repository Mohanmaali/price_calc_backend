const User_model = require("../models/user_model");
const bcrypt = require("bcrypt");
const salt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const Invited_model = require("../models/invited_model");
const sendEmail = require("../config/sendEmail");
const Department = require("../models/department_model");
const { default: mongoose } = require("mongoose");
const Team = require("../models/teams");
const Position = require("../models/position");
const isAdminUser  = require("../helpers/isUserAdmin");


const add_user_old = async (req, res) => {
  try {
    const { name, contact, password, confirm_password } = req.body.form;
    const token = req.body.token;
    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ mssg: "Password and Confirm Password dont match" });
    }
    const { email, deptId, teamId, positionId } = await jwt.verify(token, process.env.JWT);
    // console.log(deptId, teamId, positionId)
    // return
    const find_user = await User_model.findOne({ email });
    if (find_user) {
      return res.status(400).json({ mssg: "User already exists" });
    }
    const is_invited = await Invited_model.findOne({ email });
    if (is_invited) {
      const delete_invite = await Invited_model.deleteOne({ email });
    }
    const hash_pwd = await bcrypt.hashSync(password, salt);
    const new_user = await User_model.create({
      name,
      email,
      contact,
      department: new mongoose.Types.ObjectId(deptId),
      team: new mongoose.Types.ObjectId(teamId),
      position: new mongoose.Types.ObjectId(positionId),
      password: hash_pwd,
      tabs: is_invited.tabs
    });
    return res.status(200).json({ mssg: "User Registered Successfully" });
  } catch (error) {
    console.log(error);
  }
};

const add_user = async (req, res) => {
  try {
    const {password, confirm_password} = req.body?.form;
    const token = req.body.token;

    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ 
          success:false,
          message: "Password and Confirm Password dont match" 
        });
    }


    const { email } = await jwt.verify(token, process.env.JWT);

    const isUserExist = await User_model.findOne({email});
    if(!isUserExist){
      return res.status(400).json({
        success:false,
        message:'No user with this email'
      })
    }

    if(isUserExist?.is_registered){
      return res.status(400).json({
        success:false,
        message:'user already registered with us'
      })
    }

    const hash_pwd = bcrypt.hashSync(password, salt); 

    isUserExist.password = hash_pwd;
    isUserExist.is_registered = true;
    await isUserExist.save();

    res.status(200).json({
      success:true,
      message:'User successfully registered'
    })
  } catch (error) {
    console.log("error",error);
    
    res.status(500).json({
      success:false,
      message:error?.message
    })
  }
}

// const invite = async (req, res) => {
//   try {
//     const image = req.files?.image?.[0];
//     const imageData = image
//   ? {
//       filename: image.filename,
//       path: image.path,
//       url: `${process.env.BACKENDURL}/uploads/${image.filename}`,
//     }
//   : null;

    
//     const {name, email, contact, country, city, address, } = req.body;
//     const { name: dept, id: deptId } = JSON.parse(req.body.department) || {};
//     const { name: team, id: teamId } = JSON.parse(req.body.team) || {};
//     const { name: position, id: positionId } = JSON.parse(req.body.position) || {};
//     const password = (await bcrypt.hashSync(Math.floor(1000 + Math.random() * 9000).toString(),salt));

//     let user = null;

//     if(!name || !email || !contact || !country || !city || !address || !deptId || !teamId || !positionId){
//       return res.status(400).json({
//         success:false,
//         message:'All feilds are required'
//       })
//     }

//     const isEmailExist = await User_model.findOne({email});

 
//     if(isEmailExist){
//       if(isEmailExist?.is_registered){
//         return res.status(400).json({
//           success:false,
//           message:'Email is already exists'
//         })
//       }else{
//           const deleteNotRegisteredUser = await User_model.findByIdAndDelete(isEmailExist?._id);
//           user = await User_model.create({
//             image: imageData ? imageData : null,
//             name,
//             email,
//             password,
//             contact,
//             address,
//             city,
//             country,
//             department:deptId,
//             team:teamId,
//             position:positionId
//           });

//          if(!user){
//           return res.status(400).json({
//             success:false,
//             message:'Something went wrong'
//           })
//          }

//         //  sending Invite mail
//       }

//     }else{
//        user = await User_model.create({
//         image:imageData ? imageData : null,
//         name,
//         email,
//         password,
//         contact,
//         address,
//         city,
//         country,
//         department:deptId,
//         team:teamId,
//         position:positionId
//       })

//       if(!user){
//         return res.status(400).json({
//           success:false,
//           message:'something went wrong'
//         })
//       }
//     }
    
//     const token = await jwt.sign(
//       { email, deptId, teamId, positionId },
//       process.env.JWT
//     );
//     const file = "./view/email_invitation.ejs";
//     const subject = "Invitation For Registration";
//     const message = { email: email, department: dept, team: team, position: position, token: token, name, contact };
//     const temp = await sendEmail(email, file, subject, message, res);

//     res.status(200).json({
//       success:true,
//       message:'Invited mail send successfully'
//     })

//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success:false,
//       message:error?.message
//     })
//   }
// }

const invite = async (req, res) => {
  try {
    const image = req.files?.image?.[0];

    const imageData = image
      ? {
          filename: image.filename,
          path: image.path,
          url: `${process.env.BACKENDURL}/uploads/${image.filename}`,
        }
      : null;

    const {
      salutation,
      name,
      lastName,
      email,
      mobileNumbers,
      directNumbers,
      address,
      country,
      state,
      city,
    } = req.body;

    const roleGroups = JSON.parse(req.body.roleGroups || "[]");
    

    // const { name: deptName, id: deptId } = JSON.parse(req.body.department || "{}");
    // const { name: teamName, id: teamId } = JSON.parse(req.body.team || "{}");
    // const { name: positionName, id: positionId } = JSON.parse(req.body.position || "{}");

    // Validate required fields
    if (
      !salutation || !name || !lastName || !email || !mobileNumbers || !directNumbers ||
      !address || !country || !state || !city ||   roleGroups.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const existingUser = await User_model.findOne({ email });

    // If user already registered
    if (existingUser && existingUser.is_registered) {
      return res.status(400).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // Generate random password
    const rawPassword = Math.floor(1000 + Math.random() * 9000).toString();
    const password = bcrypt.hashSync(rawPassword, salt);

    // Delete unregistered user if exists
    if (existingUser && !existingUser.is_registered) {
      await User_model.findByIdAndDelete(existingUser._id);
    }

    // Create user
    const newUser = await User_model.create({
      salutation,
      name,
      lastName,
      email,
      password,
      mobileNumber: Array.isArray(mobileNumbers) ? mobileNumbers : JSON.parse(mobileNumbers),
      directNumber: Array.isArray(directNumbers) ? directNumbers : JSON.parse(directNumbers),
      address,
      country:JSON.parse(country),
      state:JSON.parse(state),
      city:JSON.parse(city),
      image: imageData,
      // department: deptId,
      // team: teamId,
      // position: positionId,
      roleGroups
    });

    if (!newUser) {
      return res.status(500).json({
        success: false,
        message: "Failed to create user.",
      });
    }

    // Send invitation email
    // const token = jwt.sign(
    //   { email, deptId, teamId, positionId },
    //   process.env.JWT
    // );

    // const emailFile = "./view/email_invitation.ejs";
    // const subject = "Invitation For Registration";
    // const message = {
    //   email,
    //   department: deptName,
    //   team: teamName,
    //   position: positionName,
    //   token,
    //   name
    // };

    // await sendEmail(email, emailFile, subject, message, res);

        // Send invitation email using the first roleGroup only
        const primaryRole = roleGroups[0] || {};
        const token = jwt.sign(
          {
            email,
            departmentId: primaryRole?.department?._id,
            teamId: primaryRole?.team?._id,
            positions: primaryRole?.positions?.map((p) => p.positionId),
          },
          process.env.JWT
        );
    
        const emailFile = "./view/email_invitation.ejs";
        const subject = "Invitation For Registration";
        const message = {
          email,
          department: primaryRole?.department?.name || "-",
          team: primaryRole?.team?.name || "-",
          position: primaryRole?.positions?.map((p) => p.name).join(", ") || "-",
          token,
          name,
        };
         await sendEmail(email, emailFile, subject, message, res);

    return res.status(200).json({
      success: true,
      message: "Invitation email sent successfully.",
    });

  } catch (error) {
    console.error("Invite error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // const user = await User_model.findOne({ email }).populate([
    //   { path: "department" },
    //   { path: "position" },
    // ]);

    const user = await User_model.findOne({ email });
    
    
    if (!user) {
      return res.status(400).json({ mssg: "User does not exist" });
    }
    const match_pwd = await bcrypt.compareSync(password, user.password);
    const admin = await isAdminUser(user?.position?.tabs); // getting user is admin or not on the basis of tabs & permissions
    
    if (match_pwd) {
      const payload = {
        id: user._id,
        // role: user.role,
        // department: user?.department._id,
        isAdmin:admin,
      };
      const token = await jwt.sign(payload, process.env.JWT);

      return res.status(200).json({
        mssg: "Login Successfully",
        // role: user?.department?.name,
        isAdmin:admin,
        // tabs: user?.department.tabs,
        token,
      });
    } else {
      return res.status(400).json({ mssg: "Password dont match" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const inviteOld = async (req, res) => {
  const { email, tabs } = req.body;
  const { name: dept, id: deptId } = req.body.selectedDept || {};
  const { name: team, id: teamId } = req.body.selectedTeam || {};
  const { name: position, id: positionId } = req.body.selectedPosition || {};
  // console.log(tabs)

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  if (!email) {
    return res.status(400).json({ msg: "Email is Required" });
  }
  const isValidEmail = emailRegex.test(email);
  if (!isValidEmail) {
    return res.status(400).json({ msg: "Enter Valid Email" });
  }
  let existingDept = await Department.findById(deptId);
  if (existingDept.name != dept) {
    return res.status(400).json({ msg: "Department Name Invalid" });
  }
  let existingTeam = await Team.findById(teamId);
  if (existingTeam.name != team) {
    return res.status(400).json({ msg: "Team Name Invalid" });
  }
  let existingPosition = await Position.findById(positionId);
  if (existingPosition.name != position) {
    return res.status(400).json({ msg: "Position Name Invalid" });
  }
  const ifmail = await User_model.findOne({ email: email });
  if (ifmail) {
    return res.status(400).send({
      msg: "User already exist with this email",
    });
  } else {
    const invited_user = await Invited_model.create({ email, department: deptId, team: teamId, position: positionId });
    const token = await jwt.sign(
      { email, deptId, teamId, positionId },
      process.env.JWT
    );
    const file = "./view/email_invitation.ejs";
    const subject = "Invitation For Registration";
    const message = { email: email, department: dept, team: team, position: position, token: token, };
    const temp = await sendEmail(email, file, subject, message, res);
    return res.status(200).send({ msg: "Email sent successfully!", temp });
  }
};

const forget_pwd_email = async (req, res) => {
  try {
    const { email } = req.body;
    const ifmail = await User_model.findOne({ email: email });
    if (ifmail === null) {
      return res.status(400).send({
        msg: "User does not exist",
      });
    }
    const token = jwt.sign(email, process.env.JWT);
    const file = "./view/forget_password.ejs";
    const subject = "Forget Password";
    const message = { email: email, token: token };
    const temp = await sendEmail(email, file, subject, message, res);
    return res.status(200).send({ msg: "Email sent successfully!", temp });
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const forget_password = async (req, res) => {
  try {
    const { password, confirm_password } = req.body.form;
    const { token } = req.body;
    if (password !== confirm_password) {
      return res.staus(400).json("Passwords dont match");
    }
    const verified_email = await jwt.verify(token, process.env.JWT);
    const if_user = await User_model.findOne({ email: verified_email });
    if (if_user) {
      const update_pwd = await User_model.findOneAndUpdate(
        { email: verified_email },
        { password: bcrypt.hashSync(password, salt) }
      );
      return res.status(200).json({ mssg: "Password Updated" });
    } else {
      return res.status(400).json({ mssg: "User not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

// const getUserDetails = async (req, res) => {
//   try {
//     const { id, role, department } = req.user;
//     const userDetail = await User_model.findById(id, { password: 0 }).populate("department position");

//     return res.status(200).json(userDetail);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({mssg: error?.message || 'Internal server error'})
//   }
// };


const getUserDetails = async (req, res) => {
  try {
    const { id } = req.user;

    const userDetail = await User_model.findById(id, { password: 0 })
      .populate({
        path: 'roleGroups.positions.positionId', // populate positionId in positions[]
        populate: {
          path: 'tabs', // populate tabs inside the Position model
        },
      });

    return res.status(200).json(userDetail);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || 'Internal server error' });
  }
};


module.exports = {
  add_user,
  signin,
  invite,
  forget_pwd_email,
  forget_password,
  getUserDetails
};
