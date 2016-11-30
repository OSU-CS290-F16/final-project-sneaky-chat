//<script>

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var record = [];

var channels = {};

if(fs.exists("./record.json")){
    record = require("./record.json");
}



function pushNSave(theString){
    record.push(theString);
    fs.writeFile("record.json",JSON.stringify(record),(function(error){"do nothing";}));
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res){
  res.sendFile(__dirname + '/style.css');
});

app.get('/wordList.json', function(req, res){
  res.sendFile(__dirname + '/wordList.json');
});

io.on('connection', function(socket){
  console.log('a user connected');
  var pos = 0;
  var lim = record.length;
  while(pos<lim){
    io.emit('catchup', record[pos]);
    pos++;
  }
  io.emit('done',"done");


  socket.on('disconnect', function(){
	  console.log('a user disconnected');
  });
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    pushNSave(msg);
  });
  socket.on('login', function(msg){
    console.log(msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

//</script>
