const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlaySchema = new mongoose.Schema({
    roomId : {
        type: String,
        required: true
    },
    pace: {
        type: String,
        required: true
    },
    token:{
        type : String,
        required: true
    },
    creator: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Play', PlaySchema);