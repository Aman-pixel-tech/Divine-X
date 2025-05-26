// backend/models/QuizResult.js
const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  trait:      { type: String, required: true },
  score:      { type: Number, required: true },
  xpGained:   { type: Number, required: true },
  date:       { type: Date,   default: Date.now }
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
