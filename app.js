var express = require('express');
var app = express();
var server = require('http').Server(app); 
var session = require('express-session');
var mongoose = require('mongoose');
var sharedSession = require("express-socket.io-session");
var randomName = require('node-random-name');
var Message = require('./messages.js');
var ejs = require('ejs');
var path = require('path');
var ws = require('ws');
var url = "mongodb://localhost:27017/test";
var wss = new ws.Server({noServer:true});
var cookieParser = require('cookie-parser')('yVVma9ga');
mongoose.connect(url);
app.use(cookieParser);
app.set('views', path.join(__dirname, './views'));
app.use(express.static(path.join(__dirname, './public')));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'MeMeS',
    saveUninitialized: true,
    resave: true,
    cookie: {httpOnly: true}
}));
app.set('port', process.env.PORT || 3000);
server.listen(3000, function(){
    console.log('listening on 3000')
})
server.on('upgrade', function(req,socket,head){
    var pathname = require('url').parse(req.url).pathname;
    if(pathname == '/' || ''){
        wss.handleUpgrade(req, socket, head, function(ws){
            wss.emit('connection', ws)
        })
    }
});
app.get('/', function(req,res){
    req.session.name = randomName();
    Message.find({}, function(err,docs){
        res.render('index', {messages:docs})
    });
});
var connections = [];
function broadcast(data, users){
    for(let i = 0; i < users.length; i++){
        if(users[i].readyState == ws.OPEN){
            users[i].send(data)
        }
    }
}
wss.on('connection', function(connection){
    var name = randomName();
    var index = connections.push(connection) - 1;
    broadcast(name + ' joined!', connections);
    connection.on('message', function(msg){
        Message.create({author:name, message:msg});
        broadcast(name + ': ' + msg, connections)
    })
    connection.on('close', function(){
        connections.splice(index, 1);
        broadcast(name + ' disconnected', connections)
    })
})
