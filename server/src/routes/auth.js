const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
const saltRounds = 10;
const fs = require('fs')
const router = require('express').Router()
const User = require('../models/user').User



function login(req, res) {
  const db = req.db
  const email = req.body.email
  const password = req.body.password

  if (email && password) {
    db.collection("users").findOne({ email: email})
      .then( result => {
        if (result) {  //Email exists
          const hash = result.password
          bcrypt.compare(password, hash, function(err, r) {
            if (r) { //Good password
              const user = {
                username: result.username,
                email: result.email
              }
              jwt.sign(user, "iamthegreatestaliveandiamhumble", function(err, token) {    //TODO tmp
                res
                  .status(200)
                  .json({token: token, username: result.username})
              })
            }
            else { //Wrong Password
              res
              .status(404)
              .json({errorMessage: "Incorrect Email or Password"})
            }
          });
        }
        else {  //Email doesn't exist
          res
            .status(404)
            .json({errorMessage: "Incorrect Email or Password"})
        }
      })
      .catch(err => {
        res
          .status(500)
          .json({errorMessage: "Internal server error. Please try later"});
      })
  }
  else {
    res
      .status(400)
      .json({errorMessage: "Missing fields"})
  }
}



function signup(req, res, next) {
  const db = req.db
  const username = req.body.username
  const email = req.body.email
  const password = req.body.password

  if (username && email && password) {
    db.collection("users").findOne({email: email})
      .then(result => {
        if (result) {
          res
            .status(400)
            .json({errorMessage: "This email is already used"})
        }
        else {

          bcrypt.hash(password, saltRounds, function(err, hash) {
            const user = new User(username, email, hash)

            db.collection("users").insertOne(user)
              .then(result => {
                res
                  .status(200)
                  .json({message: "User added"})
              })
              .catch(err => {
                res
                  .status(500)
                  .json({errorMessage: "Internal server error. Please try another time"})
              })
          });
        }
      })
      .catch(err => {
        res
          .status(500)
          .json({errorMessage: "Internal server error. Please try another time"})
      })
  }
  else {
    res
      .status(400)
      .json({errorMessage: "Missing fields"})
  }
}



router.post("/login", login)
router.post("/signup", signup)


module.exports = router;
