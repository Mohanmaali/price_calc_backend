const express = require("express");
const router = express.Router();

const { get_logs, getOpenLogs } = require("../controllers/log_controller");
const role_auth = require("../middleware/role_auth");

router.route("/get/:id").get(get_logs);
router.route("/get-open/:id").get(getOpenLogs);

module.exports = router;
