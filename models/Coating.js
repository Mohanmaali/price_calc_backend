const mongoose = require("mongoose");

const product_detail_schema = new mongoose.Schema({
  supplier: {
    type: String,
    required: true,
    trim: true,
  },
  product: [
    {
      product_desc: {
        type: String,
        required: true,
      },
      product_code: {
        type: String,
        required: true,
      },
      color_desc: {
        type: String,
        required: true,
      },
      color_code: {
        type: String,
        required: true,
      },
      color_thickness: {
        type: String,
        required: true,
      },
      color_specs: {
        type: String,
        required: true,
      },
    },
  ],
});

const coating_schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    product_detail: [product_detail_schema],
  },
  {
    timestamps: true,
  }
);

const Coating = mongoose.model("Coating", coating_schema);

module.exports = Coating;
