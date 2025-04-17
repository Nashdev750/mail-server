const { SMTPServer } = require('smtp-server');
const nodemailer = require('nodemailer');
const fs = require('fs');
const dotenv = require('dotenv');
const { addToQueue } = require('./queue');
const { getDKIMKeysForDomain } = require('./db'); // Fetch DKIM info from DB

dotenv.config();

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/' + process.env.DOMAIN + '/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/' + process.env.DOMAIN + '/fullchain.pem')
};

// SMTP server configuration
const server = new SMTPServer({
  secure: false,
  key: options.key,
  cert: options.cert,
  authOptional: false,

  // Handle domain-specific DKIM signing
  onAuth(auth, session, callback) {
    const { username, password } = auth;
    // Authenticate using username/password (e.g., company-specific API credentials)
    if (username && password) {
      return callback(null, { user: username });
    }
    return callback(new Error('Unauthorized'));
  },

  onData(stream, session, callback) {
    let chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', async () => {
      const rawEmail = Buffer.concat(chunks).toString();
      const envelope = {
        from: session.envelope.mailFrom.address,
        to: session.envelope.rcptTo.map(r => r.address)
      };

      // Extract domain from "from" address (e.g., "user@companyA.com")
      const domain = envelope.from.split('@')[1];

      // Fetch DKIM info (private key, selector) for this domain from your DB
      const dkim = await getDKIMKeysForDomain(domain);

      if (dkim) {
        const transporter = nodemailer.createTransport({
          dkim: {
            domainName: domain,
            keySelector: dkim.selector,
            privateKey: dkim.privateKey // private DKIM key for that domain
          },
          // Other SMTP configurations
          host: 'mail.typingsprint.com',
          port: 587,
          secure: false,
          tls: { rejectUnauthorized: false }
        });

        // Add email to the queue or send directly
        await addToQueue(rawEmail, envelope);  // Use Redis for queueing
        console.log(`📤 Queued message from ${envelope.from}`);
        callback();
      } else {
        callback(new Error(`DKIM not found for ${domain}`));
      }
    });
  },

  onRcptTo(address, session, callback) {
    callback();
  }
});

server.listen(587, () => {
  console.log('🚀 SMTP server listening on port 587');
});
