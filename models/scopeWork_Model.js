const mongoose = require("mongoose");

const ScopeWork_schema = new mongoose.Schema(
  {
    scope_of_work: {
      type: String,
      required: true,
      trim: true,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Team",
      // required: true
    },
    order: {
      type:Number,
      required:true
    }
  },
  {
    timestamps: true,
  }
);

const Scope_Work = mongoose.model("Scope_Work", ScopeWork_schema);

module.exports = Scope_Work;
