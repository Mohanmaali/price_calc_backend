// const mongoose = require("mongoose");

// const user_schema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     contact: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     address:{
//       type: String,
//       // required: true,
//       trim: true,
//     },
//     country:{
//       type: String,
//       // required: true,
//       trim: true,
//     },
//     city:{
//       type: String,
//       // required: true,
//       trim: true,
//     },
//     image: {
//       filename: { type: String },
//       path: { type: String }, // for deletion
//       url: { type: String },  // for frontend display
//     },    

//     department: {
//       type: mongoose.Types.ObjectId,
//       trim: true,
//       ref: "Department",
//       required: true
//     },
//     team: {
//       type: mongoose.Types.ObjectId,
//       trim: true,
//       ref: "Team",
//       required: true
//     },
//     position: {
//       type: mongoose.Types.ObjectId,
//       trim: true,
//       ref: "Position",
//       required: true
//     },
//     is_registered: {
//       type: Boolean,
//       default: false,
//     },
//     // tabs: [
//     //   {
//     //     name: String,
//     //     visibility: Boolean,
//     //     create: Boolean,
//     //     read: Boolean,
//     //     update: Boolean,
//     //     delete: Boolean,
//     //   }
//     // ],
//     // position: {
//     //   type: String,
//     //   trim: true
//     // },
//   },
//   {
//     timestamps: true,
//   }
// );

// const User_model = mongoose.model("User_model", user_schema);

// module.exports = User_model;

const mongoose = require("mongoose");

const user_schema = new mongoose.Schema(
  {
    salutation: {
      type: String,
      trim: true,
    },
    name: {               // firstName
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: [String],
      required: true,
      trim: true
    },
    directNumber: {
      type: [String],
      required: true,
      trim: true
    },    

    address: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    state: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    city: {
      label: { type: String, required: true },
      value: { type: String, required: true },
    },
    image: {
      filename: { type: String },
      path: { type: String }, // For internal deletion
      url: { type: String },  // For frontend display
    },
    is_registered: {
      type: Boolean,
      default: false,
    },

    roleGroups: [
      {
        department: {
          _id: { type: mongoose.Types.ObjectId, ref: "Department", required: true },
          name: { type: String, required: true },
        },
        team: {
          _id: { type: mongoose.Types.ObjectId, ref: "Team", required: true },
          name: { type: String, required: true },
        },
        positions: [
          {
            positionId: { type: mongoose.Types.ObjectId, ref: "Position", required: true },
            name: { type: String, required: true },
          }
        ]
      }
    ],
  },
  { 
    timestamps: true,
  }
);

const User_model = mongoose.model("User_model", user_schema);

module.exports = User_model;

