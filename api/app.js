const express = require('express');
const mongoose = require('mongoose');
const dkimRoutes = require('./dkimRoutes');
const sendRoutes = require('./sendRoutes');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use('/api', dkimRoutes);
app.use('/api', sendRoutes);

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 API server running on port ${PORT}`);
});
