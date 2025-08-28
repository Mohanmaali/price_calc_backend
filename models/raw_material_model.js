const mongoose = require("mongoose");

const raw_material_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fluctuation: {
      type: Number,
      required: true,
      trim: true,
    },
    currency_id: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency_Model",
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      trim: true,
    },
    cost_aed_per_kg: {
      type: Number,
      required: true,
      trim: true,
    },
    alloy: [{ name: { type: String, trim: true } }],
    temper: [{ name: { type: String, trim: true } }],
    grade: [{ name: { type: String, trim: true } }],
    finish: [
      {
        finish_id: {
          type: mongoose.Schema.ObjectId,
          ref: "Finish",
          default: null,
        },

        color: [
          {
            color_id: {
              type: mongoose.Schema.ObjectId,
              ref: "Finish",
              default: null,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Raw_Material_Model = mongoose.model(
  "Raw_Material_Model",
  raw_material_schema
);

module.exports = Raw_Material_Model;
