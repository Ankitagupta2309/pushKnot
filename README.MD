![logo](http://jatinm.wingified.com/pushKnot/images/pks2.png) 
# PushKnot

A proxy tool specialized in file replacing for push Notifications

### Installation

    npm install

### Usage

    node start.js --domain=<yourDomain>

This will start a proxy server at port 9002 by default.(This can be changed if your existing system is using this port for any other service)
Set your browser's proxy to 127.0.0.1:port(9002 by default)

### More Options
node pushKnot.js [options]

     --port [port]  Specify the port nproxy will listen on(9002 by default)
     --domain [domain] Specify the service worker domain. The proxy will only modify these requests.

### Steps For integrating with Automation

1. Start a chrome browser with --ignore-certificate-errors flag
2. Start pushKnot node start.js --domain= <yourDomain>
3. Trigger the notification
4. The push notification response will be captured under pushKnot/content/response.json
