const CommonNotification_model = require("../models/commonNotification");

const createCommonNotification = async (userIds, tab, details) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0 || !tab) {
      return false;
    }

    // Build payload for each userId
    const notifications = userIds.map((id) => ({
      userId: id,
      tab,
      details
    }));

    // Create all notifications in one go
    await CommonNotification_model.insertMany(notifications);

    return true;
  } catch (error) {
    console.error("Error creating notifications:", error);
    return false;
  }
};

module.exports = createCommonNotification;
