const Router = require("express").Router();

const {
  addUnit,
  getUnits,
  getSingleUnit,
  updateUnit,
} = require("../controllers/unit_controller");

const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), addUnit);
Router.route("/get").get(role_auth(), getUnits);
Router.route("/get/:id").get(role_auth(), getSingleUnit);
Router.route("/update/:id").post(role_auth(), updateUnit);

module.exports = Router;
