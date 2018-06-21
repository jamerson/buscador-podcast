const DiscoveryV1 = require('watson-developer-cloud/discovery/v1')
const cfenv = require("cfenv")

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
} catch (e) { 
  console.error(e)
}

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts)
const credentials = appEnv.services['discovery'][0].credentials

const discovery = new DiscoveryV1({
    username: credentials.username,
    password: credentials.password,
    version_date: '2018-03-05'
})

exports.addDocument = (document, callback) => {
  discovery.addDocument({ 
    environment_id: credentials.environment_id, 
    collection_id: credentials.collection_id, 
    file: JSON.stringify(document, null, 2),
    file_content_type: 'application/json'
  }, (error, data) => {
    callback(error, data)
  })
}

exports.search = (query, callback) => {
  discovery.query({
    environment_id: credentials.environment_id, 
    collection_id: credentials.collection_id,
    natural_language_query: query }, (error, data) => {
      callback(error, data)
    })
}

