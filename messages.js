var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var messageSchema = new Schema({
    message: String,
    author: String
});
var Message = mongoose.model('Message', messageSchema);
module.exports = Message;