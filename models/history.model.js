const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HistorySchema = new mongoose.Schema({
    userId: { type: String, required: true },    
    createdAt: { type: Date, default: Date.now},
    roomId : {type: String,required: true},
    isWin : {type: String, required: true, default: 0},
    game : {type:Number, required: true}
});

// Export the model
module.exports = mongoose.model('History', HistorySchema);