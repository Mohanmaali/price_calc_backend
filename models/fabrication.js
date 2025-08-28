const mongoose = require("mongoose");

const fabrication_schema = new mongoose.Schema(
  {
    activity: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Fabrication = mongoose.model("Fabrication", fabrication_schema);

module.exports = Fabrication;
