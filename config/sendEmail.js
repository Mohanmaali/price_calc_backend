const nodemailer = require("nodemailer");
const ejs = require("ejs");
const Invited_model = require("../models/invited_model");

const sendEmail = (email, file, subject, message, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE, //comment this line if you use custom server/domain
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.EMAIL_PASS,
      },
    });
    ejs.renderFile(file, message, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        var mainOptions = {
          from: process.env.SMTP_USERNAME,
          to: email,
          subject: subject,
          html: data,
        };
        transporter.sendMail(mainOptions, function (err, info) {
          if (err) {
            console.log(err);
          } else {
            return res.send(
              "Message %s sent: %s",
              info.messageId,
              info.response
            );
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendEmail;
