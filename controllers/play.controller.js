const Room = require('../models/room.model');
const User = require('../models/user.model');
const Joiner = require('../models/joiner.model');
const Play = require('../models/play.model');
const History = require('../models/history.model');
const ObjectId = require('mongoose').Types.ObjectId; 
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");

const jwt = require("jsonwebtoken");
const { decode } = require('punycode');
const { isObjectIdOrHexString } = require('mongoose');
const { join } = require('path');
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
        if(play != null){
            console.log(play.token);
            return play.token;
        }
        return "";
    }).sort({_id:-1}).limit(1);
};

exports.ready = function(req,res){
    //const url = new URL(req.headers.referer);
    //const token = url.searchParams.get("token");
    //const room = url.searchParams.get("room");
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const timestamp = new Date();
    var data = {roomId:roomId,creator:decoded.user_id,pace:"ready",createdAt:timestamp};
    
    Play.find({roomId:roomId,creator:decoded.user_id,pace:"ready"},function(err, play){        
        if(play.length == 0){
            let tk = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
            data.token = tk;
            const newPlay = new Play(data);
            newPlay.save(function(err,play){
                res.send(play);
                _io.emit(`ready_${roomId}`,{userId:decoded.user_id,isReady:true});
            });
        }else{
            Play.deleteOne({roomId:roomId,creator:decoded.user_id,pace:'ready'},function(err,play){
                res.send({isReady:false});
                _io.emit(`ready_${roomId}`,{userId:decoded.user_id,isReady:false});
            });
        }
    });
    
   
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
    //let roomId = req.query.room;
    //let token = req.query.token;
    const {token,roomId} = req.body;
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
                         pipeline : [{$match : {pace:"ready",roomId:roomId}}]
                     },
                   
                 }]
            }
        }
    ]);
    const play = await Play.findOne({roomId:roomId}).sort({_id:-1}).limit(1);
    let ul = [];
    for(let x in userlist){
        let player = userlist[x].player[0];
        let ready = player.play.length > 0 ? player.play[0].pace:"";
        ul.push({
            _id:player._id,
            name:player.name,
            isReady:(ready == 'ready' ? true:false)
        });
    }  
    Room.findById(roomId, function (err, room){
        User.findById(decoded.user_id, function (err, user) {           
            res.send({room: room,me:user,players:ul,play:play});
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
                         pipeline : [{$match : {pace:"ready",roomId:roomId}}]
                     },
                    
                 }]
            }
        }
    ]);
    const play = await Play.findOne({roomId:roomId}).sort({_id:-1}).limit(1);
    let ul = [];
    for(let x in userlist){
        let player = userlist[x].player[0];
        let ready = player.play.length > 0 ? player.play[0].pace:"";
        ul.push({
            _id:player._id,
            name:player.name,
            isReady:(ready == 'ready' ? true:false)
        });
    } 
    
    Room.findById(roomId, function (err, room){
        User.findById(decoded.user_id, function (err, user) {           
            res.render("play/chinachess", {room: room,me:user,players:ul,play:play});
        });
    });
    
}

exports.chess_start = async function(req,res){
    //const url = new URL(req.headers.referer);
    //const token = url.searchParams.get("token");
    //const room = url.searchParams.get("room");
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    Play.find({roomId:roomId,pace:'ready'},function(err, play){
        if(play.length == 2){
            Room.updateOne({_id: new ObjectId(roomId)},{$set : {status:1}},function(err, r){
                Joiner.find({roomId:roomId},function(err,joiner){
                    let tmp = [];
                    for(let x in joiner){
                        tmp.push({
                            roomId : roomId,
                            userId : joiner[x].creator,
                            game : 1,
                            isWin : 0
                        });
                    }
                    History.insertMany(tmp);
                });
                
                const pace = "C1:0.0,M1:1.0,X1:2.0,S1:3.0,J0:4.0,S0:5.0,X0:6.0,M0:7.0,C0:8.0,P1:1.2,P0:7.2,Z4:0.3,Z3:2.3,Z2:4.3,Z1:6.3,Z0:8.3,z0:0.6,z1:2.6,z2:4.6,z3:6.6,z4:8.6,p0:1.7,p1:7.7,c0:0.9,m0:1.9,x0:2.9,s0:3.9,j0:4.9,s1:5.9,x1:6.9,m1:7.9,c1:8.9";
                const timestamp = new Date();
                var data = {roomId:roomId,creator:decoded.user_id,pace:pace,createdAt:timestamp};
                let tk = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                data.token = tk;
                const newPlay = new Play(data);
                newPlay.save(function(){
                    _io.emit(`chess_start_${roomId}`,r.creator);
                    _io.emit(`room_remove`,{roomId:roomId});
                    res.status(200).send({code:1,msg:'Countdown 3s to play game'});
                });
            });
        }else{
            res.status(200).send({code:0,msg:'Players are not ready'});
        }
    });
    
}

