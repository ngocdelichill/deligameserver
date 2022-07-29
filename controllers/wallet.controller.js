const jwt = require("jsonwebtoken");
const { find } = require("../models/wallet.model");
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const { decode } = require("jsonwebtoken");
const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
var request = require('request');
const res = require("express/lib/response");
const ObjectId = require('mongoose').Types.ObjectId; 
exports.test = function (req, res) {

    res.send('Greetings from the Test controller!');
};

exports.debug = function(req,res){
    res.send('{"status":"1","message":"OK","result":[{"blockNumber":"19474204","timeStamp":"1657593916","hash":"0xc9edd7fc18ee6370bbd15c59b0929ba36530d6c2e2b2ff128a127f667c4b46d3","nonce":"23","blockHash":"0x0710e81af9564481c3ed187a1538c28795b1c2dc6d9e925a8dec482b0825ae3d","from":"0x4e47fcf5908f5f88f33e7b0f558e234abaa7c246","contractAddress":"0x840b073a82e4a29d53ea682d90b8a7444162af4b","to":"0xae0212d13a2053a6196c9f7605019df53ea08d24","value":"3749000000000000000000000","tokenName":"DLCTOKEN","tokenSymbol":"DLC","tokenDecimal":"18","transactionIndex":"186","gas":"132066","gasPrice":"5000000000","gasUsed":"88044","cumulativeGasUsed":"18333406","input":"deprecated","confirmations":"492802"},{"blockNumber":"19474205","timeStamp":"1657593916","hash":"0xc9edd7fc18ee6370bbd15c59b0929ba36530d6c2e2b2ff128a127f667c4b46d3","nonce":"23","blockHash":"0x0710e81af9564481c3ed187a1538c28795b1c2dc6d9e925a8dec482b0825ae3d","from":"0x4e47fcf5908f5f88f33e7b0f558e234abaa7c246","contractAddress":"0x840b073a82e4a29d53ea682d90b8a7444162af4b","to":"0xae0212d13a2053a6196c9f7605019df53ea08d24","value":"3749000000000000000000000","tokenName":"DLCTOKEN","tokenSymbol":"DLC","tokenDecimal":"18","transactionIndex":"186","gas":"132066","gasPrice":"5000000000","gasUsed":"88044","cumulativeGasUsed":"18333406","input":"deprecated","confirmations":"492802"}]}');
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
                //const api_url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${process.env.WALLET_CONTRACT_ADDRESS}&address=${t.fromAddress}&page=1&offset=5&startblock=${b.blockNumber}&endblock=999999999&sort=desc&apikey=${process.env.BSCSCAN_KEY}`;
                const api_url = `http://localhost:3003/wallets/debug?module=account&action=tokentx&contractaddress=${process.env.WALLET_CONTRACT_ADDRESS}&address=${t.fromAddress}&page=1&offset=5&startblock=${b.blockNumber}&endblock=999999999&sort=desc&apikey=${process.env.BSCSCAN_KEY}`;
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