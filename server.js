const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const Review = require('./models/Review');
const Alarm = require('./models/Alarm');
const QuizResult = require('./models/QuizResult');
require('dotenv').config();




const app = express();

// Middleware
app.use(cors());
app.use(express.json());



// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const jwtSecret = process.env.JWT_SECRET;



// User Schema
const UserSchema = new mongoose.Schema({
     name:          String,
     dob:           String,
     email:         { type: String, unique: true },
   password:      String,
    phone:         String,
    xp:            { type: Number, default: 0 },
    level:         { type: Number, default: 1 },
    currentTitle:  { type: String, default: 'Novice Thinker' },
  });

const User = mongoose.model('User', UserSchema);



// Root Route
app.get('/', (req, res) => {
  res.send('Backend working ✅');
});



// ✅ GET review history by email
app.get('/review/history/:email', async (req, res) => {
  try {
    const reviews = await Review.find({ email: req.params.email }).sort({ date: -1 }); // latest first
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.post('/signup', async (req, res) => {
  let { name, dob, email, password, phone } = req.body;

  // Trim and sanitize inputs
  name = name.trim();
  dob = dob.trim();
  email = email.trim().toLowerCase();
  phone = phone.trim();

  // Validate required fields
  if (!name || !dob || !email || !password || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format. Please enter a valid email.' });
  }

  // Validate phone number
  if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
    return res.status(400).json({ error: 'Invalid phone number format. Please enter a valid phone number.' });
  }

  // Validate date of birth format (dd/mm/yyyy)
  const dobPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/; // dd/mm/yyyy format
  if (!dob.match(dobPattern)) {
    return res.status(400).json({ error: 'Invalid date of birth format. Please use dd/mm/yyyy format.' });
  }

  // Password validation (min 6 characters, uppercase, lowercase, digit, special character)
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
  if (!password.match(passwordPattern)) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
    });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists. Please use a different email.' });
    }

    // Create new user
    const newUser = await User.create({
      name,
      dob,
      email,
      phone,
      password: hashedPassword,
    });

const token = jwt.sign({ id: newUser._id }, jwtSecret, { expiresIn: '7d' });

    const userResponse = {
      name:         newUser.name,
      dob:          newUser.dob,
      phone:        newUser.phone,
      email:        newUser.email,
       xp:           newUser.xp,
       level:        newUser.level,
       currentTitle: newUser.currentTitle,
    };

    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});


// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '7d' });

    const userResponse = {
        name:         user.name,
         dob:          user.dob,
         phone:        user.phone,
         email:        user.email,
         xp:           user.xp,
         level:        user.level,
         currentTitle: user.currentTitle,
       };
      

    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});




app.post('/submit-review', async (req, res) => {
  try {
    const { username, email, mood, rating, goal, goalCompleted } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Validation
    if (!mood || rating == null || !goal || goalCompleted === undefined || goalCompleted === '') {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if review already submitted for today
    const existingReview = await Review.findOne({ email, date: today });
    if (existingReview) {
      return res.status(400).json({ error: 'Daily review already submitted' });
    }

    // Save new review
    const newReview = new Review({
      username,
      email,
      mood,
      rating,
      goal,
      goalCompleted,
      date: today,
    });

    await newReview.save();

    res.status(200).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Server error during review submission' });
  }
});




app.post('/get-todays-review', async (req, res) => {
  try {
    const { email } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const review = await Review.findOne({ email, date: today });
    res.json({ 
      reviewed: !!review,
      review 
    });
  } catch (err) {
    console.error('Fetch review error:', err);
    res.status(500).json({ error: 'Failed to fetch review status' });
  }
});


// Get alarms for user
app.get('/alarms', async (req, res) => {
  try {
    const { email } = req.query;
    const alarms = await Alarm.find({ userEmail: email });
    res.json(alarms);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new alarm
app.post('/alarms', async (req, res) => {
  try {
    const newAlarm = await Alarm.create(req.body);
    res.json(newAlarm);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete alarm
app.delete('/alarms/:id', async (req, res) => {
  try {
    await Alarm.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alarm deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});



app.delete('/delete-account', async (req, res) => {
  const { email } = req.body;
  try {
    // Delete the user
    const deletedUser = await User.findOneAndDelete({ email });
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete associated data
    await Promise.all([
      Alarm.deleteMany({ userEmail: email }),
      Review.deleteMany({ email }),
      QuizResult.deleteMany({userEmail: email })
    ]);

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete-account error:', error);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
});
app.get('/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Quiz Results ---
app.post('/quiz-results', async (req,res)=>{
  const { userEmail, trait, score, xpGained } = req.body;
  // 1) save result
  await QuizResult.create({ userEmail, trait, score, xpGained });
  // 2) update user xp, level, title
  const user = await User.findOne({ email: userEmail });
  user.xp += xpGained;
  // determine new level/title
  if(user.xp >= 1000) { user.level = 4; user.currentTitle = 'Master'; }
  else if(user.xp >= 500) { user.level = 3; user.currentTitle = 'Adept'; }
  else if(user.xp >= 250) { user.level = 2; user.currentTitle = 'Apprentice'; }
  else { user.level = 1; user.currentTitle = 'Novice Thinker'; }
  await user.save();
  res.json({ xp: user.xp, level: user.level, currentTitle: user.currentTitle });
});

app.get('/quiz-results/:email', async (req,res)=>{
  const list = await QuizResult.find({ userEmail: req.params.email })
    .sort({ date: -1 })
    .limit(5);
  res.json(list); 
});
// Server Start
app.listen(process.env.PORT || 3000, () =>
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3000}`)
);
