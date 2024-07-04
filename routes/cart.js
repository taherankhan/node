const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const isAuth = require("../middleware/auth");

router.post("/add", isAuth, cartController.addToCart);
router.get("/", isAuth, cartController.renderCartPage);
router.post("/delete-item", isAuth, cartController.deleteCartItem);
router.post("/create-order", isAuth, cartController.postOrder); // Define the create-order route
router.get("/orders", isAuth, cartController.getOrders); // Ensure that only authenticated users can access orders
router.get('/orders/:orderId', isAuth, cartController.getInvoice);
router.put('/orders/:orderId/status', isAuth, cartController.updateOrderStatus);
// Define the route for updating cart quantity
router.post("/update-cart-quantity", isAuth, cartController.updateCartQuantity);


// router.get('/checkout', isAuth, cartController.renderCheckoutPage);// Route for rendering checkout page
// router.post('/place-order', isAuth, cartController.placeOrder); // Route for placing order

module.exports = router;
