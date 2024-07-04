const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const userRoutes = require("./routes/user");
const cartRoutes = require("./routes/cart");
const categoryRoutes = require("./routes/category");
const flash = require("connect-flash");
const productRoutes = require("./routes/product");
const dashboardRoutes = require("./routes/dashboard"); 
const MongoDBStore = require("connect-mongodb-session")(session);
const cookieParser = require("cookie-parser");


const errorController = require("./controllers/error");

const MONGODB_URI = "mongodb://localhost:27017/small";

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const app = express();

app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      //  secure: true ,
      maxAge: 1000 * 60 * 60 * 24, //session expiration time (1 day)
    },
  })
);

// Connect flash middleware
app.use(flash());

// Middleware to handle flash messages
app.use((req, res, next) => {
  // Store flash messages in locals for easy access in views
  res.locals.errorMessage = req.flash("error");
  res.locals.successMessage = req.flash("success");

  next();
});

// Middleware
app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/cart", cartRoutes); // Use cart route

app.get("/500", errorController.get500);
app.use(errorController.get404);

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
