const nodemailer = require("nodemailer");

const sendInquiry = async (recepients, files, subject, message, res) => {
  console.log("files", files);
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
    let to = recepients.shift();
    let cc = recepients.length ? recepients : [];
    var mainOptions = {
      from: process.env.SMTP_USERNAME,
      to: to,
      cc: cc,
      subject: subject,
      html: `
    <p><strong>Email:</strong> ${message.email}</p>
    <p><strong>Inquiry Reference:</strong> ${message.inquiryRef}</p>
    <p><strong>Organization:</strong> ${message.organization}</p>
  `,
      text: `
    Email: ${message.email}
    Inquiry Reference: ${message.inquiryRef}
    Organization: ${message.organization}
  `,
      attachments: files,
    };
    const info = await transporter.sendMail(mainOptions);
    return info;
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendInquiry;
