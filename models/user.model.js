const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
    name: { type: String, default: null },
    email: { type: String, unique: true },
    phone: { type: String, unique: true },
    password: { type: String },
    token: { type: String },
  });

// Export the model
module.exports = mongoose.model('User', UserSchema);