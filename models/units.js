const mongoose = require("mongoose");

const unit_detail_schema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  units: [
    {
      measure: {
        type: String,
        trim: true,
        required: true,
      },
      code: {
        type: String,
        trim: true,
        required: true,
      },
      remark: {
        type: String,
        trim: true,
      },
      // conversion: {
      //   type: Number,
      //   trim: true,
      // },
    },
  ],
});

const unitSchema = new mongoose.Schema({
  unit_name: {
    type: String,
    trim: true,
    required: true,
  },
  unit_detail: [unit_detail_schema],
});

const Units = mongoose.model("Units", unitSchema);

module.exports = Units;
