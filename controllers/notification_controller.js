const { default: mongoose } = require("mongoose");
const Action_model = require("../models/actions_model");
const Notification_model = require("../models/notification_model");
const { Purchase_Model } = require("../models/purchase_order_model");
const CommonNotification_model = require("../models/commonNotification");
const User_model = require("../models/user_model");
const Task_model = require("../models/task_model");
const { v4: uuidv4 } = require("uuid");
// for Notification

const get_nav_notification = async (req, res) => {
  try {
    const today = new Date(req.query.today);
    const { new_chat } = req.query;
    today.setUTCHours(0, 0, 0, 0);
    if (new_chat === "true") {
      const get_notification_for_today = await Notification_model.find({
        eta: today,
        read: false,
      });
      return res.status(200).json(get_notification_for_today);
    } else {
      const get_read_notification = await Notification_model.find({
        read: true,
      });
      return res.status(200).json(get_read_notification);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_notification = async (req, res) => {
  try {
    const today = new Date(req.query.today);
    const { notification_filter } = req.query;
    today.setUTCHours(0, 0, 0, 0);
    let and = [{}];
    if (notification_filter?.code) {
      and.push({ part_code: notification_filter.code });
    }
    if (notification_filter?.lpo) {
      and.push({ lpo_code: notification_filter.lpo });
    }
    if (notification_filter?.supplier) {
      and.push({ supplier: notification_filter.supplier });
    }
    let where = {
      $and: and,
    };

    const get_notification = await Notification_model.find(where).sort({
      createdAt: -1,
    });
    return res.status(200).json(get_notification);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const update_status = async (req, res) => {
  try {
    const { id } = req.params;
    const updated_status = await Notification_model.findByIdAndUpdate(
      id,
      {
        $set: {
          read: true,
        },
      },
      { new: true }
    );
    return res.status(200).json({ mssg: "Chat status updated" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const get_notifications_filter_data = async (req, res) => {
  try {
    const code = await Notification_model.aggregate([
      {
        $group: {
          _id: "$part_code",
        },
      },
    ]);
    const lpo = await Notification_model.aggregate([
      {
        $group: {
          _id: "$lpo_code",
        },
      },
    ]);
    const supplier = await Purchase_Model.aggregate([
      {
        $match: {
          status: "Active",
        },
      },
      {
        $group: {
          _id: "$supplier",
        },
      },
    ]);
    return res.status(200).json({ code, lpo, supplier });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};
const update_notification = async (req, res) => {
  try {
    const { id } = req.params;
    const { update, remark } = req.body;
    const updated_ntf = await Notification_model.findByIdAndUpdate(id, {
      $set: { update: update, remark: remark },
    });
    return res.status(200).json({ mssg: "Notification Updated" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ mssg: error?.message || "Internal server error" });
  }
};

// For Common Notification

const addNotification = async (req, res) => {
  try {
    let { userId, tab, details } = req.body;

    if (!userId || !tab) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    userId = new mongoose.Types.ObjectId(userId);

    let payload;

    if (details) {
      payload = {
        userId,
        tab,
        details,
      };
    } else {
      payload = {
        userId,
        tab,
      };
    }

    const notification = await CommonNotification_model.create(payload);

    if (notification) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully craeted notification",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

// const getAccessibleNotifications = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { isReaded } = req.query;

//     const user = await User_model.findById(userId)
//       .populate('position', 'tabs')
//       .select('position');

//     const tabsAccess = user?.position?.tabs || [];

//     const accessibleTabNames = tabsAccess
//       .filter(tab => tab.visibility === true || tab.read === true)
//       .map(tab => tab.name);

//     const query = {
//       userId: new mongoose.Types.ObjectId(userId),
//       tab: { $in: accessibleTabNames },
//     };

//     if(isReaded !== 'all'){
//       if (isReaded === 'read') {
//         query.isRead = true;
//       } else {
//         query.isRead = false;
//       }
//     }

//     const notifications = await CommonNotification_model.find(query).sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       data: notifications,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error?.message,
//     });
//   }
// };

const getAccessibleNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isReaded } = req.query;

    const user = await User_model.findById(userId)
      .populate("roleGroups.positions.positionId", "tabs")
      .select("roleGroups");

    // Collect all tabs from roleGroup positions
    const roleGroupTabs =
      user?.roleGroups?.flatMap((group) =>
        group.positions?.flatMap((pos) => pos.positionId?.tabs || [])
      ) || [];

    // Filter valid tabs (where read or visibility is true)
    const validTabs = roleGroupTabs.filter(
      (tab) => tab && (tab.visibility === true || tab.read === true)
    );

    // console.log("validTabs",validTabs);

    // If no valid tab access in any position, return empty
    if (validTabs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Get unique tab names
    const accessibleTabNames = [...new Set(validTabs.map((tab) => tab.name))];

    // Build query
    const query = {
      userId: new mongoose.Types.ObjectId(userId),
      tab: { $in: accessibleTabNames },
    };

    if (isReaded !== "all") {
      query.isRead = isReaded === "read";
    }

    const notifications = await CommonNotification_model.find(query).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.log("error", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

const getNotifications = (req, res) => {
  try {
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { details, isRead } = req.body;

    if (details === undefined && isRead === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "At least one field (tab, details, or isRead) must be provided to update",
      });
    }

    const updateData = {};
    if (details !== undefined) updateData.details = details;
    if (isRead !== undefined) updateData.isRead = isRead;

    const updated = await CommonNotification_model.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

const deleteNotification = async () => {
  // not done beause at that time is not use
};

const marksAllAsReadRealtedToUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await CommonNotification_model.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Task CRUD

const getTaskByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, departmentId, userfilterid, search } = req.query;

    const skip = (page - 1) * limit;


    const matchCondition = {};
    if (userId && userfilterid) {
      matchCondition["departments.employees"] = {
        $all: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(userfilterid)
        ]
      };
    } else if (userId) {
      matchCondition["departments.employees"] = new mongoose.Types.ObjectId(userId);
    }


    if (search) {
      matchCondition.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ];
    }


    if (departmentId) {
      matchCondition["departments.departmentId"] = new mongoose.Types.ObjectId(departmentId);
    }

    const tasks = await Task_model.aggregate([
      { $match: matchCondition },

      {
        $lookup: {
          from: "user_models",
          localField: "createdBy",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1, lastName: 1 } }],
          as: "createdBy"
        }
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },


      {
        $lookup: {
          from: "project_inquiry_models",
          localField: "projectInquiryId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, project_name: 1 } }],
          as: "projectInquiry"
        }
      },
      { $unwind: { path: "$projectInquiry", preserveNullAndEmptyArrays: true } },


      { $unwind: { path: "$assignments", preserveNullAndEmptyArrays: true } },


      {
        $lookup: {
          from: "departments",
          localField: "assignments.departmentId",
          foreignField: "_id",
          as: "departmentDetails"
        }
      },
      { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },


      {
        $lookup: {
          from: "user_models",
          localField: "assignments.employees",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1, lastName: 1 } }],
          as: "employeeDetails"
        }
      },


      {
        $addFields: {
          "assignments.departmentId": "$departmentDetails",
          "assignments.employees": "$employeeDetails"
        }
      },


      {
        $group: {
          _id: "$_id",
          details: { $first: "$details" },
          remark: { $first: "$remark" },
          status: { $first: "$status" },
          assignments: { $push: "$assignments" },
          projectInquiry: { $first: "$projectInquiry" },
          actionRequired: { $first: "$actionRequired" },
          type: { $first: "$type" },
          createdBy: { $first: "$createdBy" },
          dueDate: { $first: "$dueDate" },
          title: { $first: "$title" },
          description: { $first: "$description" },
          createdAt: { $first: "$createdAt" }
        }
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    ]);



    const totalCount = await Task_model.countDocuments(matchCondition);
    return res.status(200).json({
      success: true,
      message: "Successfully got tasks related to user",
      currentPage: Number(page),
      total_page: Math.ceil(totalCount / limit),
      totalCount,
      limit: Number(limit),
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};



const getTaskByCommonId = async (req, res) => {
  try {
    const { id } = req.params;

    const matchCondition = {};
    if (id) {
      matchCondition["commonId"] = id;
    }

    const tasks = await Task_model.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "user_models",
          localField: "createdBy",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "createdBy"
        }
      },
      { $unwind: "$createdBy" },

      { $unwind: "$assignments" },


      {
        $lookup: {
          from: "departments",
          localField: "assignments.departmentId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "department"
        }
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },


      {
        $lookup: {
          from: "user_models",
          localField: "assignments.employees",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "employees"
        }
      },

      {
        $lookup: {
          from: "project_inquiry_models",
          localField: "projectInquiryId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                project_name: 1,

              }
            }

          ],
          as: "projectInquiryId",
        },
      },
      { $unwind: { path: "$projectInquiryId", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          projectInquiryName: {
            $cond: [
              { $ifNull: ["$projectInquiryData.project_name", false] },
              "$projectInquiryData.project_name",
              "$projectInquiryId"
            ]
          }
        }
      },

      {
        $group: {
          _id: "$commonId",
          title: { $first: "$title" },
          type: { $first: "$type" },
          details: { $first: "$details" },
          dueDate: { $first: "$dueDate" },
          status: { $first: "$status" },
          createdBy: { $first: "$createdBy" },
          remark: { $first: "$remark" },
          projectInquiryId: { $first: "$projectInquiryId" },
          actionRequired: { $first: "$actionRequired" },
          description: { $first: "$description" },
          assignments: {
            $push: {
              department: "$department",
              employees: "$employees"
            }
          }
        }
      },
    ]);


    if (!tasks.length) {
      return res.status(400).json({
        success: true,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Successfully got tasks",
      data: tasks[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};


const createTaskOld = async (req, res) => {
  try {
    const {
      title,
      projectInquiryId = undefined,
      category,
      details,
      departments,
      actionRequired,
      dueDate,
      remark,
      phase,
      type,
      description,
    } = req.body;
    const createdBy = req.user?.id || req.admin?._id;
    if (
      !details ||
      !departments ||
      !Array.isArray(departments) ||
      departments.length === 0 ||
      !dueDate ||
      !createdBy
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }
    const tasksToCreate = [];
    for (const dept of departments) {
      const { departmentId, employees } = dept;
      if (Array.isArray(employees) && employees.length > 0) {
        for (const userId of employees) {
          const task = {
            type,
            category,
            title,
            projectInquiryId: projectInquiryId || null,
            details,
            description,
            departments: [
              {
                departmentId,
                employees: [userId, createdBy],
              },
            ],
            actionRequired,
            dueDate,
            remark,
            phase,
            status: "Active",
            createdBy,
          };
          tasksToCreate.push(task);
        }
      }
    }

    if (tasksToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users found to assign tasks.",
      });
    }
    const createdTasks = await Task_model.insertMany(tasksToCreate);
    return res.status(201).json({
      success: true,
      message: `${createdTasks.length} task(s) created successfully.`,
      data: createdTasks,
    });

  } catch (error) {
    console.error("Task creation error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server error.",
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { commonId } = req.params;
    const {
      title,
      projectInquiryId = undefined,
      category,
      details,
      actionRequired,
      dueDate,
      remark,
      type,
      description,
      assignments,
      previousAssignUserReply
    } = req.body;
    const createdBy = req.user?.id || req.admin?._id;
    let newTasks;

    
  
    if (req?.body?.updateType === "reassign") {
      let docsToInsert = [];
      await Task_model.deleteMany({ commonId });
      const newCommonId = uuidv4();
      assignments.forEach(assign => {
        assign.employees.forEach(empId => {
          docsToInsert.push({
            commonId: newCommonId,
            projectInquiryId: projectInquiryId || null,
            category,
            details,
            actionRequired,
            remark,
            type,
            title,
            description,
            dueDate,
            createdBy,
            assignments: [
              {
                departmentId: assign.departmentId,
                employees: [empId, createdBy]
              }
            ],
            previousAssignUserReply
          });
        });
      }); 

      
      newTasks = await Task_model.insertMany(docsToInsert);
      return res.json({
        message: "Task reassigned successfully",
        newTasks
      });
    } else {
      newTasks = await Task_model.updateMany(
        { commonId },
        {
          $set: {
            projectInquiryId: projectInquiryId || null,
            category,
            details,
            actionRequired,
            remark,
            type,
            title,
            description,
            dueDate,
            // assignments,
            previousAssignUserReply
          }
        },
        { new: true }
      );
      return res.json({
        message: "Task updated successfully",
        newTasks
      });
    }
  
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}


const createTask = async (req, res) => {
  try {

    const {
      title,
      projectInquiryId = undefined,
      category,
      details,
      actionRequired,
      dueDate,
      remark,
      type,
      description,
      assignments
    } = req.body;

    const commonId = uuidv4();
    const createdBy = req.user?.id || req.admin?._id;
    let docsToInsert = [];
    assignments.forEach(assign => {
      assign.employees.forEach(empId => {
        docsToInsert.push({
          commonId,
          projectInquiryId: projectInquiryId || null,
          category,
          details,
          actionRequired,
          remark,
          type,
          title,
          description,
          dueDate,
          createdBy,
          assignments: [
            {
              departmentId: assign.departmentId,
              employees: [empId, createdBy]
            }
          ],
          previousAssignUserReply: []
        });
      });
    });
    const savedTasks = await Task_model.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: "Tasks created successfully",
      commonId,
      count: savedTasks.length,
      data: savedTasks
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCommonTask = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, departmentId, userfilterid, search } = req.query;
    const skip = (page - 1) * limit;
    const matchCondition = {};
    if (userId && userfilterid) {
      matchCondition["assignments.employees"] = {
        $all: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(userfilterid)
        ]
      };
    } else if (userId) {
      matchCondition["assignments.employees"] = new mongoose.Types.ObjectId(userId);
    }

    if (search) {
      matchCondition.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ];
    }

    if (departmentId) {
      matchCondition["assignments.departmentId"] = new mongoose.Types.ObjectId(departmentId);
    }

    const tasks = await Task_model.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "user_models",
          localField: "createdBy",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "createdBy"
        }
      },
      { $unwind: "$createdBy" },

      { $unwind: "$assignments" },


      {
        $lookup: {
          from: "departments",
          localField: "assignments.departmentId",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "department"
        }
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },


      {
        $lookup: {
          from: "user_models",
          localField: "assignments.employees",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
          as: "employees"
        }
      },

      {
        $lookup: {
          from: "project_inquiry_models",
          localField: "projectInquiryId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                project_name: 1,

              }
            }

          ],
          as: "projectInquiryId",
        },
      },
      { $unwind: { path: "$projectInquiryId", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          projectInquiryName: {
            $cond: [
              { $ifNull: ["$projectInquiryData.project_name", false] },
              "$projectInquiryData.project_name",
              "$projectInquiryId"
            ]
          }
        }
      },

      {
        $group: {
          _id: "$commonId",
          title: { $first: "$title" },
          type: { $first: "$type" },
          details: { $first: "$details" },
          dueDate: { $first: "$dueDate" },
          status: { $first: "$status" },
          createdBy: { $first: "$createdBy" },
          remark: { $first: "$remark" },
          projectInquiryId: { $first: "$projectInquiryId" },
          actionRequired: { $first: "$actionRequired" },
          description: { $first: "$description" },
          assignments: {
            $push: {
              department: "$department",
              employees: "$employees"
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ]);
    // res.json(tasks);

    const totalCount = await Task_model.countDocuments(matchCondition);
    return res.status(200).json({
      success: true,
      message: "Successfully got tasks related to user",
      currentPage: Number(page),
      total_page: Math.ceil(totalCount / limit),
      totalCount,
      limit: Number(limit),
      data: tasks,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Something went wrong" });
  }
}

const deleteTaskBycommonId = async (req, res) => {
  try {
    const { commonId } = req.params;

    if (!commonId) {
      return res.status(400).json({ success: false, message: "commonId is required" });
    }
    const result = await Task_model.deleteMany({ commonId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No tasks found with this commonId" });
    }
    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} tasks deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



module.exports = {
  get_nav_notification,
  get_notification,
  update_status,
  get_notifications_filter_data,
  update_notification,

  addNotification,
  getAccessibleNotifications,
  updateNotification,
  deleteNotification,
  marksAllAsReadRealtedToUser,

  // Task Controller
  getTaskByUserId,
  createTask,
  updateTask,
  getTaskByCommonId,
  getCommonTask,
  deleteTaskBycommonId,

};
