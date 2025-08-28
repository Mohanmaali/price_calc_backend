const express = require("express");
const Router = express.Router();

const {
  add_user,
  signin,
  invite,
  forget_pwd_email,
  forget_password,
  getUserDetails,
} = require("../controllers/auth_controllers");
const auth = require("../middleware/auth");
const role_auth = require("../middleware/role_auth");
const upload = require("../middleware/photo_middleware");

Router.route("/signup").post(add_user);
Router.route("/signin").post(signin);
Router.route("/forget_pwd_email").post(forget_pwd_email);
Router.route("/forget_password").post(forget_password);
Router.route("/invite").post(role_auth(), upload.fields([{ name: 'image', maxCount: 1 }]), invite);
Router.route("/me").get(auth, getUserDetails);

module.exports = Router;
