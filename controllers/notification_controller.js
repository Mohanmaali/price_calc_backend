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


// Check Validation 
function validateTask(body) {
  const { title, category, assignments, projectInquiryId } = body;
  if ((!title || typeof title !== "string") && (!projectInquiryId)) {
    return { valid: false, message: "Title is required" };
  }
  if (!category || typeof category !== "string") {
    return { valid: false, message: "Category is required" };
  }
  if (!Array.isArray(assignments)) {
    return { valid: false, message: "Assignments must be an array" };
  }
  else if (!assignments.length || !assignments[0].employees?.length) {
    return { valid: false, message: "Employee must be atleast one" };
  }
  return { valid: true };
}


const getTaskByCommonId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "invalid id" })
    }

    const userId = req.user.id;
    const matchCondition = {};

    matchCondition["commonId"] = id;
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
          pipeline: [{ $project: { project_name: 1 } }],
          as: "projectInquiryId",

        },
      },
      { $unwind: { path: "$projectInquiryId", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          isCreator: { $eq: ["$createdBy._id", new mongoose.Types.ObjectId(userId)] },
          assignmentForUser: {
            department: "$department",
            employees: "$employees",
            actionRequired: "$actionRequired",
            remark: "$remark",
            dueDate: "$dueDate",
            status: "$status",
            reply: "$reply",
            files: '$files'
          }
        }
      },

      {
        $group: {
          _id: "$commonId",
          title: { $first: "$title" },
          type: { $first: "$type" },
          category: { $first: "$category" },
          details: { $first: "$details" },
          createdBy: { $first: "$createdBy" },
          projectInquiryId: { $first: "$projectInquiryId" },
          description: { $first: "$description" },
          assignments: {
            $push: {
              department: "$department",
              employees: "$employees",
              actionRequired: "$actionRequired",
              remark: "$remark",
              dueDate: "$dueDate",
              status: "$status",
              reply: "$reply",
              files: "$files"
            }
          },
          assignmentsForUser: { $push: "$assignmentForUser" },
          isCreator: { $first: "$isCreator" }
        }
      },



      {
        $addFields: {
          assignments: {
            $cond: [
              "$isCreator",
              "$assignments", // full list 
              {
                $filter: {
                  input: "$assignmentsForUser",
                  as: "a",
                  cond: {
                    $in: [new mongoose.Types.ObjectId(userId), "$$a.employees._id"]
                  }
                }
              }
            ]
          }
        }
      },
      { $project: { assignmentsForUser: 0 } }
    ]);

    if (!tasks.length) {
      return res.status(400).json({
        success: false,
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

const updateTask = async (req, res) => {
  try {
    const { commonId } = req.params;
    const body = JSON.parse(req.body.formData || "{}");
    const result = validateTask(body);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    } else if (!commonId) {
      return res.status(400).json({ message: "Invalid commonId" });
    }
    const {
      title,
      projectInquiryId = undefined,
      category,
      details,
      type,
      description,
      previousAssignUserReply
    } = body;
    const createdBy = req.user?.id || req.admin?.id;
    let newTasks;

    //  ===========File Uplaod Start ===========
    if (req.files && req.files.length > 0) {
      const filesByAssignment = {};
      for (const f of req.files || []) {
        const m = /^files_(\d+)$/.exec(f.fieldname);
        if (!m) continue;
        const idx = Number(m[1]);
        (filesByAssignment[idx] ||= []).push({
          filename: f.filename,
          originalname: f.originalname,
          path: f.path,
          url: `${process.env.BACKENDURL}/${f.path}`
        });
      }
      body.assignments = (body.assignments || []).map((a, i) => ({
        ...a,
        files: [
          ...(a.files || []),
          ...(filesByAssignment[i] || []),
          ...(a.existingFiles || [])
        ],
      }));

    } else {

    }
    // ====================File Uplaod End============
    if (body?.updateType === "reassign") {
      let docsToInsert = [];
      await Task_model.deleteMany({ commonId });
      const newCommonId = uuidv4();
      body.assignments.forEach(assign => {
        assign.employees.forEach(empId => {
          const updateDocs = {
            commonId: newCommonId,
            projectInquiryId: projectInquiryId || null,
            category,
            details,
            type,
            title,
            description,
            createdBy,
            dueDate: assign?.dueDate,
            actionRequired: assign?.actionRequired || '',
            remark: assign?.remark,
            reply: assign?.reply,
            status: assign?.status,
            assignments: [
              {
                departmentId: assign.departmentId,
                employees: [empId, createdBy]
              },
            ],
            previousAssignUserReply
          }
          if (assign.files && assign.files.length > 0) {
            updateDocs.files = assign.files;
          } else {
            updateDocs.files = assign?.existingFiles || []
          }


          // console.log('=========assign============', assign);
          docsToInsert.push(updateDocs)
        });
      });


      newTasks = await Task_model.insertMany(docsToInsert);
      return res.json({
        message: "Task reassigned successfully",
        newTasks
      });
    } else {

      const bulkOps = [];
      body.assignments.forEach(assign => {
        assign.employees.forEach(empId => {
          const updateDoc = {
            title,
            type,
            description,
            details,
            actionRequired: assign.actionRequired || "",
            remark: assign.remark || "",
            dueDate: assign.dueDate ? new Date(assign.dueDate) : null,
            reply: assign.reply || '',
            status: assign.status || ''
          };
          // Only include files if provided
          if (assign.files && assign.files.length > 0) {
            updateDoc.files = assign.files;
          } else {
            updateDoc.files = assign.existingFiles || []
          }
          bulkOps.push({
            updateOne: {
              filter: {
                commonId,
                "assignments.departmentId": assign.departmentId,
                "assignments.employees": empId
              },
              update: { $set: updateDoc }
            }
          });
        });
      });
      if (bulkOps.length === 0) {
        return res.status(400).json({ success: false, message: "No updates provided" });
      }
      const result = await Task_model.bulkWrite(bulkOps);
      res.status(200).json({
        success: true,
        message: "Tasks updated successfully",
        result
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}
const createTask = async (req, res) => {
  try {
    const body = JSON.parse(req.body.formData || "{}");
    if (req.files && req.files.length > 0) {
      const filesByAssignment = {};
      for (const f of req.files || []) {
        const m = /^files_(\d+)$/.exec(f.fieldname);
        if (!m) continue;
        const idx = Number(m[1]);
        (filesByAssignment[idx] ||= []).push({
          filename: f.filename,
          originalname: f.originalname,
          path: f.path,
          url: `${process.env.BACKENDURL}/${f.path}`
        });
      }
      body.assignments = (body.assignments || []).map((a, i) => ({
        ...a,
        files: [
          ...(a.files || []),
          ...(filesByAssignment[i] || []),
          ...(a.existingFiles || [])
        ],
      }));
    }
    const {
      title,
      projectInquiryId = undefined,
      category,
      details,
      type,
      description,
      assignments
    } = body;
    const result = validateTask(body);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }
    const commonId = uuidv4();
    const createdBy = req.user?.id || req.admin?._id;
    let docsToInsert = [];
    assignments.forEach(assign => {
      assign.employees.forEach(empId => {
        const updateDocs = {
          commonId,
          projectInquiryId: projectInquiryId || null,
          category,
          details,
          type,
          title,
          description,
          createdBy,
          actionRequired: assign?.actionRequired || "",
          remark: assign?.remark || '',
          dueDate: assign.dueDate,
          assignments: [
            {
              departmentId: assign.departmentId,
              employees: [empId, createdBy]
            }
          ],
          previousAssignUserReply: []
        };
        if (assign.files && assign.files.length > 0) {
          updateDocs.files = assign.files;
        }
        docsToInsert.push(updateDocs)
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


const getCommonTaskByUserId = async (req, res) => {
  try {
 
    const userId = new mongoose.Types.ObjectId(req?.params?.userId);
    const { page = 1, limit = 10, departmentId, userfilterid, search, filtertype } = req.query;
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
      ];
    }
    if (filtertype) {
      matchCondition.category = filtertype;
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
      // { $unwind: "$assignments" },
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
        $addFields: {
          employees: {
            $cond: [
              { $eq: ["$createdBy._id", new mongoose.Types.ObjectId(userId)] },
              {
                $filter: {
                  input: "$employees",
                  as: "emp",
                  cond: { $ne: ["$$emp._id", new mongoose.Types.ObjectId(userId)] }
                }
              },
              {
                $filter: {
                  input: "$employees",
                  as: "emp",
                  cond: { $eq: ["$$emp._id", new mongoose.Types.ObjectId(userId)] }
                }
              }
            ]
          }
        }
      },
      // -----------------
      {
        $lookup: {
          from: "project_inquiry_models",
          localField: "projectInquiryId",
          foreignField: "_id",
          pipeline: [{ $project: { project_name: 1 } }],
          as: "projectInquiryId"
        }
      },
      { $unwind: { path: "$projectInquiryId", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          projectInquiryName: "$projectInquiryId.project_name",
          isCreator: {
            $eq: ["$createdBy._id", new mongoose.Types.ObjectId(userId)]
          },
          assignments: {
            department: "$department",
            employees: "$employees"
          }
        }  
      },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          category: 1,
          details: 1,
          dueDate: 1,
          status: 1,
          createdBy: 1,
          remark: 1,
          projectInquiryId: 1,
          projectInquiryName: 1,
          actionRequired: 1,  
          description: 1,
          isCreator: 1,
          assignments: 1,
          createdAt: 1,
          commonId: 1,
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
  createTask,
  updateTask,
  getTaskByCommonId,
  getCommonTaskByUserId,
  deleteTaskBycommonId,

};
