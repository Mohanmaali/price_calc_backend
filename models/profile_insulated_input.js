const mongoose = require("mongoose");

const parts_schema = new mongoose.Schema(
  {
    code_id: {
      type: mongoose.SchemaTypes.Mixed,
      trim: true,
    },
    code_pl_id: {
      type: mongoose.SchemaTypes.Mixed,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
      trim: true,
    },
    // weight: {
    //   type: Number,
    //   default: 0,
    //   trim: true,
    // },
    // unit_cost: {
    //   type: Number,
    //   default: 0,
    //   trim: true,
    // },
    // total_cost: {
    //   type: Number,
    //   default: 0,
    //   trim: true,
    // },
    // origin_cost: {
    //   type: Number,
    //   default: 0,
    // },
    // landing_cost: {
    //   type: Number,
    //   default: 0,
    // },
    // selling_price: {
    //   type: Number,
    //   default: 0,
    // },
  },
  {
    timestamps: true,
  }
);
parts_schema.pre("save", function (next) {
  if (this.code_id && mongoose.Types.ObjectId.isValid(this.code_id)) {
    // console.log(`Converting code_id: ${this.code_id} to ObjectId`); // Log conversion
    this.code_id = new mongoose.Types.ObjectId(this.code_id);
  } else if (this.code_id === "") {
    this.code_id = "";
  }

  if (this.code_pl_id && mongoose.Types.ObjectId.isValid(this.code_pl_id)) {
    // console.log(`Converting code_pl_id: ${this.code_pl_id} to ObjectId`); // Log conversion
    this.code_pl_id = new mongoose.Types.ObjectId(this.code_pl_id);
  } else if (this.code_pl_id === "") {
    this.code_pl_id = "";
  }

  next();
});

const profile_calculator_schema = new mongoose.Schema(
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
    crimping: {
      type: Number,
      trim: true,
      required: true,
    },
    crimping_id: {
      type: mongoose.Types.ObjectId,
      trim: true,
      required: true,
    },
    // supplier: {
    //   type: String,
    //   trim: true,
    // },
    // supplier_code: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    supplier_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    supplier_item_code: {
      type: String,
      required: true,
      trim: true,
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
      trim: true,
      default: "LM",
    },
    rd: {
      type: Number,
      required: true,
      trim: true,
    },
    supersystem_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    system_id: {
      type: mongoose.Types.ObjectId,
      trim: true,
    },
    subsystem_id: {
      type: mongoose.Types.ObjectId,
      trim: true,
    },
    systemTags: [
      {
        system_id: { _id: false, type: mongoose.Schema.ObjectId },
      }
    ],
    description: {
      type: String,
      trim: true,
    },
    polyamide: [parts_schema],
    aluminium: [parts_schema],
    // total_cost: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // total_weight: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // origin_cost: {
    //   type: Number,
    // },
    // landing_cost: {
    //   type: Number,
    // },
    // selling_price: {
    //   type: Number,
    // },
    stock_detail: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stock_model",
      },
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
          type: Date,
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
  },
  {
    timestamps: true,
  }
);

const Profile_Insulated_Input = mongoose.model(
  "Profile_Insulated_Input",
  profile_calculator_schema
);

module.exports = { Profile_Insulated_Input };
