const jwt = require("jsonwebtoken");
const Room = require('../models/room.model');
const Joiner = require('../models/joiner.model');
const User = require('../models/user.model');
const Play = require('../models/play.model');
const History = require('../models/history.model');
const { parse } = require("dotenv");
const { decode } = require("jsonwebtoken");
const ObjectId = require('mongoose').Types.ObjectId; 
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const Game = require('../models/game.model');

exports.test = async function (req, res) {

    res.send('Greetings from the Test controller!');
};

const checkBalance = async function(userId,bet){
    const u = await User.findById(userId);
    if(parseFloat(u.balance) > bet)
        return true;
    return false;
}

exports.create = async function (req, res) {
    const {name, password, token,max_players,bet, class_room, level, game} = req.body;
    const gameDetail = await Game.findOne({id:game});
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newRom = new Room(
        {name: name, password: password, creator: decoded.user_id, maxPlayers:max_players,bet, classRoom: class_room, level:level, game:game, fee: gameDetail.fee}
    );
    User.findOne({_id: new ObjectId(decoded.user_id)},function(err, user){
        delete user.password;
        if(parseFloat(user.balance) >= parseFloat(bet)){
            newRom.save(function (err,room){
                _io.emit(`room_create`,{_id:room._id,name:room.name,password:(room.password!=""?true:false),maxPlayers:room.maxPlayers,bet:room.bet,classRoom:room.classRoom,level:room.level,game:room.game,players:[user]});
                res.send(room);
            });
        }else{
            res.send({code:0,msg:"DLC not enough"});
        }
        
    });
    
}
exports.update = async function (req, res){
    const {roomId,token,name,password,max_players, bet} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    User.findOne({_id: new ObjectId(decoded.user_id)},async function(err, user){
        if(parseFloat(user.balance) >= parseFloat(bet)){
            const room = await Room.updateOne({creator:decoded.user_id,_id : new ObjectId(roomId)},{$set : {
                name:name,
                password:password,
                maxPlayers:max_players,
                bet:bet
            }, function(err, room){}});
            res.send(room);
        }else{
            res.send({code:0,msg:"DLC not enough"});
        }
    });    
}
exports.list = async function (req, res) {
    let limit = isNaN(req.query._limit) ? 20:parseInt(req.query._limit);
    let page = isNaN(req.query._page) ? 1:parseInt(req.query._page);
    let classRoom = isNaN(req.query.class_room) ? 1:parseInt(req.query.class_room); 
    let level = isNaN(req.query.level) ? 1:parseInt(req.query.level);
    let game = isNaN(req.query.game) ? 1:parseInt(req.query.game);
    let skip = page * limit - limit;
    let keyword = typeof req.query.keyword == 'string' ? req.query.keyword:'';

    const room = await Room.aggregate([       
        { "$addFields": { "roomId": { "$toString": "$_id" }}},
        {
            $match: {
                $or:[{name:{'$regex': keyword,$options:'i'}}, {"roomId":{'$regex':keyword, $options: 'i'}},], 
                $and: [{classRoom : classRoom}, {level: level}, {game: game}, {status:0}]
            }
        },
        { "$lookup": {
          "from": "joiners",
          "localField": "roomId",
          "foreignField": "roomId",
          "as": "player",
          "pipeline" : [
              { "$project": { "userObjId": { "$toObjectId": "$creator" } } },
              {
              "$lookup" : {
                  "from": "users",
                  "localField": "userObjId",
                  "foreignField": "_id",
                  "as": "user",
              }
          }],
          
        }}
      ]).sort({_id:-1}).skip(skip).limit(limit);
      
      const total = await Room.aggregate( [
        { "$addFields": { "roomId": { "$toString": "$_id" }}},
        {
            $match: {
                $or:[{name:{'$regex': keyword,$options:'i'}}, {"roomId":{'$regex':keyword, $options: 'i'}},], 
                $and: [{classRoom : classRoom}, {level: level}, {game: game}, {status:0}]
            }
        },
        { $group: { _id: null, _count: { $sum: 1 } } },
        { $project: { _id: 0 } }
     ] );

      var r = [];
    for(let x in room){
       
        var players = [];
        for(let y in room[x].player){
            z = room[x].player[y].user;
            for(let v in z){
                players.push({
                    "_id" : z[v]._id,
                    "name" : z[v].name,
                    "phone" : z[v].phone,
                    "email" : z[v].email                    
                });
            }
            
        }
        r.push({
            "_id" : room[x]._id,
            "name" : room[x].name,
            "password" : (room[x].password != "" ? true:false),
            "maxPlayers" : room[x].maxPlayers,
            "players" : players,
            "classRoom" : room[x].classRoom,
            "level" : room[x].level
        });
    }
    
    res.send({list:r,total:total[0] == undefined ? 0:total[0]._count});
}

