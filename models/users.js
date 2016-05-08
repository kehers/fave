var dbo = require('./db.js')
    , dateformat = require('dateformat')
    ;


// Modules
exports.findOrCreate = function(token, secret, profile, fn) {
  if (!profile || !profile.username) {
    return fn('Error getting profile details. Kindly try again later');
  }

  var id = profile.id;
  var username = profile.username;

  dbo.db.collection('users').findOne({uid: id},
    function(err, doc) {
      if (err) {
        // todo: Push notification to me here
        return fn('There has been an internal error. Kindly try again later');
      }

      // todo: run profile variable tests
      var avi = profile.photos && profile.photos[0].value ?
                profile.photos[0].value : '';
      var userObj = {
        uid: id,
        user: username,
        avi: avi,
        token: token,
        secret: secret
      };

      if (doc) {
        // Update
        dbo.db.collection('users').update({uid: id},
          {$set: userObj},
          function(err, result) {
            if (err) {
              // todo: log
              return fn('There has been an internal error. Kindly try again later');
            }

            userObj.has_pocket = doc.pocket ? true : false;
            userObj.hits = doc.hits;
            if (doc.pocket)
              userObj.pocket = doc.pocket.email;
            userObj.date = dateformat(doc.date, 'fullDate');

            fn(null, userObj);
        });
      }
      else {
        // Insert
        userObj.hits = 0;
        userObj.date = new Date();

        dbo.db.collection('users').insert(userObj,
          function(err, result) {
            if (err) {
              // todo: log
              return fn('There has been an internal error. Kindly try again later');
            }

            userObj.has_pocket = false;
            userObj.date = dateformat(userObj.date, 'fullDate');

            fn(null, userObj);
        });
      }

    });
}

exports.addPocket = function(id, email, token, fn) {
  if (!id || !token) {
    return fn('Error getting account details. Kindly try again later');
  }

  dbo.db.collection('users').findOne({uid: id},
    function(err, doc) {
      if (err) {
        // todo: Push notification to me here
        return fn('There has been an internal error. Kindly try again later');
      }

      if (!doc) {
        return fn('There has been an error getting the account details. '+
          'Kindly try again later');
      }

      // Update
      dbo.db.collection('users').update({uid: id},
        {
          $set: {
            pocket: {email: email, token: token}
          }
        },
        function(err, result) {
          if (err) {
            // todo: log
            return fn('There has been an internal error. Kindly try again later');
          }

          fn(null, email);
      });

    });
}

exports.saveLastTweetId = function(id, tweets, fn) {

    if (!tweets[0]) {
      return fn('Tweet not found.');
    }

    var tid = tweets[0].id_str;

    dbo.db.collection('users').update({uid: id},
      {$set: {last_tweet: tid}},
      function(err, result) {
        fn(err, result);
      }
    );
}

exports.addHit = function(id, count, fn) {

    dbo.db.collection('users').update({uid: id},
      {$inc: {hits: count}},
      function(err, result) {
        fn(err, result);
      }
    );
}

exports.pauseAccount = function(id, fn) {

  dbo.db.collection('users').findOne({uid: id},
    function(err, doc) {
      if (err) {
        // todo: Push notification to me here
        return fn('There has been an internal error. Kindly try again later');
      }

      if (!doc) {
        return fn('There has been an error getting the account. '+
          'Kindly try again later');
      }

      // Update
      dbo.db.collection('users').update({uid: id},
        {
          $set: {
            paused: true
          }
        },
        function(err, result) {
          if (err) {
            // todo: log
            return fn('There has been an internal error. Kindly try again later');
          }

          fn();
      });

    });
}

exports.activateAccount = function(id, fn) {

  dbo.db.collection('users').findOne({uid: id},
    function(err, doc) {
      if (err) {
        // todo: Push notification to me here
        return fn('There has been an internal error. Kindly try again later');
      }

      if (!doc) {
        return fn('There has been an error getting the account. '+
          'Kindly try again later');
      }

      // Update
      dbo.db.collection('users').update({uid: id},
        {
          $unset: {
            paused: ''
          }
        },
        function(err, result) {
          if (err) {
            // todo: log
            return fn('There has been an internal error. Kindly try again later');
          }

          fn();
      });

    });
}

exports.deleteAccount = function(id, fn) {

  dbo.db.collection('users').findOne({uid: id},
    function(err, doc) {
      if (err) {
        // todo: Push notification to me here
        return fn('There has been an internal error. Kindly try again later');
      }

      if (!doc) {
        return fn('There has been an error getting the account. '+
          'Kindly try again later');
      }

      // Update
      dbo.db.collection('users').remove({uid: id},
        function(err, result) {
          if (err) {
            // todo: log
            return fn('There has been an internal error. Kindly try again later');
          }

          fn();
      });

    });
}

exports.getActiveUsers = function(fn) {

  dbo.db.collection('users').find({'paused' : {$exists : false},
    'pocket.token': {$exists: true}}).toArray(
    function(err, docs) {
      if (err) {
          return fn(err);
      }

      fn(null, docs);
  });
}
