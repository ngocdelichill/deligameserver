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
    newRom.save(function (err) {
        res.send({code: 1, msg: "Room is created"});
    });
}

exports.list = async function (req, res) {
    const room = await Room.aggregate([       
          { "$addFields": { "roomId": { "$toString": "$_id" }}},
          { "$lookup": {
            "from": "joiners",
            "localField": "roomId",
            "foreignField": "roomId",
            "as": "player"
          }}
        ]);
    res.send(room);
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
   

