const User = require("../models/user");
const flash = require("express-flash");
const Order = require("../models/order");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const Product = require("../models/product");

// Function to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString();
}
function calculateTotalPrice(products) {
  let totalPrice = 0;
  products.forEach((product) => {
      totalPrice += product.quantity * product.product.price;
  });
  return totalPrice.toFixed(2);
}
function getOrderStatusClass(status) {
  switch (status) {
      case 0:
          return "pending";
      case 1:
          return "shipped";
      case 2:
          return "delivered";
      case 3:
          return "canceled";
      default:
          return "";
  }
}

exports.addToCart = async (req, res, next) => {
  const productId = req.body.productId;
  try {
    if (!req.session.isLoggedIn) {
      return res.status(401).json({ message: "User is not authenticated" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the product is already in the user's cart
    const existingCartItem = user.cart.items.find(item => item.productId.equals(productId));

    if (existingCartItem) {
      // If the product is already in the cart, update the quantity
      existingCartItem.quantity += parseInt(req.body.quantity || 1);
    } else {
      // If the product is not in the cart, add it to the cart
      user.cart.items.push({ productId: productId, quantity: parseInt(req.body.quantity || 1) });
    }

    await user.save();
    res.redirect("/cart");
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ message: "Failed to add product to cart" });
  }
};


exports.renderCartPage = async (req, res, next) => {
  try {
    const isauthenticated = req.session.isLoggedIn;
    if (!isauthenticated) {
      return res.status(401).json({ message: "User is not authenticated" });
    }

    const user = await User.findById(req.session.user._id).populate({
      path: "cart.items.productId",
      select: "name price description",
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isadmin = req.session.user && req.session.user.role === 0;

    const cartItems = user.cart.items;
    res.render("cart", {
      pageTitle: "Cart",
      user: user,
      cartItems: cartItems,
      isauthenticated: req.session.isLoggedIn,
      isadmin: isadmin,
    });
  } catch (error) {
    console.error("Error fetching user cart:", error);
    res.status(500).json({ message: "Failed to fetch user cart" });
  }
};

exports.deleteCartItem = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user._id;

    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/cart");
    }

    // Find the index of the product in the cart
    const index = user.cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (index !== -1) {
      // Remove the product from the cart
      user.cart.items.splice(index, 1);
      await user.save();

      // Set flash message for successful deletion
      req.flash("success", "Product removed from cart");
      return res.redirect("/cart");
    } else {
      req.flash("error", "Product not found in cart");
      return res.redirect("/cart");
    }
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    req.flash("error", "Failed to delete item from cart");
    return res.redirect("/cart");
  }
};
exports.postOrder = async (req, res, next) => {
  try {
    // Ensure user information is available in the session
    if (!req.session.isLoggedIn || !req.session.user) {
      req.flash("error", "Please log in to place an order");
      return res.redirect("/login"); // Redirect to login page if user is not logged in
    }

    // Retrieve user information from the session
    const { name, email, _id } = req.session.user;

    // Find the user's cart items and populate product details
    const user = await User.findById(_id).populate("cart.items.productId");

    // Check if the user exists
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/cart");
    }

    // Extract products from the cart items
    const products = user.cart.items.map((item) => {
      return {
        quantity: item.quantity,
        product: { ...item.productId._doc },
      };
    });

    // Create a new order with user information
    const order = new Order({
      user: {
        name: name,
        email: email,
        userId: _id,
      },
      products: products,
      status: 0, // Set initial status as pending
      statusUpdated: [{ status: 0, date: new Date() }], // Add initial status update
    });

    // Save the order
    await order.save();

    // Clear the user's cart
    await user.clearCart();

    // Redirect to the orders page
    res.redirect("/cart/orders"); // Update the redirect URL to the orders page
  } catch (error) {
    console.error("Error placing order:", error);
    req.flash("error", "Failed to place order");
    res.redirect("/cart"); // Redirect to cart page in case of error
  }
};
// Define getStatusWidth function
function getStatusWidth(status) {
  const maxWidth = 200; // Adjust the maximum width as needed
  const statusPercentage = (status + 1) * 25; // Assuming each status takes 25% of the maximum width
  return `${statusPercentage}px`;
}

function getStatusName(status) {
  const statusNames = {
      0: 'Pending',
      1: 'Shipped',
      2: 'Delivered',
      3: 'Canceled'
  };
  return statusNames[status] || 'Unknown';
}

// Controller function to render the orders page
// Controller function to render the orders page
exports.getOrders = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.session.isLoggedIn) {
      req.flash("error", "Please log in to view your orders");
      return res.redirect("/users/login");
    }

    // Fetch orders based on user role
    let orders;
    if (req.session.user.role === 0) {
      orders = await Order.find().populate("user.userId products.product");
    } else {
      orders = await Order.find({ "user.userId": req.session.user._id }).populate("products.product");
    }

    // Ensure that each product object within orders contains the imageUrl
    for (const order of orders) {
      for (const product of order.products) {
        const productData = await Product.findById(product.product._id);
        if (productData) {
          product.product.imageUrl = productData.imageUrl;
        }
      }
    }

    // Render the orders page with fetched orders data
    res.render("orders", {
      pageTitle: "Your Orders",
      orders: orders,
      isauthenticated: req.session.isLoggedIn,
      isadmin: req.session.user.role === 0,
      noOrders: orders.length === 0,
      formatDate: formatDate,
      calculateTotalPrice: calculateTotalPrice,
      getOrderStatusClass: getOrderStatusClass,
      getStatusName: getStatusName
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    req.flash("error", "Failed to fetch orders");
    res.redirect("/cart");
  }
};


