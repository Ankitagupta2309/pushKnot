var proxy = require('./lib/pushKnot');

var options = {
    timeout: 10,
    debug: true
}

var port = 9002;
proxy(port, options )