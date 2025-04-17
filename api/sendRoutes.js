const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const DKIMKey = require('../models/DKIMKey');

// 🔧 Utility: Fetch DKIM config by domain
async function getDKIM(domain) {
  const dkim = await DKIMKey.findOne({ domain });
  if (!dkim) return null;
  return {
    domainName: dkim.domain,
    keySelector: dkim.selector,
    privateKey: dkim.privateKey
  };
}

// ✉️ Shared Email Sender
async function sendEmail({ from, to, subject, text, dkim }) {
  const recipientDomain = to.split('@')[1];
  const mxRecords = await dns.resolveMx(recipientDomain);
  const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

  const transporter = nodemailer.createTransport({
    host: mxHost,
    port: 25,
    secure: false,
    tls: { rejectUnauthorized: false },
    dkim
  });

  await transporter.sendMail({ from, to, subject, text });
  return mxHost;
}

// 📤 Sandbox: Always use default domain and DKIM
router.post('/send-sandbox', async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'to, subject, and text are required' });
  }

  const defaultFrom = 'noreply@typingsprint.com';
  const dkim = await getDKIM('typingsprint.com');

  if (!dkim) {
    return res.status(500).json({ error: 'Default DKIM not configured. Admin setup required.' });
  }

  try {
    const relay = await sendEmail({
      from: defaultFrom,
      to,
      subject,
      text,
      dkim
    });
    res.json({ success: true, relay, from: defaultFrom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

// 📤 Production: Uses user domain DKIM
router.post('/send-production', async (req, res) => {
  const { from, to, subject, text } = req.body;

  if (!to || !from || !subject || !text) {
    return res.status(400).json({ error: 'from, to, subject, and text are required' });
  }

  const senderDomain = from.split('@')[1];
  const dkim = await getDKIM(senderDomain);

  if (!dkim) {
    return res.status(400).json({
      error: `DKIM not set up for ${senderDomain}. Please configure via /generate-dkim and update your DNS.`
    });
  }

  try {
    const relay = await sendEmail({ from, to, subject, text, dkim });
    res.json({ success: true, relay, from });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

module.exports = router;
