var proxy = require('./lib/pushKnot');
var argv = require('yargs').argv;

var port = argv.port || 9002;
var domain = argv.domain || false;

proxy(port, domain);