const jwt = require("jsonwebtoken");
const Room = require('../models/room.model');
const Joiner = require('../models/joiner.model');
const User = require('../models/user.model');
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.create = function (req, res) {
    const {name, password, token,maxPlayers,bet} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newRom = new Room(
        {name: name, password: password, creator: decoded.user_id, maxPlayers:maxPlayers,bet}
    );
    newRom.save(function (err,room){    
        res.send(room);
    });
}

exports.list = async function (req, res) {
    const room = await Room.aggregate([       
        { "$addFields": { "roomId": { "$toString": "$_id" }}},
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
      ]);
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
            "players" : players
        });
    }
    res.send(r);
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
    const {keyword} = req.query;
    if(typeof keyword === 'string' && keyword.length > 0){
    
        const room = await Room.aggregate([
            { "$addFields": { "roomId": { "$toString": "$_id" }}},
            { $match : { 
            $or : [{name:{'$regex': keyword,$options:'i'}}, 
            {"roomId":{'$regex':keyword, $options: 'i'}}],
            }}
        ]);
        res.send(room);
    }
}

