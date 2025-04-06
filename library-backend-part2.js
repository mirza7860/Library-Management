// ==========================================
// 9. Borrow Model & Controller
// ==========================================

// models/borrowModel.js
const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue'],
    default: 'borrowed'
  },
  fine: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    }
  }
});

// Automatically update status to overdue if past due date
borrowSchema.pre('save', function(next) {
  if (this.status === 'borrowed' && this.dueDate < new Date() && !this.returnDate) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Borrow', borrowSchema);

// controllers/borrowController.js
const Borrow = require('../models/borrowModel');
const Book = require('../models/bookModel');
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const fineCalculator = require('../utils/fineCalculator');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

// Record book borrowing
exports.recordBorrowBook = catchAsyncErrors(async (req, res, next) => {
  const { bookId, userId, dueDate } = req.body;

  // Check if all required fields are provided
  if (!bookId || !dueDate) {
    return next(new ErrorHandler('Please provide book ID and due date', 400));
  }

  // Validate due date (must be a future date)
  const dueDateObj = new Date(dueDate);
  const today = new Date();
  if (dueDateObj <= today) {
    return next(new ErrorHandler('Due date must be a future date', 400));
  }

  // If userId is provided (admin is borrowing for a user), check if user exists
  let borrowingUser;
  if (userId && req.user.role === 'admin') {
    borrowingUser = await User.findById(userId);
    if (!borrowingUser) {
      return next(new ErrorHandler('User not found', 404));
    }
  } else {
    borrowingUser = req.user;
  }

  // Check if book exists and is available
  const book = await Book.findById(bookId);
  if (!book) {
    return next(new ErrorHandler('Book not found', 404));
  }

  if (book.available <= 0) {
    return next(new ErrorHandler('Book is not available for borrowing', 400));
  }

  // Check if user already has borrowed the same book
  const existingBorrow = await Borrow.findOne({
    book: bookId,
    user: borrowingUser._id,
    status: { $in: ['borrowed', 'overdue'] }
  });

  if (existingBorrow) {
    return next(new ErrorHandler('You have already borrowed this book', 400));
  }

  // Create borrow record
  const borrow = await Borrow.create({
    book: bookId,
    user: borrowingUser._id,
    dueDate: dueDateObj
  });

  // Update book availability
  book.available -= 1;
  await book.save();

  // Send email notification to user
  try {
    await sendEmail({
      email: borrowingUser.email,
      subject: 'Book Borrowed Successfully',
      html: emailTemplates.generateBookBorrowedEmailTemplate(book.title, borrow.borrowDate, borrow.dueDate)
    });
  } catch (error) {
    console.log('Email notification failed', error);
    // Continue with the process even if email fails
  }

  res.status(201).json({
    success: true,
    borrow
  });
});

// Return borrowed book
exports.returnBorrowBook = catchAsyncErrors(async (req, res, next) => {
  const { borrowId } = req.params;

  // Find borrow record
  const borrow = await Borrow.findById(borrowId).populate('book');
  if (!borrow) {
    return next(new ErrorHandler('Borrow record not found', 404));
  }

  // Check if book is already returned
  if (borrow.status === 'returned') {
    return next(new ErrorHandler('Book already returned', 400));
  }

  // Set return date and calculate fine
  borrow.returnDate = new Date();
  borrow.status = 'returned';
  
  // Calculate fine if returned after due date
  if (borrow.returnDate > borrow.dueDate) {
    const fineAmount = fineCalculator(borrow.dueDate, borrow.returnDate);
    borrow.fine.amount = fineAmount;
  }

  await borrow.save();

  // Update book availability
  const book = await Book.findById(borrow.book);
  book.available += 1;
  await book.save();

  // Send email notification to user
  try {
    const user = await User.findById(borrow.user);
    await sendEmail({
      email: user.email,
      subject: 'Book Returned Successfully',
      html: emailTemplates.generateBookReturnedEmailTemplate(
        book.title, 
        borrow.returnDate, 
        borrow.fine.amount
      )
    });
  } catch (error) {
    console.log('Email notification failed', error);
    // Continue with the process even if email fails
  }

  res.status(200).json({
    success: true,
    borrow
  });
});

// Pay fine
exports.payFine = catchAsyncErrors(async (req, res, next) => {
  const { borrowId } = req.params;

  // Find borrow record
  const borrow = await Borrow.findById(borrowId);
  if (!borrow) {
    return next(new ErrorHandler('Borrow record not found', 404));
  }

  // Check if there is any fine to pay
  if (borrow.fine.amount === 0) {
    return next(new ErrorHandler('No fine to pay', 400));
  }

  // Check if fine is already paid
  if (borrow.fine.paid) {
    return next(new ErrorHandler('Fine already paid', 400));
  }

  // Mark fine as paid
  borrow.fine.paid = true;
  await borrow.save();

  res.status(200).json({
    success: true,
    message: 'Fine paid successfully',
    borrow
  });
});

// Get my borrowed books
exports.myBorrowedBooks = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  
  // Prepare query
  const query = { user: userId };
  
  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Execute query
  const borrows = await Borrow.find(query)
    .populate({
      path: 'book',
      select: 'title author isbn image'
    })
    .skip(skip)
    .limit(limit)
    .sort({ borrowDate: -1 });

  // Count total documents
  const totalBorrows = await Borrow.countDocuments(query);

  res.status(200).json({
    success: true,
    borrows,
    totalBorrows,
    currentPage: page,
    totalPages: Math.ceil(totalBorrows / limit)
  });
});

