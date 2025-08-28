const nodemailer = require("nodemailer");
const path = require("path");

const sendPurchase = async (recepients, subject, message, files, res) => {
  try {
    const { email, purchase_order_num, name, organization } =
      typeof message === "object" ? message : {};
    const htmlContent = `
    <p>Dear ${name ? name : ""},</p>
    <p>I hope this message finds you well.</p>
    <p>
      Please find attached the detailed inquiry (Purchase Order No.: <strong>${purchase_order_num}</strong>) 
      in the PDF file for your review. Kindly take a look and let us know if you require 
      any additional details or clarifications.
    </p>
    <p>We look forward to your response.</p>
    <p>Best regards,<br>Team ${organization}</p>
  `;
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.EMAIL_PASS,
      },
    });
    var mainOptions = {
      from: process.env.SMTP_USERNAME,
      to: recepients,
      subject: subject,
      html: htmlContent,
      attachments: files,
      // text: messageText,
      //  attachments: files,
    };
    const info = await transporter.sendMail(mainOptions);
    return info;
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendPurchase;
