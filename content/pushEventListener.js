/* global self: false, JSON: false, WebSocket: false */
self.addEventListener('push', function(event) {
    var ws = new WebSocket('wss://localhost:9003', 'echo-protocol');
    this.send = function (message, callback) {
        this.waitForConnection(function () {
            ws.send(message);
            if (typeof callback !== 'undefined') {
                callback();
            }
        }, 1000);
    };

    this.waitForConnection = function (callback, interval) {
        if (ws.readyState === 1) {
            callback();
        } else {
            var that = this;
            // optional: implement backoff for interval here
            setTimeout(function () {
                that.waitForConnection(callback, interval);
            }, interval);
        }
    };
    this.send(JSON.stringify(event.data.json()));
});
