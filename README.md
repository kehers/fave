## Fave

Send links in tweets you fav to your Pocket account.


### Running

You need to [register an app on Twitter](https://apps.twitter.com/app/new) and [on Pocket](https://getpocket.com/developer/apps/). Read only permission is ok for the Twitter app while the Pocket needs `add` and `modify` (to send batch links) permissions. You can then pass the app credentials via environmental variables.

- POCKET_CK - Your Pocket Consumer key
- POCKET_CB - Your Pocket callback URL
- TWTR_CK - Your Twitter Consumer key
- TWTR_CS - Your Twitter Consumer Secret
- TWTR_CB - Your Twitter callback URL
- DB_URL - Your MongoDb URL

```
POCKET_CK=63422-9a535496a7715bd8c125bc70 POCKET_CB=[YOUR_DOMAIN]/cb/pocket TWTR_CK=sAYNdkIjSXMxm99AciaEA TWTR_CS=uQIdlDTyCKTPfmaeQZRomNSjUIwLci6KV1WEZ6sVLi8 TWTR_CB=[YOUR_DOMAIN]/cb/twitter node app.js DB_URL=https://user:pass@sub.mongolabs.com/fave
```

You also need to setup an [ironio](http://iron.io/) worker to run /worker/cron/cron.js at choice intervals. Don't forget to update the `iron.json` and `cron.js` file in `/worker/cron` with your project details.

### Licence

MIT
