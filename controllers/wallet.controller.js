const jwt = require("jsonwebtoken");
const { find } = require("../models/wallet.model");
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const { decode } = require("jsonwebtoken");
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
var request = require('request');
const ObjectId = require('mongoose').Types.ObjectId; 
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

exports.detail = (req, res) => {
    const {token,address} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Wallet.findOne({creator:decoded.user_id,address},(err,w)=>{
        if(w != null && !err)
            res.send(w);
        else
            res.send({code:0,msg:"Wallet not found"});
    });
}

exports.all = (req, res) => {
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Wallet.find({creator:decoded.user_id},(err,w)=>{
        if(w != null && !err)
            res.send(w);
        else
            res.send({code:0,msg:"Wallet not found"});
    });
}

exports.transaction_add = (req, res) => {
    const {token,address} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    let data = {
        fromAddress : address,
        toAddress : process.env.WALLET_TO,
        creator : decoded.user_id
    }
    Transaction.findOne()
    Transaction.create(data,()=>{
        res.send({code:1,msg:"Transaction add success"});
    });
}

exports.transaction_check = (req, res) => {
    const {address,token} = req.body; 
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    Transaction.findOne({address:address,creator:decoded.user_id,createdAt : {$gt : new Date(Date.now() - 15*60*1000)}},(err,t)=>{
        if(t!=null){
            Transaction.findOne({},(err,b)=>{
                const api_url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${process.env.WALLET_CONTRACT_ADDRESS}&address=${t.fromAddress}&page=1&offset=5&startblock=${b.blockNumber}&endblock=999999999&sort=desc&apikey=${process.env.BSCSCAN_KEY}`;
                request(api_url,(err, response, body)=>{
                    const trans = JSON.parse(body);
                    const tr = trans.result;
                    let data = {};
                    if(tr.length > 1){
                        let total = 0;
                        for(let x in tr){                    
                            if(tr[x].to == process.env.WALLET_TO && parseInt(tr[x].blockNumber) > parseInt(b.blockNumber) ){                        
                                let amount = tr[x].value;
                                amount = amount.substr(0,amount.length - 18);                        
                                total += parseInt(amount);
                                data = {
                                    hash : tr[0].hash,
                                    blockNumber : tr[0].blockNumber,
                                    amount : total,
                                    status : true
                                };
                            }
                        }
                        Transaction.updateOne({_id:new ObjectId(t._id)},{$set : data},()=>{});
                    }
                    res.send(body);
                });
            }).sort({blockNumber:-1});            
        }else{
            res.send({code:0,msg:"Transaction not found"});
        }        
    }).sort({_id:-1}).limit(1);
    
}

const prevHash = function(room){
    Transaction.findOne({hash:{$ne:""}}, function(err, t){
        if(t != null){
            return t.token;
        }
        return "";
    }).sort({_id:-1}).limit(1);
};