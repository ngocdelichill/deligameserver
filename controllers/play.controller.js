const Room = require('../models/room.model');
const User = require('../models/user.model');
const Joiner = require('../models/joiner.model');
const Play = require('../models/play.model');
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");

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
        {
            $match: {
                roomId:roomId
            }
        },
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

const prevHash = function(room){
    Play.findOne({roomId:room}, function(err, play){
        if(play != null)
            return play.token;
        return "";
    }).sort({_id:-1}).limit(1);
};

exports.ready = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const timestamp = new Date();
    var data = {roomId:room,creator:decoded.user_id,pace:"ready",createdAt:timestamp};
    
    Play.find({roomId:room,creator:decoded.user_id,pace:"ready"},function(err, play){        
        if(play.length == 0){
            let tk = SHA256(prevHash(room) + timestamp + JSON.stringify(data));
            data.token = tk;
            const newPlay = new Play(data);
            newPlay.save(function(err,play){
                res.send(play);
            });
        }
    });
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
    res.status(200);
}

exports.choose_color = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const color = req.body.color;
    _io.emit(`choose_color_${room}`,{userId:decoded.user_id,color:color});
}

exports.chinesechess = async function(req, res){
    let roomId = req.query.room;
    let token = req.query.token;
       
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    userlist = await Joiner.aggregate([
        {
            $match: {
                roomId: roomId
            }
        }, {
            "$project": {
                "userObjId": {
                    "$toObjectId": "$creator"
                }
            }
        }, {
            "$lookup": {
                "localField": "userObjId",
                "from": "users",
                "foreignField": "_id",
                "as": "player",
                "pipeline" : [
                   { "$addFields": { "creatorObjId": { "$toString": "$_id" }}},
                    {
                    "$lookup" : {
                        "from": "plays",
                        "localField": "creatorObjId",
                        "foreignField": "creator",
                        "as": "play",
                    }
                }]
            }
        }
    ]);
    let ul = [];
    for(let x in userlist){
        let player = userlist[x].player[0];
        ul.push({
            _id:player._id,
            name:player.name,
            play : player.play
        });
    } 

    Room.findById(roomId, function (err, room){
        User.findById(decoded.user_id, function (err, user) {           
            res.send({room: room,me:user,players:ul});
        });
    });
    
}

exports.devchinesechess = async function(req, res){
    let roomId = req.query.room;
    let token = req.query.token;
       
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    userlist = await Joiner.aggregate([
        {
            $match: {
                roomId: roomId
            }
        }, {
            "$project": {
                "userObjId": {
                    "$toObjectId": "$creator"
                }
            }
        }, {
            "$lookup": {
                "localField": "userObjId",
                "from": "users",
                "foreignField": "_id",
                "as": "player",
                "pipeline" : [
                   { "$addFields": { "creatorObjId": { "$toString": "$_id" }}},
                    {
                    "$lookup" : {
                        "from": "plays",
                        "localField": "creatorObjId",
                        "foreignField": "creator",
                        "as": "play",
                    }
                }]
            }
        }
    ]);
    let ul = [];
    for(let x in userlist){
        let player = userlist[x].player[0];
        ul.push({
            _id:player._id,
            name:player.name,
            play : player.play
        });
    } 

    Room.findById(roomId, function (err, room){
        User.findById(decoded.user_id, function (err, user) {           
            res.render("play/chinachess", {room: room,user:user,userlist:ul});
        });
    });
    
}

exports.chess_start = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    _io.emit(`chess_start_${room}`,{userId:decoded.user_id});
}

exports.chess_mankey = function(req,res){
    const url = new URL(req.headers.referer);
    const token = url.searchParams.get("token");
    const room = url.searchParams.get("room");
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const {key,pace,deleteKey} = req.body; 

    if(deleteKey != undefined){
        //delKey = deleteKey.toString().toUpperCase();
    }                    
    let k = key.toString().toUpperCase();
    var tmp = [];
    pe = pace.split(",");
    tmp.push(8 - parseInt(pe[0]));
    tmp.push(9 - parseInt(pe[1]));
    tmp.push(8 - parseInt(pe[2]));
    tmp.push(9 - parseInt(pe[3]));
    pa = tmp.join(",");
    _io.emit(`chess_mankey_${room}`,{userId:decoded.user_id,pace:pa});
    res.status(200).send({userId:decoded.user_id,pace:pa})
}