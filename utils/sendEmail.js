const nodemailer = require("nodemailer");

console.log("EMAIL USER:", process.env.EMAIL_USER);
console.log("EMAIL PASS EXISTS:", !!process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log("Verifying SMTP connection...");

    await transporter.verify();

    console.log("SMTP connection verified.");

    const info = await transporter.sendMail({
      from: '"TopStudyTutor" <githinjijohn0294@gmail.com>',
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);

    return info;
  } catch (err) {
    console.error("SMTP ERROR:", err);
    throw err;
  }
};

module.exports = sendEmail;