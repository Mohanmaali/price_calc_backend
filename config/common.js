const crypto = require("crypto")
const { default: mongoose } = require("mongoose");
const Loose_Stock_model = require("../models/loose_stock_model");
const Profile_System_Model = require("../models/profile_system_model");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const Currency_model = require("../models/currency_model");
const Accessories_Input_Model = require("../models/accessories_input_model");
const Raw_Material_Model = require("../models/raw_material_model");
const Operations_Model = require("../models/extrusion_model");
const Profile_Input_Model = require("../models/profile_input_model");
const { Profile_Insulated_Input } = require("../models/profile_insulated_input");

const roundNum = (num, decimalDigit = 2) => {
  let number = Math.round(num * 100) / 100;
  return number;
};

function checkInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && !isNaN(num);
}

async function getRecalcHash() {
  const [systems, suppliers, currencies, accessoryInputs, rawMaterial, operations, profileInput,] = await Promise.all([
    Profile_System_Model.find({}).lean(),
    Accessories_Supplier_Model.find({}).lean(),
    Currency_model.find({}).lean(),
    Accessories_Input_Model.find({}).lean(),
    Raw_Material_Model.find({}).lean(),
    Operations_Model.find({}).lean(),
    Profile_Input_Model.find({}).lean(),
    Profile_Insulated_Input.find({}).lean()
  ]);

  const json = JSON.stringify({ systems, suppliers, currencies, accessoryInputs, rawMaterial, operations, profileInput });
  return crypto.createHash("sha256").update(json).digest("hex");
}

const LooseStockPopulate = async (id) => {
  const result = await Loose_Stock_model.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: "accessories_input_models",
        localField: "code_id",
        foreignField: "_id",
        as: "accessory_details",
      },
    },
    {
      $lookup: {
        from: "profile_input_models",
        localField: "code_id",
        foreignField: "_id",
        as: "ni_details",
      },
    },
    {
      $lookup: {
        from: "profile_insulated_inputs",
        localField: "code_id",
        foreignField: "_id",
        as: "ins_details",
      },
    },
    {
      $lookup: {
        from: "kit_inputs",
        localField: "code_id",
        foreignField: "_id",
        as: "kit_details",
      },
    },
    {
      $addFields: {
        entry_details: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$category", "Accessory"] },
                then: { $arrayElemAt: ["$accessory_details", 0] },
              },
              {
                case: { $eq: ["$category", "Non-Insulated Profile"] },
                then: { $arrayElemAt: ["$ni_details", 0] },
              },
              {
                case: { $eq: ["$category", "Insulated Profile"] },
                then: { $arrayElemAt: ["$ins_details", 0] },
              },
              {
                case: { $eq: ["$category", "Kit"] },
                then: { $arrayElemAt: ["$kit_details", 0] },
              },
            ],
            default: null,
          },
        },
      },
    },
    {
      $unset: [
        "accessory_details",
        "ni_details",
        "ins_details",
        "kit_details",
        "latest_eta",
      ],
    },
  ]);
  return result;
};

module.exports = { roundNum, LooseStockPopulate, checkInteger, getRecalcHash };
