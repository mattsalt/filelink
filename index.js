const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const os = require('os')

const express = require('express')
const compress = require('compression')
const bodyParser = require('body-parser')
const storage = require('node-persist')
const FileCleaner = require('cron-file-cleaner').FileCleaner
const fileUpload = require('express-fileupload')

process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const config = require('config');
const serverConfig = config.get('server')
const app = express()

const storageTime = 7 * 25 * 60 * 60 * 1000
console.log(process.env.NODE_ENV)

storage.initSync({
	ttl: storageTime,
        dir: __dirname + '/node-persist/'
})

let fileWatcher = new FileCleaner(path.join(serverConfig.fileDirectory), storageTime, '* */30 * * * *', {
  start: true
})

console.log(serverConfig)
app.set('port', (process.env.PORT || serverConfig.port || 3000))

app.use(compress())
app.use(bodyParser.json())
app.use(fileUpload())
app.use(express.static(path.join(__dirname, 'public')))

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.locals.pretty = true

app.get('/', (req, res, next) => {
  res.render('home.pug')
})

app.post('/upload', uploadFile)
app.get('/:token', getFile)


function uploadFile (req, res, next) {
  console.log('CALLED')
  let file = req.files.upload
  writeFileToDisk(file, (err, hash) => {
    if (err) {
      console.log('error')
      res.status(500).send('Server error - failed to store file')
    } else {
      res.status(200).json({sucess: true, link: 'http://' + os.hostname() + ':' + app.get('port') + '/' + hash})
    }
  })
}

const fileExtensionRegex = /(?:\.([^.]+))?$/

function writeFileToDisk (file, callBack) {
  var fileCopy = file
  let hash = getNextHash()

  while (storage.valuesWithKeyMatch(hash).length > 0) {
    hash = getNextHash()
  }

  console.log(fileCopy.hasOwnProperty('name'))
  console.log(fileCopy.name)
  let extension = fileExtensionRegex.exec(fileCopy.name)[1]

  fs.writeFile(path.join(serverConfig.fileDirectory, hash + '.' + extension), fileCopy.data, 'base64', (err) => {
    if (err) throw err
    storage.setItem(hash, hash + '.' + extension)
        .then(() => {
          console.log('Saved file: ' + fileCopy.name + ' with hash: ' + hash)
          callBack(null, hash)
        })
  })
}

function getNextHash () {
  return crypto.randomBytes(8).toString('base64')
}

function getFile (req, res, next) {
  let hash = req.params.token
  storage.getItem(hash)
    .then((fileName) => {
      if (fileName === undefined) {
        console.log(`No such file ${hash}`)
        res.status(501).send('No such file')
        return
      }
      console.log('Retrieving ' + fileName + ' from hash-' + hash)
      res.sendFile(path.join(serverConfig.fileDirectory, fileName))
    })
}

app.listen(app.get('port'))
console.log('Server started on port ' + app.get('port'))
module.exports = app
