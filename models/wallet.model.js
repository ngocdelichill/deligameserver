const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletSchema = new mongoose.Schema({
    address : { type: String, required: true },
    createdAt : {type:Date,default: Date.now},
    creator : {type: String, required: true}
});

module.exports = mongoose.model('Wallet', WalletSchema);