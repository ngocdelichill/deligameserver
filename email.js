const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: "maichien104@gmail.com",
        pass: "zilrzwqgggpojkwa"
    }
});
message = {
    from: "maichien104@gmail.com",
    to: "sinktypica.l.l.y.6.1.34@gmail.com",
    subject: "Subject",
    text: "Hello SMTP Email"
}
transporter.sendMail(message, function (err, info) {
    if (err) {
        console.log(err)
    } else {
        console.log(info);
    }
    message = {
        from: "from@email.com",
        to: "to@email.com",
        subject: "Subject",
        html: "<h1>Hello SMTP Email</h1>"
    }
});
