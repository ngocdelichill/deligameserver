const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendSchema = new mongoose.Schema({
    userId: { type: String, default: null },
    creator: { type: String, required:true },
    createdAt: { type: Date, default: Date.now},
    accept: {type: Boolean, default: false}
  });

// Export the model
module.exports = mongoose.model('Friend', FriendSchema);