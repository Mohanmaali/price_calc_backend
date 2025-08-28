const Task_model = require("../models/task_model");

const createTasksForUsers = async (
  userIds,
  { link, details, referenceId, status, tab = "Project Inquiry", remark }
) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("No userIds provided for task creation.");
  }

  if (!details) {
    throw new Error("Details is required to create task.");
  }

  // Step 1: Find existing tasks to avoid duplicates
  const existingTasks = await Task_model.find({
    userId: { $in: userIds },
    referenceId,
    tab,
  }).select("userId"); // Only need userId for comparison

  const existingUserIds = new Set(
    existingTasks.map((task) => task.userId.toString())
  );

  // Step 2: Filter out users who already have the task
  const newTasks = userIds
    .filter((userId) => !existingUserIds.has(userId.toString()))
    .map((userId) => ({
      userId,
      link,
      details,
      referenceId,
      tab, 
      status,
      remark,
    }));

  // if (newTasks.length > 0) {
  //   await Task_model.insertMany(newTasks);
  // }
  await Task_model.create(newTasks);
};

module.exports = {
  createTasksForUsers,
};
