//<script>


var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var Users = {};

var Records = {};

var Channels = {};

if(fs.exists("./record.json")){
    record = require("./record.json");
}



function pushNSave(theString){
  record.push(theString);
  fs.writeFile("record.json",JSON.stringify(record),(function(error){"do nothing";}));
}

function getUniqueID(){
  var theID = Math.random();
  while( typeof Users[theID] !== "undefined"){
    theID = Math.random();
  }
  return theID;
}

function broadcast(chan, message){
  var pos = 0;
  var lim = Channels[chan].Manifest.length;
  while(pos<lim){
    Users[Channels[chan].Manifest[pos]].Socket.emit('broadcast',message);
    pos++;
  }
  Records[chan].push(message);
  Channels[chan].Record.push(message);
  fs.writeFile("record.json",JSON.stringify(Records),(function(error){"do nothing";}));
  console.log("done");
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
  var theID = getUniqueID();
  Users[theID] = {Socket: socket, Chan: null };
  socket.emit('ID',theID);

  socket.on('channel', function(data){

    // If the transmission is lying to us, don't do anything
    if( typeof Users[data.ID] === "undefined" ){
        return;
    }
    if( socket != Users[data.ID].Socket){
        return;
    }

    // If user already tuned into a channel, removes them from that channel
    if( typeof Channels[Users[data.ID].Chan] !== "undefined" ){
      console.log( data.ID + " dropped from channel " + data.Chan );
      var theChan = Channels[Users[data.ID].Chan];
      var pos = 0;
      var lim = theChan.Manifest.length;
      while(pos<lim){
        if(theChan.Manifest[pos] === data.ID){
          theChan.Manifest = theChan.Manifest.splice(pos,1);
        }
        pos++;
      }
    }

    // If the channel is new, make a channel object and store it in the channel table
    if( typeof Channels[data.Chan] === "undefined" ){
      console.log( data.ID + " opened channel " + data.Chan );
      Channels[data.Chan] = { Manifest: [], Record: [] };
      Channels[data.Chan].Manifest.push(theID);
      Records[data.Chan] = [];
    }
    // If the channel already exists, add the user and give them the chat record
    else{
      console.log( data.ID + " joined pre-existing channel " + data.Chan );
      Channels[data.Chan].Manifest.push(theID);
      socket.emit('catchup',Channels[data.Chan].Record);
    }

    // Set the user's channel attribute to the one in the message
    Users[data.ID].Chan = data.Chan;
    console.log(data.ID+" connected to "+data.Chan);

  });

  socket.on('disconnect', function(){

    var pos = 0;
    var lim = Users.length;
    var UserKeys = Object.keys(Users);
    while(pos<lim){
        if(Users[UserKeys[pos]].Socket === this){
            break;
        }
        pos++;
    }

    if(pos === lim){
        return;
    }

    var data = {ID: UserKeys[pos]};

    // If user is tuned into a channel, removes them from that channel
    if( typeof Channels[Users[data.ID].Chan] !== "undefined" ){
      var theChan = Channels[Users[data.ID].Chan];
      var pos = 0;
      var lim = theChan.Manifest.length;
      while(pos<lim){
        if(theChan.Manifest[pos] === data.ID){
          theChan.Manifest = theChan.Manifest.splice(pos,1);
        }
        pos++;
      }
    }
    delete Users[data.ID];
    console.log(data.ID + " disconnected");

  });



  socket.on('chat message', function(data){
    console.log(data);
    // If the transmission is lying to us, don't do anything
    if( typeof Users[data.ID] === "undefined" ){
        return;
    }
    if( socket != Users[data.ID].Socket){
        console.log(data.ID+ " lied ");
        return;
    }
    // If the user is not on a valid channel, do nothing
    if( typeof Channels[Users[data.ID].Chan] === "undefined" ){
        console.log(data.ID+ " called into the void");
        return;
    }

    console.log(data.ID+ " said "+data.Message);
    data.Message = data.ID + " > " + data.Message;
    broadcast(Users[data.ID].Chan,data.Message);

  });

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

//</script>
