const mongoose = require("mongoose");

const profile_insulated_calculator_schema = new mongoose.Schema(
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
    // system: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // description: {
    //   type: String,
    //   trim: true,
    // },
    origin_cost: {
      type: Number,
    },
    landing_cost: {
      type: Number,
    },
    selling_price: {
      type: Number,
    },
    total_cost: {
      type: Number,
    },
    price_list_1: {
      type: Number,
    },
    price_list_2: {
      type: Number,
    },
    price_list_3: {
      type: Number,
    },
    price_list_4: {
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

const Profile_Insulated_Calculator = mongoose.model(
  "Profile_Insulated_Calculator",
  profile_insulated_calculator_schema
);

module.exports = Profile_Insulated_Calculator;
