const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category');
const { body } = require('express-validator');
const isAuth=require("../middleware/auth");
const isAdmin=require("../middleware/isAdmin");

// GET route to render the add-category form
router.get('/add-category', isAuth, isAdmin, categoryController.renderAddCategoryForm);


// post routes for create  category
router.post('/', isAuth, isAdmin, categoryController.createCategory);


// Get all categories route
router.get('/', categoryController.getAllCategories);

// Get category by ID route
router.get('/:id', categoryController.getCategoryById);

// Route to render the edit category page
router.get('/:id/edit', isAuth, isAdmin, categoryController.renderEditCategoryPage);

// Route to update a category
router.post('/:id/edit', isAuth, isAdmin, categoryController.updateCategoryById);

// Delete category by ID route
router.post('/:id/delete', isAuth, isAdmin, categoryController.deleteCategoryById);

// Route to view products belonging to a category
router.get('/:categoryId/products', categoryController.viewCategoryProducts);

module.exports = router;
