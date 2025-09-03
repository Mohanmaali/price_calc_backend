const express = require("express");
const Router = express.Router();

const {
  get_notification,
  update_status,
  get_notifications_filter_data,
  get_nav_notification,
  update_notification,
  addNotification,
  updateNotification,
  getAccessibleNotifications,
  deleteNotification,
  marksAllAsReadRealtedToUser,
  createTask,
  getTaskByCommonId,
  updateTask,
  getCommonTaskByUserId,
  deleteTaskBycommonId,
} = require("../controllers/notification_controller");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

// for notification

Router.route("/today").get(get_nav_notification);
Router.route("/all").get(get_notification);
Router.route("/update_status/:id").patch(update_status);
Router.route("/get-filter-data").get(get_notifications_filter_data);
Router.route("/update-notification/:id").patch(update_notification);

// For Common Notification
Router.route("/").post(addNotification);

// Route for '/:id'
Router.route("/common/:userId")
  .get(getAccessibleNotifications)
  .put(updateNotification)
  .delete(deleteNotification); 
  
Router.route("/common/mark-all-read/:userId").put(marksAllAsReadRealtedToUser);

// For Task Assigned  
// Router.route("/task/").post(createTask);
Router.route("/task/").post(auth, upload.any(), createTask);
Router.route("/task/reassign/:commonId").post(auth, upload.any(), updateTask);

Router.route("/task/:userId").get(getCommonTaskByUserId);
Router.route("/task/:id/byid").get(auth, getTaskByCommonId);
Router.route("/task/:commonId").delete(auth, deleteTaskBycommonId);
module.exports = Router; 
