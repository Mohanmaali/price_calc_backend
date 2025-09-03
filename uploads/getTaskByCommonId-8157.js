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
              employees: "$employees",
              actionRequired: "$actionRequired",
              remark: "$remark",
              dueDate: "$dueDate",
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