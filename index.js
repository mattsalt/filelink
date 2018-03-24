var express = require('express')
var compress = require('compression')
var bodyParser = require('body-parser')
var path = require('path')
var storage = require('node-persist');

const fileUpload = require('express-fileupload')

var fs = require('fs')
var app = express()

storage.initSync();

app.set('port', (process.env.PORT || 3000))

app.use(compress())
app.use(bodyParser.json())
app.use(fileUpload())
app.use(express.static(path.join(__dirname,'public')))

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')
app.locals.pretty = true

app.get('/', (req, res, next) => {
  res.render('home.pug')
})

app.post('/upload', uploadFile)
app.get('/:token', getFile)

const maxIntHash = 1000000000

function getNextHash () {
  return Math.floor((Math.random() * Math.floor(maxIntHash))).toString(36)
}


const re = /(?:\.([^.]+))?$/;

function writeFile (file, callBack) {
  let hash = getNextHash()

  let extension = re.exec(file.name)[1]
  fs.writeFile(path.join(__dirname, 'uploads',hash + extension), file.data, 'base64', (err) => {
    if (err) throw err
    console.log('The file has been saved!')
    storage.setItemSync(hash, hash + extension)
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
      res.status(200).json({sucess:true,link:'http://localhost:3000/' + hash})
    }
  })
}

function getFile (req, res, next) {
  let hash = req.params.token
  let fileName = storage.getItemSync(hash)
  console.log(fileName)
  res.sendFile(path.join(__dirname, 'uploads', fileName))
}

app.listen(app.get('port'))
module.exports = app
