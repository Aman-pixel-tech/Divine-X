const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  username: String,
  email: String,
  mood: String,
  rating: Number,
  goal: String,
  goalCompleted: Boolean,
  date: String, // Format: YYYY-MM-DD
});

module.exports = mongoose.model('Review', reviewSchema);
