const jwt = require("jsonwebtoken");
const History = require('../models/history.model');
const Game = require('../models/game.model');
exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.game = async function (req, res){
    const {token} = req.body;
    let limit = isNaN(req.query._limit) ? 10:parseInt(req.query._limit);
    let page = isNaN(req.query._page) ? 1:parseInt(req.query._page);
    let skip = page * limit - limit;
    if(token != ''){
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const game = await Game.find({});
        var gameList = {};
        for(x in game){
            gameList[game[x].id] = game[x].name;
        }
        const win = {"-1":"Lost","0":"Draw","1":"Win"};
        var his = [];
        const h = await History.find({userId:decoded.user_id}).skip(skip).limit(limit);
        for(x in h){
            his.push({
                gameTitle : gameList[h[x].game],
                _id : h[x]._id,
                result : win[h[x].isWin],
                bet : h[x].bet,
                reward : h[x].reward,
                createdAt : h[x].createdAt
            })
        }
        const total = await History.aggregate( [
            { "$addFields": { "roomId": { "$toString": "$_id" }}},
            {
                $match: {userId:decoded.user_id}
            },
            { $group: { _id: null, _count: { $sum: 1 } } },
            { $project: { _id: 0 } }
         ] );
        res.send({list:his,total:total[0] == undefined ? 0:total[0]._count});
    }else{
        res.send({code:0,msg:"Token not found"});
    }
};