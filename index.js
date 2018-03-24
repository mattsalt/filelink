const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const express = require('express')
const compress = require('compression')
const bodyParser = require('body-parser')
const storage = require('node-persist')
const FileCleaner = require('cron-file-cleaner').FileCleaner
const fileUpload = require('express-fileupload')

const app = express()

const storageTime = 7 * 25 * 60 * 60 * 1000

storage.initSync({ttl: storageTime})

let fileWatcher = new FileCleaner(path.join(__dirname, 'uploads'), storageTime, '* */30 * * * *', {
  start: true
})

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


function uploadFile (req, res, next) {
  let file = req.files.upload
  writeFile(file, (err, hash) => {
    if (err) {
      console.log('error')
      res.status(500).send('Server error - failed to store file')
    } else {
      res.status(200).json({sucess: true, link: 'http://localhost:3000/' + hash})
    }
  })
}

const fileExtensionRegex = /(?:\.([^.]+))?$/

function writeFile (file, callBack) {
  let hash = getNextHash()
  while (storage.valuesWithKeyMatch(hash).length > 0) {
    hash = getNextHash()
  }

  const extension = fileExtensionRegex.exec(file.name)[1]

  fs.writeFile(path.join(__dirname, 'uploads', hash + '.' + extension), file.data, 'base64', (err) => {
    if (err) throw err
    storage.setItem(hash, hash + '.' + extension)
        .then(() => {
          console.log('Saved file: ' + file.name + ' with hash: ' + hash)
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
      res.sendFile(path.join(__dirname, 'uploads', fileName))
    })
}

app.listen(app.get('port'))
module.exports = app
