const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(email, link) {
  await resend.emails.send({
    from: 'Halili Dental <noreply@halilidental.com>',
    to: email,
    subject: 'Verify your account',
    html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
  });
}

module.exports = sendVerificationEmail;
