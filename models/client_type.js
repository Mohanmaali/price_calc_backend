const mongoose = require("mongoose");

const clientType_schema = new mongoose.Schema(
  {
    clienttype: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Client_Type = mongoose.model("Client_Type", clientType_schema);

module.exports = Client_Type;
