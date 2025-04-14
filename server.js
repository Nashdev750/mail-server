const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');

// TLS certs from Let's Encrypt
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/mail.typingsprint.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/mail.typingsprint.com/fullchain.pem')
};

// 🔒 Use strong credentials (or load from env/DB)
const AUTH_USER = 'apiuser';
const AUTH_PASS = 'supersecret123';

const server = new SMTPServer({
  secure: false,
  key: options.key,
  cert: options.cert,
  authOptional: false, // 🔐 Require auth!
  disabledCommands: [], // Allow STARTTLS and AUTH

  // 🔒 Simple username/password auth
  onAuth(auth, session, callback) {
    if (auth.username === AUTH_USER && auth.password === AUTH_PASS) {
      return callback(null, { user: AUTH_USER });
    }
    return callback(new Error('Unauthorized'));
  },

  // 📤 Relay to external mail server (e.g. Gmail)
  async onData(stream, session, callback) {
    let chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', async () => {
      const rawEmail = Buffer.concat(chunks).toString();

      const from = session.envelope.mailFrom.address;
      const recipients = session.envelope.rcptTo.map(rcpt => rcpt.address);

      for (const recipient of recipients) {
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
              from,
              to: recipient
            },
            raw: rawEmail
          });

          console.log(`✅ Sent to ${recipient} via ${mxHost}`);
        } catch (err) {
          console.error(`❌ Failed to ${recipient}: ${err.message}`);
        }
      }

      callback(); // acknowledge mail accepted
    });
  },

  // ✅ Accept all TO addresses
  onRcptTo(address, session, callback) {
    return callback(); // you can add domain filtering here if needed
  }
});

server.listen(587, () => {
  console.log('📡 Secure SMTP server running on port 587');
});
