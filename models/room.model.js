const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: false,
    },
    creator: {
      type: String,
      required: true,
    },  
    createdAt: {
      type: Date,
      default: Date.now,
    },
    maxPlayers: {
      type: Number,
      require: true,
      default: 0
    },
    bet: {
      type: Number,
      require: true,
      default: 0
    }
  });
  

// Export the model
module.exports = mongoose.model('Room', RoomSchema);