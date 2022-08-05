const Room = require('../models/room.model');
const User = require('../models/user.model');
const Joiner = require('../models/joiner.model');
const Play = require('../models/play.model');
const History = require('../models/history.model');
const Game = require('../models/game.model');
const Transaction = require('../models/transaction.model');
const ObjectId = require('mongoose').Types.ObjectId; 
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");



const jwt = require("jsonwebtoken");
const { decode } = require('punycode');
const { isObjectIdOrHexString } = require('mongoose');
const { join, parse } = require('path');
const { find } = require('../models/room.model');
exports.test = async function (req, res) {
    
    const balance = await updateBalance(req.query.id);
    console.log(balance);
    res.send("Fuck"+balance);
    
};

const updateBalance = async (userId) => {
    
    const t = await Transaction.aggregate([
         {$match : {creator:userId}},
         {"$group" : {_id:"$creator", _sum : {$sum: "$amount"}}}          
         ],async (err,t)=>{
            

         });
         var trans = 0;
         if(t != null){
             if(t[0] != undefined)
                 trans = t[0]._sum;
         }     
    const h = await History.aggregate([
    {$match : {userId:userId}},
    {"$group" : {_id:"$userId", _sum : {$sum: "$reward"}}}
    ],async (err,h)=>{
        
    });
    var his = 0;
    if(h != null && h != []){
        if(h[0] != undefined)                        
            his = h[0]._sum;
    }
    const balance = parseFloat(trans) + parseFloat(his); 
    //User.updateOne({_id:new ObjectId(userId)},{$set : {balance:balance}},(err)=>{
    _io.emit(`update_balance_${userId}`,balance);
    return balance;
    //});
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
            isReady:(ready == 'ready' ? true:false),
            avatar: player.avatar
        });
    }  
    var classRoom = ['No Class','Start-up','Millionaire','Billionaire'];
    var levelRoom = ['No Level','Silver','Glod','Diamond'];
    
    const r = await Room.findById(roomId);            
    var room = {
        classRoomTitle : classRoom[r.classRoom],
        levelRoomTitle : levelRoom[r.level],
        _id : r._id,
        name : r.name,
        password : r.password != "" ? true:false,
        creator : r.creator,
        maxPlayers : r.maxPlayers,
        bet : r.bet,
        classRoom : r.classRoom,
        level : r.level,
        game : r.game,
        status : r.status,
        createdAt : r.createdAt
    };
    
    const user = await User.findById(decoded.user_id);   
    res.send({room: room,me:user,players:ul,play:play}); 
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
                Room.findOne({_id: new ObjectId(roomId)},function(err, room){
                    //const reward = parseFloat(room.bet) - (parseFloat(room.bet) * parseFloat(room.fee)/100); 
                    Joiner.find({roomId:roomId},async function(err,joiner){
                        let tmp = []; let players = [];
                        for(let x in joiner){
                            players.push(joiner[x].creator);
                            tmp.push({
                                roomId : roomId,
                                userId : joiner[x].creator,
                                game : 1,
                                isWin : 0,
                                bet : room.bet,
                                reward : parseFloat(room.bet) * -1
                            });
                        }                        
                        History.insertMany(tmp);
                        for(let x in players){
                            await updateBalance(players[x]);
                        }
                    }); 
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
                    Joiner.deleteMany({roomId:roomId},async function(){
                        const reward = (parseFloat(room.bet)*2 - (parseFloat(room.bet) * 2 * parseFloat(room.fee)/100)) - parseFloat(room.bet);
                        History.updateOne({userId:decoded.user_id,roomId:roomId},{$set:{isWin:1, reward:reward}},function(){});                        
                        
                        History.updateOne({userId:{$ne:decoded.user_id},roomId:roomId},{$set:{isWin:-1}},function(){});
                        
                        _io.emit(`chess_mankey_${roomId}`,{userId:decoded.user_id,key:key.toUpperCase(),pace:pa});
                        _io.emit(`room_end_${roomId}`,{userId:decoded.user_id});
                        await updateBalance(decoded.user_id);
                        History.findOne({userId:{$ne:decoded.user_id},roomId:roomId},async (err,u)=>{
                            await updateBalance(u.userId);
                        });
                        res.send({code:2,msg:"The game is end"});
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
        if(room != null){
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
                Play.create(data);
                _io.emit(`room_draw_${roomId}`,{userId:decoded.user_id});
                res.send({code:1,msg:"Send request success"});
            }else{
                res.send({code:0,msg:"The game was end"});
            }           
        }else{
            res.send({code:0,msg:"Room not found"});
        }
    });    
};
exports.chess_draw_response = async function(req, res){
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
            Room.findOne({_id: new ObjectId(roomId)},async function(err, room){
                if(response == 'accept'){
                    data.pace = 'accept';
                    data.token = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                    Play.create(data);
                    Room.updateOne({_id: new ObjectId(roomId)},{$set : {status:2}},()=>{});
                    const reward = parseFloat(room.bet) - (parseFloat(room.bet) * parseFloat(room.fee)/100) - parseFloat(room.bet); 
                    History.updateMany({roomId:roomId},{$set : {reward : reward}},()=>{});
                    _io.emit(`room_draw_response_${roomId}`,{userId:decoded.user_id,response:'accept'});
                    await updateBalance(decoded.user_id);
                    History.findOne({userId:{$ne:decoded.user_id},roomId:roomId},async (err,u)=>{
                        await updateBalance(u.userId);
                    });
                    res.send({code:1,msg:"Player accept draw"});
                }else{
                    data.pace = 'reject';
                    data.token = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                    Play.create(data);                
                    _io.emit(`room_draw_response_${roomId}`,{userId:decoded.user_id,response:'reject'});
                    res.send({code:1,msg:"Player reject draw"});
                }
            });
            
        }
    }).sort({_id:-1}).limit(1);
}
exports.chess_resign = function(req, res){
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Room.findOne({_id:new ObjectId(roomId)},function(err,room){
        if(!err){
            if(room.status == '1'){
                let timestamp = new Date();
                var data = {
                    roomId:roomId,
                    creator:decoded.user_id,
                    createdAt:timestamp,
                    pace:'resign'
                }
                
                data.token = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));                
                Play.create(data);

                History.updateOne({userId:decoded.user_id,roomId:roomId},{$set : {isWin:-1}},()=>{});
                
                const reward = (parseFloat(room.bet)*2 - (parseFloat(room.bet) * 2 * parseFloat(room.fee)/100)) - parseFloat(room.bet);
                History.updateOne({userId:{$ne:decoded.user_id},roomId:roomId},{$set : {isWin:1, reward:reward}},()=>{});
                
                Room.updateOne({_id: new ObjectId(roomId)},{$set : {status:2}},async ()=>{
                    await updateBalance(decoded.user_id);
                    History.findOne({userId:{$ne:decoded.user_id},roomId:roomId},async (err,u)=>{
                        await updateBalance(u.userId);
                    });
                });
                _io.emit(`room_resign_${roomId}`,{userId:decoded.user_id,response:'resign'});
                res.send({code:1,msg:"Player resign"});
            }
        }
    });
};

