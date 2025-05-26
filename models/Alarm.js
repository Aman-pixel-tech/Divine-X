const mongoose = require('mongoose');

const AlarmSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  time: { type: Date, required: true },
  category: { type: String, required: true },
  days: { type: [String], required: true },
  notificationIds: { type: [String] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alarm', AlarmSchema);