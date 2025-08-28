const express = require("express");
const Router = express.Router();

const {
  add_material,
  get_all_material,
  get_single_material,
  update_Material,
  update_grade,
  add_grade,
  get_all_grade,
  get_single_grade,
  add_color,
  get_all_color,
  get_single_color,
  update_color,
  add_finish,
  get_all_finish,
  get_single_finish,
  update_finish,
  material_assigned_to,
  grade_assigned_to,
  color_assigned_to,
  finish_assigned_to,
  delete_material,
  delete_grade,
  delete_color,
  delete_finish,
  get_excel_material
} = require("../controllers/raw_material_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");

// material controllers
Router.route("/add").post(role_auth(), add_material);
Router.route("/get").get(role_auth(), get_all_material);
Router.route("/get/:id").get(role_auth(), get_single_material);
Router.route("/update/:id").patch(role_auth(), update_Material);
Router.route("/assigned/:id").get(role_auth(), material_assigned_to);
Router.route("/delete/:id").delete(role_auth(), delete_material);
Router.route("/excel/get").get(role_auth(), get_excel_material);

// // grade controllers
// Router.route("/grade/add").post(role_auth(), add_grade);
// Router.route("/grade/get").get(role_auth(), get_all_grade);
// Router.route("/grade/get/:id").get(role_auth(), get_single_grade);
// Router.route("/grade/update/:id").patch(role_auth(), update_grade);
// Router.route("/grade/assigned/:id").get(role_auth(), grade_assigned_to);
// Router.route("/grade/delete/:id").delete(role_auth(), delete_grade);

// // color controllers
// Router.route("/color/add").post(role_auth(), add_color);
// Router.route("/color/get").get(role_auth(), get_all_color);
// Router.route("/color/get/:id").get(role_auth(), get_single_color);
// Router.route("/color/update/:id").patch(role_auth(), update_color);
// Router.route("/color/assigned/:id").get(role_auth(), color_assigned_to);
// Router.route("/color/delete/:id").delete(role_auth(), delete_color);

// // finish controllers
// Router.route("/finish/add").post(role_auth(), add_finish);
// Router.route("/finish/get").get(role_auth(), get_all_finish);
// Router.route("/finish/get/:id").get(role_auth(), get_single_finish);
// Router.route("/finish/update/:id").patch(role_auth(), update_finish);
// Router.route("/finish/assigned/:id").get(role_auth(), finish_assigned_to);
// Router.route("/finish/delete/:id").delete(role_auth(), delete_finish);

module.exports = Router;
