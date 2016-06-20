var http = require('http');
var https = require('https');
var net = require('net');
var connect = require('connect');
var fs = require('fs');
var path = require('path');
var log = require('./log');
var utils = require('./utils');
var url = require('url');

var DEFAULT_PORT = 9002;
var INTERNAL_HTTPS_PORT = 0;
var app;
var httpServer;
var httpsServer;
var privateKeyFile = path.join(__dirname, '..', 'keys', 'privatekey.pem');
var certificateFile = path.join(__dirname, '..', 'keys', 'certificate.pem');

/**
 * Start up proxy server on the specified port
 * and combine the processors defined as connect middlewares into it.
 * 
 * @param {String} port the port proxy server will listen on
 * @param {Object} options options for the middlewares
 */
function proxy(port, options){
  var ps = require('./middlewares/index'); //proxy middles
  port = typeof port === 'number' ? port : DEFAULT_PORT;
  app = connect();
  app.use(ps.respond());
  app.use(ps.forward());

  httpServer = http.createServer(function(req, res){
    req.type = 'http';
    app(req, res);
  }).listen(port);

  httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyFile),
    cert: fs.readFileSync(certificateFile)
  }, function(req, res) {
    req.type = 'https';
    app(req, res);
  });

  httpsServer.on('listening', function(){
    INTERNAL_HTTPS_PORT = httpsServer.address().port;
  });
  httpsServer = httpsServer.listen(INTERNAL_HTTPS_PORT);

  proxyHttps();

  log.info('Proxy started on ' + port + '!');
  
  return {
    httpServer: httpServer,
    httpsServer: httpsServer
  };
}


/**
 * Listen the CONNECTION method and forward the https request to internal https server
 */
function proxyHttps(){
  httpServer.on('connect', function(req, socket, upgradeHead){
    var serverUrl = url.parse('https://' + req.url);
    var netClient = net.createConnection(INTERNAL_HTTPS_PORT);
    //Reverse proxy for rest of the urls
    if (req.url.indexOf('ankitagupta') == -1) {
    // if (true) {
      console.log('Receiving reverse proxy request for:' + req.url);
      var srvSocket = net.connect(serverUrl.port, serverUrl.hostname, function () {
        socket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node-Proxy\r\n' +
            '\r\n');
        srvSocket.pipe(socket);
        socket.pipe(srvSocket);
      });
    }
    else {
      netClient.on('connect', function () {
        log.info('connect to https server successfully!');
        socket.write("HTTP/1.1 200 Connection established\r\nProxy-agent: Netscape-Proxy/1.1\r\n\r\n");
      });


      socket.on('data', function (chunk) {
        netClient.write(chunk);
      });
      socket.on('end', function () {
        netClient.end();
      });
      socket.on('close', function () {
        netClient.end();
      });
      socket.on('error', function (err) {
        log.error('socket error ' + err.message);
        netClient.end();
      });
      netClient.on('data', function (chunk) {
        socket.write(chunk);
      });
      netClient.on('end', function () {
        socket.end();
      });
      netClient.on('close', function () {
        socket.end();
      });
      netClient.on('error', function (err) {
        log.error('netClient error ' + err.message);
        socket.end();
      });
    }
  });
};

process.on('uncaughtException', function(err){
  log.error('uncaughtException: ' + err.message);
});

module.exports = proxy;
