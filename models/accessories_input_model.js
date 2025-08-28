const mongoose = require("mongoose");

const input_schema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      default: "-",
    },
    supersystem_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    system_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    subsystem_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    group_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    subgroup_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    supplier_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    supplier_item_code: {
      type: String,
      required: true,
      trim: true,
    },
    rd: {
      type: Number,
      required: true,
      trim: true,
    },
    material_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    grade_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    finish_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    color_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    unit_weight: {
      type: Number,
      required: true,
      trim: true,
    },
    weight_unit: {
      type: String,
      required: true,
      trim: true,
      default: "Kg",
    },
    unit_system: {
      type: String,
      required: true,
      trim: true,
    },
    unit_description: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: "LM",
    },

    cost: {
      type: Number,
      required: true,
      trim: true,
    },
    // currency_id: {
    //   type: mongoose.Schema.ObjectId,
    //   trim: true,
    // },
    cost_to_aed: {
      type: Number,
      required: true,
      trim: true,
    },
    additional_profit: {
      type: Number,
      required: true,
      default: 1,
      trim: true,
    },
    lead_time: {
      type: String,
      required: true,
      trim: true,
    },
    systemTags: [
      {
        system_id: { _id: false, type: mongoose.Schema.ObjectId },
      }
    ],
    files: [
      {
        link: {
          type: String,
          trim: true,
        },
        name: {
          type: String,
          trim: true,
        },
        date: {
          type: String,
          trim: true,
        },
        revision: {
          type: Number,
          trim: true,
        },
        type: {
          type: String,
          trim: true,
        },
      },
    ],
    stock_detail: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock_model",
        // required: true,
      },
    ],
    loose_stock_Detail: {
      type: mongoose.Schema.ObjectId,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Accessories_Input_Model = mongoose.model(
  "Accessories_Input_Model",
  input_schema
);

module.exports = Accessories_Input_Model;
