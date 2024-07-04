const express = require('express');
const userController = require('../controllers/user');
const router = express.Router();
const { logout } = require('../controllers/user');

// Middleware for authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/users/login');
  }
};

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 0) {
    next(); // Admin user
  } else {
    res.redirect('/users/login');
  }
}

// Logout route
router.get('/logout', logout);

// Login route
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);

// Signup route
router.get('/signup', userController.getSignup);
router.post('/signup', userController.postSignup);

// Protected routes
router.get('/', isAuthenticated, userController.getAllUsers);
router.get('/:id', isAuthenticated, userController.getUserById);
router.delete('/:id', isAuthenticated, userController.deleteUserById);
router.put('/:id', isAuthenticated, userController.updateUserById);

module.exports = router;
