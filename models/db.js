var dbClient = require('mongodb').MongoClient
    , ObjectID = require('mongodb').ObjectID
    ;

var url = process.env['DB_URL'];
dbClient.connect(url, function(err, thisDb) {
    exports.db = thisDb;
    exports.id = ObjectID;
});
