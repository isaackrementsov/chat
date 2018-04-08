var app = require('express')();
var server = require('http').Server(app); 
var io = require('socket.io')(server);
var session = require('express-session')({
  secret: 'yVVma9ga',
  saveUninitialized: true,
  resave: true,
  cookie: {httpOnly: true}
});
var mongoose = require('mongoose');
var sharedSession = require("express-socket.io-session");
var randomName = require('node-random-name');
var Message = require('./messages.js');
var ejs = require('ejs');
var path = require('path');
var url = "mongodb://localhost:27017/test";
mongoose.connect(url);
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 3000);
app.get('/', function(req,res){
    Message.find({}, function(err,docs){
        res.render('index', {messages:docs})
    });
});
io.use(sharedSession(session));
io.on('connection', function(socket){
    socket.handshake.session.username = randomName();
    socket.handshake.session.save();
    socket.on('chat message', function(msg){
        Message.create({message:msg, author:socket.handshake.session.username}, function(err){
            console.log(err)
        });
        io.emit('chat message', socket.handshake.session.username + ': ' + msg)
    });
    socket.on('disconnect', function(){
        console.log(socket.handshake.session.username + ' left');
        delete socket.handshake.session
    })
});
server.listen(3000, function(){
    console.log('listening on 3000')
})
