const express = require("express");
const productController = require("../controllers/product");
const { findProductsByCategory } = require("../controllers/product");
const router = express.Router();
const { body } = require("express-validator");
const isAuth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const multer = require("multer");

const validateProduct = [
  body("name")
    .notEmpty()
    .withMessage("Product name is empty.")
    .isLength({ min: 3 })
    .withMessage("Product name must contain at least 3 characters."),
  body("price")
    .notEmpty()
    .withMessage("Product price is empty.")
    .isNumeric({ gt: 0 })
    .withMessage("Price must be greater than zero."),
  body("description")
    .notEmpty()
    .withMessage("Product description is empty.")
    .isString()
    .withMessage("Product description must be a string."),
  body("quantity")
    .notEmpty()
    .withMessage("Product quantity is empty.")
    .isNumeric({ gt: 0 })
    .withMessage("Quantity must be greater than zero."),
  body("category").notEmpty().withMessage("Category is required."),
  body("user").notEmpty().withMessage("Please select a user."),
];

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images"); // Store images in public/images directory
  },
  filename: (req, file, cb) => {
    // Set unique filename to prevent overwriting
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Filter images by mimetype
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/webp"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: fileStorage, fileFilter: fileFilter });

router.get("/add-to-cart/:productId", productController.addToCart);
router.post("/update-cart-quantity", productController.updateCartQuantity);

// Get index page
router.get("/", productController.getAllProducts); // Update to use getAllProducts

// GET route to render the add-product form
router.get("/add-product", isAuth, isAdmin, productController.renderAddProductForm);

// POST route to handle adding a new product
router.post("/", isAuth, isAdmin, upload.single("image"), validateProduct, productController.createProduct);

// Get product by ID route
router.get("/:id", productController.getProductById);

// Route to render the edit product page
router.get("/:id/edit", isAuth, isAdmin, productController.renderEditProductPage);

// Update product by ID route
router.post("/:id/edit", isAuth, isAdmin, upload.single("image"), validateProduct, productController.updateProductById);

// DELETE route to delete a product by ID
router.delete("/:id", isAuth, isAdmin, productController.deleteProductById);

// Route to find products by category
router.get("/category/:categoryId", findProductsByCategory);

module.exports = router;
