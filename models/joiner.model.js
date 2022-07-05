const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JoinerSchema = new mongoose.Schema({
    roomId: {
        type: String,
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

  

// Export the model
module.exports = mongoose.model('Joiner', JoinerSchema);