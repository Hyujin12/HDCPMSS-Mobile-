// email.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationCode(email, code) {
  try {
    const response = await resend.emails.send({
      from: "Halili Dental <onboarding@resend.dev>",
      to: email,
      subject: "Your Halili Dental Verification Code",
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>Welcome to Halili Dental Clinic</h2>
          <p>Here is your verification code:</p>
          <h1 style="color:#007bff;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    console.log("✅ Verification code sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Failed to send verification code:", error);
    throw error;
  }
}

module.exports = sendVerificationCode;
