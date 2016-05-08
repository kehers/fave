var dbo = require('./db.js')
    , Users = require('./users.js')
    , request = require('request')
    ;

const FAV_URL = 'https://api.twitter.com/1.1/favorites/list.json';
const BATCH_URL = 'https://getpocket.com/v3/send';
const ADD_URL = 'https://getpocket.com/v3/add';

const POST = 1;
const GET = 2;

var get = function(token, secret, options, fn) {
  if (!token || !secret)
    return fn('Authentication error.');

  var oauth = {
                consumer_key: process.env['TWTR_CK']
                , consumer_secret: process.env['TWTR_CS']
                , token: token
                , token_secret: secret
              };

  request.get({url:FAV_URL, oauth:oauth, json:true, qs: options},
    function (err, req, data) {
      if (err) {
        return fn(err);
      }

      fn(null, data);
  });
}

var sendtoPocket = function(url, method, param, fn) {
  param.consumer_key = process.env['POCKET_CK'];

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

// Modules
exports.saveLastFav = function(userid, token, secret, fn) {

  if (!userid || !token || !secret) {
    return fn('Missing credentials.');
  }

  get(token, secret, {user_id: userid, count: 1}, function(err, tweets) {

    if (err)
      return fn(err);

    Users.saveLastTweetId(userid, tweets, function(err, result) {
      fn(err, result);
    });

  });
}

exports.extractAndSave = function(uid, token, tweets, fn) {
  if (!token || !Array.isArray(tweets)) {
    return;
  }

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
  Users.saveLastTweetId(uid, tweets, function(err, result) {
    if (err)  return fn(err);

    // Got links bruh?
    if (param.length > 0) {
      if (param.length == 1) {
        // http://getpocket.com/developer/docs/v3/add
        sendtoPocket(ADD_URL, POST,
          {url: param[0].url, tweet_id: param[0].ref_id, access_token: token},
          function(err, result) {
            var count = 1;
            if (result.status == 0)
              count = 0;

            fn(err, result, count);
        });
      }
      else {
        // http://getpocket.com/developer/docs/v3/modify#action_add
        sendtoPocket(BATCH_URL, GET,
          {actions: JSON.stringify(param), access_token: token},
          function(err, result) {
            var count = result.action_results.length;
            if (result.status == 0)
              count = 0;

            fn(err, result, count);
        });
      }
    }
  });

}

exports.get = get;
