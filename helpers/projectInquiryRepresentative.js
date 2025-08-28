const createCommonNotification = require("./createNotification");
const { createTasksForUsers } = require("./createTask");

// extracting already present and esting user
const differentiateUserChanges = (
  oldReps = [],
  newReps = [],
  estimationDeptId,
  salesDeptId
) => {
  const formatRepsByDept = (reps) => {
    return reps.reduce((acc, rep) => {
      const deptId = rep.departmentId?.toString();
      const userIds = rep.userIds?.map((u) => u.toString()) || [];
      if (deptId) {
        acc[deptId] = acc[deptId] || new Set();
        userIds.forEach((id) => acc[deptId].add(id));
      }
      return acc;
    }, {});
  };

  const oldMap = formatRepsByDept(oldReps);
  const newMap = formatRepsByDept(newReps);

  const departments = [estimationDeptId?.toString(), salesDeptId?.toString()];
  const result = {};

  for (const deptId of departments) {
    const oldUsers = oldMap[deptId] || new Set();
    const newUsers = newMap[deptId] || new Set();

    const added = [...newUsers].filter((id) => !oldUsers.has(id));
    const removed = [...oldUsers].filter((id) => !newUsers.has(id));

    result[deptId] = { added, removed };
  }

  return result;
};

const ifAnyNewReprentativeAddedOrRemoveAfterInProgress = async (
  exitingInquiry,
  updatedInquiry
) => {
  const result = await differentiateUserChanges(
    exitingInquiry?.representative,
    updatedInquiry?.representative,
    exitingInquiry?.estimationDepartmentId,
    exitingInquiry?.salesDepartmentId
  );

  const estimationDeptData = result[exitingInquiry?.estimationDepartmentId];
  const salesDeptData = result[exitingInquiry?.salesDepartmentId];

  if (estimationDeptData?.added?.length > 0) {
    // Task and notification send from newly added user in estimation
    await createCommonNotification(
      estimationDeptData?.added,
      "Project Inquiry",
      `The project inquiry has been assigned to you with number: ${updatedInquiry?.edited_inquiry_number}`
    );

    await createTasksForUsers(estimationDeptData?.added, {
      link: `/project-inquiry/update/${exitingInquiry?._id}`,
      details: `You have been assigned a new project inquiry (Number: ${
        updatedInquiry?.edited_inquiry_number
      }). Kindly proceed to submit the quotation before ${new Date(
        updatedInquiry?.quotation_submission_date
      ).toLocaleDateString()}.`,
      referenceId: exitingInquiry?._id,
      status: "In Progress",
    });
  }

  if (estimationDeptData?.removed?.length > 0) {
    // Task and notification send from removed user in estimation
    await createCommonNotification(
      estimationDeptData?.removed,
      "Project Inquiry",
      `You have been removed from the project inquiry with number: ${updatedInquiry?.edited_inquiry_number}`
    );

    // await createTasksForUsers(estimationDeptData?.added,{
    //   link: `/project-inquiry/update/${exitingInquiry?._id}`,
    //   details:`You have been removed from the project inquiry (Number: ${updatedInquiry?.editedInquiryNumber}). You are no longer required to submit a quotation.`,
    //   referenceId: exitingInquiry?._id,
    //   status:'In Progress'
    // })
  }

  if (salesDeptData?.added?.length > 0) {
    // Task and notification send from newly added user in sales
    await createCommonNotification(
      salesDeptData?.added,
      "Project Inquiry",
      `You have been assigned a new Project Inquiry (Number: ${updatedInquiry?.edited_inquiry_number}).`
    );

    await createTasksForUsers(salesDeptData?.added, {
      link: `/project-inquiry/update/${exitingInquiry?._id}`,
      details: `You have been assigned a new Project Inquiry (Number: ${updatedInquiry?.edited_inquiry_number}). Kindly proceed to follow up with client.`,
      referenceId: exitingInquiry?._id,
      status: "Negotiations",
    });
  }

  if (salesDeptData?.removed?.length > 0) {
    // Task and notification send from removed user in sales
    await createCommonNotification(
      salesDeptData?.removed,
      "Project Inquiry",
      `You have been removed as a sales representative from the project inquiry (Number: ${updatedInquiry?.edited_inquiry_number}).`
    );
  }

  return;
};

module.exports = ifAnyNewReprentativeAddedOrRemoveAfterInProgress;
