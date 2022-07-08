const jwt = require("jsonwebtoken");
const User = require('../models/user.model');
const Friend = require('../models/friend.model');
const { decode } = require("jsonwebtoken");


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
          let creator = user[x].friend.length > 0 ? user[x].friend[0].creator:null;
          u.push({
            _id:user[x]._id,
            name: user[x].name,
            email: user[x].email,
            phone: user[x].phone,
            isFriend: accept,
            creator: creator
          });
          
        }
        res.send(u);
    }else{
        res.send([]);
    }
}

exports.add = function(req,res){
    const {token,userId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Friend.find({creator:decoded.user_id,userId:userId},function(err,fri){    
      
      if(fri == null || fri.length  == 0){
        let friend = new Friend({userId:userId,creator:decoded.user_id});
        friend.save(function (err) {
            if (err) {
                console.log(err);
            }
            res.send({code:1,msg:'Friend requests'});
        });
      }else{
        res.send({code:0,msg : "User has request"});
      }      
    });
   

}

exports.request_list = async function(req, res){
    const {token}  = req.body;
    const limit = isNaN(req.body.limit) ? 10:req.body.limit;
    const skip = isNaN(req.body.skip) ? 0:req.body.skip;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const friend = await Friend.aggregate([
        {$match:{creator:decoded.user_id,accept:false}},
        { "$lookup": {
          "let": { "userObjId": { "$toObjectId": "$userId" } },
          "from": "users",
          "pipeline": [
            { "$match": { "$expr": { "$eq": [ "$_id", "$$userObjId" ] } } }
          ],
          "as": "friends"
        }}
      ]).limit(limit).skip(skip);
      let fri = [];
      for(let x in friend){
        let item = friend[x].friends[0];
        fri.push({
          _id:item._id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          friend:friend[x].accept
        });
      }
    res.send(fri);

}

exports.invited_list = async function(req, res){
    const {token}  = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const friend = await Friend.aggregate([
        {$match:{userId:decoded.user_id,accept:false}},
        { "$lookup": {
          "let": { "userObjId": { "$toObjectId": "$creator" } },
          "from": "users",
          "pipeline": [
            { "$match": { "$expr": { "$eq": [ "$_id", "$$userObjId" ] } } }
          ],
          "as": "friends"
        }}
      ]);

    let fri = [];
      for(let x in friend){
        let item = friend[x].friends[0];
        fri.push({
          _id:item._id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          friend:friend[x].accept
        });
      }
    res.send(fri);

}
exports.list = async function(req,res){
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const fri = await Friend.aggregate([
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

      let friend = [];
      for(let x in fri){
        let f = fri[x].friends.length > 0 ? fri[x].friends[0]:[];        
        friend.push({
          "_id" : f._id,
          "name" : f.name,
          "phone" : f.phone,
          "email" : f.email
        });
      }
    res.send(friend);
}
exports.accept = async function (req, res) {
    const {token, userId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);  
      Friend.updateOne({userId:decoded.user_id,creator:userId},{$set:{accept:true}},function(err,fri){
          res.send({code:1,userId:userId});
      }); 
  
}

exports.remove = async function(req, res){
    const {token, userId} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Friend.deleteMany({$or : [ {$and : [{"userId":decoded.user_id},{"creator":userId}]},{$and : [{"userId":userId},{"creator":decoded.user_id}]}]},function(err,fri){
        res.send({code:1,userId:userId});
    });
}

