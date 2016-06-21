var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    stream = require('stream'),
    path = require('path');

function respond() {
  return function respond(req, res, next) {
    var url = req.type + '://' + req.socket.servername + req.url;
    if(url.match(/^https:.*(worker|sw).*js$/)) {
      request(url, res);
    }
    else {
      next();
    }
  }
}

function request(url, res) {
  https.get(url, function (response) {
    var data = '';
    response.on('data', function (chunk) {
      data += chunk.toString('utf8');
    });

    response.on('end', function () {
      var pushData = fs.readFileSync(path.join(__dirname, '..', '..', 'content', 'pushEventListner.js'), 'utf8');
      data += pushData;
      data += pushData;
      res.statusCode = 200;
      res.setHeader('Content-Length', data.length);
      res.setHeader('Content-Type', 'text/javascript');
      var s = new stream.Readable();
      s._read = function noop() {}; // redundant? see update below
      s.push(data);
      s.pipe(res)
    });
  });
}

module.exports = respond;