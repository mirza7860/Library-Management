// ==========================================
// 1. Project Structure Setup
// ==========================================

// server.js
const app = require('./app');
const connectDatabase = require('./database/db');
const dotenv = require('dotenv');

// Config
dotenv.config({ path: './config/config.env' });

// Connect to database
connectDatabase();

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to Unhandled Promise Rejection');
  server.close(() => {
    process.exit(1);
  });
});

// app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const errorMiddleware = require('./middlewares/errorMiddleware');
const dotenv = require('dotenv');

// Initialize express app
const app = express();

// Config
dotenv.config({ path: './config/config.env' });

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(fileUpload());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Import routes
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const userRoutes = require('./routes/userRoutes');

// Use routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/borrows', borrowRoutes);
app.use('/api/v1/users', userRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('Library Management System API is running');
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;

// config/config.env (template)
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/library_management
JWT_SECRET_KEY=your_jwt_secret_key
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
SMTP_HOST=smtp.gmail.com
SMTP_SERVICE=gmail
SMTP_PORT=465
SMTP_MAIL=your_email@gmail.com
SMTP_PASSWORD=your_email_password
CLOUDINARY_CLIENT_NAME=your_cloudinary_name
CLOUDINARY_CLIENT_API=your_cloudinary_api_key
CLOUDINARY_CLIENT_SECRET=your_cloudinary_secret

// database/db.js
const mongoose = require('mongoose');

const connectDatabase = () => {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
    });
};

module.exports = connectDatabase;

// ==========================================
// 2. Error Handling Middlewares
// ==========================================

// middlewares/errorMiddleware.js
const ErrorHandler = require('../utils/errorHandler');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Wrong MongoDB ID error
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }

  // Wrong JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'JSON Web Token is invalid. Try again.';
    err = new ErrorHandler(message, 400);
  }

  // JWT expire error
  if (err.name === 'TokenExpiredError') {
    const message = 'JSON Web Token is expired. Try again.';
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message
  });
};

// utils/errorHandler.js
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorHandler;

// utils/catchAsyncErrors.js
module.exports = (theFunc) => (req, res, next) => {
  Promise.resolve(theFunc(req, res, next))
    .catch(next);
};

// ==========================================
// 3. User Model & Authentication
// ==========================================

// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
    maxLength: [50, 'Name cannot exceed 50 characters'],
    minLength: [3, 'Name should have at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please enter your password'],
    minLength: [8, 'Password should have at least 8 characters'],
    select: false
  },
  avatar: {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  verification: {
    code: {
      type: String,
      select: false
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Generate JWT token
userSchema.methods.generateToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate verification code
userSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verification.code = code;
  return code;
};

// Generate reset password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);

// ==========================================
// 4. Authentication Controller & Utils
// ==========================================

// controllers/authController.js
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');
const sendToken = require('../utils/sendToken');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET
});

// Register a new user
exports.register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Check if all fields are provided
  if (!name || !email || !password) {
    return next(new ErrorHandler('Please fill in all fields', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('User already exists', 400));
  }

  // Create avatar with default if not provided
  let avatarData = {
    public_id: "default_avatar",
    url: "https://res.cloudinary.com/dzzjnzjr8/image/upload/v1640071102/default_avatar.png"
  };

  // Upload avatar if provided
  if (req.files && req.files.avatar) {
    const result = await cloudinary.uploader.upload(req.files.avatar.tempFilePath, {
      folder: 'avatars',
      width: 150,
      crop: 'scale'
    });
    
    avatarData = {
      public_id: result.public_id,
      url: result.secure_url
    };
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    avatar: avatarData
  });

  // Generate verification code
  const verificationCode = user.generateVerificationCode();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Verification for Library Management System',
      html: emailTemplates.generateVerificationOtpEmailTemplate(verificationCode)
    });

    res.status(201).json({
      success: true,
      message: `User registered successfully. Verification code sent to ${user.email}`
    });
  } catch (error) {
    user.verification.code = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Failed to send verification email', 500));
  }
});

