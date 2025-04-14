const nodemailer = require('nodemailer');

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 587,
    secure: false, // STARTTLS
    tls: {
      rejectUnauthorized: false, // for local/self-signed certs
    }
  });

  const info = await transporter.sendMail({
    from: 'test@typingsprint.com',
    to: 'nashdev750@gmail.com',
    subject: '🚀 Test Email from Your Custom SMTP Server',
    text: 'This is a test email sent using your Node.js-based SMTP server!',
  });

  console.log('✅ Test email sent:', info.response);
}

sendTestEmail().catch(console.error);
