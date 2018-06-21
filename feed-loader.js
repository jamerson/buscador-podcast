const FeedParser = require('feedparser');
const request = require('request'); 
const fs = require('fs');
const moment = require('moment');

exports.load = (url, responseCallback, endCallback, errorCallback) => {

  const req = request(url)
  req.on('error', function (error) {
    errorCallback({ type: 'request error', error: error });
  });
  
  req.on('response', function (res) {
    const stream = this; // `this` is `req`, which is a stream
  
    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    }
    else {
      stream.pipe(feedparser);
    }
  });

  const startSyncTime = moment();
  const startDateFileName = 'start_date.txt';
  const feedparser = new FeedParser();

  let startDate = null;
  if(fs.existsSync(startDateFileName)) {
    startDate = moment(fs.readFileSync(startDateFileName, 'utf8').toString());
  }
  
  feedparser.on('error', function (error) {
    errorCallback({ type: 'parse error', error: error });
  });
  
  feedparser.on('readable', function () {
    // This is where the action is!
    const stream = this; // `this` is `feedparser`, which is a stream
    const meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
    let bulkItems = [];
    let item;

    while (item = stream.read()) {
      bulkItems.push(item);
    }

    bulkItems = bulkItems.filter((item) => {
      if(startDate) {
        let pudDate = moment(item.pubDate);
        return startDate.isBefore(pudDate);
      }
      return true;
    })

    if(bulkItems.length > 0) {
      responseCallback(bulkItems);
    }
  });

  feedparser.on('end', function () {
    fs.writeFileSync(startDateFileName, startSyncTime.format(), 'utf8');
    endCallback(); 
  });
};
