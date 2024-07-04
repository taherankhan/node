const { body, validationResult } = require("express-validator");
const Category = require("../models/category");
const Product = require("../models/product");
const User = require("../models/user");

// Render the add category form
exports.renderAddCategoryForm = async (req, res, next) => {
  try {
    const categories = await Category.find();
    // Dynamically get the currently logged-in user's information from the session
    const currentUser = req.session.user;
    const created = req.flash('success')[0];
    const isadmin = currentUser && currentUser.role === 0; // Check if user is admin

    res.render("category/add-category", {
      categories,
      currentUser, // Pass the currentUser information to the view
      errorMessage: "",
      isauthenticated: req.session.isLoggedIn,
      created: created,
      isadmin: isadmin
    });
  } catch (error) {
    console.error("Error rendering add-category form:", error);
    next(error);
  }
};


// Create a new category
exports.createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
      return res.render("add-category", {
        errorMessage: errors.array()[0].msg,
        isauthenticated: req.session.isLoggedIn,
        isadmin: isadmin
      });
    }

    const existingCategory = await Category.findOne({ name: req.body.name });
    if (existingCategory) {
      const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
      return res.render("category/add-category", {
        errorMessage: "Category with the same name already exists",
        isauthenticated: req.session.isLoggedIn,
        isadmin: isadmin
      });
    }

    // Create the category with the currently logged-in user's ID
    const category = new Category({
      name: req.body.name,
      user: req.session.user._id // Assign the currently logged-in user's ID
    });
    await category.save();
    req.flash('created', 'Category created successfully');

    res.redirect("/categories");
  } catch (error) {
    console.error("Error creating category:", error);
    next(error);
  }
};


exports.getAllCategories = async (req, res, next) => {
  try {
    // Retrieve the error message from the query parameters, if any
    const errorMessage = req.query.error;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 6;
    const skip = (page - 1) * itemsPerPage;

    const totalCount = await Category.countDocuments();
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
   

    // Calculate nextPage based on the current page
    const nextPage = page < totalPages ? page + 1 : null;

    const categories = await Category.find()
      .skip(skip)
      .limit(itemsPerPage);

    // Pass the error message, nextPage, and other variables to the view
    res.render("category/category", {
      categories,
      errorMessage,
      totalPages,
      currentPage: page,
      itemsPerPage,
      previousPage : page > 1 ? page - 1 : null,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage,
      // user: req.session.user,
      isauthenticated:req.session.isLoggedIn,
      isadmin: isadmin,
      updated:req.flash('updated')[0],
      created: req.flash('created')[0] // Pass the created message
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    next(error);
  }
};


// Get category by ID
exports.getCategoryById = async (req, res, next) => {
  const categoryId = req.params.id;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    next(error);
  }
};

// Render edit category page
exports.renderEditCategoryPage = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
   
   
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const updated = req.query.updated === 'true';

    res.render("category/edit-category", { 
      category, 
      errorMessage: "",
      // user: req.session.user 
      isauthenticated:req.session.isLoggedIn,
      updated: updated ,
      isadmin:isadmin
    });
  } catch (error) {
    next(error);
  }
};

// Update category by ID
exports.updateCategoryById = async (req, res, next) => {
  const categoryId = req.params.id;
  const newData = req.body;

  try {
    const existingCategory = await Category.findOne({
      name: newData.name,
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const categories = await Category.find();
      const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
      
      return res.render("category/edit-category", {
        category,
        errorMessage: "Category with the same name already exists",
        categories,
        isauthenticated: req.session.isLoggedIn,
        isadmin: isadmin // Pass isadmin to the template
      });
    }

    const category = await Category.findByIdAndUpdate(categoryId, newData, {
      new: true,
    });

    req.flash('updated', 'Category updated successfully');

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.redirect("/categories");
  } catch (error) {
    console.error("Error updating category:", error);
    next(error);
  }
};


// Delete category by ID
exports.deleteCategoryById = async (req, res, next) => {
  const categoryId = req.params.id;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const productsCount = await Product.countDocuments({ category: categoryId });
    if (productsCount > 0) {
      const errorMessage = "Products are available for this category. Cannot delete category.";
      return res.status(400).json({ success: false, message: errorMessage });
    }

    await Category.findByIdAndDelete(categoryId);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Error deleting category. Please try again later." });
  }
};



// View products belonging to a category
exports.viewCategoryProducts = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);
    const isadmin = req.session.user && req.session.user.role === 0; // Check if user is admin
   
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    const products = await Product.find({ category: categoryId });
    res.render("category/category-products", { 
      category, 
      products,
      // user: req.session.user 
      isauthenticated:req.session.isLoggedIn,
      isadmin:isadmin
    });
  } catch (err) {
    next(err);
  }
};
