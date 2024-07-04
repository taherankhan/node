const User = require('../models/user');

exports.getDashboard = async (req, res, next) => {
  try {
    // Fetch data for the dashboard (example: user information)
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // Render the dashboard view with the fetched data
    res.render('dashboard', {
      pageTitle: 'Dashboard',
      user: user
      // Pass user data to the dashboard view
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    next(error);
  }
};
