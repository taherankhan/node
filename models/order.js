const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, 
      quantity: { type: Number, required: true },
      productName: { type: String } // Add a field to store the product name
    }
  ],
  user: {
    email: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User' 
    }
  },
  status: {
    type: Number,
    enum: [0, 1, 2, 3], //0 pending,1 shipped,2 delivered,3 canceled.
    default: 0 // Set default status to 'pending'
  },
  statusUpdated: [
    {
      status: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        default: Date.now // Set default date to current date
      }
    }
  ]
},
{ timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
