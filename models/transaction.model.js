const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new mongoose.Schema({
    fromAddress : { type: String, required: true },
    toAddress : { type: String, required: true },
    createdAt : {type:Date,default: Date.now},
    creator : {type: String, required: true},
    amount : {type: Number, required: false},
    status : {type: Boolean, default: false},
    transactionDate : {type: Date, required: false},
    hash : {type: String, required: false},
    blockNumber : {type: Number, required: false}
});

module.exports = mongoose.model('Transaction', TransactionSchema);