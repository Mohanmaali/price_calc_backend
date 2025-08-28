const Accessories_Input_Model = require("../models/accessories_input_model");
const Kit_Input = require("../models/kit_model");
const Log_Model = require("../models/log");
const Profile_Input_Model = require("../models/profile_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");

const get_logs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await Log_Model.find({ stock_id: id });
    let entryDetails = {};
    if (logs[0].category == "Accessory") {
      entryDetails = await Accessories_Input_Model.findById(
        logs[0].ref_code_id
      );
    } else if (logs[0].category == "Non-Inulated Profile") {
      entryDetails = await Profile_Input_Model.findById(logs[0].ref_code_id);
    } else if (logs[0].category == "Inulated Profile") {
      entryDetails = await Profile_Insulated_Input.findById(
        logs[0].ref_code_id
      );
    } else if (logs[0].category == "Kit") {
      entryDetails = await Kit_Input.findById(logs[0].ref_code_id);
    }
    return res.status(200).json({ logs, entryDetails });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const getOpenLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await Log_Model.find({
      stock_id: id,
      updateType: "Open",
    }).populate({ path: "updatedBy", model: "User_model" });
    return res.status(200).json({ logs: logs });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = { get_logs, getOpenLogs };
