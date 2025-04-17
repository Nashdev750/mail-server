const mongoose = require('mongoose');

const DKIMSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  selector: { type: String, default: 'default' },
  privateKey: String,
  publicKey: String
});

module.exports = mongoose.model('DKIMKey', DKIMSchema);
