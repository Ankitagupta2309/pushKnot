var constants = require('constants');
var http = require('http');
var https = require('https');
var Buffer = require('buffer').Buffer;
var url = require('url');
var log = require('./log');

http.globalAgent.maxSockets = 25;
https.globalAgent.maxSockets = 25;

var req = {
  /**
   * Process url with valid format especially in https cases
   * in which, req.url doesn't include protocol and host
   *
   * @param {Object} req
   */
  processUrl: function(req){
    var hostArr = req.headers.host.split(':');
    var hostname = hostArr[0];
    var port = hostArr[1];

    var parsedUrl = url.parse(req.url, true);

    parsedUrl.protocol = parsedUrl.protocol || req.type + ':';
    parsedUrl.hostname = parsedUrl.hostname || hostname;

    if(!parsedUrl.port && port){
      parsedUrl.port = port;
    }

    return url.format(parsedUrl);
  },

  /**
   * Simple wrapper for the default http.request
   *
   * @param {Object} options options about url, method and headers
   * @param {Function} callback callback to handle the response object
   */
  request: function(options, callback){
    var requestUrl;
    var requestMethod;
    var requestHeaders;
    var requestHandler;
    var requestOptions;
    var request;
    var sender;
    var requestTimeout;
    var responseTimeout;
    var buffers;

    if(typeof callback !== 'function'){
      log.error('No callback specified!');
      return;
    }

    requestHandler = callback;

    if(typeof options !== 'object'){
      requestHandler(new Error('No options specified!'));
      return;
    }

    requestUrl = options.url;

    if(typeof requestUrl === 'undefined'){
      requestHandler(new Error('No url specified!'));
      return;
    }

    try{
      requestUrl = url.parse(requestUrl);
    }catch(e){
      requestHandler(new Error('Invalid url'));
      return;
    }

    requestMethod = options.method || 'GET';
    requestHeaders = options.headers;

    requestOptions = {
      hostname: requestUrl.hostname || 'localhost',
      port: requestUrl.port || (requestUrl.protocol === 'https:' ? 443 : 80),
      method: requestMethod,
      path: requestUrl.path,
      rejectUnauthorized: false,
      /* jshint camelcase: false */
      secureOptions: constants.SSL_OP_NO_TLSv1_2 // degrade the SSL version as v0.8.x used
    };

    if(typeof requestHeaders === 'object'){
      requestOptions.headers = requestHeaders;
    }

    sender = requestUrl.protocol === 'https:' ? https : http;

    requestTimeout = setTimeout(function(){
      log.error('Request timeout for ' + options.url);
      requestTimeout = null;
      request.abort();
      requestHandler(new Error('Request Timtout'));
    }, req.reqTimeout);

    log.debug('Send ' + requestMethod + ' for ' + options.url + ' at ' + new Date());
    request = sender.request(requestOptions, function(res){
      log.debug('Finish ' + requestMethod + ' the request for ' + options.url + ' at ' + new Date());

      clearTimeout(requestTimeout);
      responseTimeout = setTimeout(function(){
        log.error('Response timeout for ' + requestMethod + ' ' + options.url);
        responseTimeout = null;
        request.abort();
        requestHandler(new Error('Response timeout'));
      }, req.resTimeout);

      buffers = [];
      res.on('data', function(chunk){
        buffers.push(chunk);
      });

      res.on('end', function(){
        log.debug('Get the response of ' + requestMethod + ' ' + options.url + ' at ' + new Date());
        if(responseTimeout){
          clearTimeout(responseTimeout);
        }
        requestHandler(null, Buffer.concat(buffers), res);
      });
    });

    if(req.isContainBodyData(requestMethod)){
      request.write(options.data);
    }

    request.on('error', function(err){
      log.error('url: ' + options.url);
      log.error('msg: ' + err.message);

      if(requestTimeout){
        clearTimeout(requestTimeout);
      }

      requestHandler(err);
    });

    request.end();
  },

  /**
   * Does the HTTP request contain body data
   *
   * @param {String} HTTP method token
   *
   * @return {Boolean}
   */
  isContainBodyData: function(method){
    if (!method){
      return false;
    }

    var whiteList = ['POST', 'PUT'];
    return whiteList.some(function(i){
      return i === method;
    });
  }
};

var reqTimeout = 10 * 1000;
Object.defineProperty(req, 'reqTimeout', {
  set: function(v){
    reqTimeout = v * 1000;
  },
  get: function(){
    return reqTimeout;
  }
});

var resTimeout = 10 * 1000;
Object.defineProperty(req, 'resTimeout', {
  set: function(v){
    resTimeout = v * 1000;
  },
  get: function(){
    return resTimeout;
  }
});

module.exports = req;