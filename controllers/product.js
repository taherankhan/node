const { validationResult } = require("express-validator");
const Product = require("../models/product");
const Category = require("../models/category");
const User = require("../models/user");

exports.renderAddProductForm = async (req, res, next) => {
  try {
    const categories = await Category.find();
    const currentUser = req.session.user;
    const created = req.flash("success")[0]; // Retrieve created message from flash
    const isadmin = currentUser && currentUser.role === 0;

    res.render("product/add-product", {
      categories,
      currentUser,
      validationErrors: [],
      name: "",
      description: "",
      price: "",
      quantity: "",
      category: "",
      isauthenticated: req.session.isLoggedIn,
      created: created,
      isadmin: isadmin, // Pass the isadmin variable
    });
  } catch (error) {
    console.error("Error rendering add-product form:", error);
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, quantity, category } = req.body;
    const image = req.file;
    console.log(image);
    // Check if a file was uploaded

    const categories = await Category.find();
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const isadmin = req.session.user && req.session.user.role === 0;
      return res.render("product/add-product", {
        validationErrors: errors.array(),
        categories,
        name,
        description,
        price,
        quantity,
        category,
        imageUrl: image.originalname,
        isauthenticated: req.session.isLoggedIn,
        isadmin: isadmin,
      });
    }

    const product = new Product({
      name,
      description,
      price,
      quantity,
      category,
      imageUrl: image.filename,
      user: req.session.user._id,
    });

    await product.save();
    req.flash("created", "Product created successfully");

    return res.redirect("/products");
  } catch (error) {
    console.error("Error creating product:", error);
    next(error);
  }
};
exports.getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const totalCount = await Product.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);
    const lastPage = totalPages;
    const nextPage = page < totalPages ? page + 1 : null;
    const previousPage = page > 1 ? page - 1 : null;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    let user = null;
    if (req.session.isLoggedIn && req.session.user) {
      // User is authenticated, fetch user's cart items
      const userId = req.session.user._id;
      user = await User.findById(userId)
        .populate("cart.items.productId")
        .exec();
    }

    // Fetch products from the database
    const products = await Product.find()
      .populate("category")
      .skip(skip)
      .limit(limit);

    // If user is authenticated, mark products in cart and set cart quantity
    if (user) {
      products.forEach((product) => {
        const cartItem = user.cart.items.find((item) =>
          item.productId && item.productId._id.equals(product._id)
        );
        product.isInCart = !!cartItem;
        product.cartQuantity = cartItem ? cartItem.quantity : 0;
      });
    }

    res.render("product/products", {
      products: products,
      totalPages,
      currentPage: page,
      lastPage,
      nextPage,
      previousPage,
      hasNextPage,
      hasPreviousPage,
      user,
      created: req.flash("created")[0],
      updated: req.flash("updated")[0],
      isauthenticated: req.session.isLoggedIn,
      isadmin: req.session.user && req.session.user.role === 0,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    error.httpStatusCode = 500;
    next(error);
  }
};


exports.getProductById = async (req, res, next) => {
  try {
    const productId = req.params.id;
    // Find the product by ID and populate its category
    const product = await Product.findById(productId).populate("category");

    // If the product is not found, render a 404 page
    if (!product) {
      return res.status(404).render("404");
    }

    // Check if there is a user session and fetch the user's cart items
    let user;
    if (req.session && req.session.user && req.session.user._id) {
      user = await User.findById(req.session.user._id).populate("cart.items.productId");
    }

    // Check if the user is authenticated and determine if the product is in the user's cart
    const isInCart = user && user.cart.items.some(item => item.productId && item.productId._id.equals(product._id));
      const cartQuantity = isInCart ? user.cart.items.find(item => item.productId && item.productId._id.equals(product._id)).quantity : 0;
   // Render the product details page with the necessary data
   res.render("product/productDetails", {
    product: product,
    user: user,
    isauthenticated: req.session.isLoggedIn,
    isadmin: req.session.user && req.session.user.role === 0,
    isInCart: isInCart,
    cartQuantity: cartQuantity,
    item: { quantity: cartQuantity, productId: product._id } // Pass the item object with quantity and productId
  });
  } catch (error) {
    console.error("Error fetching product:", error);
    next(error);
  }
};
  
