const mongoose = require("mongoose");

const material_schema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  group: [
    {
      group_id: {
        type: mongoose.Schema.ObjectId,
      },
      subgroup: [
        {
          subgroup_id: {
            type: mongoose.Schema.ObjectId,
          },
        },
      ],
    },
  ],
  grade: [
    {
      name: {
        type: String,
        trim: true,
      },
    },
  ],
  finish: [
    {
      finish_id: {
        type: mongoose.Schema.ObjectId,
      },
      color: [
        {
          color_id: {
            type: mongoose.Schema.ObjectId,
          },
        },
      ],
    },
  ],
});

const Materials = mongoose.model("material", material_schema);

module.exports = Materials;
