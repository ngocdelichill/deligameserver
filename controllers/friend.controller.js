const jwt = require("jsonwebtoken");
const User = require('../models/user.model');
const Friend = require('../models/friend.model');


exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.search = async function(req,res){
    const {keyword} = req.query;
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if(typeof keyword === 'string' && keyword.length > 0){
        const user = await User.aggregate([
          {
              $match: {
                  
                  $or: [{name:{'$regex': keyword,$options:'i'}},{phone:{'$regex':keyword,$options:'i'}},{email:{'$regex':keyword,$options:'i'}}],
                  
              }
          },
            { "$addFields": { "userId": { "$toString": "$_id" }}},
        
            { "$lookup": {
              "from": "friends",
              "localField": "userId",
              "foreignField": "userId",
              "as": "friend",
              "pipeline" : [
                {
                  "$match" : {
                    "creator" : decoded.user_id
                  }
                }
              ]
            }, 
          },
          {$match : {"userId":{$ne:decoded.user_id}}}
          ]);
        let u = [];
        for(let x in user){
          
          let accept = user[x].friend.length > 0 ? user[x].friend[0].accept:null;
          u.push({
            _id:user[x]._id,
            name: user[x].name,
            email: user[x].email,
            phone: user[x].phone,
            friend: accept
          });
        }
        res.send(u);
    }else{
        res.send([]);
    }
}

exports.add = async function(req,res){
    const {token,userId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    let friend = new Friend({userId:userId,creator:decoded.user_id});
    friend.save(function (err) {
        if (err) {
            console.log(err);
        }
        res.send({code:1,msg:'Friend requests'});
    });
}

exports.request_list = async function(req, res){
    const {token}  = req.body;
    const limit = isNaN(req.body.limit) ? 10:req.body.limit;
    const skip = isNaN(req.body.skip) ? 0:req.body.skip;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const friend = await Friend.aggregate([
        {$match:{creator:decoded.user_id}},
        { "$lookup": {
          "let": { "userObjId": { "$toObjectId": "$userId" } },
          "from": "users",
          "pipeline": [
            { "$match": { "$expr": { "$eq": [ "$_id", "$$userObjId" ] } } }
          ],
          "as": "friends"
        }}
      ]).limit(limit).skip(skip);
    res.send(friend);

}

exports.invited_list = async function(req, res){
    const {token}  = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const friend = await Friend.aggregate([
        {$match:{userId:decoded.user_id}},
        { "$lookup": {
          "let": { "userObjId": { "$toObjectId": "$creator" } },
          "from": "users",
          "pipeline": [
            { "$match": { "$expr": { "$eq": [ "$_id", "$$userObjId" ] } } }
          ],
          "as": "friends"
        }}
      ]);
    res.send(friend);

}
exports.list = async function(req,res){
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const friend = await Friend.aggregate([
        {$match:{"$or" : [{creator:decoded.user_id},{userId:decoded.user_id}],
        "$and" : [{accept:true}]}},
        { "$lookup": {
          "let": { "userObjId": { "$toObjectId": "$userId" } },
          "from": "users",
          "pipeline": [
            { "$match": { "$expr": { "$eq": [ "$_id", "$$userObjId" ] } }}
          ],
          "as": "friends"
        }}
      ]);
    res.send(friend);
}
exports.accept = async function (req, res) {
    const {token, id} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
   Friend.findById(id,function(err,f){
        Friend.updateOne({"_id":f._id,userId:f.userId},{$set:{accept:1}},function(err,fri){
            res.send({code:1,msg:'Friend Accept'});
        }); 
   });
}

exports.remove = async function(req, res){
    const {token, id} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Friend.findById(id,function(err,f){
        Friend.deleteOne({"_id":f._id},function(err,fri){
            res.send({code:1,msg:'Friend Deleted'});
        });
   });
}