exports.chess_mankey = async function(req,res){
    //const url = new URL(req.headers.referer);
    //const token = url.searchParams.get("token");
    //const roomId = url.searchParams.get("room");
    const {token,roomId,key,pace,deleteKey} = req.body; 
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const room = await Room.findOne({_id: new ObjectId(roomId)});
    if(room.status == 1){
        const play = await Play.findOne({roomId:roomId}).sort({_id:-1}).limit(1);
        var k = key;
        var tmp = [];
        pe = pace.split(",");
        tmp.push(8 - parseInt(pe[0]));
        tmp.push(9 - parseInt(pe[1]));
        tmp.push(8 - parseInt(pe[2]));
        tmp.push(9 - parseInt(pe[3]));
        pa = tmp.join(",");
        
        const a = paceToObject(play.pace);
        var delKey = deleteKey; 
    
        if(decoded.user_id != room.creator){
            if(key == key.toLowerCase()){
                k = key.toUpperCase();
            }
            if(delKey != undefined){
                if(delKey == delKey.toUpperCase()){
                    delKey = delKey.toLowerCase();
                }  
            }
            a[k] = `${8 - parseInt(pe[2])}.${9 - parseInt(pe[3])}`;
        }else{
            a[k] = `${pe[2]}.${pe[3]}`;
        }
        
        if(delKey != undefined){
            delete a[delKey];
        }
    
        let timestamp = new Date();
        var data = {creator:decoded.user_id,roomId:roomId,pace:paceToString(a),createdAt:timestamp};
        let tk = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
        data.token = tk;            
        const newPlay = new Play(data);
        newPlay.save(function(err,pl){
            if(delKey === 'j0' || delKey === 'J0'){
                Room.updateOne({_id : new ObjectId(roomId)},{$set:{status:2}},function(){
                    Joiner.deleteMany({roomId:roomId},function(){
                        History.updateOne({userId:decoded.user_id,roomId:roomId},{$set:{isWin:1}},function(){});
                        History.updateOne({userId:{$ne:decoded.user_id},roomId:roomId},{$set:{isWin:-1}},function(){});
                        res.send({code:2,msg:"The game is end"});
                        _io.emit(`room_end_${roomId}`,{userId:decoded.user_id});
                    });                                
                });
            }else{
                _io.emit(`chess_mankey_${roomId}`,{userId:decoded.user_id,key:key.toUpperCase(),pace:pa});
                res.status(200).send({userId:decoded.user_id,pace:pa});
            }
            

        });
    }
    if(room.status == 2){
        res.status(200).send({code:0,msg:"The game ends"});
    }
    
}

const paceToString = function(pace){
    var a = [];
    for(x in pace){
        a.push(x+":"+pace[x]); 
    }
    return a.join(",");
}
const paceToObject = function(pace){
    var pa = {};
    var a = pace.split(",");
    for(x in a){
        b = a[x].split(":");
        pa[b[0]] = b[1];
    }
    return pa;
}

exports.chess_draw = async function(req,res){
    const {token,roomId} = req.body;
    Room.findOne({_id : new ObjectId(roomId)},async function(err,room){
        if(!error){
            if(room.status == '1'){
                const decoded = jwt.verify(token, process.env.JWT_KEY);
                const joiner = await Joiner.findOne({roomId:roomId,creator:{$ne:decoded.user_id}});
                let timestamp = new Date();
                var data = {
                    roomId:roomId,
                    creator:decoded.user_id,
                    createdAt:timestamp,
                    pace:'draw'
                }
                data.token = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                Play.insertOne(data);
                _io.emit(`room_draw_${roomId}`,{userId:decoded.user_id});
                res.send({code:1,msg:"Send request success"});
            }            
        }
    });    
};
exports.chess_draw_response = async function(){
    const {token,roomId,response} = req.body;
    Play.findOne({roomId:roomId},function(err,play){
        if(play.pace == 'draw'){
            const decoded = jwt.verify(token, process.env.JWT_KEY);
                let timestamp = new Date();
                var data = {
                    roomId:roomId,
                    creator:decoded.user_id,
                    createdAt:timestamp
                }
                data.token = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
            if(response == 'accept'){
                data.pace = 'accept';
                Play.insertOne(data);
                Room.updateOne({roomId:roomId},{$set : {status:2}});
                _io.emit(`room_draw_response_${roomId}`,{userId:decoded.user_id,response:'accept'});
                res.send({code:1,msg:"Player accept draw"});
            }else{
                data.pace = 'reject';
                Play.insertOne(data);
                _io.emit(`room_draw_response_${roomId}`,{userId:decoded.user_id,response:'reject'});
                res.send({code:1,msg:"Player reject draw"});
            }
        }
    }).sort({_id:-1}).limit(1);
}
exports.chess_abort = function(){
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);

};