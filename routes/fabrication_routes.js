const Router = require("express").Router();

const {
  addFabrication,
  getAllFabrications,
  getSingleFabrication,
  updateFabrication,
} = require("../controllers/fabrication_controller");

const role_auth = require("../middleware/role_auth");

Router.route("/add").post(role_auth(), addFabrication);
Router.route("/get").get(role_auth(), getAllFabrications);
Router.route("/get/:id").get(role_auth(), getSingleFabrication);
Router.route("/update/:id").post(role_auth(), updateFabrication);

module.exports = Router;
