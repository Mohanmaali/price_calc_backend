const { default: mongoose } = require("mongoose");
const Departments = require("../models/department_model");
const Position = require("../models/position");
const Team = require("../models/teams");
const User_model = require("../models/user_model");
const Department = require("../models/department_model");
const Scope_Work = require("../models/scopeWork_Model");
const Project_inquiry_Model = require("../models/project_inquiry_model");
const { default: axios } = require("axios");
const ProjectInquiryDepartmentSelection = require("../models/inquiry_department_selection_model");

const add_Department = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name } = req.body;
    const tabs = JSON.parse(req.body.tabs);
    const file = req.file;

    if (!name?.trim() || !tabs.length) {
      return res.status(400).json({ mssg: "All fields are mandatory" });
    }

    const normalizedName = name.trim().toLowerCase();

    const isExist = await Department.findOne({
      name: { $regex: `^${normalizedName}$`, $options: "i" },
    }).session(session);

    if (isExist) {
      return res.status(400).json({ mssg: "Department name already exists" });
    }

    const image = file
      ? `${process.env.BACKENDURL}/uploads/${file.filename}`
      : null;

    // Step 1: Create Department
    const [newDept] = await Department.create(
      [
        {
          name,
          tabs,
          image,
        },
      ],
      { session }
    );

    // Step 2: Create Team
    const [team] = await Team.create(
      [
        {
          name: "Head Of Department",
          tabs,
          department: newDept._id,
          image,
        },
      ],
      { session }
    );

    // Step 3: Create Positions
    await Position.insertMany(
      [
        {
          name: "Administrator",
          tabs,
          // team: team._id,
          department: newDept._id,
          image,
        },
        {
          name: "Director",
          tabs,
          // team: team._id,
          department: newDept._id,
          image,
        },
      ],
      { session }
    );

    // ✅ Commit if everything succeeded
    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json({ mssg: "Department, Team, and Positions created successfully" });
  } catch (error) {
    console.error(error);
    await session.abortTransaction();
    session.endSession();

    return res
      .status(500)
      .json({ mssg: error.message || "Internal server error" });
  }
};