exports.check_match = function(req, res){
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Joiner.findOne({creator:decoded.user_id},(err, join)=>{
        if(join != null){
            Room.findOne({_id:new ObjectId(join.roomId)},(err, room)=>{
                if(room.status == '1'){
                    Game.findOne({id:room.game},(err,g)=>{
                        res.send({code:1,roomId:room._id,gameAlias:g.alias});
                    });                   
                }else{
                    res.send({code:0,msg:"Game not start or game is end"});
                }
            });
        }else{
            res.send({code:0,msg:"You not join game"});
        }
    })
}
exports.deli_finance_bussiness = (req, res) => {
    const {token, roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Room.findOne({_id: new ObjectId(roomId)},(err, room) => { 
        if(room != null){
            Joiner.findOne({creator:decoded.user_id,roomId},(err, join)=>{
                if(join != null){
                    if(room.status == '0'){
                        res.send({code:0, msg: "Room has not started"});
                    }
                    if(room.status == '1'){
                        Play.findOne({roomId},(err, play)=>{
                            let item = play.pace.split(",");
                            for(let x in item){
                                let obj = item[x].split(":");
                                if(obj[0].indexOf('next') > -1){
                                    res.send(item[x]);
                                }
                            }
                            
                        }).sort({_id:-1}).limit(1);
                    }
                    if(room.status == '0'){
                        res.send({code:0, msg: "Room is end"});
                    }
                }
            });
            
        }else{
            res.send({code:0,msg:"Room not found"});
        }
    });
}

exports.roll_dice = (req, res) => {
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Room.findOne({_id: new ObjectId(roomId)},(err,room) => {
        if(room != null){
        if(room.status == '0'){
            res.send({code:0,msg:"Game has not started"});
        }
        if(room.status == '2'){
            res.send({code:0,msg:"Game is end"});
        }
        if(room.status == '1'){
            Play.findOne({roomId},async (err, play)=>{
                if(play != null){
                    let pace = play.pace.split(",");
                    let pace_next = decoded.user_id;
                    let pace_position = 0;
                    let pace_balance = 1500;
                    for(let x in pace){
                        let item = pace[x].split(":");
                        if(item[0] == 'next')
                            pace_next = item[1];
                    }
                    const _me = await Play.findOne({roomId,creator:decoded.user_id}).sort({_id:-1}).limit(1);
                    if(_me.pace != 'ready'){
                        let me_pace = _me.pace.split(",");
                        for(x in me_pace){
                            let item = me_pace[x].split(":");
                            if($item[0] == 'position')
                                pace_position = parseInt($item[1]);
                            if($item[0] == 'balance')
                                pace_balance = parseFloat($item[1]);
                        }
                        
                    }
                    if(pace_next == decoded.user_id){
                        let a = Math.floor(Math.random() * 6) + 1;
                        let b = Math.floor(Math.random() * 6) + 1;
                        if(a == b){
                            next = decoded.user_id;
                        }else{
                            const join = await Joiner.find({roomId}).sort({_id:-1});
                            let tmp = [];
                            for(let i in join){
                                tmp.push(join[i]._id);
                            }
                            let key = tmp.indexOf(decoded.user_id);
                            if(key+1 == tmp.length || tmp[key+1] != undefined){
                                next = tmp[key+1];
                            }else{
                                next = tmp[0];
                            }
                            let position = (pace_position + a + b) % 39;
                            let square = Square[position];
                            
                            data = {
                                roomId,
                                pace : `dice:[${a},${b}],position:${position},balance:1500,reward:0,`,
                                creator:decoded.user_id
                            };
                           //Play.create(data);
                        }
                        
                        _io.emit(`roll_dice_${roomId}`,{
                            userId:decoded.user_id,
                            diceA:a,
                            diceB:b,
                            next:next
                        });
                        res.send({code:1,msg:""});
                    }else{
                        res.send({code:0,msg:"Not allow roll"});
                    }
                }
            }).sort({_id:-1}).limit(1);
        }
        }else{
            res.send({code:0,msg:"Room not found"});
        }
    })
}

exports.deli_mono_start = async (req, res) => {
    const {token,roomId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Room.findOne({_id:new ObjectId(roomId)},(err,room)=>{
        if(room != null){
            if(room.status == '0'){
                Play.find({roomId:roomId, pace: 'ready'}, (err, play) => {
                    Joiner.find({roomId},(err, join)=>{
                        if(play.length == join.length){
                            History.find({roomId},(err,his)=>{
                                let joined = [];
                                if(his != null){
                                    for(let x in his){
                                        joined.push(his[x].userId);
                                    }
                                }
                                let tmp = []; let players = [];
                                for(let x in join){
                                    players.push(join[x].creator);
                                    if(joined.indexOf(join[x].creator) <= -1){                                    
                                        tmp.push({
                                            roomId : roomId,
                                            userId : join[x].creator,
                                            game : 1,
                                            isWin : 0,
                                            bet : room.bet,
                                            reward : parseFloat(room.bet) * -1
                                        });
                                    }
                                    
                                }
                                if(tmp.length > 0)
                                    History.insertMany(tmp);
    
                                Room.updateOne({_id: new ObjectId(roomId)},{$set : {status:1}},()=>{
                                    let nextPlayer = players[Math.floor(Math.random()*players.length)];
                                    const pace = `balance:1500,next:${nextPlayer}`;
                                    const timestamp = new Date();
                                    var data = {roomId:roomId,creator:decoded.user_id,pace:pace,createdAt:timestamp};
                                    let tk = SHA256(prevHash(roomId) + timestamp + JSON.stringify(data));
                                    data.token = tk;
                                    const newPlay = new Play(data);
                                    newPlay.save(function(){
                                        _io.emit(`delimono_start_${roomId}`,{next:nextPlayer});
                                        _io.emit(`room_remove`,{roomId:roomId});
                                        res.status(200).send({code:1,msg:'Countdown 3s to play game'});
                                    });
                                });
                            });
                            
    
                            
                        }else{
                            res.send({code:0,msg:"Players are not ready"});
                        }
                    });                
                });
            }
            if(room.status == '1'){
                res.send({code:0, msg: "Room is running"});
            }
            if(room.status == '2'){
                res.send({code:0, msg: "Room is end"});
            }
        }else{
            res.send({code:0, msg: "Room not found"});
        }
    });
    
}

const SQ = (name,pricetext,color,price) => {
    return {
      name:name,
      pricetext:pricetext,
      color:color,
      price:price
    }
  }

  const Square = [
  SQ("GO","COLLECT $200 SALARY AS YOU PASS.", "#FFFFFF",0),
  SQ("Mediterranean Avenue", "$60", "#8B4513",60),
  SQ("Community Chest", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Baltic Avenue", "$60", "#8B4513", 60),
  SQ("City Tax", "Pay $200", "#FFFFFF",0),
  SQ("Reading Railroad", "$200", "#FFFFFF", 200, 1),
  SQ("Oriental Avenue", "$100", "#87CEEB", 100),
  SQ("Chance", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Vermont Avenue", "$100", "#87CEEB", 100),
  SQ("Connecticut Avenue", "$120", "#87CEEB", 120),
  SQ("Just Visiting", "", "#FFFFFF",0),
  SQ("St. Charles Place", "$140", "#FF0080", 140),
  SQ("Electric Company", "$150", "#FFFFFF", 150),
  SQ("States Avenue", "$140", "#FF0080", 140),
  SQ("Virginia Avenue", "$160", "#FF0080", 160),
  SQ("Pennsylvania Railroad", "$200", "#FFFFFF", 200),
  SQ("St. James Place", "$180", "#FFA500", 180),
  SQ("Community Chest", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Tennessee Avenue", "$180", "#FFA500", 180),
  SQ("New York Avenue", "$200", "#FFA500", 200),
  SQ("Free Parking", "", "#FFFFFF",0),
  SQ("Kentucky Avenue", "$220", "#FF0000", 220),
  SQ("Chance", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Indiana Avenue", "$220", "#FF0000", 220),
  SQ("Illinois Avenue", "$240", "#FF0000", 240),
  SQ("B&O Railroad", "$200", "#FFFFFF", 200),
  SQ("Atlantic Avenue", "$260", "#FFFF00", 260),
  SQ("Ventnor Avenue", "$260", "#FFFF00", 260),
  SQ("Water Works", "$150", "#FFFFFF", 150),
  SQ("Marvin Gardens", "$280", "#FFFF00", 280),
  SQ("Go to Jail", "Go directly to Jail. Do not pass GO. Do not collect $200.", "#FFFFFF",0),
  SQ("Pacific Avenue", "$300", "#008000", 300),
  SQ("North Carolina Avenue", "$300", "#008000", 300),
  SQ("Community Chest", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Pennsylvania Avenue", "$320", "#008000", 320),
  SQ("Short Line", "$200", "#FFFFFF", 200),
  SQ("Chance", "FOLLOW INSTRUCTIONS ON TOP CARD", "#FFFFFF",0),
  SQ("Park Place", "$350", "#0000FF", 350),
  SQ("LUXURY TAX", "Pay $100", "#FFFFFF",0),
  SQ("Boardwalk", "$400", "#0000FF", 400)
];
  