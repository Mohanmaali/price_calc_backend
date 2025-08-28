const mongoose = require("mongoose");

const color_schema = new mongoose.Schema({
  color: {
    type: String,
    trim: true,
    required: true,
  },
});

const Color = mongoose.model("color", color_schema);

module.exports = Color;
