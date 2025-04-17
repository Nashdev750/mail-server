const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const fs = require('fs');
const { getDKIM } = require('./dkim');
require('dotenv').config({ path: '../.env' });

const AUTH_USER = 'apiuser';
const AUTH_PASS = 'supersecret123';

const server = new SMTPServer({
  secure: false,
  key: fs.readFileSync(process.env.TLS_KEY),
  cert: fs.readFileSync(process.env.TLS_CERT),
  authOptional: false,

  onAuth(auth, session, callback) {
    if (auth.username === AUTH_USER && auth.password === AUTH_PASS) {
      return callback(null, { user: AUTH_USER });
    }
    return callback(new Error('Unauthorized'));
  },

  async onRcptTo(address, session, callback) {
    return callback(); // Add domain filtering if needed
  },

  async onData(stream, session, callback) {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', async () => {
      const rawEmail = Buffer.concat(chunks).toString();
      const from = session.envelope.mailFrom.address;
      const recipients = session.envelope.rcptTo.map(r => r.address);

      for (const recipient of recipients) {
        const domain = recipient.split('@')[1];
        const senderDomain = from.split('@')[1];

        try {
          const mxRecords = await dns.resolveMx(domain);
          const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

          const dkim = await getDKIM(senderDomain);

          const transportOptions = {
            host: mxHost,
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false }
          };

          if (dkim) {
            transportOptions.dkim = {
              domainName: dkim.domain,
              keySelector: dkim.selector,
              privateKey: dkim.privateKey
            };
          }

          const transporter = nodemailer.createTransport(transportOptions);

          await transporter.sendMail({
            envelope: { from, to: recipient },
            raw: rawEmail
          });

          console.log(`✅ Sent to ${recipient} via ${mxHost}`);
        } catch (err) {
          console.error(`❌ Failed to ${recipient}: ${err.message}`);
        }
      }

      callback();
    });
  }
});

server.listen(process.env.SMTP_PORT || 587, () => {
  console.log(`📡 SMTP server running on port ${process.env.SMTP_PORT || 587}`);
});
