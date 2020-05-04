require('dotenv').config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require('lodash');

const app = express();

app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB Database
mongoose.connect("mongodb://localhost:27017/crownUserDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useFindAndModify', false);
mongoose.set("useCreateIndex", true);

// Crown Users schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  twitterId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// New User Model defined by User Schema
const User = new mongoose.model("User", userSchema);

// Passport strategies
passport.use(User.createStrategy());

// Passport Login method
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// Passport logout method
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/crown",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

// Facebook OAuth strategy
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/crown"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

// Twitter OAuth strategy
passport.use(new TwitterStrategy({
    consumerKey: process.env.CONSUMER_ID,
    consumerSecret: process.env.CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/crown"
  },
  function(token, tokenSecret, profile, cb) {
    User.findOrCreate({
      twitterId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

// Google OAuth
app.get("/auth/google", passport.authenticate('google', {
  scope: ["profile"]
}));

app.get("/auth/google/crown",
  passport.authenticate('google', {
    failureRedirect: '/'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/');
  });

// Facebook OAuth
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/crown',
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/'
  }));

// Twitter OAuth
app.get('/auth/twitter',
  passport.authenticate('twitter'));

app.get('/auth/twitter/crown',
  passport.authenticate('twitter', {
    failureRedirect: '/'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

// Current date to use in ejs pages
const d = new Date();
const year = d.getFullYear();

// Home page
app.get('/', function(req, res) {
  res.render("home", {
    currentUser: req.user,
    year: year
  });
});


app.get("/logout", function(req, res) {
  // Logout current user and redirect home
  req.session.destroy(err => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  })
});


// Defining forum post schema
const forumsSchema = new mongoose.Schema({
  username: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: Date,
  title: String,
  body: String,
  comments: [{
    body: String,
    commentUsername: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  date: {
    type: Date,
    default: Date.now
  }
});

// Create new Post model
const Post = new mongoose.model("Post", forumsSchema);

app.get("/forums", function(req, res) {
  // Find all posts from database to render on forums.ejs
  Post.find({}, function(err, foundPosts) {
    if (req.isAuthenticated()) {
      res.render("forums", {
        currentUser: req.user,
        foundPosts: foundPosts,
        year: year,
        postBody: req.body.postBody,
        postTitle: req.body.postTitle
      });
    } else {
      res.redirect("/#join")
    }
  }).populate("username").sort('-date');
});


app.post("/forums", function(req, res) {

  const postUsername = req.user.id
  const postTitle = req.body.postTitle
  const postBody = req.body.postBody

  // Add posts to database to be rendered on forums.ejs
  const post = new Post({
    username: postUsername,
    title: postTitle,
    body: postBody,
  });
  // Inserting new posts into DB
  Post.insertMany(post, function(err) {
    if (err) {
      console.log(err);
    } else {
      post.save();
    }
  });
  res.redirect("/forums")
});

// Link to forum post ID as a url for each post
app.get("/forums/:postID", function(req, res) {

  const commentUser = req.user.username;
  const posterComment = req.postComment
  const postTitle = req.params.postTitle;
  const postID = req.params.postID;

  // Find matching post to the ID and load that post
  Post.findOne({
    _id: postID
  }, function(err, foundPost) {
    if (req.isAuthenticated()) {
      res.render("forumposts", {
        postID: postID,
        postComments: foundPost.comments,
        posterComment: posterComment,
        commentUser: commentUser,
        currentUser: req.user,
        foundPost: foundPost,
        year: year,
        postBody: req.body.postBody,
        postTitle: req.body.postTitle
      });
    } else {
      res.redirect("/#join")
    }
  }).populate("username");
});


app.post("/forums/:postID", function(req, res) {

  const commentUser = req.user.username;
  const posterComment = req.body.postComment;
  const postID = req.params.postID;

  // Update current forum post comments array to have the comment the user added.
  Post.updateMany({
    _id: postID
  }, {
    $push: {
      comments: {
        body: posterComment,
        commentUsername: commentUser
      }
    }
  }, function(err, post) {
    if (err) {
      console.log(err);
    }
  }).populate("commentUsername");
  // Redirect users back to the forum post they are commenting on
  res.redirect("/forums/" + postID)
});

// Delete comments method
app.post("/forums/:postID/delete", function(req, res) {

  let postID = req.params.postID
  const button = req.body.button;

  Post.findById({
    _id: postID
  }, function(err, foundPost) {
    if (err) {
      console.log(err);
    } else {
      const newComments = foundPost.comments.filter(e => {
        return (e._id != button)
      });
      Post.updateOne({
        _id: postID
      }, {
        comments: newComments
      }, function() {
        res.redirect("/forums/" + postID)
      });
    }
  });
});

app.get('/pvp', function(req, res) {
  res.render("pvp", {
    currentUser: req.user,
    year: year
  });
});

app.get('/pve', function(req, res) {

  // Warcraft Logs API for Iuxbp character
  const url = "https://classic.warcraftlogs.com:443/v1/parses/character/iuxbp/fairbanks/us?metric=dps&timeframe=historical&api_key=" + process.env.API_KEY;

  // Parse WCL data
  https.get(url, function(response) {
    var body = "";
    response.on("data", function(data) {
      body += data
    });
    response.on("end", function() {
      const logs = JSON.parse(body);

      // RAZORGORE SECTION

      const razorgoreRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 610) {
          razorgoreRanks.push(logs[i].rank)
        }
      }
      var recordRazorgoreRank = Math.min(...razorgoreRanks);

      const razorgorePercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 610) {
          razorgorePercentiles.push(logs[i].percentile)
        }
      }
      var recordRazorgorePercentile = Math.floor(Math.max(...razorgorePercentiles));

      // VAEL SECTION

      const vaelRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 611) {
          vaelRanks.push(logs[i].rank)
        }
      }
      var recordVaelRank = Math.min(...vaelRanks);

      const vaelPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 611) {
          vaelPercentiles.push(logs[i].percentile)
        }
      }
      var recordVaelPercentile = Math.floor(Math.max(...vaelPercentiles));

      // BROODLORD SECTION

      const broodlordRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 612) {
          broodlordRanks.push(logs[i].rank)
        }
      }
      var recordBroodlordRank = Math.min(...broodlordRanks);

      const broodlordPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 612) {
          broodlordPercentiles.push(logs[i].percentile)
        }
      }
      var recordBroodlordPercentile = Math.floor(Math.max(...broodlordPercentiles));

      // FIREMAW SECTION

      const firemawRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 613) {
          firemawRanks.push(logs[i].rank)
        }
      }
      var recordFiremawRank = Math.min(...firemawRanks);

      const firemawPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 613) {
          firemawPercentiles.push(logs[i].percentile)
        }
      }
      var recordFiremawPercentile = Math.floor(Math.max(...firemawPercentiles));

      // EBONROC SECTION

      const ebonrocRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 614) {
          ebonrocRanks.push(logs[i].rank)
        }
      }
      var recordEbonrocRank = Math.min(...ebonrocRanks);

      const ebonrocPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 614) {
          ebonrocPercentiles.push(logs[i].percentile)
        }
      }
      var recordEbonrocPercentile = Math.floor(Math.max(...ebonrocPercentiles));

      // FLAMEGOR SECTION

      const flamegorRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 615) {
          flamegorRanks.push(logs[i].rank)
        }
      }
      var recordFlamegorRank = Math.min(...flamegorRanks);

      const flamegorPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 615) {
          flamegorPercentiles.push(logs[i].percentile)
        }
      }
      var recordFlamegorPercentile = Math.floor(Math.max(...flamegorPercentiles));

      // CHROMAGGUS SECTION

      const chromaggusRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 616) {
          chromaggusRanks.push(logs[i].rank)
        }
      }
      var recordChromaggusRank = Math.min(...chromaggusRanks);

      const chromaggusPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 616) {
          chromaggusPercentiles.push(logs[i].percentile)
        }
      }
      var recordChromaggusPercentile = Math.floor(Math.max(...chromaggusPercentiles));

      // NEFARION SECTION

      const nefRanks = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 617) {
          nefRanks.push(logs[i].rank)
        }
      }
      var recordNefRank = Math.min(...nefRanks);

      const nefPercentiles = [];
      for (var i = 0; i < logs.length; i++) {
        if (logs[i].encounterID === 617) {
          nefPercentiles.push(logs[i].percentile)
        }
      }
      var recordNefPercentile = Math.floor(Math.max(...nefPercentiles));

      res.render("pve", {
        recordRazorgoreRank: recordRazorgoreRank,
        recordRazorgorePercentile: recordRazorgorePercentile,
        recordVaelRank: recordVaelRank,
        recordVaelPercentile: recordVaelPercentile,
        recordBroodlordRank: recordBroodlordRank,
        recordBroodlordPercentile: recordBroodlordPercentile,
        recordFiremawRank: recordFiremawRank,
        recordFiremawPercentile: recordFiremawPercentile,
        recordEbonrocRank: recordEbonrocRank,
        recordEbonrocPercentile: recordEbonrocPercentile,
        recordFlamegorRank: recordFlamegorRank,
        recordFlamegorPercentile: recordFlamegorPercentile,
        recordChromaggusRank: recordChromaggusRank,
        recordChromaggusPercentile: recordChromaggusPercentile,
        recordNefRank: recordNefRank,
        recordNefPercentile: recordNefPercentile,
        currentUser: req.user
      });
    });
  });
});

// Post route for signing up
app.post("/signup", function(req, res) {

  // Register users with their inputs of username, email, password
  User.register({
    username: req.body.username,
    email: req.body.email
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      // Login & Redirect to homepage if users register successfully
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });

});

// Post route for users login
app.post("/login", function(req, res) {

  // Define new user with inputs for username, password, email
  const user = new User({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email
  });

  // Login users if credentials match database credentials, redirect to homepage
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

// Set up local host
app.listen(3000, function() {
  console.log("server is running on port 3000");
});
