const express = require('express');
const router = express.Router();
const DKIMKey = require('../models/DKIMKey');
const crypto = require('crypto');

router.post('/generate-dkim', async (req, res) => {
  const { domain, selector = 'default' } = req.body;

  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 1024,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    await DKIMKey.findOneAndUpdate(
      { domain },
      { domain, selector, publicKey, privateKey },
      { upsert: true, new: true }
    );

    const dnsValue = `v=DKIM1; k=rsa; p=${publicKey
      .replace(/-----.*-----/g, '')
      .replace(/\s+/g, '')}`;

    res.json({
      domain,
      selector,
      dnsName: `${selector}._domainkey.${domain}`,
      dnsType: 'TXT',
      dnsValue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate DKIM keys' });
  }
});

module.exports = router;
