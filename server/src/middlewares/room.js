const express = require('express');
const Room = require('../models/room').Room;
const ObjectId = require('mongodb').ObjectID;

function getAllRooms(req, res) {
  // TODO
}

// Create a new room and sends its ID to the client
function createRoom(req, res) {
  const db = req.db;
  const room = new Room();

  db.collection("rooms").insertOne(room)
      .then(result => {
        res
          .status(201)
          .json({ roomID: result.insertedId })
      })
      .catch(err => {
        res
          .status(500)
          .json({errorMessage: "Error in the server. Please try later"})
      })
}

// Verify if the room exists or not. acts as a boolean
function joinRoom(req, res) {
  const db = req.db;
  const roomID = req.body.roomID;
  console.log(roomID);

  if (roomID) {
    db.collection("rooms").findOne(ObjectId(roomID))
    .then( result => {
      if(result) {
        res
          .status(200)
          .json({ roomID: roomID});  // this information is not relevant to the client
      } else {
        res
          .status(404)
          .json({errorMessage: "This room doesn't exist. Please try with another room ID"});
      }
    })
    .catch(err => {
      res
        .status(500)
        .json({errorMessage: "Internal server error. Please try another time"});
    })
  } else {
      res
        .status(400)
        .json({errorMessage: "Missing fields. roomID not provided"});
  }
}




var roomRouter = express.Router();
roomRouter.get('/get-rooms', getAllRooms);
roomRouter.post('/create-room', createRoom);
roomRouter.post('/join-room', joinRoom);

module.exports = roomRouter;