const express = require('express')
const app = express()
const server = require('http').createServer(app)
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const http = require('http')

const authRouter = require('./src/middlewares/auth.js');
const roomRouter = require('./src/middlewares/room.js');
const controller = require('./src/middlewares/token.js');

const PORT = process.env.PORT || 8080;

///////////////////////////////////////
//////////// MIDDLEWARES //////////////
///////////////////////////////////////

//app.use(cors());
app.use(bodyParser.json()) //Parsed data is populated on the request object (i.e. req.body).
app.use(bodyParser.urlencoded( { extended: true }))
app.use( (req, res, next ) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Requested-With, Accept, x-access-token')
  if (req.method == 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
  }
  res.header('Content-Type', 'application/json') //REST-API: we only send back json data
  next()
})

//app.use(express.static(path.join(__dirname, 'public')));


//////////////////////////////
///////// DATABASE ///////////
//////////////////////////////
const MongoClient = require('mongodb').MongoClient;
//const url = 'mongodb://localhost:27017/sync';
// const url = 'mongodb+srv://achraf:achraf@cluster0.tcfev.mongodb.net/sync?retryWrites=true&w=majority'
//const url = 'mongodb+srv://achraf:achraf@cluster0.bj6rh.mongodb.net/admin?retryWrites=true&w=majority';
const url = 'mongodb+srv://achraf:achraf@cluster0.0ktnx.mongodb.net/synk?retryWrites=true&w=majority';

var db;
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log("connection to database established...  ");

    db = client.db("sync");
    db.createCollection('users'); //Normally, if it already exists, it shoudn't do anything, but I'm not sure

    app.use((req, res, next) => {
      req.db = db
      next();
    })

    app.use('/api/auth', authRouter)
    // app.use('/room', controller.checkToken, roomRouter)
    app.use('/api/room', roomRouter)

  })
  .catch(err => {console.log(err)})

///////////////////
//// ROUTING //////
///////////////////

// app.use('/api/auth', authRouter)
// // app.use('/room', controller.checkToken, roomRouter)
// app.use('/api/room', roomRouter)

// Index Route

// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


///////////////////////////////////////
///////// SOCKET CONNECTION ///////////
///////////////////////////////////////

var sockets = [];
// const SOCKET_PORT = process.env.SOCKET_PORT | 3000
// const io = require('socket.io')(SOCKET_PORT);
const io = require('socket.io')(server);
//const io = require('socket.io')(server, { path: '/socket.io'});

//To connect to the socket, we should have an ID of an already created room
io.on('connection', (socket) => {

  let handshake = socket.handshake;
  let roomId = handshake.query.roomId;
  let username = handshake.query.username;

  if (handshake.query && roomId && username)
  { // Connection accepted
    socket.join(roomId);
    if (io.sockets.hosts == undefined) io.sockets.hosts = {}
    if (io.sockets.hosts[roomId] == undefined)  {
      io.sockets.hosts[roomId] = socket.id;
      socket.emit('put-status-to-host', '');
    } else {
      socket.emit('put-status-to-nothost', '');
    }

    socket.emit('message', 'you are connected');
    socket.to(roomId).emit('message', `${username} is connected`);  //broadcast

    ///////
    //log//
    ///////
    // console.log("\n----");
    // console.log("CONNECT");
    // for (let id in io.sockets.adapter.rooms) {
    //   console.log(`ROOM ID: ${id}.\n  length: ${io.sockets.adapter.rooms[id].length}`);
    // }
    //
    // console.log("\nHOSTS: \n", io.sockets.hosts);
    // console.log("----\n");

  }
  else
  { // Connection refused
    socket.emit('message', 'Socket connection failed. roomID or Username not provided');
    socket.disconnect(true);
    console.log(`log: ${username} have tried to connect to room ${roomId}. Connection failed`);
    return; //break
  }

  socket.on('disconnect', () => {
    socket.emit('message', 'Socket connection aborted');
    if (socket.id == io.sockets.hosts[roomId]) io.sockets.hosts[roomId] = undefined;
    socket.disconnect(true);

    ///////
    //log//
    ///////
    // console.log("\n----");
    // console.log("DISCONNECT");
    // for (let id in io.sockets.adapter.rooms) {
    //   console.log(`ROOM ID: ${id}.\n  length: ${io.sockets.adapter.rooms[id].length}`);
    // }
    //
    // console.log("\nHOSTS: \n", io.sockets.hosts);
    // console.log("----\n");

  })

  socket.on('chat-message', (data) => { //broadcast
    socket.to(roomId).emit('chat-message', data);
  })

  socket.on('host-player-state', (state) => { //broadcast
    socket.to(roomId).emit('host-player-state', state);
  })

  socket.on('become-host', () => {
    io.sockets.hosts[roomId] = socket.id;
    socket.emit('put-status-to-host', '');
    socket.to(roomId).emit('put-status-to-nothost');  //broadcast
    ///////
    //log//
    ///////
    // console.log("\n----");
    // console.log("CHANGE OF HOSTS");
    //
    // console.log("\nHOSTS: \n", io.sockets.hosts);
    // console.log("----\n");
  })

  //Sync
  socket.on('get-hoststate', () => {
    let hostId = io.sockets.hosts[roomId];
    //if there is no host, make 'socket' the host
    if (hostId == undefined) {
      io.sockets.hosts[roomId] = socket.id;
      socket.emit('put-status-to-host', '');
      socket.to(roomId).emit('put-status-to-nothost');
      return;
    }
    //else
    let host = io.sockets.sockets[hostId];
    host.emit('get-hoststate', '');
  });

  socket.on('hoststate', (hostState) => {
    socket.to(roomId).emit('hoststate', hostState); //broadcast the player time of the host
  });

  socket.on('synchronized', () => {
    let hostId = io.sockets.hosts[roomId];
    //if there is no host, make 'socket' the host
    if (hostId == undefined) {
      io.sockets.hosts[roomId] = socket.id;
      socket.emit('put-status-to-host', '');
      socket.to(roomId).emit('put-status-to-nothost');
      return;
    }
    //else
    let host = io.sockets.sockets[hostId];
    host.emit('synchronized', '');
  })
});


///////////////////////////////////////
///////// SERVER CONNECTION ///////////
///////////////////////////////////////

server.listen(PORT, () => {
  console.log("Running on port " + PORT)
})
