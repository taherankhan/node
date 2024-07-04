const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true ,"name is required"] },
  description: { type: String ,required:[true, "description is required"]},
  price: { type: Number, required:[ true, "Price is required"] },
  quantity: { type: Number, required: [true,"quantity is required"] },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true,"category is required"],
  },
  imageUrl: {
    type: String,
    required: [true, "Image URL  is required"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "user id is required"],
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
