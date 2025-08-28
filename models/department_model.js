const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    tabs: [
      {
        name: { type: String, trim: true },
        visibility: { type: Boolean, trim: false },
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        type: { type: String, enum: ["Setting", "Module"], default: "Setting" }
      },
    ],
    image: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;
