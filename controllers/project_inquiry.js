const { default: mongoose } = require("mongoose");
const InquiryType = require("../models/inquiryType");

const ProjectInquiry = require("../models/project_inquiry_model");
const Client = require("../models/client");

const path = require("path");
const fs = require("fs");
const createCommonNotification = require("../helpers/createNotification");
const Position = require("../models/position");
const User_model = require("../models/user_model");
const ProjectInquiryDepartmentSelection = require("../models/inquiry_department_selection_model");
const Team = require("../models/teams");
const { createTasksForUsers } = require("../helpers/createTask");
const deleteTaskByStatusAndReferenceId = require("../helpers/deleteTask");
const Task_model = require("../models/task_model");
const ifAnyNewReprentativeAddedOrRemoveAfterInProgress = require("../helpers/projectInquiryRepresentative");
const Project_inquiry_Model = require("../models/project_inquiry_model");

// get Head department Related to department ids
const getHODUsersByMultipleDepartments = async (departmentIds = []) => {
  try {
    // Convert to ObjectId array
    const objectIds = departmentIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Step 1: Get 'Head Of Department' teams in these departments
    const hodTeams = await Team.find({
      department: { $in: objectIds },
      name: "Head Of Department",
    });

    const hodTeamIds = hodTeams.map((team) => team._id);

    // Step 2: Get 'Administrator' and 'Director' positions in those teams
    const positions = await Position.find({
      // team: { $in: hodTeamIds },
      department: { $in: objectIds },
      name: { $in: ["Administrator", "Director"] },
    });

    const positionIds = positions.map((pos) => pos._id.toString());

    // Step 3: Get users who hold any of those positions within matching dept/team
    const users = await User_model.find({
      roleGroups: {
        $elemMatch: {
          "department._id": { $in: objectIds },
          "team._id": { $in: hodTeamIds },
          "positions.positionId": { $in: positionIds },
        },
      },
    });

    // Return only user IDs
    return users.map((user) => user._id.toString());
  } catch (error) {
    console.error("Error in getHODUsersByMultipleDepartments:", error.message);
    return [];
  }
};

const addInquiry = async (req, res) => {
  const files = req.files;
  const other = files.files || [];
  try {
    const {
      client_name,
      inquiryNumber,
      editedinquiryNumber,
      inquiryType,
      project_name,
      // inquiry,
      client_confirmation_number,
      quotation_submission_date,
      contacts,
      departmentId,
      teamId,
      // positionId,
      // userIds,
      country,
      state,
      city,
      inquiryCreatedBy,
      date,
      representative,
      estimationDepartmentId,
      salesDepartmentId,
    } = JSON.parse(req.body.project_form);
    const clientForm = JSON.parse(req.body.client_form) || [];
    const scopeArray = JSON.parse(req.body.scope) || [];
    // let partsData = JSON.parse(req.body.parts) || [];

    // partsData = partsData.filter(
    //   part => {
    //     return part.code_id && part.ref_code_id
    //   }
    // );

    if (
      !clientForm?.name ||
      !inquiryCreatedBy ||
      !date ||
      !country ||
      !state ||
      !city ||
      !inquiryNumber ||
      !editedinquiryNumber ||
      !inquiryType ||
      !project_name ||
      !client_confirmation_number ||
      !quotation_submission_date ||
      scopeArray?.length == 0
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Extract Extimation Department Id
    const estimationSalesDepartment =
      await ProjectInquiryDepartmentSelection.find();
    const isAnyUsersPresent = await getHODUsersByMultipleDepartments([
      estimationSalesDepartment[0]?.estimationDepartmentId,
      estimationSalesDepartment[0]?.salesDepartmentId,
    ]);

    if (isAnyUsersPresent?.length == 0) {
      return res.status(400).json({
        success: false,
        message:
          "No user assigned in Head Of Department,Please and then create",
      });
    }

    const ifExistingInquiry = await ProjectInquiry.find({
      $or: [{ edited_inquiry_number: editedinquiryNumber }],
    });
    if (ifExistingInquiry.length) {
      return res
        .status(400)
        .json({ mssg: "Inquiry already with this number." });
    }

    const filesData = JSON.parse(req.body.fileData) || [];

    // const combinedFiles = other.map((file) => {
    //   const fileInfo = filesData.find((data) => data.name === file.originalname);
    //   return {
    //     file: files.files,
    //     name: fileInfo ? fileInfo.name : "",
    //     path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
    //     date: fileInfo ? fileInfo.date : "",
    //     revision: fileInfo ? fileInfo.revision : 0,
    //     type: fileInfo ? fileInfo.type : ".jpg",
    //   };
    // });

    const combinedFiles = other.map((file) => {
      const fileInfo = filesData.find(
        (data) => data.name === file.originalname
      );

      return {
        file: files.files, // This line was incorrect before
        name: fileInfo ? fileInfo.name : "",
        path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
        date: fileInfo ? fileInfo.date : "",
        revision: fileInfo ? fileInfo.revision : 0,
        type: fileInfo ? fileInfo.type : ".jpg",
      };
    });

    // let  newInquiry = new ProjectInquiry({
    //   client_name: new mongoose.Types.ObjectId(clientForm?.id),
    //   contacts,
    //   inquiry_number: inquiryNumber,
    //   inquiryType,
    //   project_name,
    //   inquiry,
    //   client_confirmation_number,
    //   quotation_submission_date: new Date(quotation_submission_date),
    //   country,
    //   state,
    //   city,
    //   departmentId,
    //   teamId,
    //   parts: partsData,
    //   scope: scopeArray,
    //   files: combinedFiles
    // });
    let newInquiry;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const submissionDate = new Date(quotation_submission_date);
    submissionDate.setHours(0, 0, 0, 0);
    const enquiryStatus = submissionDate < today ? "Overdue" : "Active";
    if (departmentId) {
      newInquiry = new ProjectInquiry({
        client_name: new mongoose.Types.ObjectId(clientForm?.id),
        contacts,
        inquiry_number: inquiryNumber,
        edited_inquiry_number: editedinquiryNumber,
        inquiryType,
        project_name,
        // inquiry,
        client_confirmation_number,
        quotation_submission_date: new Date(quotation_submission_date),
        estimationStatus: enquiryStatus,
        country,
        state,
        city,
        departmentId,
        teamId,
        // positionId,
        // userIds,
        inquiryCreatedBy,
        date: new Date(date),
        // parts: partsData,
        parst: [],
        scope: scopeArray,
        files: combinedFiles,
        representative,
        estimationDepartmentId:
          estimationSalesDepartment[0]?.estimationDepartmentId,
        salesDepartmentId: estimationSalesDepartment[0]?.salesDepartmentId,
      });
    } else {
      newInquiry = new ProjectInquiry({
        client_name: new mongoose.Types.ObjectId(clientForm?.id),
        contacts,
        inquiry_number: inquiryNumber,
        edited_inquiry_number: editedinquiryNumber,
        inquiryType,
        project_name,
        // inquiry,
        client_confirmation_number,
        quotation_submission_date: new Date(quotation_submission_date),
        estimationStatus: enquiryStatus,
        country,
        state,
        city,
        departmentId: null,
        teamId: null,
        // positionId: null,
        // userIds: [],
        date: new Date(date),
        // parts: partsData,
        inquiryCreatedBy,
        parts: [],
        scope: scopeArray,
        files: combinedFiles,
        representative,
        estimationDepartmentId:
          estimationSalesDepartment[0]?.estimationDepartmentId,
        salesDepartmentId: estimationSalesDepartment[0]?.salesDepartmentId,
      });
    }

    await newInquiry.save();

    // creating Notification
    // const userIds = newInquiry.representative?.map((represent) =>  represent?.userIds).flat();
    await createCommonNotification(
      isAnyUsersPresent,
      "Project Inquiry",
      `New Project Inquiry Has Been Created with number: ${editedinquiryNumber}`
    );

    // Creating Task
    await createTasksForUsers(isAnyUsersPresent, {
      link: `/project-inquiry/update/${newInquiry?._id}?estimationDepartmentId=${estimationSalesDepartment[0]?.estimationDepartmentId}&salesDepartmentId=${estimationSalesDepartment[0]?.salesDepartmentId}`,
      details: `A new Project Inquiry (Number: ${editedinquiryNumber}) has been created. Please assign an appropriate employee to handle this inquiry.`,
      referenceId: newInquiry?._id,
      status: "Active",
    });

    return res
      .status(201)
      .json({ success: true, message: "Inquiry created", data: newInquiry });
  } catch (error) {
    console.error("Transaction failed:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating inquiry",
      error: error.message,
    });
  }
};

