const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new mongoose.Schema({
    fromAddress : { type: String, required: true },
    toAddress : { type: String, required: true },
    createdAt : {type:Date,default: Date.now},
    creator : {type: String, required: true},
    amount : {type: Number, required: true},
    status : {type: Boolean, default: false},
    transactionDate : {type: Date}
});

module.exports = mongoose.model('Transaction', TransactionSchema);