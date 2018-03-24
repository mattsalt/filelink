var express = require('express')
var compress = require('compression')
var bodyParser = require('body-parser')
var path = require('path')
var storage = require('node-persist')
var FileCleaner = require('cron-file-cleaner').FileCleaner;
var crypto = require("crypto");
const fileUpload = require('express-fileupload')

var fs = require('fs')
var app = express()

storage.initSync({ttl: 7 * 24 * 60 * 60 * 1000})

app.set('port', (process.env.PORT || 3000))

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

const maxIntHash = 1000000000

function getNextHash() {
  return crypto.randomBytes(8).toString('base64');
}

const re = /(?:\.([^.]+))?$/

function writeFile (file, callBack) {
  var hashExists = true
  while(hashExists){
     var hash = getNextHash()
     var extension = re.exec(file.name)[1]
     var existing = storage.valuesWithKeyMatch(hash) 
     if(existing.length === 0){
        hashExists = false
     }
  }
  fs.writeFile(path.join(__dirname, 'uploads', hash + '.'+extension), file.data, 'base64', (err) => {
    if (err) throw err
    storage.setItemSync(hash, hash + '.' + extension)
    console.log('Saved file: ' + file.name + ' with hash: ' + hash)
    callBack(null, hash)
  })
}

function uploadFile (req, res, next) {
  let file = req.files.upload
  writeFile(file, (err, hash) => {
    if (err) {
      console.log('error')
      res.status(501).send('Bad Request')
    } else {
      res.status(200).json({sucess: true, link: 'http://localhost:3000/' + hash})
    }
  })
}

function getFile (req, res, next) {
  let hash = req.params.token
  let fileName = storage.getItemSync(hash)
  console.log('Retrieving ' + fileName + ' from hash-' + hash) 
  res.sendFile(path.join(__dirname, 'uploads', fileName))
}

var fileWatcher = new FileCleaner(path.join(__dirname, 'uploads'), 12 * 60 * 60 * 1000,  '* */30 * * * *', {
  start: true
});

app.listen(app.get('port'))
module.exports = app