// Get all borrow records (admin only)
exports.getAllBorrows = catchAsyncErrors(async (req, res, next) => {
  // Prepare query
  const query = {};
  
  // Filter by user
  if (req.query.userId) {
    query.user = req.query.userId;
  }
  
  // Filter by book
  if (req.query.bookId) {
    query.book = req.query.bookId;
  }
  
  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    query.borrowDate = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Execute query
  const borrows = await Borrow.find(query)
    .populate({
      path: 'book',
      select: 'title author isbn image'
    })
    .populate({
      path: 'user',
      select: 'name email'
    })
    .skip(skip)
    .limit(limit)
    .sort({ borrowDate: -1 });

  // Count total documents
  const totalBorrows = await Borrow.countDocuments(query);

  res.status(200).json({
    success: true,
    borrows,
    totalBorrows,
    currentPage: page,
    totalPages: Math.ceil(totalBorrows / limit)
  });
});

// ==========================================
// 10. User Management Controller
// ==========================================

// controllers/userController.js
const User = require('../models/userModel');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const sendToken = require('../utils/sendToken');
const cloudinary = require('cloudinary').v2;

// Get all users (admin only)
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
  // Prepare query
  const query = {};
  
  // Filter by role
  if (req.query.role) {
    query.role = req.query.role;
  }
  
  // Filter by verification status
  if (req.query.verified) {
    query['verification.verified'] = req.query.verified === 'true';
  }

  // Search users by name or email
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex }
    ];
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Execute query
  const users = await User.find(query)
    .select('-password -verification.code')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Count total documents
  const totalUsers = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    users,
    totalUsers,
    currentPage: page,
    totalPages: Math.ceil(totalUsers / limit)
  });
});

// Get user by ID (admin only)
exports.getUserById = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -verification.code');

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  res.status(200).json({
    success: true,
    user
  });
});

// Update user role (admin only)
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return next(new ErrorHandler('Please provide a role', 400));
  }

  if (!['user', 'admin'].includes(role)) {
    return next(new ErrorHandler('Invalid role', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password -verification.code');

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  res.status(200).json({
    success: true,
    user
  });
});

// Delete user (admin only)
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Delete user avatar from cloudinary
  if (user.avatar.public_id !== 'default_avatar') {
    await cloudinary.uploader.destroy(user.avatar.public_id);
  }

  // Delete user
  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Update user profile (for users to update their own profile)
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  // Update avatar if provided
  if (req.files && req.files.avatar) {
    // Get the current user
    const user = await User.findById(req.user.id);

    // Delete old avatar from cloudinary if it's not the default avatar
    if (user.avatar.public_id !== 'default_avatar') {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    // Upload new avatar
    const result = await cloudinary.uploader.upload(req.files.avatar.tempFilePath, {
      folder: 'avatars',
      width: 150,
      crop: 'scale'
    });

    newUserData.avatar = {
      public_id: result.public_id,
      url: result.secure_url
    };
  }

  // Update user
  const user = await User.findByIdAndUpdate(
    req.user.id,
    newUserData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    user
  });
});

