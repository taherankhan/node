

// Middleware function to check if the user is authenticated
function isAuthenticated(req, res, next) {
    // Check if the user is logged in by verifying the presence of req.session.user
    if (req.session.user) {
      // If the user is authenticated, proceed to the next middleware
      next();
    } else {
      // If the user is not authenticated, redirect them to the login page
      res.redirect('/users/login');
    }
  }
  
  
  module.exports = isAuthenticated;
  