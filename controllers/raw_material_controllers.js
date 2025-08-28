const Raw_Material_Model = require("../models/raw_material_model");
const Currency_model = require("../models/currency_model");
const Profile_Input_Model = require("../models/profile_input_model");
const Materials = require("../models/material");
const Grade = require("../models/grade");
const Color = require("../models/color");
const Finish = require("../models/finish");
const Accessories_Supplier_Model = require("../models/accessories_supplier_model");
const { default: mongoose } = require("mongoose");

const add_raw_material = async (req, res) => {
  try {
    const { material } = req.body.raw_material_form;
    const { alloy, temper, grade } = req.body;
    const fluctuation = parseFloat(req.body.raw_material_form.fluctuation);
    const cost = parseFloat(req.body.raw_material_form.cost);
    const currency_id = req.body.currency_id;
    const finish = req.body.finish;
    if (
      !material ||
      fluctuation === null ||
      isNaN(fluctuation) ||
      cost === null ||
      isNaN(cost) ||
      !currency_id
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const if_material = await Raw_Material_Model.findOne({
      material,
    });
    if (if_material) {
      return res
        .status(400)
        .json({ mssg: "Entry Already Exists with this name" });
    }
    const currency = await Currency_model.findById(currency_id);
    const fluctuation_calc = (fluctuation / 100) * cost;
    const currency_val = currency.cost_usd_per_kg_plus_fluctuation;
    const final_cost = currency_val * (fluctuation_calc + cost);
    const new_material = await Raw_Material_Model.create({
      name: material,
      fluctuation,
      cost,
      currency_id,
      cost_aed_per_kg: final_cost,
      alloy,
      temper,
      grade,
      finish,
    });
    return res.status(200).json({ mssg: "Raw Material Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const get_all_raw_material = async (req, res) => {
  try {
    // const all_material = await Raw_Material_Model.find({   });
    const all_material = await Raw_Material_Model.aggregate([
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "currency",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish.finish_id",
          foreignField: "_id",
          as: "finishDetail",
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    color: {
                      $filter: {
                        input: "$$detail.color",
                        as: "color",
                        cond: {
                          $in: [
                            "$$color._id",
                            {
                              $reduce: {
                                input: "$finish",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.finish_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.color",
                                            as: "c",
                                            in: "$$c.color_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "finish",
              in: {
                finish_id: "$$finish._id",
                name: "$$finish.name",
                code: "$$finish.code",
                description: "$$finish.description",
                is_delete: "$$finish.is_delete",
                __v: "$$finish.__v",
                color: {
                  $map: {
                    input: "$$finish.color",
                    as: "color",
                    in: {
                      color_id: "$$color._id",
                      name: "$$color.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    ]);
    return res.status(200).json(all_material);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const get_single_raw_material = async (req, res) => {
  try {
    const id = req.params.id;
    const raw_material = await Raw_Material_Model.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "currency_id",
          foreignField: "_id",
          as: "currency",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish.finish_id",
          foreignField: "_id",
          as: "finishDetail",
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    color: {
                      $filter: {
                        input: "$$detail.color",
                        as: "color",
                        cond: {
                          $in: [
                            "$$color._id",
                            {
                              $reduce: {
                                input: "$finish",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.finish_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.color",
                                            as: "c",
                                            in: "$$c.color_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "finish",
              in: {
                finish_id: "$$finish._id",
                name: "$$finish.name",
                code: "$$finish.code",
                description: "$$finish.description",
                is_delete: "$$finish.is_delete",
                __v: "$$finish.__v",
                color: {
                  $map: {
                    input: "$$finish.color",
                    as: "color",
                    in: {
                      color_id: "$$color._id",
                      name: "$$color.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({ rawMaterial: raw_material[0] });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const update_raw_material = async (req, res) => {
  try {
    const id = req.params.id;
    const { material } = req.body.raw_material_form;
    const { alloy, temper, grade } = req.body;
    const fluctuation = parseFloat(req.body.raw_material_form.fluctuation);
    const cost = parseFloat(req.body.raw_material_form.cost);
    const currency_id = req.body.currency_id;
    const finish = req.body.finish;
    if (
      !material ||
      fluctuation === null ||
      isNaN(fluctuation) ||
      cost === null ||
      isNaN(cost) ||
      !currency_id
    ) {
      return res.status(400).json({ mssg: "All Fields Are Mandatory" });
    }
    const currency = await Currency_model.findById(currency_id);
    const fluctuation_calc = (fluctuation / 100) * cost;
    const currency_val = currency.cost_usd_per_kg_plus_fluctuation;
    const final_cost = currency_val * (fluctuation_calc + cost);
    // const final_cost =
    //   cost * currency.cost_usd_per_kg_plus_fluctuation +
    //   fluctuation_calc * currency.cost_usd_per_kg_plus_fluctuation;
    // const final_cost =
    //   cost * currency.cost_usd_per_kg_plus_fluctuation +
    //   (5 / 100) * cost * currency.cost_usd_per_kg_plus_fluctuation;
    const updated_material = await Raw_Material_Model.findByIdAndUpdate(id, {
      name: material,
      fluctuation,
      cost,
      currency_id,
      cost_aed_per_kg: final_cost,
      alloy,
      temper,
      grade,
      finish,
    });
    return res.status(200).json({ mssg: "Raw Material Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const delete_raw_material = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted_material = await Raw_Material_Model.findByIdAndDelete(id);
    // console.log(cost_usd_per_kg,fluctuation,cost_with_fluctuation)
    return res.status(200).json({ mssg: "Material Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const raw_material_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const non_insulated_material = await Profile_Input_Model.aggregate([
      {
        $match: { material_id: new mongoose.Types.ObjectId(id) },
      },
      {
        $project: {
          code: 1,
        },
      },
    ]);
    return res.status(200).json({
      non_insulated_material,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const getAlloysForOperartion = async (req, res) => {
  try {
    const alloys = await Raw_Material_Model.aggregate([
      {
        $unwind: {
          path: "$alloy",
        },
      },
      {
        $match: {
          "alloy.name": { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$alloy._id",
          name: { $first: "$alloy.name" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
        },
      },
    ]);
    return res.status(200).json(alloys);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

//Material Controllers
const add_material = async (req, res) => {
  try {
    const allData = req.body;
    const { material, group, grade, finish } = allData;
    if (
      !material ||
      group.filter((a) => {
        return a.name == "" || a.subgroup == [];
      }).length
    ) {
      return res.status(400).json({
        mssg: "Material and atleast a Group and Subgroup is required.",
      });
    }
    const new_material = await Materials.create({
      name: material,
      group,
      grade,
      finish,
    });
    return res.status(200).json({ mssg: "New Material Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_single_material = async (req, res) => {
  try {
    const { id } = req.params;
    // const material = await Materials.findById(id);
    const material = await Materials.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group.group_id",
          foreignField: "_id",
          as: "groupDetail",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish.finish_id",
          foreignField: "_id",
          as: "finishDetail",
        },
      },
      {
        $addFields: {
          groupDetail: {
            $map: {
              input: "$groupDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    subgroup: {
                      $filter: {
                        input: "$$detail.subgroup",
                        as: "subgroup",
                        cond: {
                          $in: [
                            "$$subgroup._id",
                            {
                              $reduce: {
                                input: "$group",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.group_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.subgroup",
                                            as: "c",
                                            in: "$$c.subgroup_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          groupDetail: {
            $map: {
              input: "$groupDetail",
              as: "group",
              in: {
                group_id: "$$group._id",
                name: "$$group.name",
                __v: "$$group.__v",
                subgroup: {
                  $map: {
                    input: "$$group.subgroup",
                    as: "subgroup",
                    in: {
                      subgroup_id: "$$subgroup._id",
                      name: "$$subgroup.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    color: {
                      $filter: {
                        input: "$$detail.color",
                        as: "color",
                        cond: {
                          $in: [
                            "$$color._id",
                            {
                              $reduce: {
                                input: "$finish",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.finish_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.color",
                                            as: "c",
                                            in: "$$c.color_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "finish",
              in: {
                finish_id: "$$finish._id",
                name: "$$finish.name",
                code: "$$finish.code",
                description: "$$finish.description",
                is_delete: "$$finish.is_delete",
                __v: "$$finish.__v",
                color: {
                  $map: {
                    input: "$$finish.color",
                    as: "color",
                    in: {
                      color_id: "$$color._id",
                      name: "$$color.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);
    return res.status(200).json(material[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_all_material = async (req, res) => {
  try {
    const materials = await Materials.aggregate([
      {
        $lookup: {
          from: "group_subgroups",
          localField: "group.group_id",
          foreignField: "_id",
          as: "groupDetail",
        },
      },
      {
        $lookup: {
          from: "finishes",
          localField: "finish.finish_id",
          foreignField: "_id",
          as: "finishDetail",
        },
      },
      {
        $addFields: {
          groupDetail: {
            $map: {
              input: "$groupDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    subgroup: {
                      $filter: {
                        input: "$$detail.subgroup",
                        as: "subgroup",
                        cond: {
                          $in: [
                            "$$subgroup._id",
                            {
                              $reduce: {
                                input: "$group",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.group_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.subgroup",
                                            as: "c",
                                            in: "$$c.subgroup_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          group: {
            $map: {
              input: "$groupDetail",
              as: "group",
              in: {
                group_id: "$$group._id",
                name: "$$group.name",
                __v: "$$group.__v",
                subgroup: {
                  $map: {
                    input: "$$group.subgroup",
                    as: "subgroup",
                    in: {
                      subgroup_id: "$$subgroup._id",
                      name: "$$subgroup.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          finishDetail: {
            $map: {
              input: "$finishDetail",
              as: "detail",
              in: {
                $mergeObjects: [
                  "$$detail",
                  {
                    color: {
                      $filter: {
                        input: "$$detail.color",
                        as: "color",
                        cond: {
                          $in: [
                            "$$color._id",
                            {
                              $reduce: {
                                input: "$finish",
                                initialValue: [],
                                in: {
                                  $concatArrays: [
                                    "$$value",
                                    {
                                      $cond: [
                                        {
                                          $eq: [
                                            "$$this.finish_id",
                                            "$$detail._id",
                                          ],
                                        },
                                        {
                                          $map: {
                                            input: "$$this.color",
                                            as: "c",
                                            in: "$$c.color_id",
                                          },
                                        },
                                        [],
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          finish: {
            $map: {
              input: "$finishDetail",
              as: "finish",
              in: {
                finish_id: "$$finish._id",
                name: "$$finish.name",
                code: "$$finish.code",
                description: "$$finish.description",
                is_delete: "$$finish.is_delete",
                __v: "$$finish.__v",
                color: {
                  $map: {
                    input: "$$finish.color",
                    as: "color",
                    in: {
                      color_id: "$$color._id",
                      name: "$$color.name",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          groupDetail: 0,
          finishDetail: 0,
        },
      },
    ]);
    return res.status(200).json(materials);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const flattenMaterialData = (materials) => {
  return materials.map((item) => {
    const groupNames = item.group.map((group) => group.name);

    // const subgroupNames = item.group
    //   .flatMap((group) => group.subgroup)
    //   .map((subgroup) => subgroup.name);

    const gradeNames = item.grade.map((grade) => grade.name);

    const finishNames = item.finish.map((finish) => finish.name);

    // const finishColors = item.finish
    //   .flatMap((finish) => finish.color)
    //   .map((color) => color.name);

    return {
      material: item.material || "",
      group: groupNames || [],
      // subgroups: subgroupNames,
      grade: gradeNames || [],
      finish: finishNames || [],
      // finishColors: finishColors,
    };
  });
};

const get_excel_material = async (req, res) => {
  try {
    const materials = await Materials.find();
    return res.status(200).json(flattenMaterialData(materials));
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

const update_Material = async (req, res) => {
  try {
    const { id } = req.params;
    const allData = req.body;
    const { material, group, grade, finish } = allData;
    if (
      !material ||
      group.filter((a) => {
        return a.name == "" || a.subgroup == [];
      }).length
    ) {
      return res.status(400).json({
        mssg: "Material and atleast a Group and Subgroup is required.",
      });
    }
    const updatedMaterial = await Materials.findByIdAndUpdate(id, {
      name: material,
      group,
      grade,
      finish,
    });
    return res.status(200).json({ mssg: "Material Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const material_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Accessories_Supplier_Model.aggregate([
      {
        $match: {
          "scope.subgroup.material.material_id": new mongoose.Types.ObjectId(
            id
          ),
        },
      },
      {
        $project: {
          code: "$name",
        },
      },
    ]);
    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const delete_material = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await Materials.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Material Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

//Grade Controllers
const add_grade = async (req, res) => {
  try {
    const grade = req.body;
    const new_grade = await Grade.create(grade);
    return res.status(200).json({ mssg: "New Grade Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_single_grade = async (req, res) => {
  try {
    const { id } = req.params;
    const grade = await Grade.findById(id);
    return res.status(200).json(grade);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_all_grade = async (req, res) => {
  try {
    const grades = await Grade.find();
    return res.status(200).json(grades);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const update_grade = async (req, res) => {
  try {
    const { id } = req.params;
    const grade = req.body;
    const updatedMaterial = await Grade.findByIdAndUpdate(id, grade);
    return res.status(200).json({ mssg: "Grade Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const grade_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const gradeDetails = await Grade.findById(id);
    const supplier = await Accessories_Supplier_Model.aggregate([
      {
        $match: { "grade.name": gradeDetails.grade },
      },
      {
        $project: {
          code: "$supplier",
        },
      },
    ]);
    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const delete_grade = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await Grade.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Grade Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

//Color Controllers
const add_color = async (req, res) => {
  try {
    const color = req.body;
    const new_color = await Color.create(color);
    return res.status(200).json({ mssg: "New Color Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_single_color = async (req, res) => {
  try {
    const { id } = req.params;
    const color = await Color.findById(id);
    return res.status(200).json(color);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_all_color = async (req, res) => {
  try {
    const colors = await Color.find();
    return res.status(200).json(colors);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const update_color = async (req, res) => {
  try {
    const { id } = req.params;
    const color = req.body;
    const updatedMaterial = await Color.findByIdAndUpdate(id, color);
    return res.status(200).json({ mssg: "Color Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const color_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const colorDetails = await Color.findById(id);
    const supplier = await Accessories_Supplier_Model.aggregate([
      {
        $match: { "color.name": colorDetails.color },
      },
      {
        $project: {
          code: "$supplier",
        },
      },
    ]);
    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const delete_color = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await Color.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Color Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

//Finish Controllers
const add_finish = async (req, res) => {
  try {
    const { color } = req.body;
    const { finish, code, description } = req.body.finish;
    // const colorArr = await color.map((itm) => {
    //   return itm.name;
    // });
    const new_finish = await Finish.create({
      name: finish,
      code,
      description,
      color,
    });
    return res.status(200).json({ mssg: "New Finish Added" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_single_finish = async (req, res) => {
  try {
    const { id } = req.params;
    const finish = await Finish.findById(id);
    return res.status(200).json(finish);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const get_all_finish = async (req, res) => {
  try {
    const finishs = await Finish.find();
    return res.status(200).json(finishs);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const update_finish = async (req, res) => {
  try {
    const { id } = req.params;
    const { color } = req.body;
    const { finish, code, description } = req.body.finish;
    // const colorArr = await color.map((itm) => {
    //   return itm.name;
    // });
    const updatedMaterial = await Finish.findByIdAndUpdate(id, {
      name: finish,
      code,
      description,
      color,
    });
    return res.status(200).json({ mssg: "Finish Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const finish_assigned_to = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Accessories_Supplier_Model.aggregate([
      {
        $match: {
          "scope.subgroup.material.finish.finish_id":
            new mongoose.Types.ObjectId(id),
        },
      },
      {
        $project: {
          code: "$name",
        },
      },
    ]);
    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};
const delete_finish = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await Finish.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Finish Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mssg: error?.message || 'Internal server error'
    })
  }
};

module.exports = {
  //raw material controllers
  add_raw_material,
  get_all_raw_material,
  get_single_raw_material,
  update_raw_material,
  delete_raw_material,
  raw_material_assigned_to,
  getAlloysForOperartion,

  //material controllers
  add_material,
  get_single_material,
  get_all_material,
  update_Material,
  material_assigned_to,
  delete_material,
  get_excel_material,

  //grade controllers
  add_grade,
  get_single_grade,
  get_all_grade,
  update_grade,
  grade_assigned_to,
  delete_grade,

  //color controllers
  add_color,
  get_single_color,
  get_all_color,
  update_color,
  color_assigned_to,
  delete_color,

  //finish controllers
  add_finish,
  get_single_finish,
  get_all_finish,
  update_finish,
  finish_assigned_to,
  delete_finish,
};
