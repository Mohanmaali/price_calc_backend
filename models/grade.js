const mongoose = require("mongoose");

const grade_schema = new mongoose.Schema({
  grade: {
    type: String,
    trim: true,
    required: true,
  },
});

const Grade = mongoose.model("grade", grade_schema);

module.exports = Grade;
