var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var chatSchema = new Schema({
    messages: [{data:String, author:String}],
    members: [{name:String}],
    title: {type:String}
});
var Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;