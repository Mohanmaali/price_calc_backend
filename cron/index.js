// /config/cron/index.js
const currencyUpdaterJob = require("./currencyUpdate");
const projectInquiry = require("./projectInquiry");
const followUpReminder = require("./inquiryReminder");

function startAllCronJobs() {
    currencyUpdaterJob();
    projectInquiry();
    followUpReminder();
}

module.exports = startAllCronJobs;
