const mongoose = require("mongoose");

const actions_schema = new mongoose.Schema(
  {
    // code: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    code_id: {
      type: mongoose.Schema.ObjectId,
      trim: true,
      unique: true,
    },
    // reference_code: {
    //   type: String,
    //   trim: true,
    // },
    ref_code_id: {
      type: mongoose.Schema.ObjectId,
      trim: true,
    },
    order_type: {
      type: String,
      trim: true,
      default: "Package",
    },
    category: {
      type: String,
      trim: true,
    },
    inquiryId: [{
      type: mongoose.Schema.ObjectId,
      ref: "Inquiry_Model"
    }],
    purchaseOrderId: [{
      type: mongoose.Schema.ObjectId,
      ref: "Purchase_Model"
    }],
    // supplier: {
    //   type: String,
    //   trim: true,
    // },
    read: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Action_model = mongoose.model("Action_model", actions_schema);

module.exports = Action_model;
