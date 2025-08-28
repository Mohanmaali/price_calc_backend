const scheduler = require("node-schedule");
const Project_inquiry_Model = require("../models/project_inquiry_model");

function projectInquiry() {
  scheduler.scheduleJob("0 0 * * *", async function () {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueInquiries = await Project_inquiry_Model.find({
        quotation_submission_date: { $lt: today },
        estimationStatus: "Active",
      });

      for (const inquiry of overdueInquiries) {
        inquiry.estimationStatus = "Over Due";
        await inquiry.save();
      }

      console.log(
        `${overdueInquiries.length} inquiries marked as Overdue at`,
        new Date().toLocaleString()
      );
    } catch (err) {
      console.error("projectInquiry cron failed:", err.message);
    }
  });
}

module.exports = projectInquiry;
