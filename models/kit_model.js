const mongoose = require("mongoose");

const parts_schema = new mongoose.Schema(
  {
    // code: {
    //   type: String,
    //   default: "-",
    //   trim: true,
    // },
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

const Kit_Input_Schema = new mongoose.Schema(
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
      trim: true,
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
    group_id: {
      type: mongoose.Types.ObjectId,
      trim: true,
    },
    subgroup_id: {
      type: mongoose.Types.ObjectId,
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
      default: "Pcs",
    },
    non_insulated_aluminium_profile: [parts_schema],
    insulated_aluminium_profile: [parts_schema],
    accessories: [parts_schema],
    operation: [parts_schema],
    kit: [parts_schema],
    // origin_cost: {
    //   type: Number,
    // },
    // landing_cost: {
    //   type: Number,
    // },
    // selling_price: {
    //   type: Number,
    // },
    // total_cost: {
    //   type: Number,
    //   trim: true,
    //   required: true,
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

const Kit_Input = mongoose.model("Kit_Input", Kit_Input_Schema);

module.exports = Kit_Input;
