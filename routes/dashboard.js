const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboard');


router.get('/', (req, res) => {
    // Assuming you have a user object stored in the session
    const user = req.session.user;
    
    // Your logic to render the dashboard page goes here
    res.render('dashboard', { pageTitle: 'Dashboard', user: user });
  });
  
module.exports = router;

