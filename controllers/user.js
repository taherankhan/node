const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const mongoose = require("mongoose");

exports.postSignup = async (req, res, next) => {
  try {
    // Validate user input
    await Promise.all([
      body("name").notEmpty().withMessage("Name is required").run(req),
      body("email").isEmail().withMessage("Invalid email").run(req),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .run(req),
      body("countrycode").optional().isString().run(req),
      body("phone")
        .isLength({ min: 10, max: 15 })
        .withMessage("Phone number must be between 10 and 15 digits")
        .custom(async (value) => {
          const existingUser = await User.findOne({ phone: value });
          if (existingUser) {
            throw new Error("Phone number already exists");
          }
        })
        .run(req),
    ]);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      countrycode: req.body.countrycode,
      phone: req.body.phone,
    });

    // Save user to database
    await user.save();

    // Display toastr message for successful signup
    req.flash("toastrSuccess", "Signup successful. You can now login.");

    // Redirect to login page after successful signup
    res.redirect("/users/login");
  } catch (error) {
    console.error("Error creating user:", error);
    next(error);
  }
};

exports.getSignup = async (req, res, next) => {
  try {
    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render("signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: message,
      oldInput: {
        email: "",
        password: "",
      },
      validationErrors: [],
      // user: req.session.user   // Pass user variable here
      isauthenticated: req.session.isLoggedIn,
      role: req.session.role,
    });
  } catch (error) {
    console.error("Error in signup:", error);
    next(error);
  }
};exports.getLogin = async (req, res, next) => {
  try {
    let message = req.flash('error');
    message = message.length > 0 ? message[0] : null;

    // Get success message if available
    const successMessage = req.flash('success')[0];

    const errorMessage = req.flash('error')[0];

    // Get toastr success message if available
    const toastrSuccessMessage = req.flash('toastrSuccess')[0];

    // Get logout success message from cookie or set a default value
    const logoutSuccessMessage = req.cookies.logoutSuccess || '';
    
    // Clear the logout success message cookie
    res.clearCookie('logoutSuccess');

    res.render('login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: message,
      oldInput: {
        email: '',
        password: '',
      },
      validationErrors: [],
      isauthenticated: req.session.isLoggedIn,
      successMessage: successMessage,
      logoutSuccessMessage: logoutSuccessMessage,
      toastrSuccess: toastrSuccessMessage,
      errorMessage: errorMessage,
      isadmin: req.session.user && req.session.user.role === 0 // Add isadmin variable here
    });
  } catch (error) {
    console.error("Error getting login page:", error);
    next(error);
  }
};


exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.render("login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
        isauthenticated: req.session.isLoggedIn,
        successMessage: null,
        logoutSuccessMessage: null,
        toastrSuccess: null,
      });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      req.flash("error", "Invalid email or password");
      return res.render("login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Invalid email or password",
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: [],
        isauthenticated: req.session.isLoggedIn,
        successMessage: null,
        logoutSuccessMessage: null,
        toastrSuccess: null,
      });
    }

    // Store user information in session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.session.isLoggedIn = true;

    // Set success message in session
    req.flash("success", "Login successful");

    // Redirect to the products page after successful login
    return res.redirect("/products");
  } catch (error) {
    console.error("Error logging in user:", error);
    return next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  const identifier = req.params.id;
  try {
    let user;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else {
      user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }],
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    next(error);
  }
};

exports.deleteUserById = async (req, res, next) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Delete user logic here
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(error);
  }
};

exports.updateUserById = async (req, res, next) => {
  const userId = req.params.id;
  const newData = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, newData, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    next(error);
  }
};
exports.logout = async (req, res, next) => {
  try {
    // Set logout success flash message
    req.flash("logoutSuccess", "Logout successful");

    // Set logoutSuccessMessage in cookies
    res.cookie("logoutSuccess", "Logout successful");

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return next(err);
      }

      // Redirect to the login page after logout
      res.redirect("/users/login");
    });
  } catch (error) {
    console.error("Error logging out:", error);
    next(error);
  }
};
