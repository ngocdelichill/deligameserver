const jwt = require("jsonwebtoken");
const Room = require('../models/room.model');
const Joiner = require('../models/joiner.model');
const roomModel = require("../models/room.model");

exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.create = function(req,res){
    const {name,password,token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const newRom = new Room({
        name:name,
        password:password,
        creator:decoded.user_id
    });
    newRom.save(function(err){
        res.send({code:1,msg:"Room is created"});
    });
}

exports.list = function(req,res){
    Room.find({},function(err,room){
        res.send(room);
    }).sort({_id:-1});
}

exports.join = function(req,res){
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
   

        let newJoin = new Joiner({
            roomId:roomId,
            creator:decoded.user_id
        });
        
        Room.findById(roomId,function(err,room){
            Joiner.findOne({creator:decoded.user_id},function(err,joiner){
                
                if(joiner != null && joiner != undefined && joiner != []){                                                
                    Room.findById(joiner.roomId,function(err,r){      
                                    
                        Room.updateOne({_id:joiner.roomId},{
                            $set : {player:parseInt(r.player) - 1}
                        })
                    });
                    Joiner.deleteMany({creator:decoded.user_id},function(err){});
                }
               
                
            });
            var player = room.player != undefined ? parseInt(room.player)+1:1;
            Room.updateOne({_id:req.body.roomId},{$set:{player:player}},function(){
                newJoin.save(function(err){
                    if(err)
                        res.send("Error joiner");
                    res.send(newJoin);    
                });
            });             
            
        });
    
    
}