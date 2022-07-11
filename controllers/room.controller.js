const jwt = require("jsonwebtoken");
const Room = require('../models/room.model');
const Joiner = require('../models/joiner.model');
const User = require('../models/user.model');
const { parse } = require("dotenv");
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.create = function (req, res) {
    const {name, password, token,max_players,bet, class_room, level} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newRom = new Room(
        {name: name, password: password, creator: decoded.user_id, maxPlayers:max_players,bet, classRoom: class_room, level:level}
    );
    newRom.save(function (err,room){    
        res.send(room);
    });
}

exports.list = async function (req, res) {
    let limit = isNaN(req.query._limit) ? 20:parseInt(req.query._limit);
    let page = isNaN(req.query._page) ? 1:parseInt(req.query._page);
    let classRoom = isNaN(req.query.class_room) ? 1:parseInt(req.query.class_room); 
    let level = isNaN(req.query.level) ? 1:parseInt(req.query.level);
    let skip = page * limit - limit;
    let keyword = typeof req.query.keyword == 'string' ? req.query.keyword:'';

    const room = await Room.aggregate([       
        { "$addFields": { "roomId": { "$toString": "$_id" }}},
        {
            $match: {
                $or:[{name:{'$regex': keyword,$options:'i'}}, {"roomId":{'$regex':keyword, $options: 'i'}},], 
                $and: [{classRoom : classRoom}, {level: level}]
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
      ]).skip(skip).limit(limit);
      
      const total = await Room.aggregate( [
        {
            $match: {
                $or:[{name:{'$regex': keyword,$options:'i'}}, {"roomId":{'$regex':keyword, $options: 'i'}},], 
                $and: [{classRoom : classRoom}, {level: level}]
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
    res.send({list:r,total:total[0]._count});
}

exports.join = function (req, res) {
    const {token, roomId,password} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Joiner.deleteOne({creator:decoded.user_id},function(err){
        _io.emit(`room_remove`,decoded.user_id);
        Room.findById(req.body.roomId,function(err,room){
            if(room.password == password){
                let newJoin = new Joiner({roomId: roomId, creator: decoded.user_id});
                newJoin.save().then(function(join){
                    User.findById(decoded.user_id,function(err,user){
                        _io.emit(`room_join_${roomId}`,user);
                    });
                    
                    res.send(join);
                });
            }else{
                res.send({code:0,msg:"Password is incorrect"});
            }            
        });
        

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

