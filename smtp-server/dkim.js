const mongoose = require('mongoose');
const DKIMKey = require('../models/DKIMKey');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function getDKIM(domain) {
  return await DKIMKey.findOne({ domain });
}

module.exports = { getDKIM };
