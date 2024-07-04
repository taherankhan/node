const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: [true, "user name required"] },
  email: {
    type: String,
    required: [true, "users e-mail required"],
    unique: true,
  },
  password: { type: String, required: [true, "users password is required"] },
  countrycode: { type: String, required: [true, "Country code is required"] },
  phone: {
    type: String,
    required: [true, "users phone number is required"],
    unique: true,
    min: [10, "Must be at least 10, got {VALUE}"],
  },
  role: {
    type: Number,
    enum: [0, 1],
    default: 1,   //0 for admin  , 1 for normal users
  },
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1 }, // Default quantity is 1
      },
    ],
  },
});

userSchema.methods.addToCart = function(product) {
  const cartProductIndex = this.cart.items.findIndex(cp => {
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];

  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity
    });
  }
  const updatedCart = {
    items: updatedCartItems
  };
  this.cart = updatedCart;
  return this.save();
};
userSchema.methods.clearCart = function() {
  this.cart = { items: [] };
  return this.save();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
