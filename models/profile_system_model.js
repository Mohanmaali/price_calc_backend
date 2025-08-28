const mongoose = require("mongoose");

const system_detail_schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  subsystems: [
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      code: {
        type: String,
        required: true,
        trim: true,
      },
    },
  ],
});

const system_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: String,
      required: true,
      trim: true,
    },
    royality: {
      type: Number,
      required: true,
      trim: true,
    },
    overhead: {
      type: Number,
      required: true,
      trim: true,
    },
    profit: {
      type: Number,
      required: true,
      trim: true,
    },
    price_list_1: {
      type: Number,
      required: true,
      trim: true,
    },
    price_list_2: {
      type: Number,
      required: true,
      trim: true,
    },
    price_list_3: {
      type: Number,
      required: true,
      trim: true,
    },
    price_list_4: {
      type: Number,
      required: true,
      trim: true,
    },
    system_detail: [system_detail_schema],
  },
  {
    timestamps: true,
  }
);

const Profile_System_Model = mongoose.model(
  "Profile_System_Model",
  system_schema
);

module.exports = Profile_System_Model;
