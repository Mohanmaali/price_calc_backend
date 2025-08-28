const multer = require("multer");
const crypto = require("crypto");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(2).toString("hex");

    const ext = file.originalname.split(".").pop();
    const name = file.originalname.split(".")[0].replace(/ /g, "_");
    cb(null, name + "-" + uniqueSuffix + "." + ext);
  },
});

const upload = multer({ storage });

module.exports = upload;
