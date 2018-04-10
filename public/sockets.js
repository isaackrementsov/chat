var ws = new WebSocket('ws://localhost:3000');
function msg(){
    input = document.getElementById('chat');
    send(input.value);
    input.value = '';
    return false
}
function send(data){
    if(ws.readyState == WebSocket.OPEN){
        ws.send(data)
    }else{
        throw 'No connection'
    }
}
ws.addEventListener('open',  function(){})
ws.addEventListener('message', function(msg){
    var chat = document.getElementById('chats');
    chat.innerHTML += `<p>${msg.data}</p>`
})