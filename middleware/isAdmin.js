const isAdmin = (req, res, next) => {
    // Check if user is authenticated and has admin role
    if (req.session.user && req.session.user.role === 0) {
      // User is admin, proceed to the next middleware or route handler
      next();
    } else {
      // User is not admin, redirect them to a login page or show an error message
      res.status(403).send("Access denied. Only admin users can access this resource.");
    }
  };
  
  module.exports = isAdmin;
  