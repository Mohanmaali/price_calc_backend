const scheduler = require("node-schedule");
const Project_inquiry_Model = require("../models/project_inquiry_model");
const Task_model = require("../models/task_model");
const { createTasksForUsers } = require("../helpers/createTask");

function followUpReminder() {
    scheduler.scheduleJob('0 0 */10 * *', async function () {
        try {
            const matchingInquiries = await Project_inquiry_Model.find({
                estimation_status: "Submitted",
                sales_status: "Negotiations",
            });

            for (const inquiry of matchingInquiries) {
                // All Representative ids present in inquiry
                // const newUserIds = inquiry?.representative?.map(rep => rep?.userIds).flat() || [];
                const salesDeptId = inquiry?.salesDepartmentId?.toString();

                const salesUserIds = inquiry.representative
                    ?.filter(rep => rep.departmentId?.toString() === salesDeptId)
                    .map(rep => rep.userIds)
                    .flat() || [];

                const uniqueUserIds = [...new Set(salesUserIds.map(id => id.toString()))];

                if (uniqueUserIds.length === 0) continue;


                await createTasksForUsers(uniqueUserIds, {
                    link: `/project-inquiry/update/${inquiry?._id}`,
                    details: `Please take follow up from client for Project Inquiry: ${editedInquiryNumber}.`,
                    referenceId: inquiry?._id,
                    status: 'In Progress'
                })
            }

            console.log(
                `Created ${matchingInquiries.length} follow-up tasks at`,
                new Date().toLocaleString()
            );
        } catch (err) {
            console.error("followUpReminder cron failed:", err.message);
        }
    });
}

module.exports = followUpReminder;
