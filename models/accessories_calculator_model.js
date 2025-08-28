const mongoose = require("mongoose");

const accessories_calculator_schema = new mongoose.Schema(
  {
    // code: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    input_model_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
      trim: true,
    },
    // image: {
    //   type: String,
    //   trim: true,
    // },
    // description: {
    //   type: String,
    //   trim: true,
    // },
    // weight: {
    //   type: Number,
    //   trim: true,
    // },
    // supplier: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // system: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    oc: {
      type: Number,
      required: true,
      trim: true,
    },
    landing_cost: {
      type: Number,
      required: true,
      trim: true,
    },
    final_cost: {
      type: Number,
      required: true,
      trim: true,
    },
    // profit: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    selling_price: {
      type: Number,
      required: true,
      trim: true,
    },
    priceList1: {
      type: Number,
    },
    priceList2: {
      type: Number,
    },
    priceList3: {
      type: Number,
    },
    priceList4: {
      type: Number,
    },
    // files: [
    //   {
    //     link: {
    //       type: String,
    //       trim: true,
    //     },
    //     name: {
    //       type: String,
    //       trim: true,
    //     },
    //     date: {
    //       type: Date,
    //       trim: true,
    //     },
    //     revision: {
    //       type: Number,
    //       trim: true,
    //     },
    //     type: {
    //       type: String,
    //       trim: true,
    //     },
    //   },
    // ],
  },
  {
    timestamps: true,
  }
);

const AccessoriesCalculator = mongoose.model(
  "accessories_calculator",
  accessories_calculator_schema
);

module.exports = AccessoriesCalculator;
