const router = require("express").Router();

const {
  updatePDF_Fields,
  getPDF_Fields,
} = require("../controllers/pdf_fields_controller");
const role_auth = require("../middleware/role_auth");

router.route("/").get(role_auth(), getPDF_Fields);
router.route("/").patch(role_auth(), updatePDF_Fields);

module.exports = router;
