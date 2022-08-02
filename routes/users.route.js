const express = require('express');
var bodyParser = require('body-parser')
const router = express.Router();
var jsonParser = bodyParser.json();
const aws = require("aws-sdk");
const multer  = require('multer');
var multerS3 = require('multer-s3');
const jwt = require("jsonwebtoken");
var path = require("path");
var s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
    signatureVersion: 'v4',
 });

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket:process.env.AWS_BUCKET+"/avatar",
        metadata: function (req, file, cb) {      
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const fileSize = parseInt(req.headers["content-length"])
            if ((file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" || file.mimetype === "application/octet-stream") && fileSize <= 1048576) {
                const {token} = req.query;
                    const decoded = jwt.verify(token, process.env.JWT_KEY);
                    file.name = decoded.user_id+"_"+file.originalname;
                    cb(null, file.name);
            }else{
                cb(null,false);
            }
        }
    })
 }).single('avatar');
const user = require('../controllers/user.controller');

// a simple test url to check that all of our files are communicating correctly.
router.get('/test', user.test);
router.post('/register',jsonParser, user.register);
router.post('/login',jsonParser, user.login);
router.post('/forgot-password',jsonParser, user.forgot_password);
router.get('/recovery-password',user.recovery_password);
router.put('/update-password', user.update_password);
router.put('/change-password', jsonParser,user.change_password);
router.post('/detail', user.details);
router.put('/update', user.update);
router.delete('/:id/delete', user.delete);

router.post('/upload-avatar',function(req,res){
    upload(req,res,(err)=>{
        if(err){
            res.send({code:0,msg:"Upload failed"});
        }else{
            user.upload_avatar(req,res);
        }
    })
});

router.post('/update-avatar', user.update_avatar);
module.exports = router;