// Register new admin (admin only)
exports.registerNewAdmin = catchAsyncErrors(async (req, res, next) => {
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

  // Create new admin user (verified by default)
  const user = await User.create({
    name,
    email,
    password,
    role: 'admin',
    verification: {
      verified: true
    },
    avatar: {
      public_id: "default_avatar",
      url: "https://res.cloudinary.com/dzzjnzjr8/image/upload/v1640071102/default_avatar.png"
    }
  });

  res.status(201).json({
    success: true,
    message: 'Admin user created successfully',
    user
  });
});

// ==========================================
// 11. Utils & Helpers
// ==========================================

// utils/fineCalculator.js
/**
 * Calculates fine amount based on due date and return date
 * @param {Date} dueDate - The due date for the book
 * @param {Date} returnDate - The actual date the book was returned
 * @returns {Number} - Fine amount
 */
const fineCalculator = (dueDate, returnDate) => {
  // Default rate: $0.50 per day
  const fineRatePerDay = 0.5;
  const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
  
  if (daysOverdue <= 0) {
    return 0;
  }
  
  // Calculate fine
  let fineAmount = daysOverdue * fineRatePerDay;
  
  // Maximum fine: $20
  return Math.min(fineAmount, 20);
};

module.exports = fineCalculator;

// Add more email templates to utils/emailTemplates.js
exports.generateBookBorrowedEmailTemplate = (bookTitle, borrowDate, dueDate) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Book Borrowed Successfully</h2>
      <p style="color: #555; line-height: 1.5;">You have successfully borrowed the following book:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #333; margin: 0 0 10px 0;">${bookTitle}</h3>
        <p style="color: #555; margin: 0;">Borrowed on: ${new Date(borrowDate).toLocaleDateString()}</p>
        <p style="color: #555; margin: 0;">Due date: ${new Date(dueDate).toLocaleDateString()}</p>
      </div>
      <p style="color: #555; line-height: 1.5;">Please return the book by the due date to avoid late fees. Thank you for using our library services!</p>
      <p style="color: #555; line-height: 1.5;">Thank you,<br />Library Management System Team</p>
    </div>
  `;
};

exports.generateBookReturnedEmailTemplate = (bookTitle, returnDate, fineAmount) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Book Returned Successfully</h2>
      <p style="color: #555; line-height: 1.5;">You have successfully returned the following book:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #333; margin: 0 0 10px 0;">${bookTitle}</h3>
        <p style="color: #555; margin: 0;">Returned on: ${new Date(returnDate).toLocaleDateString()}</p>
        ${fineAmount > 0 ? `<p style="color: #d32f2f; margin: 10px 0 0 0;">Fine amount: $${fineAmount.toFixed(2)}</p>` : ''}
      </div>
      ${fineAmount > 0 ? 
        `<p style="color: #555; line-height: 1.5;">Please note that you have been charged a late fee of $${fineAmount.toFixed(2)}. You can pay this fine through your account dashboard.</p>` : 
        `<p style="color: #555; line-height: 1.5;">Thank you for returning the book on time!</p>`}
      <p style="color: #555; line-height: 1.5;">Thank you for using our library services.</p>
      <p style="color: #555; line-height: 1.5;">Thank you,<br />Library Management System Team</p>
    </div>
  `;
};