exports.renderEditProductPage = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    const categories = await Category.find();
    const created = req.flash("updated")[0];

    if (!product) {
      return res.status(404).render("404");
    }

    // Check if the 'updated' query parameter exists and is set to true
    const updated = req.query.updated === "true";

    res.render("product/edit-product", {
      product,
      categories,
      isauthenticated: req.session.isLoggedIn,
      updated: updated,
      isadmin: req.session.user && req.session.user.role === 0, // Add isadmin variable here
    });
  } catch (error) {
    console.error("Error rendering edit product page:", error);
    next(error);
  }
};
exports.updateProductById = async (req, res, next) => {
  const productId = req.params.id;
  const newData = req.body;

  try {
    let imageUrl = newData.image || newData.imageUrl; // Get the new image URL from the form or retain the existing one
    const image = req.file;

    if (image) {
      // If a new image is uploaded, set imageUrl to the path of the uploaded image
      imageUrl = image.filename;
    }

    newData.imageUrl = imageUrl; // Update the imageUrl in the newData object

    const product = await Product.findByIdAndUpdate(productId, newData, {
      new: true,
    });

    req.flash("updated", "product updated successful");

    if (!product) {
      return res.status(404).render("404");
    }

    // Redirect to the product page with the success message
    res.redirect(`/products`); // Pass 'updated=true' as query parameter
  } catch (error) {
    console.error("Error updating product:", error);
    next(error);
  }
};

exports.deleteProductById = async (req, res, next) => {
  const productId = req.params.id;

  try {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    // Send success response with the message
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    next(error);
  }
};

exports.findProductsByCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId;
    const products = await Product.find({ "category._id": categoryId });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    // Check if the user is authenticated
    if (req.session.isLoggedIn && req.session.user) {
      // User is authenticated, proceed to fetch products
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const skip = (page - 1) * limit;

      const totalCount = await Product.countDocuments();
      const totalPages = Math.ceil(totalCount / limit);
      const lastPage = totalPages;
      const nextPage = page < totalPages ? page + 1 : null; // Calculate the next page
      const previousPage = page > 1 ? page - 1 : null; // Calculate the previous page
      const hasNextPage = page < totalPages; // Determine if there is a next page
      const hasPreviousPage = page > 1; // Determine if there is a previous page

      // Get the current user's cart items
      const userId = req.session.user._id; // Assuming user ID is stored in the session
      const user = await User.findById(userId)
        .populate("cart.items.productId")
        .exec();

      // Fetch products from the database
      const products = await Product.find()
        .populate("category")
        .skip(skip)
        .limit(limit);

      // Mark products that are already in the user's cart
      products.forEach((product) => {
        const cartItem = user.cart.items.find(
          (item) => item.productId && item.productId._id.equals(product._id)
        );
        product.isInCart = !!cartItem;
        product.cartQuantity = cartItem ? cartItem.quantity : 0; // Set cart quantity for each product
      });

      return res.render("product/products", {
        products: products,
        totalPages,
        currentPage: page,
        lastPage,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage,
        user,
        created: req.flash("created")[0], // Pass the created message
        updated: req.flash("updated")[0],
        isauthenticated: req.session.isLoggedIn,
        isadmin: req.session.user && req.session.user.role === 0, // Add isadmin variable here
      });
    } else {
      // User is not authenticated, render the products page without user-specific data
      const products = await Product.find().populate("category");
      return res.render("product/products", {
        products: products,
        isauthenticated: req.session.isLoggedIn,
        isadmin: req.session.user && req.session.user.role === 0, // Add isadmin variable here
      });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    error.httpStatusCode = 500;
    next(error);
  }
};


exports.addToCart = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const user = await User.findById(req.session.user._id);

    user.addToCart(product);

    return res.redirect("/cart"); // Redirect to the cart page after adding the product
  } catch (error) {
    console.error("Error adding product to cart:", error);
    next(error);
  }
};

exports.updateCartQuantity = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    const quantity = req.body.quantity;

    const user = await User.findById(req.session.user._id)
      .populate("cart.items.productId") // Populate cart items with product details
      .exec();

    // Find the cart item corresponding to the productId
    const cartItem = user.cart.items.find(
      (item) => item.productId._id.toString() === productId
    );

    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    // Update the cart quantity
    cartItem.quantity = quantity;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Cart quantity updated successfully" });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    next(error);
  }
};
