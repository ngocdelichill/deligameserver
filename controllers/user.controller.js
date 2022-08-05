const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const History = require('../models/history.model');
var aes256 = require('aes256');
const { isObjectIdOrHexString } = require("mongoose");
const { decode } = require("jsonwebtoken");
var key = '11112222';
const ObjectId = require('mongoose').Types.ObjectId; 


exports.test = function (req, res) {
    res.send('Greetings from the Test controller!');
};

exports.register = async function (req, res) {

    const {name, phone, email, password} = req.body;
    
    if (!(name && password && phone && email)) {       
        res.json({code: -1, msg: "Field is empty"});        
    }
  
    const encryptedPassword = await bcrypt.hash(password, 10);
    let user = new User(
        {name: name, phone: phone, email: email, password: encryptedPassword}
    );
    
    const token = jwt.sign({
        user_id: user._id,
        email
    }, process.env.JWT_KEY, {expiresIn: "30d"});
    
    user.token = token;
    user.save(function (err) {
        if (err) {
            console.log(err);
        }
        res.send(user);
    });

};



exports.login = async function (req, res) {

    // Get user input
    const {email, password} = req.body;
    // Validate user input
    if (!(email && password)) {
        res.json({code: -1, msg: "Username or password is empty"});
    }
    // Validate if user exist in our database
    const user = await User.findOne({email});

    if (user && (await bcrypt.compare(password, user.password))) {
        // Create token
        const token = jwt.sign({
            user_id: user._id,
            email
        }, process.env.JWT_KEY, {expiresIn: "30d"});
        User.updateOne({
            email
        }, {
            $set: {
                token: token
            }
        }, function (err, u) {
            if (err) 
                console.log(err);
            user.token = token;
            res
                .status(200)
                .json(user);
            });
       
    } else {
        res.json({code: 0, msg: "Username or password not found"});
    }

};

exports.forgot_password = async function (req, res) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: "maichien104@gmail.com",
            pass: "zilrzwqgggpojkwa"
        }
    });
    const {email} = req.body;
    const user = await User.findOne({email: email});
    var request_id = aes256.encrypt(key, (new Date().getTime()) + "|" + user.email);
    const text = `Hi ${user.name},
        
        ` +
            `Forgot yout password?
        ` +
            `We received a request to reset the password for your account.
        ` +
            `To reset your password, click on the link below:
        
        ` + `${req.protocol}://${req.headers.host}/users/recovery_password?request_id=${request_id}
        
        ` +
            `Team support
        ` +
            `Hotline: 02866 811 879
        ` +
            `Address: 860/60S/27 Nguyen Gia Tri, Ward 25, Binh Thanh District, HCM City.`;
    message = {
        from: "maichien104@gmail.com",
        to: email,
        subject: "DeliChill - Request a password reset",
        text: text
    }

    transporter.sendMail(message, function (err, info) {
        if (err) {
            console.log(err)
        } else {
            res.json(info);
        }
    });
}

exports.recovery_password = async function (req, res) {
    const str = aes256.decrypt(key, req.query.request_id);
    const param = str.split("|");
    const user = await User.findOne({email: param[1]});
    res.json(user);
}
exports.update_password = async function (req, res) {
    var url = new URL(req.headers.referer);
    var resid = url
        .searchParams
        .get("request_id");
    const param = aes256
        .decrypt(key, resid)
        .split("|");
    const {password} = req.body;
    encryptedPassword = await bcrypt.hash(password, 10);
    User.updateOne({
        email: param[1]
    }, {
        $set: {
            password: encryptedPassword
        }
    }, function (err, user) {
        if (err) 
            console.log(err);
        res.send({code: 1, msg: 'Password changed successfully!'});
    });
};

const getBalance = async function(userId){
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

exports.details =  function (req, res) {
    const {token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    User.findById(decoded.user_id,async function (err, user) {
        if (user != null) 
            res.send({
                _id:user._id,
                name:user.name,
                email:user.email,
                phone:user.phone,
                balance: await getBalance(decoded.user_id),
                avatar:user.avatar
            });
    })
};



exports.update = async function (req, res) {
    const {token, name, phone, password} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded.user_id);
    if (user && (await bcrypt.compare(password, user.password))) {
        User.updateOne({
            _id: new ObjectId(decoded.user_id)
        }, {
            $set: {
                name: name,
                phone: phone
            }
        }, function (err, user) {
            if (err) 
                console.log(err);
            res.send({code:1,msg:"Updated success"});
        });
    }else{
        res.send({code:0,msg:"Password is wrong"});
    }
};

exports.change_password = async function(req,res){
    const {password, passwordOld, token} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decoded.user_id);
    encryptedPassword = await bcrypt.hash(password, 10);
    if (user && (await bcrypt.compare(passwordOld, user.password))) {
        User.updateOne({
            _id: new ObjectId(decoded.user_id)
        }, {
            $set: {
                password:encryptedPassword
            }
        }, function (err, user) {
            if (err) 
                console.log(err);
            res.send({code:1,msg:"Change password success"});
        });
    }else{
        res.send({code:0,msg:"Password old is wrong"});
    }
};

exports.delete = function (req, res) {
    /*
    User.findByIdAndRemove(req.params.id, function (err) {
        if (err) 
            console.log(err);
        res.send('Deleted successfully!');
    })
    */
};

exports.upload_avatar = async (req, res) => {
    const {token} = req.query;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    const avatar = req.file != undefined ? req.file.location:"";
    if(avatar != ""){
        User.updateOne({_id:new ObjectId(decoded.user_id)}, {$set : {avatar:avatar}},()=>{});    
        res.send({code:1,msg:"Upload Success",file:req.file});
    }else{
        res.send({code:0,msg:"File not found"});
    }
    
};

exports.update_avatar = (req, res)=> {
    const {token,avatar} = req.body;
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    User.updateOne({_id:new ObjectId(decoded.user_id)}, {$set : {avatar:avatar}},()=>{});    
    res.send({code:1,msg:"Update Success"});
}