const getEnquiryNumber = async (req, res) => {
  try {
    const { clientName } = req.query;
    // const data = await ProjectInquiry.find({
    //   client_name: new mongoose.Types.ObjectId(clientName),
    // }).populate("client_name");

    // if (data.length >= 0) {
    //   const serial_number = (data.length + 1).toString().padStart(3, "0");
    //   return res.status(200).json({ serial_number });
    // } else {
    //   return res
    //     .status(404)
    //     .json({ mssg: "No Supplier found for this client." });
    // }
    const data = await ProjectInquiry.aggregate([
      { $match: { client_name: new mongoose.Types.ObjectId(clientName) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$inquiry_number",
          revision: { $push: "$revision" },
        },
      },
      { $project: { inquiry_number: 1, revision: 1 } },
    ]);
    if (data.length >= 0) {
      const serial_number = (data.length + 1).toString().padStart(3, "0");
      res.status(200).json({ serial_number });
    } else {
      res.status(404).json({ mssg: "No Supplier found for this client." });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

const getInquires = async (req, res) => {
  try {
    const { filter = {}, page, search = "", userId } = req.query;

    const { clientId, inquiryType, status, salesStatus } = filter;

    const searchRegex = new RegExp(search, "i");
    const and = [];

    const limit = 10;
    const pageNumber = parseInt(page) || 1;
    const skip = (pageNumber - 1) * limit;

    if (inquiryType && mongoose.Types.ObjectId.isValid(inquiryType)) {
      and.push({ inquiryType: new mongoose.Types.ObjectId(inquiryType) });
    }
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      and.push({ client_name: new mongoose.Types.ObjectId(clientId) });
    }
    if (status) {
      and.push({ estimationStatus: status });
    }
    if (salesStatus) {
      and.push({ salesStatus: salesStatus });
    }

    if (
      userId &&
      userId !== "null" &&
      mongoose.Types.ObjectId.isValid(userId)
    ) {
      const user = await User_model.findById(userId);
      const userDepartmentIds = (user?.roleGroups || [])
        .map((group) => group.department?._id?.toString())
        .filter(Boolean);

      const departmentMatchCondition = {
        $or: [
          {
            "representative.departmentId": {
              $in: userDepartmentIds.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
            },
          },
          {
            estimationDepartmentId: {
              $in: userDepartmentIds.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
            },
          },
          {
            salesDepartmentId: {
              $in: userDepartmentIds.map(
                (id) => new mongoose.Types.ObjectId(id)
              ),
            },
          },
        ],
      };

      and.push({
        $or: [
          { "representative.userIds": new mongoose.Types.ObjectId(userId) },
          departmentMatchCondition,
        ],
      });
    }

    const matchStage = {
      $match: {
        $and: [
          {
            $or: [
              { inquiry_number: { $regex: searchRegex } },
              { edited_inquiry_number: { $regex: searchRegex } },
              { client_confirmation_number: { $regex: searchRegex } },
            ],
          },
          ...(and.length > 0 ? [...and] : []),
        ],
      },
    };

    let pipeline;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      pipeline = [
        matchStage,
        {
          $addFields: {
            currentUserId: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "user_models",
            localField: "currentUserId",
            foreignField: "_id",
            as: "currentUser",
          },
        },
        { $unwind: "$currentUser" },
        {
          $lookup: {
            from: "teams",
            let: {
              estDeptId: "$estimationDepartmentId",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$department", "$$estDeptId"],
                      },
                      {
                        $eq: ["$name", "Head Of Department"],
                      },
                    ],
                  },
                },
              },
              { $project: { _id: 1, tabs: 0 } },
            ],
            as: "estimationHeadTeams",
          },
        },
        {
          $lookup: {
            from: "teams",
            let: { salesDeptId: "$salesDepartmentId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$department", "$$salesDeptId"],
                      },
                      {
                        $eq: ["$name", "Head Of Department"],
                      },
                    ],
                  },
                },
              },
              { $project: { _id: 1, tabs: 0 } },
            ],
            as: "salesHeadTeams",
          },
        },
        {
          $lookup: {
            from: "positions",
            pipeline: [
              {
                $match: {
                  name: {
                    $in: ["Director", "Administrator"],
                  },
                },
              },
              { $project: { _id: 1, tabs: 0 } },
            ],
            as: "headPositions",
          },
        },
        {
          $addFields: {
            isAssignedInEstimation: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$representative",
                      as: "rep",
                      cond: {
                        $and: [
                          {
                            $eq: [
                              "$$rep.departmentId",
                              "$estimationDepartmentId",
                            ],
                          },
                          {
                            $in: ["$currentUserId", "$$rep.userIds"],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            isAssignedInSales: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$representative",
                      as: "rep",
                      cond: {
                        $and: [
                          {
                            $eq: ["$$rep.departmentId", "$salesDepartmentId"],
                          },
                          {
                            $in: ["$currentUserId", "$$rep.userIds"],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            isEstimationHead: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$currentUser.roleGroups",
                      as: "role",
                      cond: {
                        $and: [
                          {
                            $eq: [
                              "$$role.department._id",
                              "$estimationDepartmentId",
                            ],
                          },
                          {
                            $eq: ["$$role.team.name", "Head Of Department"],
                          },
                          {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: "$$role.positions",
                                    as: "pos",
                                    cond: {
                                      $in: [
                                        "$$pos.name",
                                        ["Director", "Administrator"],
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            isSalesHead: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$currentUser.roleGroups",
                      as: "role",
                      cond: {
                        $and: [
                          {
                            $eq: [
                              "$$role.department._id",
                              "$salesDepartmentId",
                            ],
                          },
                          {
                            $eq: ["$$role.team.name", "Head Of Department"],
                          },
                          {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: "$$role.positions",
                                    as: "pos",
                                    cond: {
                                      $in: [
                                        "$$pos.name",
                                        ["Director", "Administrator"],
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
            isQuotationFilled: {
              $gt: [
                {
                  $size: {
                    $ifNull: ["$quotationSubmissions", []],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: "clients",
            localField: "client_name",
            foreignField: "_id",
            as: "client_name",
          },
        },
        {
          $unwind: {
            path: "$client_name",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "inquirytypes",
            localField: "inquiryType",
            foreignField: "_id",
            as: "inquiryType",
          },
        },
        {
          $unwind: {
            path: "$inquiryType",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            estimationHeadTeams: 0,
            salesHeadTeams: 0,
            headPositions: 0,
            currentUser: 0,
          },
        },
        {
          $lookup: {
            from: "task_models",
            localField: "_id",
            foreignField: "referenceId",
            as: "revisionRequestTask",
            pipeline: [
              {
                $match: {
                  status: "Revision Request",
                },
              },
              {
                $sort: {
                  createdAt: -1,
                },
              },
              {
                $limit: 1,
              },
            ],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: "$inquiry_number",
            latestInquiry: { $first: "$$ROOT" }, // Keep the latest inquiry
            previousInquiry: {
              $push: {
                _id: "$_id",
                revision: "$revision",
              },
            },
          },
        },
        {
          $addFields: {
            latestInquiry: {
              previousInquiry: {
                $filter: {
                  input: "$previousInquiry",
                  as: "inquiry",
                  cond: { $ne: ["$$inquiry._id", "$latestInquiry._id"] },
                },
              },
            },
          },
        },
        {
          $replaceRoot: { newRoot: "$latestInquiry" },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ];
    } else {
      pipeline = [
        matchStage,
        {
          $addFields: {
            isAssignedInEstimation: true,
            isAssignedInSales: true,
            isEstimationHead: true,
            isSalesHead: true,
            isQuotationFilled: {
              $gt: [
                {
                  $size: {
                    $ifNull: ["$quotationSubmissions", []],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: "clients",
            localField: "client_name",
            foreignField: "_id",
            as: "client_name",
          },
        },
        {
          $unwind: {
            path: "$client_name",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "inquirytypes",
            localField: "inquiryType",
            foreignField: "_id",
            as: "inquiryType",
          },
        },
        {
          $unwind: {
            path: "$inquiryType",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            estimationHeadTeams: 0,
            salesHeadTeams: 0,
            headPositions: 0,
            currentUser: 0,
          },
        },
        {
          $lookup: {
            from: "task_models",
            localField: "_id",
            foreignField: "referenceId",
            as: "revisionRequestTask",
            pipeline: [
              {
                $match: {
                  status: "Revision Request",
                },
              },
              {
                $sort: {
                  createdAt: -1,
                },
              },
              {
                $limit: 1,
              },
            ],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: "$inquiry_number",
            latestInquiry: { $first: "$$ROOT" }, // Keep the latest inquiry
            previousInquiry: {
              $push: {
                _id: "$_id",
                revision: "$revision",
              },
            },
          },
        },
        {
          $addFields: {
            latestInquiry: {
              previousInquiry: {
                $filter: {
                  input: "$previousInquiry",
                  as: "inquiry",
                  cond: { $ne: ["$$inquiry._id", "$latestInquiry._id"] },
                },
              },
            },
          },
        },
        {
          $replaceRoot: { newRoot: "$latestInquiry" },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ];
    }
    const result = await ProjectInquiry.aggregate(pipeline);
    const response = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    return res.status(200).json({
      success: true,
      message: "Successfully retrieved project inquiries",
      data: response,
      currentPage: pageNumber,
      total_page: totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    let response = await ProjectInquiry.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client_name",
          foreignField: "_id",
          as: "client_details",
        },
      },
      {
        $unwind: {
          path: "$client_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "currency_models",
          localField: "client_details.currency_id",
          foreignField: "_id",
          as: "client_currency",
        },
      },
      {
        $lookup: {
          from: "inquirytypes",
          localField: "inquiryType",
          foreignField: "_id",
          as: "inquiry_type_details",
        },
      },
      {
        $unwind: {
          path: "$inquiry_type_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          departmentIdObject: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$departmentId", null] },
                  { $ne: ["$departmentId", undefined] },
                ],
              },
              then: "$departmentId",
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "departmentIdObject",
          foreignField: "_id",
          as: "department_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$department_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          teamIdObject: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$teamId", null] },
                  { $ne: ["$teamId", undefined] },
                ],
              },
              then: "$teamId",
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "teamIdObject",
          foreignField: "_id",
          as: "team_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$team_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          positionId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$positionId", null] },
                  { $ne: ["$positionId", undefined] },
                ],
              },
              then: "$positionId",
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "positions",
          localField: "positionId",
          foreignField: "_id",
          as: "position_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$position_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$representative",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "representative.departmentId",
          foreignField: "_id",
          as: "representative.department_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$representative.department_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "representative.teamId",
          foreignField: "_id",
          as: "representative.team_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$representative.team_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "positions",
          localField: "representative.positionId",
          foreignField: "_id",
          as: "representative.position_details",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$representative.position_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "user_models",
          localField: "representative.userIds",
          foreignField: "_id",
          as: "representative.user_details",
        },
      },
      {
        $lookup: {
          from: "user_models",
          localField: "inquiryCreatedBy",
          foreignField: "_id",
          as: "inquiryCreatedByDetails",
          pipeline: [
            {
              $project: {
                tabs: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$inquiryCreatedByDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          inquiryCreatedByDetails: {
            _id: "$inquiryCreatedByDetails._id",
            name: "$inquiryCreatedByDetails.name",
          },
        },
      },
      {
        $lookup: {
          from: "scope_works",
          localField: "scope",
          foreignField: "_id",
          as: "scope_details",
        },
      },
      {
        $addFields: {
          "representative.isAssignedInEstimation": {
            $eq: ["$representative.departmentId", "$estimationDepartmentId"],
          },
          "representative.isAssignedInSales": {
            $eq: ["$representative.departmentId", "$salesDepartmentId"],
          },
          "representative.isEstimationHead": {
            $and: [
              {
                $eq: [
                  "$representative.departmentId",
                  "$estimationDepartmentId",
                ],
              },
              {
                $eq: [
                  "$representative.team_details.name",
                  "Head Of Department",
                ],
              },
              {
                $in: [
                  "$representative.position_details.name",
                  ["Director", "Administrator"],
                ],
              },
            ],
          },
          "representative.isSalesHead": {
            $and: [
              { $eq: ["$representative.departmentId", "$salesDepartmentId"] },
              {
                $eq: [
                  "$representative.team_details.name",
                  "Head Of Department",
                ],
              },
              {
                $in: [
                  "$representative.position_details.name",
                  ["Director", "Administrator"],
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          client_name: { $first: "$client_details" },
          contacts: { $first: "$contacts" },
          inquiryType: { $first: "$inquiry_type_details" },
          inquiry_number: { $first: "$inquiry_number" },
          edited_inquiry_number: { $first: "$edited_inquiry_number" },
          project_name: { $first: "$project_name" },
          inquiry: { $first: "$inquiry" },
          client_confirmation_number: { $first: "$client_confirmation_number" },
          quotation_submission_date: { $first: "$quotation_submission_date" },
          country: { $first: "$country" },
          state: { $first: "$state" },
          city: { $first: "$city" },
          date: { $first: "$date" },
          departmentId: { $first: "$department_details" },
          teamId: { $first: "$team_details" },
          positionId: { $first: "$position_details" },
          userIds: { $first: "$user_details" },
          files: { $first: "$files" },
          estimationStatus: { $first: "$estimationStatus" },
          scope: { $first: "$scope_details" },
          parts: { $push: "$parts" },
          representative: { $push: "$representative" },
          inquiryCreatedBy: { $first: "$inquiryCreatedByDetails" },
          quotationSubmissions: { $first: "$quotationSubmissions" },
          salesStatus: { $first: "$salesStatus" },
          estimationDepartmentId: { $first: "$estimationDepartmentId" },
          salesDepartmentId: { $first: "$salesDepartmentId" },
          currency_details: { $first: "$client_currency" },
          revision: { $first: "$revision" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Successfully get inquiry",
      data: response,
    });
  } catch (error) {
    console.log("error", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Server error",
    });
  }
};

const deleteInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const projectInquiry = await ProjectInquiry.findById(
      new mongoose.Types.ObjectId(id)
    );

    if (!projectInquiry) {
      return res.status(400).json({
        success: false,
        message: "Project Inquiry not found related to this id",
      });
    }

    const response = await ProjectInquiry.findByIdAndDelete(id);

    if (response) {
      const deletedTask = await Task_model.deleteMany({
        referenceId: id,
      });
    }
    return res.status(201).json({
      success: true,
      message: "Project Inquiry successfully deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Server error",
    });
  }
};

const getRepsForDepartment = (inquiry, departmentId) => {
  const deptRep = inquiry.representative.find(
    (rep) => rep.departmentId.toString() === departmentId.toString()
  );
  return deptRep ? deptRep.userIds.map((id) => id.toString()) : [];
};

const getQuotationIds = (inquiry) => {
  return inquiry.quotationSubmissions
    ? inquiry.quotationSubmissions.map((q) => q._id.toString())
    : [];
};

const taskSendLogic = async (
  originalInquiry,
  updatedInquiry,

  estimationDepartmentId,
  salesDepartmentId,
  estimationHODList,
  salesHODList,
  isUserEstimationHOD,
  isUserSalesHOD,
  isUserEstimationRep,
  isUserSalesRep,
  oldEstimationReps,
  newEstimationReps,
  addedEstimationReps,
  removedEstimationReps,
  oldSalesReps,
  newSalesReps,
  addedSalesReps,
  removedSalesReps,
  oldQuotationIds,
  newQuotationIds,
  addedQuotationIds,
  removedQuotationIds,
  addedQuotations,
  removedQuotations
) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const submissionDate = new Date(updatedInquiry.quotation_submission_date);
    submissionDate.setHours(0, 0, 0, 0);
    const hasInvalidSubmissionDate = submissionDate < today ? true : false;

    await Task_model.deleteMany({
      referenceId: updatedInquiry._id,
      status: "Revision Request",
    });

    if (isUserEstimationHOD && addedEstimationReps.length) {
      console.log("new rep added in estimation by hod");
      // await deleteTaskByStatusAndReferenceId("Active", updatedInquiry?._id);

      await createCommonNotification(
        addedEstimationReps,
        "Project Inquiry",
        `The project inquiry has been assigned to you with number: ${updatedInquiry.edited_inquiry_number}`
      );

      await createTasksForUsers(addedEstimationReps, {
        link: `/project-inquiry/update/${updatedInquiry?._id}`,
        details: `You have been assigned a new project inquiry (Number: ${
          updatedInquiry.edited_inquiry_number
        }). Kindly proceed to submit the quotation before ${new Date(
          updatedInquiry.quotation_submission_date
        ).toLocaleDateString()}.`,
        referenceId: updatedInquiry?._id,
        status: "In Progress",
      });
      await Task_model.updateOne(
        { referenceId: updatedInquiry._id, status: "Active" },
        { $pull: { users: { $in: estimationHODList } } }
      );
      await ProjectInquiry.findByIdAndUpdate(updatedInquiry._id, {
        estimationStatus: "In Progress",
      });
    }

    if (
      !isUserEstimationHOD &&
      isUserEstimationRep &&
      addedQuotationIds.length
    ) {
      console.log("estimation rep added a quotation");
      // await deleteTaskByStatusAndReferenceId(
      //   "In Progress",
      //   updatedInquiry?._id
      // );

      await createCommonNotification(
        [...newSalesReps, ...salesHODList],
        "Project Inquiry",
        `The quotation for Project Inquiry Number ${updatedInquiry.edited_inquiry_number} has been submitted`
      );
      await ProjectInquiry.findByIdAndUpdate(updatedInquiry._id, {
        estimationStatus: "Submitted",
      });
      if (hasInvalidSubmissionDate) {
        console.log(2.1);
        await createTasksForUsers([...newSalesReps, ...salesHODList], {
          link: `/project-inquiry/update/${updatedInquiry?._id}`,
          details: `The quotation for Project Inquiry Number ${updatedInquiry.edited_inquiry_number} has been submitted after the due date.`,
          referenceId: updatedInquiry?._id,
          status: "Submitted",
        });
      } else {
        console.log(2.2);
        await createTasksForUsers([...newSalesReps, ...salesHODList], {
          link: `/project-inquiry/update/${updatedInquiry?._id}`,
          details: `Quotation  has been added for Project Inquiry Number ${updatedInquiry.edited_inquiry_number}.`,
          referenceId: updatedInquiry?._id,
          status: "Submitted",
        });
      }
      await Task_model.updateOne(
        { referenceId: updatedInquiry._id, status: "In Progress" },
        { $pull: { users: { $in: newEstimationReps } } }
      );
    }

    if (isUserSalesHOD && addedSalesReps.length) {
      console.log("new rep added in sales by hod");
      // await deleteTaskByStatusAndReferenceId("Submitted", updatedInquiry?._id);
      await createCommonNotification(
        addedSalesReps,
        "Project Inquiry",
        `You have been assigned a new Project Inquiry (Number: ${updatedInquiry.edited_inquiry_number}).`
      );
      await ProjectInquiry.findByIdAndUpdate(updatedInquiry._id, {
        salesStatus: "Negotiations",
      });
      // await createTasksForUsers(addedSalesReps, {
      //   link: `/project-inquiry/update/${updatedInquiry?._id}`,
      //   details: `You have been assigned a new Project Inquiry (Number: ${updatedInquiry.edited_inquiry_number}). Kindly proceed to follow up with client.`,
      //   referenceId: updatedInquiry?._id,
      //   status: "Negotiations",
      // });
      await Task_model.create({
        users: addedSalesReps,
        link: `/project-inquiry/update/${updatedInquiry?._id}`,
        details: `You have been assigned a new Project Inquiry (Number: ${updatedInquiry.edited_inquiry_number}). Kindly proceed to follow up with client.`,
        referenceId: updatedInquiry?._id,
        status: "Negotiations",
      });
      await Task_model.updateOne(
        { referenceId: updatedInquiry._id, status: "Active" },
        { $pull: { users: { $in: salesHODList } } }
      );
    }

    if (removedEstimationReps.length) {
      console.log("est hod removed a rep");
      await createCommonNotification(
        removedEstimationReps,
        "Project Inquiry",
        `You have been removed from the project inquiry with number: ${updatedInquiry?.edited_inquiry_number}`
      );
    }

    if (removedSalesReps.length) {
      console.log("sales hod removed a rep");
      await createCommonNotification(
        removedSalesReps,
        "Project Inquiry",
        `You have been removed from the project inquiry with number: ${updatedInquiry?.edited_inquiry_number}`
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const sentByDetails = async (userId, oldInquiry, updatedInquiry) => {
  try {
    const selectedDepartments = await ProjectInquiryDepartmentSelection.find();
    const estimationDepartmentId =
      selectedDepartments[0].estimationDepartmentId;
    const salesDepartmentId = selectedDepartments[0].salesDepartmentId;

    const estimationHODList = await getHODUsersByMultipleDepartments([
      estimationDepartmentId,
    ]);
    const salesHODList = await getHODUsersByMultipleDepartments([
      salesDepartmentId,
    ]);

    const isUserEstimationHOD = estimationHODList.some(
      (hod) => hod === userId.toString()
    );
    const isUserSalesHOD = salesHODList.some(
      (hod) => hod === userId.toString()
    );

    const isUserEstimationRep = updatedInquiry.representative.some(
      (rep) =>
        rep.departmentId.toString() === estimationDepartmentId.toString() &&
        rep.userIds.includes(userId)
    );
    const isUserSalesRep = updatedInquiry.representative.some(
      (rep) =>
        rep.departmentId.toString() === salesDepartmentId.toString() &&
        rep.userIds.includes(userId)
    );

    // Estimation
    const oldEstimationReps = getRepsForDepartment(
      oldInquiry,
      estimationDepartmentId
    );
    const newEstimationReps = getRepsForDepartment(
      updatedInquiry,
      estimationDepartmentId
    );

    const addedEstimationReps = newEstimationReps.filter(
      (id) => !oldEstimationReps.includes(id)
    );
    const removedEstimationReps = oldEstimationReps.filter(
      (id) => !newEstimationReps.includes(id)
    );

    // Sales
    const oldSalesReps = getRepsForDepartment(oldInquiry, salesDepartmentId);
    const newSalesReps = getRepsForDepartment(
      updatedInquiry,
      salesDepartmentId
    );

    const addedSalesReps = newSalesReps.filter(
      (id) => !oldSalesReps.includes(id)
    );
    const removedSalesReps = oldSalesReps.filter(
      (id) => !newSalesReps.includes(id)
    );

    // For IDs only
    const oldQuotationIds = getQuotationIds(oldInquiry);
    const newQuotationIds = getQuotationIds(updatedInquiry);

    const addedQuotationIds = newQuotationIds.filter(
      (id) => !oldQuotationIds.includes(id)
    );
    const removedQuotationIds = oldQuotationIds.filter(
      (id) => !newQuotationIds.includes(id)
    );

    // If you want full objects instead of just IDs:
    const addedQuotations = updatedInquiry.quotationSubmissions.filter((q) =>
      addedQuotationIds.includes(q._id.toString())
    );
    const removedQuotations = oldInquiry.quotationSubmissions.filter((q) =>
      removedQuotationIds.includes(q._id.toString())
    );

    // console.log(userId, estimationHODList, salesHODList);
    // console.log("est hod", isUserEstimationHOD, "sales hod", isUserSalesHOD);
    // console.log("est rep", isUserEstimationRep, "sales rep", isUserSalesRep);

    // console.log("Added estimation reps:", addedEstimationReps);
    // console.log("Removed estimation reps:", removedEstimationReps);
    // console.log("Added sales reps:", addedSalesReps);
    // console.log("Removed sales reps:", removedSalesReps);
    return {
      estimationDepartmentId,
      salesDepartmentId,
      estimationHODList,
      salesHODList,
      isUserEstimationHOD,
      isUserSalesHOD,
      isUserEstimationRep,
      isUserSalesRep,
      oldEstimationReps,
      newEstimationReps,
      addedEstimationReps,
      removedEstimationReps,
      oldSalesReps,
      newSalesReps,
      addedSalesReps,
      removedSalesReps,
      oldQuotationIds,
      newQuotationIds,
      addedQuotationIds,
      removedQuotationIds,
      addedQuotations,
      removedQuotations,
    };
  } catch (error) {
    console.log(error);
  }
};

const updateInquiry = async (req, res) => {
  const inquiryId = req.params.id;
  const files = req.files;
  const other = files?.files || [];
  const existingFiles = JSON.parse(req.body.existingFiles) || [];

  const quotationSubmissions = [];

  Object.keys(req.body).forEach((key) => {
    if (key.startsWith("quotationDocuments_")) {
      const index = parseInt(key.split("_")[1], 10);
      const documents = JSON.parse(req.body[key] || "[]");

      const uploadedFiles = (
        req.files?.[`quotationFiles_${index}[]`] || []
      ).map((file) => ({
        name: file.originalname,
        path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
      }));

      quotationSubmissions[index] = {
        editedQuotationNumber: req.body[`editedQuotationNumber_${index}`],
        quotationNumber: req.body[`quotationNumber_${index}`],
        date: req.body[`quotationDate_${index}`] || null,
        remark: req.body[`quotationRemark_${index}`] || "",
        price: req.body[`quotationPrice_${index}`] || "",
        documents: [...documents, ...uploadedFiles],
      };
    }
  });

  // Normalize structure
  const sanitizedQuotationSubmissions = quotationSubmissions.map((entry) => {
    return {
      quotationNumber: entry?.quotationNumber,
      editedQuotationNumber: entry?.editedQuotationNumber,
      date: entry.date ? new Date(entry.date) : null,
      remark: entry.remark,
      price: entry?.price,
      documents: entry.documents.map((doc) => ({
        name: doc.name,
        path: doc.path,
        mimetype: doc.mimetype,
        size: doc.size,
      })),
    };
  });

  try {
    // Parse all incoming JSON data
    const {
      client_name,
      inquiryNumber,
      inquiryType,
      project_name,
      // inquiry,
      client_confirmation_number,
      quotation_submission_date,
      country,
      city,
      state,
      departmentId,
      teamId,
      positionId,
      userIds,
      date,
      editedInquiryNumber,
      representative,
      isEnquiryInSales,
      contacts,
    } = JSON.parse(req.body.project_form);

    const partsData = JSON.parse(req.body.parts || "[]");
    const filesData = JSON.parse(req.body.fileData || "[]");
    const scopeArray = JSON.parse(req.body.scope || "[]");
    const clientForm = JSON.parse(req.body.client_form || "{}");
    // Validate and convert clientForm.id to ObjectId
    if (!mongoose.isValidObjectId(clientForm.id)) {
      throw new Error("Invalid client ID");
    }
    const clientId = new mongoose.Types.ObjectId(clientForm.id);

    // Validate and convert inquiryType to ObjectId
    if (!mongoose.isValidObjectId(inquiryType)) {
      throw new Error("Invalid inquiry type ID");
    }
    const inquiryTypeId = new mongoose.Types.ObjectId(inquiryType);

    // Sanitize partsData: convert code_id and ref_code_id to ObjectId if valid
    const sanitizedParts = partsData.map((part) => ({
      ...part,
      code_id: mongoose.isValidObjectId(part.code_id)
        ? new mongoose.Types.ObjectId(part.code_id)
        : null,
      ref_code_id: mongoose.isValidObjectId(part.ref_code_id)
        ? new mongoose.Types.ObjectId(part.ref_code_id)
        : null,
    }));

    // Sanitize scope array to only valid ObjectIds
    const sanitizedScope = scopeArray
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const combinedFiles = other.map((file) => {
      const fileInfo = filesData.find(
        (data) => data.name === file.originalname
      );
      return {
        file, // This line was incorrect before
        name: fileInfo ? fileInfo.name : "",
        path: `${process.env.BACKENDURL}/uploads/${file.filename}`,
        date: fileInfo ? fileInfo.date : "",
        revision: fileInfo ? fileInfo.revision : 0,
        type: fileInfo ? fileInfo.type : ".jpg",
      };
    });

    const fullFileList = [
      ...combinedFiles,
      ...existingFiles.map((file) => ({
        ...file,
        file: null,
        source: "server",
      })),
    ];

    // files deleted flow start

    const originalInquiry = await ProjectInquiry.findById(inquiryId);

    const { estimationStatus, salesStatus } = originalInquiry;

    if (!originalInquiry) {
      throw new Error("Inquiry not found");
    }

    const originalFiles = originalInquiry.files || [];
    const retainedFilePaths = fullFileList.map((f) => f.path);

    const deletedFiles = originalFiles.filter(
      (origFile) => !retainedFilePaths.includes(origFile.path)
    );
    for (const file of deletedFiles) {
      const filePath = path.resolve(
        __dirname,
        "../uploads",
        path.basename(file.path)
      );
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error(`Error deleting file ${filePath}:`, err);
        }
      });
    }

    // files deleted flow end

    // Quatation Files deleted flow start
    // Remove deleted quotation files from server
    const originalQuotationSubmissions =
      originalInquiry?.quotationSubmissions || [];

    const updatedQuotationDocuments = sanitizedQuotationSubmissions?.flatMap(
      (submission) => (submission.documents || [])?.map((doc) => doc.path)
    );

    const originalQuotationDocuments = originalQuotationSubmissions?.flatMap(
      (submission) => (submission.documents || [])?.map((doc) => doc.path)
    );

    // Files to delete: present in original but not in updated
    const quotationFilesToDelete = originalQuotationDocuments?.filter(
      (path) => !updatedQuotationDocuments?.includes(path)
    );

    // Delete those files from the server
    for (const filePath of quotationFilesToDelete) {
      const fileOnDisk = path.resolve(
        __dirname,
        "../uploads",
        path.basename(filePath)
      );
      fs.unlink(fileOnDisk, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error(`Error deleting quotation file ${fileOnDisk}:`, err);
        }
      });
    }
    const updateData = {
      client_name: clientId,
      inquiry_number: inquiryNumber,
      inquiryType: inquiryTypeId,
      project_name,
      // inquiry,
      client_confirmation_number,
      date: new Date(date),
      quotation_submission_date: new Date(quotation_submission_date),
      country,
      city,
      state,
      departmentId: departmentId || null,
      teamId: teamId || null,
      positionId: positionId || null,
      userIds: userIds || [],
      // parts: sanitizedParts,
      parts: [],
      scope: sanitizedScope,
      files: fullFileList,
      edited_inquiry_number: editedInquiryNumber,
      representative,
      estimationStatus,
      quotationSubmissions: sanitizedQuotationSubmissions,
      contacts,
    };

    if (
      !clientId ||
      !inquiryNumber ||
      !inquiryTypeId ||
      !project_name ||
      !client_confirmation_number ||
      !date ||
      !quotation_submission_date ||
      !country ||
      !state ||
      !city ||
      !editedInquiryNumber ||
      sanitizedScope?.length == 0
    ) {
      return res.status(400).json({
        success: false,
        message: "All feilds are required",
      });
    }

    const updatedInquiry = await ProjectInquiry.findByIdAndUpdate(
      inquiryId,
      updateData,
      { new: true }
    );
    const {
      estimationDepartmentId,
      salesDepartmentId,
      estimationHODList,
      salesHODList,
      isUserEstimationHOD,
      isUserSalesHOD,
      isUserEstimationRep,
      isUserSalesRep,
      oldEstimationReps,
      newEstimationReps,
      addedEstimationReps,
      removedEstimationReps,
      oldSalesReps,
      newSalesReps,
      addedSalesReps,
      removedSalesReps,
      oldQuotationIds,
      newQuotationIds,
      addedQuotationIds,
      removedQuotationIds,
      addedQuotations,
      removedQuotations,
    } = await sentByDetails(req.user._id, originalInquiry, updatedInquiry);

    await taskSendLogic(
      originalInquiry,
      updatedInquiry,

      estimationDepartmentId,
      salesDepartmentId,
      estimationHODList,
      salesHODList,
      isUserEstimationHOD,
      isUserSalesHOD,
      isUserEstimationRep,
      isUserSalesRep,
      oldEstimationReps,
      newEstimationReps,
      addedEstimationReps,
      removedEstimationReps,
      oldSalesReps,
      newSalesReps,
      addedSalesReps,
      removedSalesReps,
      oldQuotationIds,
      newQuotationIds,
      addedQuotationIds,
      removedQuotationIds,
      addedQuotations,
      removedQuotations
    );

    return res.status(200).json({
      success: true,
      message: "Inquiry updated",
      data: updatedInquiry,
    });
  } catch (error) {
    console.error("Update transaction failed:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating inquiry",
      error: error.message,
    });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    const inquiry = await ProjectInquiry.findById(id);
    if (!inquiry) {
      return res.status(400).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const response = await ProjectInquiry.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { estimationStatus: status }
    );
    return res.status(200).json({
      success: true,
      message: "status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};

const getClientContacts = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await Client.findById(new mongoose.Types.ObjectId(id));
    if (!response) {
      return res.status(400).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "client successfully get",
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    });
  }
};
const updateSalesStatus = async (req, res) => {
  try {
    const { salesStatus } = req.body;
    const { inquiryId } = req.params;

    if (!salesStatus || !inquiryId) {
      return res.status(400).json({
        success: false,
        message: "Missing inquiryId or salesStatus",
      });
    }

    const updated = await ProjectInquiry.findByIdAndUpdate(
      inquiryId,
      { salesStatus },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Project Inquiry not found",
      });
    }

    // await deleteTaskByStatusAndReferenceId('Submitted', inquiryId);
    // await deleteTaskByStatusAndReferenceId('Negotiations', inquiryId);
    await Task_model.deleteMany({
      referenceId: new mongoose.Types.ObjectId(inquiryId),
    });

    return res.status(200).json({
      success: true,
      message: "Sales status updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
};

const requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const inquiry = await Project_inquiry_Model.findById(id);
    if (!inquiry) {
      return res.status(400).json({ mssg: "Inquiry not found" });
    }
    const { _id, createdAt, updatedAt, revision, ...rest } = inquiry.toObject();
    const revisedInquiry = await Project_inquiry_Model.create({
      ...rest,
      estimationStatus: "In Progress",
      revision: (inquiry.revision || 0) + 1,
      quotationSubmissions: [],
    });
    const estimationDepartmentId = revisedInquiry.estimationDepartmentId;
    const estimationHODList = await getHODUsersByMultipleDepartments([
      estimationDepartmentId,
    ]);
    const estimationReps = revisedInquiry.representative
      .filter(
        (rep) =>
          rep.departmentId.toString() === estimationDepartmentId.toString()
      )
      .flatMap((rep) => rep.userIds.map((u) => u.toString()));
    const recipients = [...new Set([...estimationHODList, ...estimationReps])];

    await deleteTaskByStatusAndReferenceId("In Progress", id);

    await createCommonNotification(
      recipients,
      "Project Inquiry",
      `Sales has requested revision for Project Inquiry: ${revisedInquiry.edited_inquiry_number} (Revision: ${revisedInquiry.revision}).`
    );

    await createTasksForUsers(recipients, {
      link: `/project-inquiry/update/${revisedInquiry?._id}/`,
      details: `Sales has requested revision for Project Inquiry (Number: ${revisedInquiry.edited_inquiry_number}, Revision: ${revisedInquiry.revision}). Kindly submit the updated quotation.\n Remark: ${remark}`,
      referenceId: revisedInquiry?._id,
      status: "Revision Request",
      remark: remark,
    });

    return res
      .status(200)
      .json({ success: true, mssg: "Successfully requested revision" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ mssg: "Some error occured" });
  }
};

module.exports = {
  addInquiry,
  getEnquiryNumber,
  getInquires,
  getInquiryById,
  deleteInquiryById,
  updateInquiry,
  updateEnquiryStatus,
  getClientContacts,
  updateSalesStatus,
  requestRevision,
};
