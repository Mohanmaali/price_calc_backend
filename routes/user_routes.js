const express = require("express");
const Router = express.Router();

const { list_users, userDetail, updateUser, deleteUser } = require("../controllers/user_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload=require('../middleware/photo_middleware')

Router.route("/list").get(role_auth(), list_users);
Router.route("/detail/:id").get(role_auth(), userDetail);
Router.route("/update/:id").patch(role_auth(), upload.fields([{ name: 'image', maxCount: 1 }]),  updateUser);
Router.route("/delete/:id").delete(role_auth(), deleteUser);

module.exports = Router;