const get_Department = async (req, res) => {
  try {
    const { deptSearch } = req.query;

    const pipeline = [];

    // Add search filter if present
    if (deptSearch) {
      pipeline.push({
        $match: {
          name: { $regex: deptSearch, $options: "i" },
        },
      });
    }

    // Add lookup for teams and positions
    pipeline.push(
      {
        $lookup: {
          from: "teams",
          let: { deptId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$department", "$$deptId"] },
              },
            },
            {
              $project: { tabs: 0 },
            },

            // 2. Lookup positions via users for non‐HOD teams
            {
              $lookup: {
                from: "user_models",
                let: { teamId: "$_id", deptId: "$$deptId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: "$roleGroups",
                                as: "rg",
                                cond: {
                                  $and: [
                                    { $eq: ["$$rg.team._id", "$$teamId"] },
                                    {
                                      $eq: ["$$rg.department._id", "$$deptId"],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      roleGroups: {
                        $filter: {
                          input: "$roleGroups",
                          as: "rg",
                          cond: {
                            $and: [
                              { $eq: ["$$rg.team._id", "$$teamId"] },
                              { $eq: ["$$rg.department._id", "$$deptId"] },
                            ],
                          },
                        },
                      },
                    },
                  },
                  { $unwind: "$roleGroups" },
                  { $unwind: "$roleGroups.positions" },
                  { $replaceRoot: { newRoot: "$roleGroups.positions" } },
                  {
                    $group: {
                      _id: "$_id",
                      name: { $first: "$name" },
                    },
                  },
                ],
                as: "positions",
              },
            },
          ],
          as: "teams",
        },
      },

      {
        $lookup: {
          from: "positions",
          let: { deptId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$department", "$$deptId"] } } },
            { $project: { tabs: 0 } },
          ],
          as: "allDeptPositions",
        },
      },

      {
        $addFields: {
          teams: {
            $map: {
              input: "$teams",
              as: "team",
              in: {
                $mergeObjects: [
                  "$$team",
                  {
                    positions: {
                      $cond: [
                        { $eq: ["$$team.name", "Head Of Department"] },
                        "$allDeptPositions",
                        "$$team.positions",
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          tabs: 0,
          allDeptPositions: 0,
        },
      },

      {
        $sort: { createdAt: -1 },
      }
    );

    const data = await Department.aggregate(pipeline);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const get_DepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Departments.findById(id);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const update_Department = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const tabs = JSON.parse(req.body.tabs);
    const image = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (name === "" || tabs.length === 0) {
      return res.status(400).json({ mssg: "All Field Are Mandatory" });
    }

    const isDepartmentNameIsExist = await Departments.findOne({
      name,
      _id: { $ne: id },
    });

    if (isDepartmentNameIsExist) {
      return res.status(400).json({
        mssg: "Department name already exists",
      });
    }

    const existingDept = await Department.findById(id);
    const tabNames = tabs.map((itm) => itm.name);

    const deletedTabs = existingDept.tabs
      .filter((tab) => !tabNames.includes(tab.name))
      .map((tab) => tab.name);

    const teamsForDept = await Team.find({ department: id });

    // for (const team of teamsForDept) {
    //   if (Array.isArray(team.tabs)) {
    //     team.tabs = team.tabs.filter(
    //       (tab) => !deletedTabs.includes(tab.name)
    //     );
    //     for (const tab of team.tabs) {
    //       const updatedTab = tabs.find((itm) => itm.name === tab.name);
    //       if (updatedTab) {
    //         tab.visibility = !!updatedTab.visibility;
    //         tab.create = !!updatedTab.create;
    //         tab.read = !!updatedTab.read;
    //         tab.update = !!updatedTab.update;
    //         tab.delete = !!updatedTab.delete;
    //       }
    //     }
    //     await team.save();
    //   }
    //   const positions = await Position.find({ team: team._id });

    //   for (const position of positions) {
    //     if (Array.isArray(position.tabs)) {
    //       position.tabs = position.tabs.filter(
    //         (tab) => !deletedTabs.includes(tab.name)
    //       );
    //       for (const tab of position.tabs) {
    //         const updatedTab = tabs.find((itm) => itm.name === tab.name);
    //         if (updatedTab) {
    //           tab.visibility = !!updatedTab.visibility;
    //           tab.create = !!updatedTab.create;
    //           tab.read = !!updatedTab.read;
    //           tab.update = !!updatedTab.update;
    //           tab.delete = !!updatedTab.delete;
    //         }
    //       }
    //       await position.save();
    //     }
    //   }
    // }

    const positions = await Position.find({ department: id });

    for (const position of positions) {
      if (Array.isArray(position.tabs)) {
        position.tabs = position.tabs.filter(
          (tab) => !deletedTabs.includes(tab.name)
        );
        for (const tab of position.tabs) {
          const updatedTab = tabs.find((itm) => itm.name === tab.name);
          if (updatedTab) {
            tab.visibility = !!updatedTab.visibility;
            tab.create = !!updatedTab.create;
            tab.read = !!updatedTab.read;
            tab.update = !!updatedTab.update;
            tab.delete = !!updatedTab.delete;
          }
        }
        await position.save();
      }
    }

    const updated_department = await Departments.findByIdAndUpdate(id, {
      name,
      tabs,
      image,
    });
    return res.status(200).json({ mssg: "Department Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const delete_Department = async (req, res) => {
  try {
    const { id } = req.params;
    // const positions = await Position.find({  })
    await Position.deleteMany({ department: id });
    await Team.deleteMany({ department: id });
    const data = await Departments.findByIdAndDelete(id);
    return res.status(200).json({ mssg: "Department Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const addTeam = async (req, res) => {
  try {
    const { deptId } = req.params;
    const { name } = req.body;
    // const tabs = JSON.parse(req.body.tabs)
    const image = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
    if (!name || !deptId) {
      return res.status(400).json({ mssg: "Name and Deparment are required" });
    }
    const existingTeam = await Team.findOne({ name, department: deptId });
    if (existingTeam) {
      return res.status(400).json({
        mssg: "Team already exists with this name inside this department",
      });
    }
    const newTeam = await Team.create({
      name,
      // tabs,
      department: deptId,
      image,
    });
    return res
      .status(200)
      .json({ mssg: "Team Created Successfully", data: newTeam });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Something went wrong" });
  }
};

const getTeamById = async (req, res) => {
  try {
    const { deptId, teamId } = req.params;
    const data = await Team.findOne({
      _id: teamId,
      department: deptId,
    }).populate("department");
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { deptId, teamId } = req.params;
    const { name } = req.body;
    // const tabs = JSON.parse(req.body.tabs)
    const image = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (name === "") {
      return res.status(400).json({ mssg: "All Field Are Mandatory" });
    }
    const existingTeam = await Team.findById(teamId);
    // const tabNames = tabs.map((itm) => itm.name);

    // const deletedTabs = existingTeam.tabs
    //   .filter((tab) => !tabNames.includes(tab.name))
    //   .map((tab) => tab.name);

    // const positionForTeam = await Position.find({ team: teamId });

    // for (const position of positionForTeam) {
    //   if (Array.isArray(position.tabs)) {
    //     position.tabs = position.tabs.filter(
    //       (tab) => !deletedTabs.includes(tab.name)
    //     );
    //     for (const tab of position.tabs) {
    //       const updatedTab = tabs.find((itm) => itm.name === tab.name);
    //       if (updatedTab) {
    //         tab.visibility = !!updatedTab.visibility;
    //         tab.create = !!updatedTab.create;
    //         tab.read = !!updatedTab.read;
    //         tab.update = !!updatedTab.update;
    //         tab.delete = !!updatedTab.delete;
    //       }
    //     }
    //     await position.save();
    //   }

    // }
    const updatedTeam = await Team.findByIdAndUpdate(teamId, {
      name,
      image,
      // tabs,
    });
    return res.status(200).json({ mssg: "Team Updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const deleteTeam = async (req, res) => {
  try {
    const { deptId, teamId } = req.params;
    const positions = await Position.deleteMany({ team: teamId });
    const data = await Team.findByIdAndDelete(teamId);
    return res.status(200).json({ mssg: "Team Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ mssg: error?.message || "Internal server error" });
  }
};

const addPosition = async (req, res) => {
  try {
    const { deptId, teamId } = req.params;
    const { name, name1 } = req.body;
    const tabs = JSON.parse(req.body.tabs);
    const image = `${process.env.BACKENDURL}/uploads/${req.file?.filename}`;
    if (!name || !deptId) {
      return res.status(400).json({ mssg: "Name and Deparment are required" });
    }

    const existingPos = await Position.findOne({ name, department: deptId });
    if (existingPos) {
      return res.status(400).json({
        mssg: "Position already exists with this name inside this department",
      });
    }
    // const newTeam = await Position.create({
    //   name, tabs, team: teamId, image
    // })

    const positionsToCreate = [
      {
        name: name.trim(),
        tabs,
        // team: teamId,
        department: deptId,
        image,
      },
    ];

    if (name1?.trim()) {
      positionsToCreate.push({
        name: name1.trim(),
        tabs,
        // team: teamId,
        department: deptId,
        image,
      });
    }

    const createdPositions = await Position.insertMany(positionsToCreate);

    return res.status(200).json({ mssg: "Position Created Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Something went wrong" });
  }
};

const getPositionById = async (req, res) => {
  try {
    const { deptId, teamId, positionId } = req.params;
    const data = await Position.findOne({
      _id: positionId,
      department: deptId,
    }).populate("department");
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

const updatePosition = async (req, res) => {
  try {
    const { deptId, teamId, positionId } = req.params;
    const { name } = req.body;
    const tabs = JSON.parse(req.body.tabs);
    const image = req.file
      ? `${process.env.BACKENDURL}/uploads/${req.file.filename}`
      : req.body.photo;
    if (name === "" || tabs.length === 0) {
      return res.status(400).json({ mssg: "All Field Are Mandatory" });
    }
    const updatedTeam = await Position.findByIdAndUpdate(positionId, {
      name,
      tabs,
      image,
    });
    return res.status(200).json({ mssg: "Position Updated" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

const deletePosition = async (req, res) => {
  try {
    const { deptId, teamId, positionId } = req.params;
    const data = await Position.findByIdAndDelete(positionId);
    return res.status(200).json({ mssg: "Position Deleted" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

const checkAssigned = async (req, res) => {
  try {
    const { id, type } = req.query;
    if (type == "Department") {
      let assignedUser = await User_model.find({
        department: new mongoose.Types.ObjectId(id),
      });
      return res.status(200).json(assignedUser);
    } else if (type == "Team") {
      let assignedUser = await User_model.find({
        team: new mongoose.Types.ObjectId(id),
      });
      return res.status(200).json(assignedUser);
    } else if (type == "Position") {
      let assignedUser = await User_model.find({
        position: new mongoose.Types.ObjectId(id),
      });
      return res.status(200).json(assignedUser);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Some Error Occured" });
  }
};

const getTeamsRelatedToDepartment = async (req, res) => {
  try {
    let { deptId } = req.params;
    deptId = new mongoose.Types.ObjectId(deptId);

    const teams = await Team.find({ department: deptId });

    return res.status(200).json({
      success: true,
      message: "Teams successfully getted",
      data: teams,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

// const isDepartmentPresentAnywhere = async (req, res) => {
//   try {
//     const { deptId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(deptId)) {
//       return res.status(400).json({ success: false, message: 'Invalid department ID' });
//     }

//     const objectId = new mongoose.Types.ObjectId(deptId);

//     const [users, scopes, teams, inquiries] = await Promise.all([
//       User_model.find({
//         "roleGroups.department._id": objectId,
//       }),
//       Scope_Work.find({ department: objectId }),
//       Team.find({ department: objectId }),
//       // Project_inquiry_Model.find({ departmentId: objectId }),
//       Project_inquiry_Model.find({ departmentId: objectId }),
//       Project_inquiry_Model.find({
//         representative: {
//           $elemMatch: {
//             departmentId: objectId
//           }
//         }
//       }),
//     ]);

//     const result = {
//       users,
//       scopes,
//       teams,
//       inquiries,
//     };

//     const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

//     return res.status(200).json({
//       success: true,
//       departmentId: deptId,
//       usedAnywhere: isUsedAnywhere,
//       counts: {
//         users: users.length,
//         scopes: scopes.length,
//         teams: teams.length,
//         inquiries: inquiries.length,
//       },
//       data: result,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Server error',
//     });
//   }
// };

const isDepartmentPresentAnywhere = async (req, res) => {
  try {
    const { deptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid department ID" });
    }

    const objectId = new mongoose.Types.ObjectId(deptId);

    const [users, scopes, teams, inquiries, representativeInquiries] =
      await Promise.all([
        User_model.find({ "roleGroups.department._id": objectId }),
        Scope_Work.find({ department: objectId }),
        Team.find({ department: objectId }),
        Project_inquiry_Model.find({ departmentId: objectId }),
        Project_inquiry_Model.find({
          representative: { $elemMatch: { departmentId: objectId } },
        }),
      ]);

    const result = {
      users,
      scopes,
      teams,
      inquiries,
      representativeInquiries,
    };

    const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

    return res.status(200).json({
      success: true,
      departmentId: deptId,
      usedAnywhere: isUsedAnywhere,
      counts: {
        users: users.length,
        scopes: scopes.length,
        teams: teams.length,
        inquiries: inquiries.length,
        representativeInquiries: representativeInquiries.length,
      },
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// const getUsers = async (req, res) => {
//   try {
//     let { deptId, teamId, positionId } = req.params;
//     deptId = new mongoose.Types.ObjectId(deptId);
//     teamId = new mongoose.Types.ObjectId(teamId);
//     positionId = new mongoose.Types.ObjectId(positionId);
//     const users = await User_model.find({ department: deptId, team: teamId, position: positionId });

//     return res.status(200).json({
//       success: true,
//       message: 'sucessfully get users',
//       data: users
//     })
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error?.message
//     })
//   }
// }

const getUsers = async (req, res) => {
  try {
    let { deptId, teamId, positionId } = req.params;

    deptId = new mongoose.Types.ObjectId(deptId);
    teamId = new mongoose.Types.ObjectId(teamId);
    positionId = new mongoose.Types.ObjectId(positionId);

    const users = await User_model.find({
      roleGroups: {
        $elemMatch: {
          "department._id": deptId,
          "team._id": teamId,
          positions: {
            $elemMatch: {
              positionId: positionId,
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully retrieved users",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

const getPositionsRelatedToTeam = async (req, res) => {
  try {
    let { teamId } = req.params;
    teamId = new mongoose.Types.ObjectId(teamId);
    // const positions = await Position.find({ team: teamId });
    const result = await User_model.aggregate([
      // Unwind roleGroups array
      { $unwind: "$roleGroups" },

      // Match the specific team
      {
        $match: {
          "roleGroups.team._id": teamId,
        },
      },

      // Unwind positions inside roleGroups
      { $unwind: "$roleGroups.positions" },

      // Group all unique position IDs
      {
        $group: {
          _id: null,
          positionIds: { $addToSet: "$roleGroups.positions.positionId" },
        },
      },

      // Lookup Position documents
      {
        $lookup: {
          from: "positions", // MongoDB collection name is lowercase plural by default
          localField: "positionIds",
          foreignField: "_id",
          as: "positions",
        },
      },

      // Optional: project only positions
      {
        $project: {
          _id: 0,
          positions: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Successfully get positions related to team",
      data: result[0]?.positions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

const getPositionsByTeamGrouped = async (req, res) => {
  try {
    const extractedPositions = req.body;

    if (!Array.isArray(extractedPositions) || extractedPositions.length === 0) {
      return res.status(400).json({ message: "Invalid or empty data." });
    }

    // Ensure all ObjectIds are valid mongoose ObjectIds
    const allPositionIds = [
      ...new Set(
        extractedPositions.flatMap((group) =>
          group.postions.map((id) => mongoose.Types.ObjectId(id))
        )
      ),
    ];

    const positions = await Position.find({
      _id: { $in: allPositionIds },
    }).lean();

    // Create a map for fast lookup
    const positionMap = {};
    positions.forEach((pos) => {
      positionMap[pos._id.toString()] = pos;
    });

    const groupedData = extractedPositions.map((group) => {
      const groupTeamId = mongoose.Types.ObjectId(group.teamId);
      const matchingPositions = group.postions
        .map((posId) => positionMap[posId.toString()])
        .filter(Boolean); // Filter out missing positions

      return {
        teamId: groupTeamId,
        positions: matchingPositions,
      };
    });

    res.status(200).json(groupedData);
  } catch (error) {
    console.error("Error extracting positions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserWithPopulatedTabs = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User_model.findById(id).lean();

    // Iterate through roleGroups and fetch position details (including tabs)
    const populatedRoleGroups = await Promise.all(
      user.roleGroups.map(async (group) => {
        const populatedPositions = await Promise.all(
          group.positions.map(async (pos) => {
            const positionDoc = await Position.findById(pos.positionId).lean();
            return {
              ...pos,
              tabs: positionDoc?.tabs || [],
              image: positionDoc?.image || "",
            };
          })
        );

        return {
          ...group,
          positions: populatedPositions,
        };
      })
    );

    const updatedUser = {
      ...user,
      roleGroups: populatedRoleGroups,
    };

    return res.json(updatedUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// const isExistInsideHeadOfDeptartment = async (req, res) => {
//   try {
//     const { estimationDeptId, userId } = req.params;

//     const estimationTeams = await Team.find({ department: estimationDeptId, name: 'Head Of Department' });
//     if (estimationTeams.length === 0) {
//       return res.status(404).json({ success: false, message: "No 'Head Of Department' team found for this department." });
//     }

//     const estimationPositions = await Position.find({ team: estimationTeams[0]._id });
//     const estimationPositionIds = estimationPositions.map(pos => pos._id.toString());

//     const allUsers = await User_model.find();

//     const estimationUsers = allUsers.filter(user =>
//       user.roleGroups?.some(group =>
//         group.positions?.some(pos =>
//           estimationPositionIds.includes(pos.positionId.toString())
//         )
//       )
//     );

//     const userExists = estimationUsers.some(user => user._id.toString() === userId.toString());

//     return res.status(200).json({
//       success: true,
//       userExists,
//       message: userExists ? "User is part of the Head of Department." : "User is NOT part of the Head of Department."
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

// const isExistInsideHeadOfDeptartment = async (req, res) => {
//   try {
//     let { estimationDeptIds, userId } = req.body;

//     if (!Array.isArray(estimationDeptIds) || !userId) {
//       return res.status(400).json({ success: false, message: "Invalid input. Provide 'estimationDeptIds' as an array and 'userId'." });
//     }

//     // Step 1: Find all "Head Of Department" teams for the given departments
//     const estimationTeams = await Team.find({
//       department: { $in: estimationDeptIds },
//       name: "Head Of Department"
//     });

//     if (estimationTeams.length === 0) {
//       return res.status(404).json({ success: false, message: "No 'Head Of Department' teams found for these departments." });
//     }

//     const teamIds = estimationTeams.map(team => team._id);

//     // Step 2: Find all positions under those teams
//     const estimationPositions = await Position.find({ team: { $in: teamIds } });
//     const estimationPositionIds = estimationPositions.map(pos => pos._id.toString());

//     // Step 3: Fetch only the user we're checking
//     const user = await User_model.findById(userId);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found." });
//     }

//     // Step 4: Check if user has any of the target positions in their roleGroups
//     const userExists = user.roleGroups?.some(group =>
//       group.positions?.some(pos =>
//         estimationPositionIds.includes(pos.positionId.toString())
//       )
//     );

//     return res.status(200).json({
//       success: true,
//       userExists,
//       message: userExists
//         ? "User is part of at least one Head Of Department."
//         : "User is NOT part of any Head Of Department."
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

const isExistInsideHeadOfDeptartment = async (req, res) => {
  try {
    let { estimationDeptIds, salesDeptIds, userId } = req.query;
    if (
      !estimationDeptIds ||
      estimationDeptIds === "null" ||
      !salesDeptIds ||
      salesDeptIds === "null" ||
      !userId ||
      userId === "null"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input. Provide 'estimationDeptIds', 'salesDeptIds', and 'userId'.",
      });
    }
    const estimationDeptObjectId = new mongoose.Types.ObjectId(
      estimationDeptIds
    );
    const salesDeptObjectId = new mongoose.Types.ObjectId(salesDeptIds);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const checkHOD = async (deptId) => {
      const team = await Team.findOne({
        department: deptId,
        name: "Head Of Department",
      });

      if (!team) return false;

      const user = await User_model.findOne({
        _id: userObjectId,
        roleGroups: {
          $elemMatch: {
            "department._id": deptId,
            "team._id": team._id,
          },
        },
      });

      return !!user;
    };

    const estimationHOD = await checkHOD(estimationDeptObjectId);
    const salesHOD = await checkHOD(salesDeptObjectId);

    return res.status(200).json({
      success: true,
      estimationHOD,
      salesHOD,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

const isUserAssignedInInquiry = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }

    const isAssigned = await Project_inquiry_Model.exists({
      "representative.userIds": new mongoose.Types.ObjectId(userId),
    });

    return res.status(200).json({
      success: true,
      assigned: isAssigned ? true : false,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// const setEstimationAndSalesDepartment = async (req, res) => {
//   try {
//     const { estDeptId, salesDeptId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(estDeptId) || !mongoose.Types.ObjectId.isValid(salesDeptId)) {
//       return res.status(400).json({ success: false, message: 'Invalid department IDs provided' });
//     }

//     const newDoc = new ProjectInquiryDepartmentSelection({
//       estimationDepartmentId: estDeptId,
//       salesDepartmentId: salesDeptId,
//     });

//     await newDoc.save();

//     return res.status(201).json({ success: true, message: 'Departments saved successfully' });
//   } catch (error) {
//     console.error("Error in setEstimationAndSalesDepartment:", error.message);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

const setEstimationAndSalesDepartment = async (req, res) => {
  try {
    const { estDeptId, salesDeptId } = req.body;

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(estDeptId) ||
      !mongoose.Types.ObjectId.isValid(salesDeptId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid department IDs provided" });
    }

    // Helper to validate department setup
    const isValidDepartment = async (deptId, deptName) => {
      // 1. Find Head of Department team
      const headTeam = await Team.findOne({
        department: deptId,
        name: { $regex: /^head of department$/i }, // Case-insensitive match
      });

      if (!headTeam) {
        return {
          valid: false,
          message: `No 'Head of Department' team in ${deptName}`,
        };
      }

      // 2. Find Administrator or Director position in this department/team
      const positions = await Position.find({
        department: deptId,
        name: { $in: [/^administrator$/i, /^director$/i] },
      });

      if (!positions.length) {
        return {
          valid: false,
          message: `No 'Administrator' or 'Director' position in ${deptName}'s Head team`,
        };
      }

      const positionIds = positions.map((pos) => pos._id);

      // 3. Check if any user is assigned to this department, team, and one of these positions
      const userExists = await User_model.findOne({
        "roleGroups.department._id": deptId,
        "roleGroups.team._id": headTeam._id,
        "roleGroups.positions.positionId": { $in: positionIds },
      });

      if (!userExists) {
        return {
          valid: false,
          message: `No eligible user found in ${deptName}'s Head team`,
        };
      }

      return { valid: true };
    };

    // Validate estimation department
    const estCheck = await isValidDepartment(
      estDeptId,
      "Estimation Department"
    );
    if (!estCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: estCheck.message });
    }

    // Validate sales department
    const salesCheck = await isValidDepartment(salesDeptId, "Sales Department");
    if (!salesCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: salesCheck.message });
    }

    // All checks passed → Save the record
    const newDoc = new ProjectInquiryDepartmentSelection({
      estimationDepartmentId: estDeptId,
      salesDepartmentId: salesDeptId,
    });

    await newDoc.save();

    return res
      .status(201)
      .json({ success: true, message: "Departments saved successfully" });
  } catch (error) {
    console.error("Error in setEstimationAndSalesDepartment:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

const getSelectedEstimationAndSalesDepartment = async (req, res) => {
  try {
    const response = await ProjectInquiryDepartmentSelection.find(); // Gets all documents

    return res.status(200).json({
      success: true,
      message: "Successfully fetched Estimation & Sales departments",
      data: response,
    });
  } catch (error) {
    console.error("err", error?.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// const updateEstimationSalesDepartment = async (req, res) => {
//   try {
//     const {id} = req.params;
//     const { estDeptId, salesDeptId } = req.body;

//     const response = await ProjectInquiryDepartmentSelection.findByIdAndUpdate(id, { estimationDepartmentId:estDeptId, salesDepartmentId:salesDeptId});

//     if(!response){
//       return res.status(400).json({
//         success:false,
//         message:'Something went wrong while updating'
//       })
//     }

//     return res.status(200).json({
//       success:true,
//       message:'Estimation and sales department successfully updated'
//     })
//   } catch (error) {
//     console.error("err", error?.message);
//     return res.status(500).json({ success: false, error: "Internal server error" });
//   }
// }

const updateEstimationSalesDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { estDeptId, salesDeptId } = req.body;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(estDeptId) ||
      !mongoose.Types.ObjectId.isValid(salesDeptId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID(s) provided" });
    }

    // Helper function to validate department
    const isValidDepartment = async (deptId, deptName) => {
      const headTeam = await Team.findOne({
        department: deptId,
        name: { $regex: /^head of department$/i }, // Case-insensitive match
      });
      if (!headTeam) {
        return {
          valid: false,
          message: `No 'Head of Department' team in ${deptName}`,
        };
      }

      const positions = await Position.find({
        department: deptId,
        name: { $in: [/^administrator$/i, /^director$/i] }, // Case-insensitive match
      });

      if (!positions.length) {
        return {
          valid: false,
          message: `No 'Administrator' or 'Director' in ${deptName}'s Head team`,
        };
      }

      const positionIds = positions.map((p) => p._id);

      const userExists = await User_model.findOne({
        "roleGroups.department._id": deptId,
        "roleGroups.team._id": headTeam._id,
        "roleGroups.positions.positionId": { $in: positionIds },
      });

      if (!userExists) {
        return {
          valid: false,
          message: `No eligible user found in ${deptName}'s Head team`,
        };
      }

      return { valid: true };
    };

    // Check Estimation Department
    const estCheck = await isValidDepartment(
      estDeptId,
      "Estimation Department"
    );
    if (!estCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: estCheck.message });
    }

    // Check Sales Department
    const salesCheck = await isValidDepartment(salesDeptId, "Sales Department");
    if (!salesCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: salesCheck.message });
    }

    // All checks passed → Update the document
    const response = await ProjectInquiryDepartmentSelection.findByIdAndUpdate(
      id,
      {
        estimationDepartmentId: estDeptId,
        salesDepartmentId: salesDeptId,
      },
      { new: true }
    );

    if (!response) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong while updating",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Estimation and sales department successfully updated",
    });
  } catch (error) {
    console.error("err", error?.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

const isUserIsSalesRepresentative = async (req, res) => {
  try {
    const { departmentId, userId } = req.query;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId." });
    }

    const uId = new mongoose.Types.ObjectId(userId);
    let query = {};

    if (departmentId) {
      const depId = new mongoose.Types.ObjectId(departmentId);
      query = {
        representative: {
          $elemMatch: {
            departmentId: depId,
            userIds: { $in: [uId] }, // check if userId exists in the array
          },
        },
      };
    } else {
      query = {
        representative: {
          $elemMatch: {
            userIds: { $in: [uId] },
          },
        },
      };
    }
 
    const result = await Project_inquiry_Model.findOne(query);

    return res.status(200).json({
      success: true,
      present: !!result,
    });
  } catch (error) {
    console.error("Error checking representative:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// const allTabs = [
//   // "Dashboard",
//   { name: "Dashboard", description: "", type: "Setting" },
//   { name: "PDF Format", description: "", type: "Setting" },
//   { name: "Currency", description: "", type: "Setting" },
//   { name: "Finish", description: "", type: "Setting" },
//   {
//     name: "Group",
//     description:
//       "Group Creation has checkboxes which is used to conditionally show Groups on 4 Input tabs.",
//     type: "Setting",
//   },
//   { name: "Hourly Rate", description: "", type: "Setting" },
//   {
//     name: "Raw Material",
//     description: "Depends on Currency and Finish. Allow Read API access first.",
//     type: "Setting",
//   },
//   {
//     name: "Material",
//     description: "Depends on Group and Finish. Allow Read API access first.",
//     type: "Setting",
//   },
//   {
//     name: "Supplier",
//     description:
//       "Depends on Currency, Group, Material and Finish. Allow Read API access first.",
//     type: "Setting",
//   },
//   {
//     name: "Operational Cost",
//     description:
//       "Depends on Supplier and Raw Material. Allow Read API access first.",
//     type: "Setting",
//   },
//   { name: "Unit", description: "", type: "Setting" },
//   {
//     name: "Clients",
//     description: "Depends on Currency. Allow Read API access first.",
//     type: "Setting",
//   },
//   {
//     name: "Project Inquiry Types",
//     description:
//       "Depends on Client, Master Inventory , Scope Of work and Project Inquiry Type. Allow Read API access first.",
//     type: "Setting",
//   },
//   {
//     name: "Scope Of Work",
//     description: "Depends on Department. Allow Read API access first.",
//     type: "Setting",
//   },
//   { name: "Actions", description: "", type: "Setting" },

//   { name: "Organization", description: "", type: "Module" },
//   { name: "Invite", description: "", type: "Module" },
//   { name: "Department", description: "", type: "Module" },
//   { name: "Employee", description: "", type: "Module" },
//   { name: "System", description: "", type: "Module" },
//   {
//     name: "Packaging",
//     description:
//       "Depends on previously created Packaging Units. Allow Read API access first.",
//     type: "Module",
//   },
//   {
//     name: "Input Entry",
//     description:
//       "Depends on System, Group, Supplier, Material, Raw Material, Finish, Unit, Operation. Allow Read API access first.",
//     type: "Module",
//   },
//   {
//     name: "Package Entry",
//     description:
//       "Depends on Input Entry, Packaging and Unit. Allow Read API access first.",
//     type: "Module",
//   },
//   { name: "Price List", description: "", type: "Module" },
//   { name: "Package Price List", description: "", type: "Module" },
//   { name: "Export", description: "", type: "Module" },
//   { name: "Master Inventory", description: "", type: "Module" },
//   {
//     name: "Project Inquiry",
//     description:
//       "Depends on Client, Master Inventory. Allow Read API access first.",
//     type: "Module",
//   },
//   {
//     name: "Project",
//     description:
//       "Depends on Client, Master Inventory. Allow Read API access first.",
//     type: "Module",
//   },
//   {
//     name: "Purchase Order",
//     description:
//       "Depends on PDF Format, Supplier, Master Inventory and Project. Allow Read API access first.",
//     type: "Module",
//   },
//   {
//     name: "Inquiry",
//     description:
//       "Depends on PDF Format, Procurement, Actions, Projects, Master Inventory. Allow Read API access first.",
//     type: "Module",
//   },
// ];

// async function updateType() {
//   const positions = await Position.find();

//   for (const pos of positions) {
//     const team = await Team.findById(pos.team);

//     if (team && team?.department) {
//       pos.department = team?.department;

//       delete pos.team;

//       await pos.save();
//       console.log(`Updated position: ${pos.name} (department set, team removed)`);
//     } else {
//       console.warn(`Team not found or missing department for position: ${pos.name}`);
//     }
//   }
// }

// updateType()

// checl team assigned anywhere
// const isTeamPresentAnywhere = async (req, res) => {
//   try {
//     const { teamId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(teamId)) {
//       return res.status(400).json({ success: false, message: 'Invalid team ID' });
//     }

//     const objectId = new mongoose.Types.ObjectId(teamId);

//     const [users, scopes] = await Promise.all([
//       User_model.find({
//         "roleGroups.team._id": objectId,
//       }),
//       Scope_Work.find({ teamId: objectId }),
//       // Team.find({ department: objectId }),
//       // Project_inquiry_Model.find({ departmentId: objectId }),
//     ]);

//     const result = {
//       users,
//       scopes,
//       // teams,
//       // inquiries,
//     };

//     const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

//     return res.status(200).json({
//       success: true,
//       departmentId: teamId,
//       usedAnywhere: isUsedAnywhere,
//       counts: {
//         users: users.length,
//         scopes: scopes.length,
//         // teams: teams.length,
//         // inquiries: inquiries.length,
//       },
//       data: result,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Server error',
//     });
//   }
// };

const isTeamPresentAnywhere = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid team ID" });
    }

    const objectId = new mongoose.Types.ObjectId(teamId);

    const [users, scopes, repInquiries] = await Promise.all([
      User_model.find({ "roleGroups.team._id": objectId }),
      Scope_Work.find({ teamId: objectId }),
      Project_inquiry_Model.find({
        representative: { $elemMatch: { teamId: objectId } },
      }),
    ]);

    const result = {
      users,
      scopes,
      representativeInquiries: repInquiries,
    };

    const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

    return res.status(200).json({
      success: true,
      teamId,
      usedAnywhere: isUsedAnywhere,
      counts: {
        users: users.length,
        scopes: scopes.length,
        teams: 0,
        inquiries: 0,
        representativeInquiries: repInquiries.length,
      },
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// checl team assigned anywhere
// const isPositionPresentAnywhere = async (req, res) => {
//   try {
//     const { positionId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(positionId)) {
//       return res.status(400).json({ success: false, message: 'Invalid position ID' });
//     }

//     const objectId = new mongoose.Types.ObjectId(positionId);

//     const [users, scopes] = await Promise.all([
//       User_model.find({
//         "roleGroups.team._id": objectId,
//       }),
//       // Scope_Work.find({ teamId: objectId }),
//       // Team.find({ department: objectId }),
//       // Project_inquiry_Model.find({ departmentId: objectId }),
//     ]);

//     const result = {
//       users,
//       scopes,
//       // teams,
//       // inquiries,
//     };

//     const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

//     return res.status(200).json({
//       success: true,
//       departmentId: teamId,
//       usedAnywhere: isUsedAnywhere,
//       counts: {
//         users: users.length,
//         scopes: scopes.length,
//         // teams: teams.length,
//         // inquiries: inquiries.length,
//       },
//       data: result,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Server error',
//     });
//   }
// };

const isPositionPresentAnywhere = async (req, res) => {
  try {
    const { positionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(positionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid position ID" });
    }

    const objectId = new mongoose.Types.ObjectId(positionId);

    const [users, repInquiries] = await Promise.all([
      User_model.find({ "roleGroups.positions.positionId": objectId }),
      Project_inquiry_Model.find({
        representative: { $elemMatch: { positionId: objectId } },
      }),
    ]);

    const result = {
      users,
      representativeInquiries: repInquiries,
    };

    const isUsedAnywhere = Object.values(result).some((arr) => arr.length > 0);

    return res.status(200).json({
      success: true,
      positionId,
      usedAnywhere: isUsedAnywhere,
      counts: {
        users: users.length,
        scopes: 0,
        teams: 0,
        inquiries: 0,
        representativeInquiries: repInquiries.length,
      },
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};





const getUsersByDepartMentId = async (req, res) => {
  try {
    
    let { deptId } = req.params;
    deptId = new mongoose.Types.ObjectId(deptId);
    const users = await User_model.find({
      'roleGroups.department._id': deptId, 
    })
    return res.status(200).json({
      success: true,
      message: "Successfully retrieved users",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Server Error",
    });
  }
};

module.exports = {
  add_Department,
  get_Department,
  get_DepartmentById,
  update_Department,
  delete_Department,
  addTeam,
  getTeamById,
  updateTeam,
  deleteTeam,
  addPosition,
  getPositionById,
  updatePosition,
  deletePosition,
  checkAssigned,
  getTeamsRelatedToDepartment,
  isDepartmentPresentAnywhere,
  getUsers,
  getPositionsRelatedToTeam,

  getPositionsByTeamGrouped,
  getUserWithPopulatedTabs,

  isExistInsideHeadOfDeptartment,
  isUserAssignedInInquiry,
  setEstimationAndSalesDepartment,
  getSelectedEstimationAndSalesDepartment,
  updateEstimationSalesDepartment,
  isUserIsSalesRepresentative,

  isTeamPresentAnywhere,
  isPositionPresentAnywhere,
  getUsersByDepartMentId
};
