const mongoose = require("mongoose");

const Hourly_Rate_schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Hourly_Rate = mongoose.model("Hourly_Rate", Hourly_Rate_schema);

module.exports = Hourly_Rate;
