const jwt = require("jsonwebtoken");
const User = require('../models/user.model');
const Friend = require('../models/friend.model');

exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.search = async function(req,res){
    const {keyword} = req.query;
    if(typeof keyword === 'string'){
        const user = await User.find({$or : [{name:{'$regex': keyword}},{phone:{'$regex':keyword}},{email:{'$regex':keyword}}]});
        res.send(user);
    }else{
        res.send([]);
    }
}

exports.add = async function(req,res){
    const {token,user_id} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    let friend = new Friend({userId:user_id,creator:decoded.user_id});
    friend.save(function (err) {
        if (err) {
            console.log(err);
        }
        res.send({code:1,msg:'Friend requests'});
    });
}

exports.request_list = async function(req, res){
    const {token}  = req.body;
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
      ]);
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