async function getProductImage(productId) {
  // Function to fetch product image URL
  const product = await Product.findById(productId);
  return product ? product.image : null;
}

exports.getInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    // Fetch the order with populated product details
    const order = await Order.findById(orderId).populate("products.product");

    if (!order) {
      return res.status(404).json({ message: "No order found." });
    }

    // Fetch the user's details from the order
    const userId = order.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Create a new PDF document
    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");

    // Set the filename for the PDF
    const invoiceName = `invoice-${orderId}.pdf`;
    res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

    // Pipe the PDF document to the response
    pdfDoc.pipe(res);

    // Add invoice title
    pdfDoc.fontSize(20).text("Invoice", { align: "center" });
    pdfDoc.moveDown();

    // Add order details
    pdfDoc.fontSize(16).text(`Order ID: ${order._id}`);
    // Add user information
    pdfDoc.fontSize(12).text(`User: ${user.name} (${user.email})`, { align: "left" });
    pdfDoc.moveDown();

    pdfDoc.fontSize(12).text(`Date: ${new Date(order.createdAt).toDateString()}`);
    pdfDoc.moveDown();

    // Add table header
    pdfDoc.font("Helvetica-Bold").text("Product name", { continued: true });
    pdfDoc.text(" | Quantity | Price |   Total");
    pdfDoc.moveDown();

    pdfDoc.text(
      "---------------------------------------------------------------------------------------------------------------------"
    );

    // Add products to the table
    let totalPrice = 0;
    for (const prod of order.products) {
      const productTotal = prod.quantity * prod.product.price;
      totalPrice += productTotal;

      const productImage = await getProductImage(prod.product._id);

      pdfDoc
        .font("Helvetica")
        .text(`${prod.product.name}`, { continued: true, link: `/products/${prod.product._id}` }) // Link to product details
        .text(" | Quantity: " + prod.quantity.toString() + " | Price: $" + prod.product.price.toFixed(2) + " | Total: $" + productTotal.toFixed(2))
        .moveDown();

      if (productImage) {
        pdfDoc.image(productImage, { width: 100, height: 100 }); // Include product image
        pdfDoc.moveDown();
      }
    }

    // Add line separator
    pdfDoc
      .font("Helvetica-Bold")
      .text(
        "---------------------------------------------------------------------------------------------------------------------"
      );

    // Add total price
    pdfDoc.moveDown();
    pdfDoc
      .font("Helvetica-Bold")
      .text(`Total Price: $${totalPrice.toFixed(2)}`, { align: "right" });

    // End the PDF document
    pdfDoc.end();
  } catch (error) {
    next(error); // Pass any caught errors to the error handling middleware
  }
};



exports.updateOrderStatus = async (req, res, next) => {
  try {
      const orderId = req.params.orderId;
      const status = req.body.status;

      // Update the order status in the database
      await Order.findByIdAndUpdate(orderId, { status: status });

      res.status(200).json({ message: 'Order status updated successfully' });
  } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
  }
};
exports.updateCartQuantity = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    const quantity = req.body.quantity;

    // Validate input
    if (!productId || !quantity || isNaN(quantity)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    // Find the current user
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the product in the user's cart
    const cartItem = user.cart.items.find(item => item.productId.equals(productId));
    if (!cartItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Update the quantity
    cartItem.quantity = parseInt(quantity);

    // Save the user
    await user.save();

    res.status(200).json({ message: "Cart quantity updated successfully" });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    next(error);
  }
};





// exports.getCheckout = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.session.user._id).populate({
//       path: "cart.items.productId",
//       select: "name price description",
//     });
//     if (!user) {
//       req.flash('error', 'User not found');
//       return res.redirect('/cart');
//     }

//     const cartItems = user.cart.items;
//     const total = cartItems.reduce((accumulator, item) => {
//       return accumulator + item.quantity * item.productId.price;
//     }, 0);

//     res.render("checkout", {
//       pageTitle: "Checkout",
//       cartItems: cartItems,
//       total: total,
//     });
//   } catch (error) {
//     console.error("Error fetching user cart for checkout:", error);
//     req.flash('error', 'Failed to fetch user cart for checkout');
//     return res.redirect('/cart');
//   }
// };
// exports.placeOrder = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.session.user._id).populate({
//       path: "cart.items.productId",
//       select: "name price description",
//     });
//     if (!user) {
//       req.flash('error', 'User not found');
//       return res.redirect('/cart');
//     }
//     const products = user.cart.items.map(item => {
//       return {
//         product: { ...item.productId._doc },
//         quantity: item.quantity
//       };
//     });
//     const order = new Order({
//       products: products,
//       user: {
//         email: user.email,
//         userId: user._id
//       }
//     });
//     await order.save();
//     user.cart.items = [];
//     await user.save();
//     req.flash('success', 'Order placed successfully');
//     return res.redirect('/cart');
//   } catch (error) {
//     console.error("Error placing order:", error);
//     req.flash('error', 'Failed to place order');
//     return res.redirect('/cart');
//   }
// };

// exports.renderCheckoutPage = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.session.user._id).populate({
//       path: "cart.items.productId",
//       select: "name price description",
//     });
//     if (!user) {
//       req.flash('error', 'User not found');
//       return res.redirect('/cart');
//     }
//     const cartItems = user.cart.items;
//     const total = cartItems.reduce((accumulator, item) => {
//       return accumulator + item.quantity * item.productId.price;
//     }, 0);
//     res.render("checkout", {
//       pageTitle: "Checkout",
//       cartItems: cartItems,
//       total: total,
//     });
//   } catch (error) {
//     console.error("Error fetching user cart for checkout:", error);
//     req.flash('error', 'Failed to fetch user cart for checkout');
//     return res.redirect('/cart');
//   }
// };
