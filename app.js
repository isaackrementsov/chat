var express = require('express');
var app = express();
var server = require('http').Server(app); 
var session = require('express-session');
var mongoose = require('mongoose');
var sharedSession = require("express-socket.io-session");
var randomName = require('node-random-name');
var Chat = require('./chats.js');
var ejs = require('ejs');
var path = require('path');
var ws = require('ws');
var url = "mongodb://localhost:27017/test";
var wss = new ws.Server({noServer:true});
var store = new session.MemoryStore();
var requestSession;
var User = require('./users.js');
var bodyParser = require('body-parser');
mongoose.connect(url);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())
app.set('views', path.join(__dirname, './views'));
app.use(express.static(path.join(__dirname, './public')));
app.set('view engine', 'ejs');
app.use(session({
    store: store,
    secret: '1234abcd',
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
    wss.handleUpgrade(req, socket, head, function(ws){
        wss.emit('connection', ws)
    })
});
function auth(redirect){
    return function(req,res,next){
        if(req.session.username){
            next()
        }else{
            res.redirect(redirect)
        }
    }
}
function reverse(redirect){
    return function(req,res,next){
        if(req.session.username){
            res.redirect(redirect)
        }else{
            next()
        }
    } 
}
app.get('/', function(req,res){res.render('index')});
app.get('/login', reverse('/home'), function(req,res){res.render('login')});
app.post('/login', function(req,res){
    User.findOne({'username':req.body.username, 'password':req.body.password}, function(err,doc){
        req.session.username = doc.username;
        res.redirect('/home')
    })
});
app.get('/signup', reverse('/home'), function(req,res){res.render('signup')});
app.post('/signup', function(req,res){
    User.create({username:req.body.username, password:req.body.password}, function(err){
        if(err){
            res.redirect('/signup')
        }else{
            res.redirect('/login')
        }
    })
});
app.get('/home', auth('/login'), function(req,res){
    Chat.find({'members.name':req.session.username}, function(err,docs){
        res.render('home', {chats:docs})
    })
});
app.get('/chats/:id', auth('/login'), function(req,res){
    Chat.findOne({'_id':req.params.id}, function(err,doc){
        if(doc){
            if(doc.members.map(function(elem){return elem.name}).indexOf(req.session.username)){
                req.session.members = doc.members;
                req.session.chatId = doc._id;
            }else{
                res.redirect('/home')
            }
        }
        requestSession = req.session;
        res.render('chat', {chat:doc})
    })
});
app.post('/chat/create', auth('/login'), function(req,res){
    var members = req.body.members.split(',').map(function(elem){return {name:elem.trim()}});
    members.push({name:req.session.username});
    Chat.create({title:req.body.title, members:members},function(err){
        res.redirect('/home')
    })
});
app.get('/chat/create', auth('/login'), function(req,res){res.render('create')});
var connections = [];
function broadcast(data, users, callback){
    for(let i = 0; i < users.length; i++){
        if(users[i].server.readyState == ws.OPEN){
            if(callback){
                return callback(data, users[i])
            }else{
                users[i].server.send(data)
            }
        }
    }
}
wss.on('connection', function(connection){
    var name = requestSession.username;
    var index = connections.push({server:connection, username:name, id:requestSession.chatId}) - 1;
    broadcast(JSON.stringify({data:'online', author:name}), connections, function(message, user){
        if(user.id == requestSession.chatId){
            user.server.send(message)
        }
    });
    connection.on('message', function(msg){
        Chat.update({'_id':requestSession.chatId}, {$push:{'messages':{data:msg, author:name}}}, function(err, update){
            console.log(update)
        });
        broadcast(JSON.stringify({data:msg, author:name}), connections, function(message, user){
            if(user.id == requestSession.chatId){
                user.server.send(message)
            }
        })
    })
    connection.on('close', function(){
        connections.splice(index, 1);
        broadcast(JSON.stringify({data:'disconnected', author:name}), connections, function(message, user){
            if(user.id == requestSession.chatId){
                user.server.send(message)
            }
        })
    })
})
