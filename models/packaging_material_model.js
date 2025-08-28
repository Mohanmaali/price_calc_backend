const mongoose = require("mongoose");

const packaging_schema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    detail: [
      {
        material: {
          type: String,
          required: true,
          trim: true,
        },
        cost: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Packaging = mongoose.model("Packaging", packaging_schema);

module.exports = Packaging;
