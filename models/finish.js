const mongoose = require("mongoose");

const finish_schema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  code: {
    type: String,
    trim: true,
    required: true,
  },
  description: {
    type: String,
    trim: true,
    required: true,
  },
  color: [
    {
      name: {
        type: String,
        trim: true,
      },
    },
  ],
  is_delete: {
    type: Boolean,
    default: false,
  },
});

const Finish = mongoose.model("finish", finish_schema);

module.exports = Finish;
