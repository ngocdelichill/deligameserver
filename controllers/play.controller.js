const Room = require('../models/room.model');
const User = require('../models/user.model');
const Joiner = require('../models/joiner.model');
const jwt = require("jsonwebtoken");
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.finance = async function (req, res) {
    let roomId = req.query.room;
    let token = req.query.token;
       
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    //const userlist = await Joiner.find({roomId:roomId, creator:{$ne:decoded.user_id}});
    userlist = await Joiner.aggregate([
        { "$project": { "userObjId": { "$toObjectId": "$creator" } } },
        { "$lookup": {
        "localField": "userObjId",
        "from": "users",
        "foreignField": "_id",
        "as": "player"
      }}
        ]);
        let ul = [];
    for(let x in userlist){
        let player = userlist[x].player[0];
        ul.push({
            _id:player._id,
            name:player.name
        });
    } 

    Room.findById(roomId, function (err, room){

        User.findById(decoded.user_id, function (err, user) {
           
            res.render("play/finance", {room: room,user:user,userlist:ul});
        });


    });

}

exports.ready = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    _io.emit(`ready_${room}`,decoded.user_id);
   
}

exports.roll = function(req, res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const {die1,die2} = req.body;
    _io.emit(`roll_${room}`,{die1:die1,die2:die2});
}
exports.dice = function(req, res){
    res.send({die1:5,die2:4});
}
exports.next = function(req, res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const {player} = req.body;
    _io.emit(`next_${room}`,{player:player});
}
exports.auction = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    _io.emit(`auction_${room}`,decoded.user_id);
}
exports.bid = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const {bid,currentbidder} = req.body;
    _io.emit(`bid_${room}`,{bid:bid,userId:decoded.user_id,currentbidder:currentbidder});
}