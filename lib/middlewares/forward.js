var request = require('../request');
var log = require('../log');
var Buffer = require('buffer').Buffer;

function _forwardHandler(err, data, proxyRes, res){
  if(err){
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(proxyRes.statusCode, proxyRes.headers);
  res.write(data);
  res.end();
}

/**
 * Forward the request directly
 */
function forward(){
  return function forward(req, res){
    var url  = request.processUrl(req);
    var options = {
      url: url,
      method: req.method,
      headers: req.headers
    };
    var buffers = [];

    log.debug('forward: ' + url);
    
    if(request.isContainBodyData(req.method)){
      req.on('data', function(chunk){
        buffers.push(chunk);
      });

      req.on('end', function(){
        options.data = Buffer.concat(buffers);
        request.request(options, function(err, data, proxyRes){
          _forwardHandler(err, data, proxyRes, res);
        });
      });
    }else{
      request.request(options, function(err, data, proxyRes){
        _forwardHandler(err, data, proxyRes, res);
      });
    }
  };
}

module.exports = forward;