const mongoose = require("mongoose");

const profile_calculator_schema = new mongoose.Schema(
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
    // weight: {
    //   type: Number,
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
    // material: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // alloy: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    product_cost: {
      type: Number,
    },
    origin_cost: {
      type: Number,
    },
    landing_cost: {
      type: Number,
    },
    final_cost: {
      type: Number,
    },
    final_selling_price: {
      type: Number,
    },
    final_selling_price_lm: {
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

const Profile_Calculator = mongoose.model(
  "Profile_Calculator",
  profile_calculator_schema
);

module.exports = Profile_Calculator;
