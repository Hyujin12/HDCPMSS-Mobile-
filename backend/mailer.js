// email.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(email, verificationLink) {
  try {
    const response = await resend.emails.send({
      from: "Halili Dental <onboarding@resend.dev>", // change to verified domain later
      to: email,
      subject: "Verify your Halili Dental account",
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2>Welcome to Halili Dental Clinic</h2>
          <p>Click below to verify your account:</p>
          <a href="${verificationLink}" 
             style="display:inline-block;background:#007bff;color:#fff;padding:10px 20px;
             border-radius:5px;text-decoration:none;">Verify Email</a>
        </div>
      `,
    });

    console.log("✅ Email sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}

module.exports = sendVerificationEmail;
