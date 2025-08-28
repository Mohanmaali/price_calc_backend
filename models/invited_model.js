const mongoose = require("mongoose");

const invited_schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
    },
    is_registered: {
      type: Boolean,
      default: false,
    },
    // role: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    department: {
      type: mongoose.Types.ObjectId,
      trim: true,
      ref: "Department",
      required: true
    },
    team: {
      type: mongoose.Types.ObjectId,
      trim: true,
      ref: "Team",
      required: true
    },
    position: {
      type: mongoose.Types.ObjectId,
      trim: true,
      ref: "Position",
      required: true
    },
    // position: {
    //   type: String,
    //   trim: true
    // },
    // tabs: [
    //   {
    //     _id: false,
    //     name: { type: String, trim: true },
    //     visibility: { type: Boolean, trim: false },
    //     create: { type: Boolean, default: false },
    //     read: { type: Boolean, default: false },
    //     update: { type: Boolean, default: false },
    //     delete: { type: Boolean, default: false },
    //   },
    // ],
  },
  {
    timestamps: true,
  }
);

const Invited_model = mongoose.model("Invited_model", invited_schema);

module.exports = Invited_model;
