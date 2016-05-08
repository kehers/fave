var express = require('express')
    , session = require('express-session')
    , passport = require('passport')

    , TwitterStrategy = require('passport-twitter').Strategy
    , PocketStrategy = require('passport-pocket')

    , flash = require('flash')
    , compression = require('compression')
    , favicon = require('serve-favicon')
    , engines = require('consolidate')

    , Tweets = require('./models/tweets')
    , Users = require('./models/users')

    ;

// Config

var app = express();
app.listen(3000);

// Middlewares

app.use(session({
  secret: 'nkwobi isiewu'
}));
app.use(passport.initialize());
app.use(passport.session());

app.engine('html', engines.hogan);
app.set('view engine', 'html');
app.set('views', __dirname + '/public_html');
app.use(flash());
app.use(compression());
app.use(favicon(__dirname + '/public_html/favicon-32x32.png'));
app.use(express.static(__dirname + '/public_html'));
// Transfer flash messages from res to req
app.use(function (req, res, next) {
  if (res.locals.flash)
    req.flash_msgs = res.locals.flash;

  next();
})

// Twitter

passport.use('twitter', new TwitterStrategy({
    consumerKey: process.env['TWTR_CK'],
    consumerSecret: process.env['TWTR_CS'],
    callbackURL: process.env['TWTR_CB']
  },
  function(token, tokenSecret, profile, done) {
    Users.findOrCreate(token, tokenSecret, profile, function(err, user){
      return done(err, user);
    });
  }
));

// Pocket

passport.use('pocket', new PocketStrategy({
    consumerKey: process.env['POCKET_CK'],
    callbackURL: process.env['POCKET_CB']
  },
  function(email, token, done) {
    if (email && token)
      return done(null, {email: email, token: token});
    else
      return done('Error authenticating the Pocket account');
  }
));

// Routes

// Inject some variables into template variables
var render = function(req, _obj) {
    var obj = {
        year: new Date().getFullYear(),
        partials: {
            header: 'header',
            footer: 'footer'
        }
    }

    if (req.flash_msgs) {
        var msgObj;
        for (var i=0;i<req.flash_msgs.length;i++) {
            msgObj = req.flash_msgs[i];
            obj[msgObj.type] = msgObj.message;
        }
    }
    if (req.user) {
        for (var attr in req.user) {
            obj['user_'+attr] = req.user[attr];
        }
    }

    if (null == _obj || "object" != typeof _obj) return obj;
    for (var attr in _obj) {
        if (_obj.hasOwnProperty(attr)) obj[attr] = _obj[attr];
    }

    return obj;
};

// Twitter auth
app.get('/login', passport.authenticate('twitter'));
app.get('/cb/twitter', function(req, res, next) {
  passport.authenticate('twitter', function(err, user, info) {
    if (err) {
      req.flash('error', 'There has been an authentication error.'+
        ' Plese try again later');
      return res.redirect('/');
    }

    req.login(user, function(err) {
      if (err) {
        req.flash('error', 'There has been an error logging you in.'+
          ' Please try again later');
      }

      return res.redirect('/');
    });

  })(req, res, next);
});
// Add pocket
app.get('/add/pocket', function(req, res, next) {
  if (!req.user) {
    // todo: Allow adding either one first
    req.flash('info', 'What about we start with your twitter account?');
    return res.redirect('/');
  }

  next();
}, passport.authenticate('pocket'));
app.get('/cb/pocket', function(req, res, next) {
  passport.authenticate('pocket', function(err, pocketUsr, info) {

    if (err) {
      req.flash('error', 'There has been an authentication error.'+
        ' Please try again later');
      // Remove pocket codes here
      delete req.session.pocketCode;

      return res.redirect('/');
    }

    Users.addPocket(req.user.uid, decodeURIComponent(pocketUsr.email), pocketUsr.token,
      function(err, email) {

        if (err) {
          req.flash('error', 'There has been an authentication error.'+
            ' Plese try again later');
          return res.redirect('/');
        }

        req.user.has_pocket = true;
        req.user.pocket = email;

        res.redirect('/');

        // Get last fav from twitter and save date
        Tweets.saveLastFav(req.user.uid, req.user.token,
          req.user.secret, function(err) {
            // ?
          });
    });

  })(req, res, next);
});

// Views
app.get('/', function(req, res) {

  if (!req.user) {
    // Home page (unauthenticated)
    return res.render('home', render(req));
  }

  // If has Pocket, home view

  if (req.user.has_pocket) {
    if (req.query.pause !== undefined) {
      Users.pauseAccount(req.user.uid, function() {
        req.user.paused = true;
        req.flash('info', 'Getting favs to Pocket paused.');
        res.redirect('/');
      });
    }
    else if (req.query.go !== undefined) {
      Users.activateAccount(req.user.uid, function() {
        delete req.user.paused;
        req.flash('info', 'All set to send your favs to Pocket again.');
        res.redirect('/');
      });
    }
    else
      res.render('dashboard', render(req));
  }
  else {
    res.render('add_pocket', render(req));
  }
});
app.route('/delete')
  .post(function(req, res) {
    if (!req.user) {
      return res.redirect('/');
    }

    res.render('delete_account', render(req));
  })
  .get(function(req, res) {

    if (req.query.confirm !== 'undefined') {
      Users.deleteAccount(req.user.uid, function(){
        req.logout();
        req.session.destroy();
        return res.redirect('/');
      });
    }
    else
      res.redirect('/');
  });
app.get('/privacy', function(req, res) {
  res.render('privacy', render(req));
});
app.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

// Session handlers

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});


//
