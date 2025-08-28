const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  path: {
    type: String,
    required: true,
    trim: true,
  },
});

const inquiry_schema = new mongoose.Schema(
  {
    recepients: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    files: [fileSchema],
  },
  {
    timestamps: true,
  }
);

const Sent_Inquiry_Model = mongoose.model("Sent_Inquiry_Model", inquiry_schema);

module.exports = Sent_Inquiry_Model;
