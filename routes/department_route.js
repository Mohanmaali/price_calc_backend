const express = require("express");
const Router = express.Router();

const {
  add_Department,
  get_Department,
  get_DepartmentById,
  delete_Department,
  update_Department,
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
} = require("../controllers/department_controller");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/check-assigned").get(role_auth(), checkAssigned)

Router.route("/add").post(role_auth(), upload.single("photo"), add_Department);
Router.route("/get_all").get(role_auth(), get_Department);
Router.get("/team/:deptId",role_auth(),getTeamsRelatedToDepartment);
Router.route("/:id").get(role_auth(), get_DepartmentById);
Router.route("/:id").patch(role_auth(), upload.single("photo"), update_Department);
Router.route("/:id").delete(role_auth(), delete_Department);

// team
Router.route("/:deptId/team").post(role_auth(), upload.single("photo"), addTeam);
Router.route("/:deptId/team/:teamId").get(role_auth(), getTeamById);
Router.route("/:deptId/team/:teamId").patch(role_auth(), upload.single("photo"), updateTeam);
Router.route("/team/:teamId").delete(role_auth(), upload.single("photo"), deleteTeam);
Router.route("/team/:teamId/position").get(role_auth(),getPositionsRelatedToTeam)

//position
Router.route("/:deptId/team/:teamId/position").post(role_auth(), upload.single("photo"), addPosition);
Router.route("/:deptId/team/:teamId/position/:positionId").get(role_auth(), getPositionById);
Router.route("/:deptId/team/:teamId/position/:positionId").patch(role_auth(), upload.single("photo"), updatePosition);
Router.route("/position/:positionId").delete(role_auth(), upload.single("photo"), deletePosition);

// check department able to delete or not
Router.route("/check-assigned/:deptId").get(role_auth(),isDepartmentPresentAnywhere);
Router.route("/check-assigned-team/:teamId").get(role_auth(),isTeamPresentAnywhere);
Router.route("/check-assigned-position/:positionId").get(role_auth(),isPositionPresentAnywhere);


// extract users on the basis of dept, team and position
Router.route("/users/department/:deptId/team/:teamId/position/:positionId").get(role_auth(),getUsers);

Router.route("/positions").get(role_auth(),getPositionsByTeamGrouped);
Router.route("/position/:id").get(role_auth(),getUserWithPopulatedTabs);
Router.route("/employee/:deptId").get(role_auth(),getUsersByDepartMentId);

// Reterive user present in any department
// Router.route("/estimation/:estimationDeptId/user/:userId").get(role_auth(),isExistInsideHeadOfDeptartment);
Router.route('/head/check-head-of-department').get(role_auth(),isExistInsideHeadOfDeptartment);

// check user is assigned in inquiry
Router.route("/user/:userId").get(role_auth(),isUserAssignedInInquiry);

// Set Estimation & Sales Deptment for project Inquiry
Router.route('/set-est-sales-dept').post(role_auth(),setEstimationAndSalesDepartment);
Router.route('/static/get-est-sales-dept').get(role_auth(), getSelectedEstimationAndSalesDepartment);
Router.route('/update-est-sales-dept/:id').put(role_auth(),updateEstimationSalesDepartment);

Router.route('/present/check-representative').get(role_auth(),isUserIsSalesRepresentative);

module.exports = Router;
