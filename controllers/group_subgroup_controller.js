const { default: mongoose } = require("mongoose");
const Accessories_Input_Model = require("../models/accessories_input_model");
const Group_Subgroup = require("../models/group_subgroup");
const Kit_Input = require("../models/kit_model");
const Materials = require("../models/material");
const Profile_Input_Model = require("../models/profile_input_model");
const {
  Profile_Insulated_Input,
} = require("../models/profile_insulated_input");

const add_group = async (req, res) => {
  try {
    const { group, subGroups, show_in } = req.body;
    // const subgroup_Arr = await subGroups.map((itm) => {
    //   return itm.name;
    // });
    // const check_group = await Group_Subgroup.findOne({
    //   $or: [
    //     {
    //       group: group,
    //     },
    //     {
    //       subgroup: {
    //         $in: subgroup_Arr,
    //       },
    //     },
    //   ],
    //    ,
    // });
    // const check_group = await Group_Subgroup.findOne({ group });
    // if (check_group) {
    //   return res
    //     .status(400)
    //     .json({ mssg: "Group or Subgroup Already Exists with this Name" });
    // }
    if (show_in.length == 0) {
      return res
        .status(400)
        .json({ mssg: "Please select atleast an option for Show in" });
    }
    const add_entry = await Group_Subgroup.create({
      name: group,
      subgroup: subGroups,
      show_in: show_in,
    });
    return res.status(200).json({ mssg: "Group Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_groups = async (req, res) => {
  try {
    let { search, page, filter } = req.query;
    let searchRegex = { $regex: new RegExp(".*" + search + ".*", "i") };
    const limit = 10;
    const pageNumber = parseFloat(page) || 1;
    const skip = (pageNumber - 1) * limit;
    let and = [{}];
    let where = {
      $or: [{ name: searchRegex }, { subgroup: { $elemMatch: searchRegex } }],
      $and: and,
    };
    const result = await Group_Subgroup.aggregate([
      // {
      //   $limit: limit,
      // },
      // {
      //   $skip: skip,
      // },
      {
        $match: where,
      },
      {
        $addFields: {
          subgroup: {
            $sortArray: { input: "$subgroup", sortBy: 1 },
          },
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);
    const totalCount = await Group_Subgroup.countDocuments(where);
    const currentPage = pageNumber;
    const total_page = Math.ceil(totalCount / limit);
    return res
      .status(200)
      .json({ result, currentPage, total_page, totalCount, limit });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const get_single_group = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group_Subgroup.findById(id);
    return res.status(200).json(group);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const update_group = async (req, res) => {
  try {
    const { id } = req.params;
    const { group, subGroups, show_in } = req.body;
    // const subgroup_Arr = await subGroups.map((itm) => {
    //   return itm.name;
    // });
    if (show_in.length == 0) {
      return res
        .status(400)
        .json({ mssg: "Please select atleast an option for Show in" });
    }
    const add_entry = await Group_Subgroup.findByIdAndUpdate(id, {
      name: group,
      subgroup: subGroups,
      show_in: show_in,
    });
    return res.status(200).json({ mssg: "Group Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const getCoatingsfromGroup = async (req, res) => {
  try {
    const group = await Group_Subgroup.find({ group: "Coating" });
    return res.status(200).json(group);
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const group_subgroup_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const acc_ni_pipeline = [
      {
        $match: { group_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          code: "$code",
        },
      },
    ];
    const in_kit_pipeline = [
      {
        $match: { group_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          code: 1,
        },
      },
    ];
    const accessory_group = await Accessories_Input_Model.aggregate(
      acc_ni_pipeline
    );
    const profile_group = await Profile_Input_Model.aggregate(acc_ni_pipeline);
    const profile_ins_group = await Profile_Insulated_Input.aggregate(
      in_kit_pipeline
    );
    const kit_group = await Kit_Input.aggregate(in_kit_pipeline);
    const material_group = await Materials.aggregate([
      {
        $unwind: {
          path: "$group",
        },
      },
      {
        $match: {
          "group.group_id": new mongoose.Types.ObjectId(id),
        },
      },
      // {
      //   $group: {
      //     _id: "$_id",
      //     group: { $push: "$$ROOT" },
      //   },
      // },
      {
        $project: {
          name: 1,
        },
      },
    ]);

    return res.status(200).json({
      accessory_group,
      profile_group,
      profile_ins_group,
      kit_group,
      material_group,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

const delete_group = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteGroup = await Group_Subgroup.findByIdAndDelete(id);
    return res.status(204).json({ mssg: "Deleted Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({mssg: error?.message || 'Internal server error'})
  }
};

module.exports = {
  add_group,
  get_groups,
  get_single_group,
  update_group,
  getCoatingsfromGroup,
  group_subgroup_assigned_to,
  delete_group,
};
