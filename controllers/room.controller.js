const jwt = require("jsonwebtoken");
const Room = require('../models/room.model');
const Joiner = require('../models/joiner.model');
const roomModel = require("../models/room.model");

exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.create = function (req, res) {
    const {name, password, token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newRom = new Room(
        {name: name, password: password, creator: decoded.user_id}
    );
    newRom.save(function (err) {
        res.send({code: 1, msg: "Room is created"});
    });
}

exports.list = function (req, res) {
    /*
    Room.find({},function(err,room){
        res.send(room);
    }).sort({_id:-1});
    */
    Room.aggregate([
        {
            $match: {
                roomId: room
                    ._id
                    .toString(),
                creator: {
                    $ne: req
                        .user
                        ._id
                        .toString()
                }
            }
        }, {
            "$lookup": {
                "let": {
                    "userObjId": {
                        "$toObjectId": "$creator"
                    }
                },
                "from": "users",
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": ["$_id", "$$userObjId"]
                            }
                        }
                    }
                ],
                "as": "player"
            }
        }
    ]);
}

exports.join =  function (req, res) {
    const {token, roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    let newJoin = new Joiner({roomId: roomId, creator: decoded.user_id});

    Joiner.findOne({
        creator: decoded.user_id
    }, function (err, joiner) {

        if (joiner != null && joiner != undefined && joiner != []) {
            Room.findById(joiner.roomId, function (err, r) {
                Joiner.deleteMany({
                    creator: decoded.user_id
                }, function (err) {
                    
                });
            });

        }
        
    });
   Room.findById(roomId, async function (err, room) {
    if(room != null && room != undefined && room != []){
        await newJoin.save(function (err) {
            if (err) 
                res.send("Error joiner");
            res.send(newJoin);
        });
    
    }
    });
    }  
   

