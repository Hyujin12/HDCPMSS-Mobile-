const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const sendVerificationEmail = require('../mailer');

const JWT_SECRET = process.env.JWT_SECRET;

// -----------------------------
// AUTH MIDDLEWARE
// -----------------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// -----------------------------
// REGISTER
// -----------------------------
router.post('/register', async (req, res) => {
  try {
    const { username, email, mobileNumber, password } = req.body;
    if (!username || !email || !mobileNumber || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const newUser = new User({
      username,
      email,
      mobileNumber,
      password: hashedPassword,
      verificationCode,
      codeExpires,
      isVerified: false,
    });

    await newUser.save();

    try {
      await sendVerificationEmail(email, verificationCode);
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.status(201).json({
      message: 'Verification code sent to email.',
      userId: newUser._id,
    });

  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// -----------------------------
// VERIFY EMAIL
// -----------------------------
router.post('/verify', async (req, res) => {
  const { userId, code } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (user.verificationCode !== code) return res.status(400).json({ message: 'Invalid code' });
    if (user.codeExpires < Date.now()) return res.status(400).json({ message: 'Code expired' });

    user.isVerified = true;
    user.verificationCode = null;
    user.codeExpires = null;
    await user.save();

    res.status(200).json({ message: 'User verified successfully' });
  } catch (err) {
    console.error('Verification Error:', err.message);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// -----------------------------
// LOGIN (JWT)
// -----------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email first',
        userId: user._id
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------
// PROTECTED PROFILE ROUTE
// -----------------------------
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