// Verify OTP
exports.verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { email, code } = req.body;

  // Check if all fields are provided
  if (!email || !code) {
    return next(new ErrorHandler('Please provide email and verification code', 400));
  }

  // Find the user
  const user = await User.findOne({ email }).select('+verification.code');
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Check if verification code matches
  if (user.verification.code !== code) {
    return next(new ErrorHandler('Invalid verification code', 400));
  }

  // Mark user as verified
  user.verification.verified = true;
  user.verification.code = undefined;
  await user.save();

  // Send token
  sendToken(user, 200, res);
});

// Login user
exports.login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(new ErrorHandler('Please provide email and password', 400));
  }

  // Find user
  const user = await User.findOne({ email }).select('+password');

  // Check if user exists
  if (!user) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  // Check if password matches
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  // Check if user is verified
  if (!user.verification.verified) {
    return next(new ErrorHandler('Please verify your email first', 401));
  }

  // Send token
  sendToken(user, 200, res);
});

// Logout user
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get user profile
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user
  });
});

// Forgot password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler('User not found with this email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset password url
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Library Management System Password Recovery',
      html: emailTemplates.generateForgotPasswordEmailTemplate(resetPasswordUrl)
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email}`
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Email could not be sent', 500));
  }
});

// Reset password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // Hash token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find user
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Reset password token is invalid or has expired', 400));
  }

  // Check if password and confirm password are the same
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler('Passwords do not match', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Send token
  sendToken(user, 200, res);
});

// Update password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // Check if all fields are provided
  if (!oldPassword || !newPassword || !confirmPassword) {
    return next(new ErrorHandler('Please provide all fields', 400));
  }

  // Find user
  const user = await User.findById(req.user.id).select('+password');

  // Check if old password is correct
  const isPasswordMatched = await user.comparePassword(oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler('Old password is incorrect', 400));
  }

  // Check if new password and confirm password match
  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler('Passwords do not match', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Send token
  sendToken(user, 200, res);
});

// ==========================================
// 5. Authentication Utils
// ==========================================

// utils/sendToken.js
const sendToken = (user, statusCode, res) => {
  // Create token
  const token = user.generateToken();

  // Options for cookie
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    user,
    token
  });
};

module.exports = sendToken;

// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  const mailOptions = {
    from: `Library Management System <${process.env.SMTP_MAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;

// utils/emailTemplates.js
exports.generateVerificationOtpEmailTemplate = (verificationCode) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Email Verification</h2>
      <p style="color: #555; line-height: 1.5;">Thank you for registering with our Library Management System. Please use the verification code below to verify your email address:</p>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
        <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
      </div>
      <p style="color: #555; line-height: 1.5;">This code is valid for 10 minutes. If you did not request this verification, please ignore this email.</p>
      <p style="color: #555; line-height: 1.5;">Thank you,<br />Library Management System Team</p>
    </div>
  `;
};

exports.generateForgotPasswordEmailTemplate = (resetPasswordUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Password Reset</h2>
      <p style="color: #555; line-height: 1.5;">You requested a password reset for your Library Management System account. Please click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetPasswordUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #555; line-height: 1.5;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p style="color: #555; line-height: 1.5; word-break: break-all;">${resetPasswordUrl}</p>
      <p style="color: #555; line-height: 1.5;">This link is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
      <p style="color: #555; line-height: 1.5;">Thank you,<br />Library Management System Team</p>
    </div>
  `;
};

// ==========================================
// 6. Authentication Middleware
// ==========================================

// middlewares/authMiddleware.js
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Check if user is authenticated
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHandler('Please login to access this resource', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Find user
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return next(new ErrorHandler('User not found', 404));
    }

    next();
  } catch (error) {
    return next(new ErrorHandler('Not authorized to access this resource', 401));
  }
});

// Authorize roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler(`Role: ${req.user.role} is not allowed to access this resource`, 403));
    }
    next();
  };
};

// ==========================================
// 7. Routes
// ==========================================

// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, logout, getUserProfile, forgotPassword, resetPassword, updatePassword, verifyOTP } = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Authentication routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.get('/logout', isAuthenticated, logout);
router.get('/profile', isAuthenticated, getUserProfile);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/update-password', isAuthenticated, updatePassword);

module.exports = router;
