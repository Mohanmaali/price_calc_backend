const mongoose = require("mongoose");

const Glasses_schema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    outer_panel: {
      type: String,
      required: true,
      trim: true,
    },
    spacer1: {
      type: String,
      required: true,
      trim: true,
    },
    middle_panel: {
      type: String,
      required: true,
      trim: true,
    },
    spacer2: {
      type: String,
      required: true,
      trim: true,
    },
    inner_panel: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Glass = mongoose.model("Glass", Glasses_schema);

module.exports = Glass;
