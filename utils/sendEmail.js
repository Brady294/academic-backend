const axios = require("axios");

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is missing");
  }

  try {
    console.log("Sending email through Brevo API...");

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "TopStudyTutor",
          email: process.env.EMAIL_FROM,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("✅ Email sent successfully.");
    console.log("Brevo Response:", response.data);

    return response.data;
  } catch (error) {
    console.error("❌ BREVO API ERROR");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};

module.exports = sendEmail;