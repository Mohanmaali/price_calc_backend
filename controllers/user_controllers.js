const User_model = require("../models/user_model");
const Invited_model = require("../models/invited_model");
const { default: mongoose } = require("mongoose");

// const list_users = async (req, res) => {
//   try {
//     const aggregatePipeline = [
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           email: 1,
//           position: 1,
//           contact: 1,
//           createdAt: 1,
//           mobileNumber: 1,
//           directNumber: 1,
//           lastName:1,
//           image:1,

//           // role: 1,
//           department: 1,
//           // is_registered: { $literal: true }, // Set default value for is_registered
//           is_registered: 1,
//           // Add other fields as needed
//         },
//       },
//       {
//         $unionWith: {
//           coll: "invited_models",
//           pipeline: [
//             {
//               $project: {
//                 _id: 1,
//                 email: 1,
//                 createdAt: 1,
//                 is_registered: 1,
//                 department: 1,
//                 mobileNumber: 1,
//                 directNumber: 1,
//                 lastName:1,
//                 // role: 1,
//                 // Add other fields as needed
//                 image:1,
//               },
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: "departments",
//           localField: "department",
//           foreignField: "_id",
//           as: "department"
//         }
//       },
//       {
//         $lookup: {
//           from: "positions",
//           localField: "position",
//           foreignField: "_id",
//           as: "position"
//         }
//       }
//     ];

//     User_model.aggregate(aggregatePipeline)
//       .exec()
//       .then((result) => {
//         res.status(200).json(result);
//       })
//       .catch((err) => {
//         console.error(err);
//         res.status(400).json(err);
//       });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       mssg: error?.message || 'Internal server error'
//     })
//   }
// };


// const list_users = async (req, res) => {
//   try {
//     const aggregatePipeline = [
//       // Optional project stage if you only need certain user fields
//       {
//         $project: {
//           name: 1,
//           lastName: 1,
//           email: 1,
//           image: 1,
//           salutation: 1,
//           mobileNumber: 1,
//           directNumber: 1,
//           is_registered: 1,
//           createdAt: 1,
//           roleGroups: 1
//         }
//       },
 
//       // Unwind roleGroups
//       {
//         $unwind: {
//           path: "$roleGroups",
//           preserveNullAndEmptyArrays: true
//         }
//       },
 
//       // Extract department._id
//       {
//         $addFields: {
//           departmentId: "$roleGroups.department._id"
//         }
//       },
 
//       // Unwind positions array inside each roleGroup
//       {
//         $unwind: {
//           path: "$roleGroups.positions",
//           preserveNullAndEmptyArrays: true
//         }
//       },
 
//       // Extract positionId
//       {
//         $addFields: {
//           positionId:
//             "$roleGroups.positions.positionId"
//         }
//       },
 
//       // Lookup for department name
//       {
//         $lookup: {
//           from: "departments",
//           localField: "departmentId",
//           foreignField: "_id",
//           as: "departmentData"
//         }
//       },
//       {
//         $unwind: {
//           path: "$departmentData",
//           preserveNullAndEmptyArrays: true
//         }
//       },
 
//       // Lookup for position name
//       {
//         $lookup: {
//           from: "positions",
//           localField: "positionId",
//           foreignField: "_id",
//           as: "positionData"
//         }
//       },
//       {
//         $unwind: {
//           path: "$positionData",
//           preserveNullAndEmptyArrays: true
//         }
//       },
 
//       // Group by user and collect departments and positions
//       {
//         $group: {
//           _id: "$_id",
//           name: { $first: "$name" },
//           lastName: { $first: "$lastName" },
//           email: { $first: "$email" },
//           image: { $first: "$image" },
//           salutation: { $first: "$salutation" },
//           mobileNumber: { $first: "$mobileNumber" },
//           directNumber: { $first: "$directNumber" },
//           is_registered: { $first: "$is_registered" },
//           createdAt: { $first: "$createdAt" },
//           department: {
//             $addToSet: {
//               _id: "$departmentData._id",
//               name: "$departmentData.name"
//             }
//           },
//           position: {
//             $addToSet: {
//               _id: "$positionData._id",
//               name: "$positionData.name"
//             }
//           }
//         }
//       },
//       {
//         $sort:{
//           name:1
//         }
//       }
//     ];
 
//     const result = await User_model.aggregate(aggregatePipeline).exec();
//     return res.status(200).json(result);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: error?.message || 'Internal server error',
//     });
//   }
// };

