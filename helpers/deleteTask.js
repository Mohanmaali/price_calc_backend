const Task_model = require("../models/task_model"); // Adjust the path as needed

// Function to delete a task by status and referenceId
const deleteTaskByStatusAndReferenceId = async (status, referenceId) => {
  try {
    // const deletedTask = await Task_model.findOneAndDelete({
    //   status,
    //   referenceId,
    // });
    const deletedTask = await Task_model.updateOne(
      { referenceId: updatedInquiry._id, status: "In Progress" },
      { $pull: { users: { $in: newEstimationReps } } },
      { new: true }
    );

    if (!deletedTask) {
      return {
        success: false,
        message: "No task found with the given status and referenceId.",
      };
    }

    return {
      success: true,
      message: "Task deleted successfully.",
      data: deletedTask,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = deleteTaskByStatusAndReferenceId;
