const {
  addInquiry,
  getEnquiryNumber,
  getInquires,
  getInquiryById,
  deleteInquiryById,
  updateInquiry,
  updateEnquiryStatus,
  getClientContacts,
  updateSalesStatus,
  requestRevision,
} = require("../controllers/project_inquiry");
const upload = require("../middleware/photo_middleware");
const role_auth = require("../middleware/role_auth");

const Router = require("express").Router();

Router.route("/add").post(
  role_auth(),
  upload.fields([
    { name: "files", maxCount: 10 },
    { name: "file", maxCount: 10 },
  ]),
  addInquiry
);

Router.route("/serial-number").get(getEnquiryNumber);
Router.route("/get").get(role_auth(), getInquires);
Router.route("/:id")
  .get(role_auth(), getInquiryById)
  .delete(role_auth(), deleteInquiryById);

// Router.put('/update/:id', upload.fields([{ name: 'files' }]), updateInquiry);
Router.put(
  "/update/:id",
  upload.fields([
    { name: "files" },
    // Add support for up to 10 quotation file groups
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `quotationFiles_${i}[]`,
    })),
  ]),
  role_auth(),
  updateInquiry
);

Router.put("/update/status/:id", role_auth(), updateEnquiryStatus);
Router.get("/contact/:id", role_auth(), getClientContacts);

// Update Sales status
Router.put("/update-sales-status/:inquiryId", role_auth(), updateSalesStatus);
Router.post("/request-revision/:id", role_auth(), requestRevision);

module.exports = Router;
