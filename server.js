const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');
const os = require('os');

// SSL certs from Let's Encrypt
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/mail.typingsprint.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/mail.typingsprint.com/fullchain.pem')
};

const server = new SMTPServer({
  secure: false, // we’re using STARTTLS on port 587
  key: options.key,
  cert: options.cert,
  authOptional: true, // set to false if you want to restrict usage
  disabledCommands: [], // enable STARTTLS, AUTH, etc.

  // 🔥 Core sending logic
  async onData(stream, session, callback) {
    let chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', async () => {
      const rawEmail = Buffer.concat(chunks).toString();

      const from = session.envelope.mailFrom.address;
      const recipients = session.envelope.rcptTo.map(rcpt => rcpt.address);

      for (let recipient of recipients) {
        const domain = recipient.split('@')[1];

        try {
          const mxRecords = await dns.resolveMx(domain);
          const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

          const transporter = nodemailer.createTransport({
            host: mxHost,
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false }
          });

          await transporter.sendMail({
            envelope: {
              from: from,
              to: recipient
            },
            raw: rawEmail
          });

          console.log(`✅ Sent to ${recipient} via ${mxHost}`);
        } catch (err) {
          console.error(`❌ Failed to send to ${recipient}: ${err.message}`);
        }
      }

      callback(); // acknowledge receipt
    });
  },

  // ❌ No local inbox logic, just relay
  onRcptTo(address, session, callback) {
    return callback(); // accept any recipient
  }
});

server.listen(587, () => {
  console.log(`📤 Outbound SMTP server running on port 587 (${os.hostname()})`);
});
