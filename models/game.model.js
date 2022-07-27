const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameSchema = new mongoose.Schema({
    id: {type:Number,required:true},
    name: {type:String, required: true},
    desc: {type:String, required:false},
    alias: {type:String, required:true},
    img: {type:String, required: false},
    thumb: {type:String, required: false},
    roomPlayerMax: {type:Number, required: true},
    roomBackground: {type:String, required: false},
    timeLimit: {type: Number, required: false},
    sort: {type:Number, required: true},
    fee : {type: Number, requied: true}
  });

// Export the model
module.exports = mongoose.model('Game', GameSchema);