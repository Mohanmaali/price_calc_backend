const mongoose = require("mongoose");

const pdf_fields_Schema = new mongoose.Schema({
  reference_code_rev: {
    type: String,
    trim: true,
    required: true,
  },
  form_rev_date: {
    type: String,
    trim: true,
    required: true,
  },
});

const PDF_Fields = mongoose.model("pdf_fields", pdf_fields_Schema);

module.exports = PDF_Fields;
