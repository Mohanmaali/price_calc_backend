const mongoose = require("mongoose");

const notification_schema = new mongoose.Schema(
  {
    lpo_code: {
      type: String,
      required: true,
      trim: true,
    },
    lpo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase_Model",
    },
    order_type: {
      type: String,
      trim: true,
      default: "Package",
    },
    supplier: {
      type: String,
      trim: true,
    },
    part_code: {
      type: String,
      required: true,
      trim: true,
    },
    code_id: {
      type: mongoose.Schema.ObjectId,
      required: true,
    },
    eta: {
      type: Date,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      required: true,
      default: false,
    },
    update: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notification_model = mongoose.model(
  "Notification_model",
  notification_schema
);

module.exports = Notification_model;
