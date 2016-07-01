var http = require('http');
var https = require('https');
var net = require('net');
var connect = require('connect');
var fs = require('fs');
var path = require('path');
var log = require('./log');
var url = require('url');

var INTERNAL_HTTPS_PORT = 0;
var WEB_SOCKET_PORT= 9003;
var app;
var httpServer;
var httpsServer;
var wsServer;
var socketServer;
var privateKeyFile = path.join(__dirname, '..', 'keys', 'privatekey.pem');
var certificateFile = path.join(__dirname, '..', 'keys', 'certificate.pem');
var responseFilePath = path.join(__dirname, '..', 'content', 'response.json');

/**
 * Listen the CONNECTION method and forward the https request to internal https server
 */
function proxyHttps(domain){
  httpServer.on('connect', function(req, socket){
    var serverUrl = url.parse('https://' + req.url);
    var netClient = net.createConnection(INTERNAL_HTTPS_PORT);
    //Reverse proxy for rest of the urls
    if (domain && req.url.indexOf(domain) === -1) {
      log.debug('Receiving reverse proxy request for:' + req.url);
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
        log.info('connect to https server successfully for url ' + req.url);
        socket.write('HTTP/1.1 200 Connection established\r\nProxy-agent: Netscape-Proxy/1.1\r\n\r\n');
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
}

/**
 * Start up proxy server on the specified port
 * and combine the processors defined as connect middlewares into it.
 * 
 * @param {String} port the port proxy server will listen on
 * @param {String} Proxy request for this domain
 */
function proxy(port, domain){
  var ps = require('./middlewares/index'); //proxy middles

  // remove content/response.json
  fs.exists(responseFilePath , function(exists) {
    if(exists) {
      log.debug('Removing exisitng response.json');
      fs.unlink(responseFilePath);
    }
  });

  app = connect();
  app.use(ps.respond());
  app.use(ps.forward());
  log.debug('Domain: ' + domain);
  log.debug('Port: ' + port);
  // Socket server for capturing response send from service worker.js
  socketServer  = https.createServer({
    key: fs.readFileSync(privateKeyFile),
    cert: fs.readFileSync(certificateFile)
  }, function(req, res) {
    req.type = 'https';
    log.debug((new Date()) + ' Received request for ' + req.url);
    res.writeHead(404);
    res.end();
  });
  socketServer.listen(WEB_SOCKET_PORT, function() {
    log.info((new Date()) + ' Socket Server is listening on port ' + WEB_SOCKET_PORT);
  });
  var WebSocketServer = require('websocket').server;
  wsServer = new WebSocketServer({
    httpServer: socketServer,
    autoAcceptConnections: false
  });
  
  wsServer.on('request', function(request) {
    var connection = request.accept('echo-protocol', request.origin);
    log.info((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
      var jsonFileContents = [];
      // read exisitng file and add contents to it
        if (fs.existsSync(responseFilePath)) {
          var data = fs.readFileSync(responseFilePath, {encoding : 'utf8'});
          try {
            jsonFileContents = JSON.parse(data);
          }
          catch(e)
          {
            log.debug('Error while parsing response.json');
          }
          log.debug('Exisitng contents: ' + jsonFileContents);
        }
        jsonFileContents.push(message.utf8Data);
        log.debug('new Notification : ' + message.utf8Data);
        fs.writeFileSync(responseFilePath, JSON.stringify(jsonFileContents), {encoding : 'utf8'});
    });
  });

  // Proxy servers
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

  proxyHttps(domain);

  log.info((new Date()) + ' Proxy Server is listening on port ' + port);
  return {
    httpServer: httpServer,
    httpsServer: httpsServer
  };
}

process.on('uncaughtException', function(err){
  log.error('uncaughtException: ' + err.message);
});

module.exports = proxy;
