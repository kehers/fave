var request = require('request')
    , dbClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID

    , url = 'db_url'
    , twitter_key = 'twitter_key'
    , twitter_secret = 'twitter_secret'
    , pocket_key = 'pocket_key'
    , fav_url = 'https://api.twitter.com/1.1/favorites/list.json'
    , add_url = 'https://getpocket.com/v3/add'
    , batch_url = 'https://getpocket.com/v3/send'
    , l = 0;
;

const POST = 1;
const GET = 2;

// Add to pocket
var sendtoPocket = function(url, method, param, fn) {
  param.consumer_key = pocket_key;

  var params = {
    url: url
  }
  if (method == POST) {
    params.form = param;
    request.post(params, function (err, req, data) {

        if (err) {
          return fn(err);
        }

        fn(null, JSON.parse(data));
    });
  }
  else if (method == GET) {
    params.qs = param;

    request.get(params, function (err, req, data) {
        if (err) {
          return fn(err);
        }

        fn(null, JSON.parse(data));
    });
  }
}

var end = function(i) {
  if (i == l-1)
    setTimeout(function() {
      process.exit(0);
    }, 5000);
}

// todo:
// Refactor: Use promises, async or/and iron queues
dbClient.connect(url, function(err, db) {
  var id = ObjectID;

  db.collection('users').find({'paused' : {$exists : false},
    'pocket.token': {$exists: true}}).toArray(

    function(err, docs) {
      if (err) {
        process.exit(0);
      }

      if (docs.length == 0)  process.exit(0);

      l = docs.length;

      for (var i = 0; i < l; i++) {
        (function(user, counter){

          request.get({url:fav_url, oauth:{
                consumer_key: twitter_key, consumer_secret: twitter_secret,
                token: user.token, token_secret: user.secret
              }, json:true, qs: {since_id: user.last_tweet, user_id: user.uid}},//
            function (err, req, tweets) {

              if (err)
                return end(counter);

              if (!Array.isArray(tweets) || tweets.length == 0)
                return end(counter);

              // Get URLs in tweets
              var tweet, urls;
              var param = [];
              for (var i=0;i<tweets.length;i++) {
                tweet = tweets[i];
                // Has url entities
                if (tweet.entities && tweet.entities.urls) {
                  urls = tweet.entities.urls;
                  for (var j=0;j<urls.length;j++) {
                    url = urls[j];
                    if (url.expanded_url) {
                      // http://getpocket.com/developer/docs/v3/modify#action_add
                      param.push({
                        action: 'add',
                        url: url.expanded_url,
                        ref_id: tweet.id_str
                      });
                    }
                  }
                }
              }

              // Save last tweet id
              if (!tweets[0])
                return end(counter);

              db.collection('users').update({uid: user.uid},
                {$set: {last_tweet: tweets[0].id_str}},
                function(err) {

                  if (err) return end(counter);

                  // Got links bruh?
                  if (param.length > 0) {
                    if (param.length == 1) {
                      // http://getpocket.com/developer/docs/v3/add
                      sendtoPocket(add_url, POST,
                        {url: param[0].url, tweet_id: param[0].ref_id, access_token: user.pocket.token},
                        function(err, result) {
                          if (result) {
                            var count = 1;
                            if (result.status == 0)
                              count = 0;

                            if (count) {
                              // Add hit
                              db.collection('users').update({uid: user.uid},
                                {$inc: {hits: count}},
                                function(err, result) {}
                              );
                            }
                          }

                          end(counter);
                      });
                    }
                    else {
                      // http://getpocket.com/developer/docs/v3/modify#action_add
                      sendtoPocket(batch_url, GET,
                        {actions: JSON.stringify(param), access_token: user.pocket.token},
                        function(err, result) {
                          if (result) {
                            var count = result.action_results.length;
                            if (result.status == 0)
                              count = 0;

                            if (count) {
                              // Add hit
                              db.collection('users').update({uid: user.uid},
                                {$inc: {hits: count}},
                                function(err, result) {}
                              );
                            }
                          }

                          end(counter);
                      });
                    }
                  }
                  else {
                    end(counter);
                  }
                });
          });

        })(docs[i], i);
      }
    });

});




