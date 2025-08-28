const AccessoriesCalculator = require("../models/accessories_calculator_model");
const Profile_Calculator = require("../models/profile_non_insulated_calc_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");
const Kit_Input = require("../models/kit_model");
const Profile_Insulated_Calculator = require("../models/profile_insulated_calc_model");
const Kit_Calculator = require("../models/Kit_Calc_Model");
const Stock_model = require("../models/stock_model");

const get_combined_price_list = async (req, res) => {
  try {
    const accessory_pl = await AccessoriesCalculator.aggregate([
      {
        $match: {},
      },
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "input_model_id",
          foreignField: "_id",
          as: "input_detail",
        },
      },
      {
        $project: {
          _id: 1,
          code: "$input_detail.code",
          description: "$input_detail.description",
          image: "$input_detail.image",
          origin_cost: "$oc",
          landing_cost: 1,
          selling_price: 1,
          input_model_id: 1,
          price_list_1: "$priceList1",
          price_list_2: "$priceList2",
          price_list_3: "$priceList3",
          price_list_4: "$priceList4",
          type: "Accessory",
          unit: "LM",
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ]);
    const non_insulated_pl = await Profile_Calculator.aggregate([
      {
        $match: {},
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "input_model_id",
          foreignField: "_id",
          as: "input_detail",
        },
      },
      {
        $project: {
          _id: 1,
          code: "$input_detail.code",
          description: "$input_detail.description",
          image: "$input_detail.image",
          origin_cost: 1,
          landing_cost: "$origin_cost",
          selling_price: "$final_selling_price",
          input_model_id: 1,
          price_list_1: 1,
          price_list_2: 1,
          price_list_3: 1,
          price_list_4: 1,
          type: "Non-Insulated Profile",
          unit: "Kg",
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ]);
    const insulated_pl = await Profile_Insulated_Calculator.aggregate([
      {
        $match: {},
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "input_model_id",
          foreignField: "_id",
          as: "input_detail",
        },
      },
      {
        $project: {
          _id: 1,
          code: "$input_detail.code",
          description: "$input_detail.description",
          image: "$input_detail.image",
          origin_cost: 1,
          landing_cost: 1,
          selling_price: 1,
          input_model_id: 1,
          price_list_1: 1,
          price_list_2: 1,
          price_list_3: 1,
          price_list_4: 1,
          type: "Insulated Profile",
          unit: "LM",
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ]);
    const Kit_pl = await Kit_Calculator.aggregate([
      {
        $match: {},
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "input_model_id",
          foreignField: "_id",
          as: "input_detail",
        },
      },
      {
        $project: {
          _id: 1,
          code: "$input_detail.code",
          description: "$input_detail.description",
          image: "$input_detail.image",
          origin_cost: 1,
          landing_cost: 1,
          selling_price: 1,
          input_model_id: 1,
          price_list_1: 1,
          price_list_2: 1,
          price_list_3: 1,
          price_list_4: 1,
          type: "Kit",
          unit: "Pcs",
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ]);
    return res.status(200).json([
      { name: "accessory_pl", data: accessory_pl },
      { name: "non_insulated_pl", data: non_insulated_pl },
      { name: "insulated_pl", data: insulated_pl },
      { name: "kit_pl", data: Kit_pl },
    ]);
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};
const get_combined_package_price_list = async (req, res) => {
  try {
    const stock = await Stock_model.aggregate([
      {
        $lookup: {
          from: "accessories_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "accessory_details",
        },
      },
      {
        $lookup: {
          from: "profile_input_models",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ni_details",
        },
      },
      {
        $lookup: {
          from: "profile_insulated_inputs",
          localField: "reference_code_id",
          foreignField: "_id",
          as: "ins_details",
        },
      },
      {
        $lookup: {
          from: "kit_inputs",
          localField: "reference_code_id",
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
        $project: {
          _id: 1,
          code: "$packing_code",
          packing_description: 1,
          reference_code: "$entry_details.code",
          reference_code_id: 1,
          image: 1,
          origin_cost: 1,
          landing_cost: 1,
          selling_price: 1,

          price_list_1: "$priceList1",
          price_list_2: "$priceList2",
          price_list_3: "$priceList3",
          price_list_4: "$priceList4",
          category: 1,
        },
      },
      {
        $sort: {
          code: 1,
        },
      },
    ]);
    const categorizedData = stock.reduce(
      (acc, itm) => {
        if (itm.category === "Accessory") {
          acc.accessory.push(itm);
        } else if (itm.category === "Non-Insulated Profile") {
          acc.nonInsulated.push(itm);
        } else if (itm.category === "Insulated Profile") {
          acc.insulated.push(itm);
        } else if (itm.category === "Kit") {
          acc.kit.push(itm);
        }
        return acc;
      },
      {
        accessory: [],
        nonInsulated: [],
        insulated: [],
        kit: [],
      }
    );

    return res.status(200).json([
      { name: "accessory_pl", data: categorizedData.accessory },
      { name: "non_insulated_pl", data: categorizedData.nonInsulated },
      { name: "insulated_pl", data: categorizedData.insulated },
      { name: "kit_pl", data: categorizedData.kit },
    ]);
  } catch (error) {
    console.log(error);
    res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = { get_combined_price_list, get_combined_package_price_list };
