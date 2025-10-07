const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, code) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'eugenedianito@gmail.com', // MUST MATCH sender below
      pass: 'djzhnohsceabsofd', // ✅ App password from Google
    },
  });

  const mailOptions = {
    from: '"Halili Dental Clinic" <eugenedianito@gmail.com>', // MUST match auth.user
    to: email,
    subject: 'Email Verification Code',
    html: `<p>Your verification code is: <strong>${code}</strong></p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.response);
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
};

module.exports = sendVerificationEmail;
