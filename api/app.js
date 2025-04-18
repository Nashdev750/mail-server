const express = require('express');
const mongoose = require('mongoose');
const dkimRoutes = require('./dkimRoutes');
const sendRoutes = require('./sendRoutes');
require('dotenv').config({ path: '../.env' });

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

app.use('/emailflow/api', dkimRoutes);
app.use('/emailflow/api', sendRoutes);

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 API server running on port ${PORT}`);
});
