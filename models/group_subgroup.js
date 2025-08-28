const mongoose = require("mongoose");

const group_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subgroup: [
      {
        name: { type: String, trim: true },
      },
    ],
    show_in: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Group_Subgroup = mongoose.model("Group_Subgroup", group_schema);

module.exports = Group_Subgroup;