exports.join = function (req, res) {
    const {token, roomId,password} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Joiner.deleteOne({creator:decoded.user_id},function(err){
        _io.emit(`room_remove`,decoded.user_id);
        Room.findById(req.body.roomId,function(err,room){           
            if(room != null && room != undefined && room != {} ){
                User.findOne({_id: new ObjectId(decoded.user_id)},function(err, user){
                    if(room.password == password){
                        if(parseFloat(user.balance) > parseFloat(room.bet)){
                        let newJoin = new Joiner({roomId: roomId, creator: decoded.user_id});
                        newJoin.save().then(function(join){
                            User.findById(decoded.user_id,function(err,user){
                                if(room.creator == decoded.user_id){
                                    const timestamp = new Date();
                                    var data = {roomId:roomId,pace:'ready',creator:decoded.user_id,createdAt:timestamp};
                                
                                    let tk = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                                    data.token = tk;
                                
                                    const newPlay = new Play(data);
                                    newPlay.save();   
                                }
                                _io.emit(`room_join_${roomId}`,user);
                                _io.emit(`room_refesh`,{roomId:roomId,player:user});
                            });            
                            res.send(join);
                        });
                    }else{
                        res.send({code:0,msg:"DLC not enough"});
                    }
                    }else{
                        res.send({code:0,msg:"Password is incorrect"});
                    } 
                });
            }else{
                res.send({code:-1,msg:"Room not found"});
            }
                    
        });
    });
}  

exports.out = async function(req,res){
    const {token, roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Room.findById(roomId,function(err,room){
        if(!err){
            if(room.creator == decoded.user_id){
                Room.updateOne({_id : new ObjectId(roomId)},{$set:{status:2}},function(){
                    Joiner.remove({roomId:roomId},function(){
                        if(room.status == '1'){
                            History.updateOne({userId:decoded.user_id,roomId:roomId},{$set:{isWin:-1}},function(){});
                            const reward = (parseFloat(room.bet)*2 - (parseFloat(room.bet) * 2 * parseFloat(room.fee)/100));
                            History.updateOne({userId:{$ne:decoded.user_id},roomId:roomId},{$set:{isWin:1,reward:reward}},function(){});
                        }                       
                        _io.emit(`room_out_${roomId}`,{userId:decoded.user_id});
                        _io.emit(`room_out`,{roomId:roomId,userId:decoded.user_id});
                        res.send({code:2,msg:"Room master is out!"});
                    });                                
                });
            }else{
                
                    Joiner.deleteOne({creator:decoded.user_id},function(err){
                        if(room.status == '1'){
                            Room.updateOne({_id : new ObjectId(roomId)},{$set:{status:2}},function(){
                                History.updateOne({userId:decoded.user_id,roomId:roomId},{$set:{isWin:-1}},function(){});
                                const reward = (parseFloat(room.bet)*2 - (parseFloat(room.bet) * 2 * parseFloat(room.fee)/100));
                                History.updateOne({userId:{$ne:decoded.user_id},roomId:roomId},{$set:{isWin:1,reward:reward}},function(){});
                            });
                        }
                        _io.emit(`room_out_${roomId}`,{userId:decoded.user_id});
                        _io.emit(`room_out`,{roomId:roomId,userId:decoded.user_id});
                        res.send({code:1,msg:""});
                    });
               
            }
        }
        

    });
    
}

exports.search = async function(req,res){
    const {keyword, classRoom, level} = req.query;
    if(typeof keyword === 'string'){
    
        const room = await Room.aggregate([
            { "$addFields": { "roomId": { "$toString": "$_id" }}},
            { $match : { 
            $or : [
                {name:{'$regex': keyword,$options:'i'}}, 
                {"roomId":{'$regex':keyword, $options: 'i'}},                
        ],
        $and : [
            {classRoom : classRoom},
            {level: level}
        ]
            }}
        ]);
        res.send(room);
    }
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

exports.game_detail = async function(req,res){
    const {gameAlias,token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const win = await History.aggregate( [
        {
            $match: {
                userId:decoded.user_id,
                isWin:'1'
            }
        },
        { $group: { _id: null,total:{$sum:1}} }
     ] );
     const total = await History.aggregate( [
        {
            $match: {
                userId:decoded.user_id
            }
        },
        {"$group" : {_id:"$userId",total:{$sum:1}}}
        ]); 
    const totalPlayer = await History.aggregate( [
        {"$group" : {_id:"$userId",total:{$sum:1}}}
        ]);
   
    const g = await Game.findOne({alias:gameAlias});
    let game = {
        _id:g._id,
        id:g.id,
        name:g.name,
        desc:g.desc,
        alias:g.alias,
        img:g.img,
        thumb:g.thumb,
        roomPlayerMax:g.roomPlayerMax,
        roomBackground:g.roomBackground,
        timeLimit:g.timeLimit,
        sort:g.sort,
        fee:g.fee
    };
   
    game.totalPlayer = totalPlayer[0]==undefined ? 0:totalPlayer[0].total;
    game.winRate = parseInt(win[0]==undefined?0:win[0].total)*100 / (total[0]==undefined?1:total[0].total);
    res.send(game);
    
};