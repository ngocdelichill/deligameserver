const jwt = require("jsonwebtoken");
const { find } = require("../models/wallet.model");
const Wallet = require('../models/wallet.model');


exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.add = function(req, res){
    const {address,token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Wallet.findOne({address:address},function(err,w){
        if(err || w == null){
            Wallet.create({
                address,
                creator:decoded.user_id
            });
            res.send({code:1,msg:"Add success"});
        }else{
            res.send({code:0,msg:"Address exits"});
        }
    });
    
};

exports.remove = (req, res) => {
    const {token,address} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Wallet.findOne({creator:decoded.user_id,address},(err,w)=>{        
        if(!err && w != null){
            Wallet.deleteOne({address:address,creator:decoded.user_id},(err)=>{});
            res.send({code:1,msg:"Address remove success"});
        }else{
            res.send({code:0,msg:"Address not found"});
        }
    });
}

