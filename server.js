var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use("/TemplateData",express.static(__dirname + "/TemplateData"));
app.use("/Release",express.static(__dirname + "/Release"));
app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendfile(__dirname + '/index.html');
});

/////// ------ Game Logic -------- ///////
var currentPlayers = 0;
const MAX_PLAYERS_PER_ROOM = 4;
var rooms = [];

io.on('connection', function(socket){

  // ---- Count players
  currentPlayers ++;
  //console.log('Number of concurrent users: ' + currentPlayers);
  socket.on('disconnect', function() {
    currentPlayers --;
    //console.log('Number of concurrent users: ' + currentPlayers);
  });


  // ----- Rooms
  // Join a room if the room have less than 4 players
  socket.on('room', function(room) {
    var playersInRoom = numClientsInRoom('/', room);
    if (playersInRoom < MAX_PLAYERS_PER_ROOM) {
      socket.leave(room);
      socket.join(room);
      if (rooms.indexOf(room) == -1) {
        rooms.push(room);
        io.sockets.emit('newRoom', room);
        socket.emit('joinedRoom', room + '|1');
      } else {
        socket.emit('joinedRoom', room + '|2');
      }
      //console.log('Player has joined room: ' + room + ', number of players inside the room: ' + numClientsInRoom('/', room));
    } else {
      //console.log('Reached max players capability for the room ' + room);
    }
  });
  socket.on('leaveRoom', function(room){
    socket.leave(room);
    //console.log('Player has leave room ' + room);
  });
  // Send a room one by one to the socket who ask for it
  socket.on('roomList', function(){
    for (var i = 0; i < rooms.length; i++) {
      socket.emit('newRoom', rooms[i]);
    }
    //socket.emit('roomListResult', rooms);
    //console.log('Emited room list: ' + JSON.stringify(rooms));
  });
  function numClientsInRoom(namespace, room) {
    if (io.nsps[namespace].adapter.rooms[room]) {
      var clients = io.nsps[namespace].adapter.rooms[room].sockets;
      //console.log(clients.length + ' users in room ' + room);
      return Object.keys(clients).length;
    } else {
      return 0;
    }
  };

  socket.on('movement', function(m) {
    var mov = JSON.parse(m);
    //console.log('Movement activated: ' + m + ' --- sending to room: ' + mov.room);
    //socket.to(m.room).emit('move', m);
    //io.sockets.in(m.room).emit('move', m);
    io.in(mov.room).emit('move', m);
  });
});





/////// ------ Node server logic (with the openshift vars) -------- ///////

var MainServer = function () {
  var self = this;

  self.terminator = function(sig){
      if (typeof sig === "string") {
         console.log('%s: Received %s - terminating app ...',
                     Date(Date.now()), sig);
         process.exit(1);
      }
      console.log('%s: Node server stopped.', Date(Date.now()) );
  };

  /**
   *  Setup termination handlers (for exit and a list of signals).
   */
  self.setupTerminationHandlers = function(){
      //  Process on exit and signals.
      process.on('exit', function() { self.terminator(); });

      // Removed 'SIGPIPE' from the list - bugz 852598.
      ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
       'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
      ].forEach(function(element, index, array) {
          process.on(element, function() { self.terminator(element); });
      });
  };

  self.setupVariables = function() {
      //  Set the environment variables we need.
      self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
      self.port      = process.env.OPENSHIFT_NODEJS_PORT || 3000;

      if (typeof self.ipaddress === "undefined") {
          //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
          //  allows us to run/test the app locally.
          console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
          self.ipaddress = "127.0.0.1";
      };
  };

  self.listen = function () {
    self.setupVariables();
    http.listen(self.port, self.ipaddress, function() {
        console.log('%s: Node server started on %s:%d ...',
                    Date(Date.now() ), self.ipaddress, self.port);
    });
  };
};

var init = new MainServer();
init.listen();
init.setupTerminationHandlers();
