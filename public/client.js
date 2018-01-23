var socket = io.connect();

function joinRoom (room) {
  socket.emit('room', room);
  //console.log('Emited join to ' + room);
};

socket.on('roomListResult', function(data) {
  SendMessage('SocketController', 'ShowRoomList', JSON.stringify(data));
});

socket.on('newRoom', function(data) {
  SendMessage('SocketController', 'CreateNewRoom', data);
});

socket.on('joinedRoom', function(data) {
  SendMessage('SocketController', 'JoinedRoom', data);
});

function roomList () {
  socket.emit('roomList', '');
  //console.log('Ask for roomList');
};

function Movement (m) {
  socket.emit('movement', m);
  //console.log('Emited Movement with json: ' + m);
};

socket.on('move', function(m) {
  SendMessage('GlobalStateManager', 'MoveSomeone', m);
  //console.log("move: sending message to unity");
});
