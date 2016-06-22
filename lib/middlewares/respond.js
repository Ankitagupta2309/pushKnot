var fs = require('fs'),
    https = require('https'),
    stream = require('stream'),
    path = require('path'),
    log = require('../log');

function request(url, res) {
  https.get(url, function (response) {
    var data = '';
    response.on('data', function (chunk) {
      data += chunk.toString('utf8');
    });

    response.on('end', function () {
      log.debug('Modified Request for URL ' + url);
      var pushData = fs.readFileSync(path.join(__dirname, '..', '..', 'content', 'pushEventListener.js'), 'utf8');
      data += pushData;
      log.debug('Data added: ' + data.length);
      log.debug('Data added: ' + data);
      res.statusCode = 200;
      res.setHeader('Content-Length', data.length);
      res.setHeader('Content-Type', 'text/javascript');
      var s = new stream.Readable();
      s._read = function noop() {}; // redundant? see update below
      s.pipe(res);
      s.push(data);
    });
  });
}

function respond() {
  return function respond(req, res, next) {
    var url = req.type + '://' + req.socket.servername + req.url;
    if(url.match(/^https:.*(worker|sw).*js($|\?)/)) {
      request(url, res);
    }
    else {
      next();
    }
  };
}

module.exports = respond;