exports.generateDueDateReminderEmailTemplate = (userName, bookTitle, dueDate) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Book Due Date Reminder</h2>
      <p style="color: #555; line-height: 1.5;">Hello ${userName},</p>
      <p style="color: #555; line-height: 1.5;">This is a friendly reminder that the following book is due for return soon:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #333; margin: 0 0 10px 0;">${bookTitle}</h3>
        <p style="color: #555; margin: 0;">Due date: ${new Date(dueDate).toLocaleDateString()}</p>
      </div>
      <p style="color: #555; line-height: 1.5;">Please return the book by the due date to avoid late fees. If you need more time, please consider renewing the book through your account.</p>
      <p style="color: #555; line-height: 1.5;">Thank you,<br />Library Management System Team</p>
    </div>
  `;
};

// ==========================================
// 12. Routes
// ==========================================

// routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const { addBook, getAllBooks, getBookById, updateBook, deleteBook } = require('../controllers/bookController');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// Book routes
router.get('/', getAllBooks); // Public route
router.get('/:id', getBookById); // Public route
router.post('/add', isAuthenticated, authorizeRoles('admin'), addBook);
router.put('/:id', isAuthenticated, authorizeRoles('admin'), updateBook);
router.delete('/:id', isAuthenticated, authorizeRoles('admin'), deleteBook);

module.exports = router;

// routes/borrowRoutes.js
const express = require('express');
const router = express.Router();
const { recordBorrowBook, returnBorrowBook, payFine, myBorrowedBooks, getAllBorrows } = require('../controllers/borrowController');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// Borrow routes
router.post('/borrow', isAuthenticated, recordBorrowBook);
router.put('/return/:borrowId', isAuthenticated, returnBorrowBook);
router.put('/pay-fine/:borrowId', isAuthenticated, payFine);
router.get('/my-borrows', isAuthenticated, myBorrowedBooks);
router.get('/', isAuthenticated, authorizeRoles('admin'), getAllBorrows);

module.exports = router;

// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUserRole, deleteUser, updateProfile, registerNewAdmin } = require('../controllers/userController');
const { isAuthenticated, authorizeRoles } = require('../middlewares/authMiddleware');

// User routes
router.get('/', isAuthenticated, authorizeRoles('admin'), getAllUsers);
router.get('/:id', isAuthenticated, authorizeRoles('admin'), getUserById);
router.put('/role/:id', isAuthenticated, authorizeRoles('admin'), updateUserRole);
router.delete('/:id', isAuthenticated, authorizeRoles('admin'), deleteUser);
router.put('/update/profile', isAuthenticated, updateProfile);
router.post('/register-admin', isAuthenticated, authorizeRoles('admin'), registerNewAdmin);

module.exports = router;

// ==========================================
// 13. Automation Services
// ==========================================

// services/notifyUsers.js
const cron = require('node-cron');
const Borrow = require('../models/borrowModel');
const User = require('../models/userModel');
const Book = require('../models/bookModel');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Service to notify users about due books
 * Runs every day at midnight
 */
const setupDueDateNotifications = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running due date notification service...');
      
      // Get date for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Get date for day after tomorrow
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      // Find all books due tomorrow
      const dueBorrows = await Borrow.find({
        status: 'borrowed',
        dueDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow
        }
      }).populate('book').populate('user');
      
      console.log(`Found ${dueBorrows.length} books due tomorrow`);
      
      // Send email notifications
      for (const borrow of dueBorrows) {
        if (borrow.user && borrow.book) {
          await sendEmail({
            email: borrow.user.email,
            subject: 'Book Due Tomorrow - Reminder',
            html: emailTemplates.generateDueDateReminderEmailTemplate(
              borrow.user.name,
              borrow.book.title,
              borrow.dueDate
            )
          });
          console.log(`Reminder sent to ${borrow.user.email} for book ${borrow.book.title}`);
        }
      }
      
      console.log('Due date notification service completed successfully');
    } catch (error) {
      console.error('Error in due date notification service:', error);
    }
  });
};

// services/removeUnverifiedAccounts.js
const cron = require('node-cron');
const User = require('../models/userModel');

/**
 * Service to remove unverified accounts after 7 days
 * Runs every day at 1:00 AM
 */
const setupUnverifiedAccountsCleanup = () => {
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('Running unverified accounts cleanup service...');
      
      // Get date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Find and delete unverified accounts older than 7 days
      const result = await User.deleteMany({
        'verification.verified': false,
        createdAt: { $lt: sevenDaysAgo }
      });
      
      console.log(`Deleted ${result.deletedCount} unverified accounts`);
      console.log('Unverified accounts cleanup service completed successfully');
    } catch (error) {
      console.error('Error in unverified accounts cleanup service:', error);
    }
  });
};

// Initialize automation services (add to app.js)
const initializeServices = () => {
  setupDueDateNotifications();
  setupUnverifiedAccountsCleanup();
  console.log('Automation services initialized');
};

module.exports = initializeServices;

// Add to app.js
const initializeServices = require('./services/initializeServices');
initializeServices();

// services/initializeServices.js
const setupDueDateNotifications = require('./notifyUsers');
const setupUnverifiedAccountsCleanup = require('./removeUnverifiedAccounts');

const initializeServices = () => {
  setupDueDateNotifications();
  setupUnverifiedAccountsCleanup();
  console.log('Automation services initialized');
};

module.exports = initializeServices;

// ==========================================
// 14. package.json
// ==========================================

// package.json
{
  "name": "library-management-system",
  "version": "1.0.0",
  "description": "Backend API for Library Management System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cloudinary": "^1.41.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-fileupload": "^1.4.1",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^7.6.3",
    "node-cron": "^3.0.2",
    "nodemailer": "^6.9.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
