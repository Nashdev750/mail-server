const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.typingsprint.com',
  port: 587,
  secure: false,
  auth: {
    user: 'apiuser',
    pass: 'supersecret123'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendEmail() {
  await transporter.sendMail({
    from: 'noreply@typingsprint.com',
    to: 'nashdev750@gmail.com',
    subject: 'Hello from your own SMTP!',
    text: 'This is plain text.',
    html: '<h2>This is HTML</h2><p>With some styling.</p>',
    attachments: [
      {
        filename: 'hello.txt',
        content: 'Hello world!'
      }
    ]
  });

  console.log('✅ Email sent!');
}
sendEmail()