const list_users = async (req, res) => {
  try {
    const { nameOrEmail, departmentId } = req.query;
    const aggregatePipeline = [];

    if (nameOrEmail) {
      const searchRegex = new RegExp(nameOrEmail, "i");

      aggregatePipeline.push({
        $match: {
          $or: [
            { name: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
          ],
        },
      });
    }

    
    aggregatePipeline.push(
      {
        $unwind: {
          path: "$roleGroups",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    if (departmentId) {
      aggregatePipeline.push({
        $match: {
          "roleGroups.department._id": new mongoose.Types.ObjectId(departmentId),
        },
      });
    }
    
     aggregatePipeline.push(
      {
        $unwind: {
          path: "$roleGroups.positions",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Look up department
      {
        $lookup: {
          from: "departments",
          localField: "roleGroups.department._id",
          foreignField: "_id",
          as: "departmentInfo",
        },
      },
      {
        $unwind: {
          path: "$departmentInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Look up team
      {
        $lookup: {
          from: "teams",
          localField: "roleGroups.team._id",
          foreignField: "_id",
          as: "teamInfo",
        },
      },
      {
        $unwind: {
          path: "$teamInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Look up position
      {
        $lookup: {
          from: "positions",
          localField: "roleGroups.positions.positionId",
          foreignField: "_id",
          as: "positionInfo",
        },
      },
      {
        $unwind: {
          path: "$positionInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Reconstruct live roleGroup
      {
        $group: {
          _id: {
            userId: "$_id",
            departmentId: "$roleGroups.department._id",
            teamId: "$roleGroups.team._id",
          },
          roleGroup: {
            $first: {
              department: {
                _id: "$departmentInfo._id",
                name: "$departmentInfo.name",
              },
              team: {
                _id: "$teamInfo._id",
                name: "$teamInfo.name",
              },
              positions: [],
            },
          },
          positionList: {
            $addToSet: {
              _id: "$positionInfo._id",
              name: "$positionInfo.name",
            },
          },
          userData: {
            $first: "$$ROOT",
          },
        },
      },
      {
        $addFields: {
          "roleGroup.positions": "$positionList",
        },
      },

      // Group by user again and collect all roleGroups
      {
        $group: {
          _id: "$_id.userId",
          userData: { $first: "$userData" },
          roleGroups: { $push: "$roleGroup" },
        },
      },

      // Final projection
      {
        $project: {
          name: "$userData.name",
          lastName: "$userData.lastName",
          email: "$userData.email",
          image: "$userData.image",
          salutation: "$userData.salutation",
          mobileNumber: "$userData.mobileNumber",
          directNumber: "$userData.directNumber",
          is_registered: "$userData.is_registered",
          createdAt: "$userData.createdAt",
          roleGroups: 1,
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    );

    const result = await User_model.aggregate(aggregatePipeline);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error?.message || 'Internal server error',
    });
  }
};



// const userDetail = async (req, res) => {
//   try {
//     const { id } = req.params
//     const user = await User_model.findById(id)

//     console.log("user---",user);
    

//     return res.status(200).json(user)
//   } catch (error) {
//     console.log(error)
//     return res.status(500).json({ mssg: "Some Error Occured", error })
//   }
// }

const userDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $unwind: {
          path: "$roleGroups",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$roleGroups.positions",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup department
      {
        $lookup: {
          from: "departments",
          localField: "roleGroups.department._id",
          foreignField: "_id",
          as: "departmentInfo",
        },
      },
      {
        $unwind: {
          path: "$departmentInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup team
      {
        $lookup: {
          from: "teams",
          localField: "roleGroups.team._id",
          foreignField: "_id",
          as: "teamInfo",
        },
      },
      {
        $unwind: {
          path: "$teamInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup position
      {
        $lookup: {
          from: "positions",
          localField: "roleGroups.positions.positionId",
          foreignField: "_id",
          as: "positionInfo",
        },
      },
      {
        $unwind: {
          path: "$positionInfo",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Reconstruct each roleGroup entry
      {
        $group: {
          _id: {
            userId: "$_id",
            departmentId: "$roleGroups.department._id",
            teamId: "$roleGroups.team._id",
          },
          roleGroup: {
            $first: {
              department: {
                _id: "$departmentInfo._id",
                name: "$departmentInfo.name",
              },
              team: {
                _id: "$teamInfo._id",
                name: "$teamInfo.name",
              },
              positions: [],
            },
          },
          positionsList: {
            $addToSet: {
              _id: "$positionInfo._id",
              name: "$positionInfo.name",
            },
          },
          userData: { $first: "$$ROOT" },
        },
      },
      {
        $addFields: {
          "roleGroup.positions": "$positionsList",
        },
      },

      // Group again to merge roleGroups
      {
        $group: {
          _id: "$_id.userId",
          roleGroups: { $push: "$roleGroup" },
          userData: { $first: "$userData" },
        },
      },

      // Final projection
      {
        $project: {
          name: "$userData.name",
          lastName: "$userData.lastName",
          email: "$userData.email",
          salutation: "$userData.salutation",
          image: "$userData.image",
          mobileNumber: "$userData.mobileNumber",
          directNumber: "$userData.directNumber",
          is_registered: "$userData.is_registered",
          createdAt: "$userData.createdAt",
          address: "$userData.address",
          country: "$userData.country",
          state: "$userData.state",
          city: "$userData.city",
          roleGroups: 1,
        },
      },
    ];

    const [user] = await User_model.aggregate(pipeline);
    return res.status(200).json(user || {});
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Some Error Occurred", error });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
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
      roleGroups,
    } = req.body;

    // Check if email already exists for another user
    const isEmailExist = await User_model.findOne({
      email,
      _id: { $ne: id } // exclude current user
    });

    if (isEmailExist) {
      return res.status(400).json({
        success: false,
        message: "Email is already exists",
      })
    }


    const { name: deptName, id: deptId } = JSON.parse(req.body.department || "{}");
    const { name: teamName, id: teamId } = JSON.parse(req.body.team || "{}");
    const { name: positionName, id: positionId } = JSON.parse(req.body.position || "{}");

    // Validate required fields
    if (
      !name || !lastName || !email || !mobileNumbers || !directNumbers ||
      !address || !country || !state || !city || !roleGroups
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    let parsedRoleGroups = [];
    try {
      parsedRoleGroups = JSON.parse(roleGroups);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid roleGroups format.",
      });
    }


    let user;

    if (imageData) {
      user = await User_model.findByIdAndUpdate(id, {
        salutation,
        name,
        lastName,
        email,
        mobileNumber: Array.isArray(mobileNumbers) ? mobileNumbers : JSON.parse(mobileNumbers),
        directNumber: Array.isArray(directNumbers) ? directNumbers : JSON.parse(directNumbers),
        address,
        country: JSON.parse(country),
        state: JSON.parse(state),
        city: JSON.parse(city),
        image: imageData,
        // department: deptId,
        // team: teamId,
        // position: positionId,
        roleGroups: parsedRoleGroups,
      })
    } else {
      user = await User_model.findByIdAndUpdate(id, {
        salutation,
        name,
        lastName,
        email,
        // mobileNumbers,
        // directNumbers,
        mobileNumber: Array.isArray(mobileNumbers) ? mobileNumbers : JSON.parse(mobileNumbers),
        directNumber: Array.isArray(directNumbers) ? directNumbers : JSON.parse(directNumbers),
        address,
        country: JSON.parse(country),
        state: JSON.parse(state),
        city: JSON.parse(city),
        // image: imageData,
        // department: deptId,
        // team: teamId,
        // position: positionId,
        roleGroups: parsedRoleGroups,
      })
    }
    return res.status(200).json({ mssg: "User Updated successfully" })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mssg: "Some Error Occured", error })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const deleteInvited = await Invited_model.findByIdAndDelete(id)
    const deletedUser = await User_model.findByIdAndDelete(id)
    return res.status(200).json({ mssg: "User Deleted" })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mssg: "Some Error Occured", error })
  }
}

module.exports = { list_users, userDetail, updateUser, deleteUser };


// const userDetail = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const pipeline = [
//       {
//         $match: { _id: new mongoose.Types.ObjectId(id) },
//       },
//       {
//         $unwind: {
//           path: "$roleGroups",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $unwind: {
//           path: "$roleGroups.positions",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // Lookup department
//       {
//         $lookup: {
//           from: "departments",
//           localField: "roleGroups.department._id",
//           foreignField: "_id",
//           as: "departmentInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$departmentInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // Lookup team
//       {
//         $lookup: {
//           from: "teams",
//           localField: "roleGroups.team._id",
//           foreignField: "_id",
//           as: "teamInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$teamInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // Lookup position
//       {
//         $lookup: {
//           from: "positions",
//           localField: "roleGroups.positions.positionId",
//           foreignField: "_id",
//           as: "positionInfo",
//         },
//       },
//       {
//         $unwind: {
//           path: "$positionInfo",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // Reconstruct each roleGroup entry
//       {
//         $group: {
//           _id: {
//             userId: "$_id",
//             departmentId: "$roleGroups.department._id",
//             teamId: "$roleGroups.team._id",
//           },
//           roleGroup: {
//             $first: {
//               department: {
//                 _id: "$departmentInfo._id",
//                 name: "$departmentInfo.name",
//               },
//               team: {
//                 _id: "$teamInfo._id",
//                 name: "$teamInfo.name",
//               },
//               positions: [],
//             },
//           },
//           positionsList: {
//             $addToSet: {
//               _id: "$positionInfo._id",
//               name: "$positionInfo.name",
//             },
//           },
//           userData: { $first: "$$ROOT" },
//         },
//       },
//       {
//         $addFields: {
//           "roleGroup.positions": "$positionsList",
//         },
//       },

//       // Group again to merge roleGroups
//       {
//         $group: {
//           _id: "$_id.userId",
//           roleGroups: { $push: "$roleGroup" },
//           userData: { $first: "$userData" },
//         },
//       },

//       // Final projection
//       {
//         $project: {
//           name: "$userData.name",
//           lastName: "$userData.lastName",
//           email: "$userData.email",
//           salutation: "$userData.salutation",
//           image: "$userData.image",
//           mobileNumber: "$userData.mobileNumber",
//           directNumber: "$userData.directNumber",
//           is_registered: "$userData.is_registered",
//           createdAt: "$userData.createdAt",
//           address: "$userData.address",
//           country: "$userData.country",
//           state: "$userData.state",
//           city: "$userData.city",
//           roleGroups: 1,
//         },
//       },
//     ];

//     const [user] = await User_model.aggregate(pipeline);
//     return res.status(200).json(user || {});
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Some Error Occurred", error });
//   }
// };