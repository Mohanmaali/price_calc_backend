const mongoose = require("mongoose");

const PriceCalcMetaSchema = new mongoose.Schema({
    hash: String,
    // type: { type: String, enum: ["Accessory", "Non-Insulated Profile", "Insulated Profile", "Kit"] }, // optional: e.g. "accessories", "systems"
}, { timestamps: true });

const PriceCalcMeta = mongoose.model("PriceCalcMeta", PriceCalcMetaSchema);

module.exports = PriceCalcMeta
