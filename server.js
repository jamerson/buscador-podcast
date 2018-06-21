const express = require("express")
const app = express()
const bodyParser = require('body-parser')
const feedLoader = require("./feed-loader")
const discovery = require("./discovery-proxy")

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get("/api/podcast", function (request, response) {
  const query = request.query.search
  discovery.search(query, (error, data) => {
    if(error) {
      console.error(error)
      return
    }
    response.send(data)
  })

  return
})

function addDocument(item) {
  return new Promise(function (fulfill, reject) {
    discovery.addDocument(item, (error, response) => {
      if(error) {
        error.item = item
        reject(error)
      } else fulfill(item)
    })
  })
}

//From: https://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
function MakeQuerablePromise(promise) {
  // Don't create a wrapper for promises that can already be queried.
  if (promise.isResolved) return promise;

  var isResolved = false;
  var isRejected = false;

  // Observe the promise, saving the fulfillment in a closure scope.
  var result = promise.then(
     function(v) { isResolved = true; return v; }, 
     function(e) { isRejected = true; throw e; });
  result.isFulfilled = function() { return isResolved || isRejected; };
  result.isResolved = function() { return isResolved; }
  result.isRejected = function() { return isRejected; }
  return result;
}

// function addDocuments(items, callback) {
//   let promises = []
//   let retryableItems = []
//   items.forEach((item) => {
//     promises.push(addDocument(item))  
//   })

//   Promise.all(promises).then(results => {
//     callback()
//   }, (reason) => {
//     if(reason.code === 429) {
//       //server is busy processing previous documents, wait and try again
//       addDocuments([], callback)
//     }
//   }).finally(()=>{
    
//   }).catch((error) => {
//     console.log(error);
//   })
// }

function addDocuments(items, callback) {
  let promises = []
  items.forEach(item => {
    // console.log('addDocument', item.title)
    promises.push(addDocument(item))  
  })

  let retryListItems = []
  Promise.all(promises).then(results => {
    callback()
  }, reason => {
    if(reason.code === 429) {
      //server is busy processing previous documents, wait and try again
      // console.log('retryListItems', reason.item.title)
      retryListItems.push(reason.item)
      setTimeout(() => {addDocuments(retryListItems, callback)}, 10000)
    }
  }).catch((error) => {
    console.error(error);
  })
}

function getFeedItems(url, callback) {
  feedLoader.load(url, (items) => {
    let promises = []
    promises.push(addDocuments(items, callback))
  },
  ()=>{},
  reason => {
    console.error(reason)
  })
}

app.post("/api/podcast/populate", function (request, response) {
  getFeedItems('http://feeds.feedburner.com/anticastdesign', () => response.end())
  return
})


//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port)
})
