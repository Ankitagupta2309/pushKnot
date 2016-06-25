/**
 * Created by jatinm on 05/01/16.
 */

var fs = require('fs');
var https = require('https');
var querystring = require('querystring');

describe('PUSH NOTIFICATIONS PushKnot Demo', function () {


    'use strict';

    // notification data
    var data = {
        title: 'SeConf2016',
        message: 'PushKnot by Ankita,Jatin',
        url: 'https://github.com/Ankitagupta2309/pushKnot'
    };
    var postData = querystring.stringify(data);
    var jsonData = null;

    var ptor = browser;
    browser.ignoreSynchronization = true;

    it('Open a test webpage', function () {
        ptor.get('http://jatinm.wingified.com/pushKnot/');
        browser.sleep(10000);
        expect(browser.getCurrentUrl()).toContain('pushKnot');
    });

    it('Wait for auto accept of chrome native Allow Block notification', function () {
        console.log('Accept');
        expect(element(by.css('button.pushcrew-chrome-style-notification-btn.pushcrew-btn-allow')).isDisplayed()).toBe(true);
        element(by.css('button.pushcrew-chrome-style-notification-btn.pushcrew-btn-allow')).click();
        browser.sleep(20000);//dirty sleep

    });

    it('Execute and trigger the push notification', function () {

// form data
//         var postData = querystring.stringify({
//             title: "Amy",
//             message: "Li",
//             url: "http://yahoo.com"
//         });

// request option

        expect(postData).toBeDefined(true);
        var options = {
            host: 'pushcrew.com',
            port: 443,
            method: 'POST',
            path: '/api/v1/send/all',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Authorization': 'key=ea56d8d09a2d01a7c4349988728fda4' // missing seven in the end linkin park
            }
        };

// request object
        var req = https.request(options, function (res) {
            var result = '';
            res.on('data', function (chunk) {
                result += chunk;
            });
            res.on('end', function () {
                console.log(result);
            });
            res.on('error', function (err) {
                console.log(err);
            })
        });

// req error
        req.on('error', function (err) {
            console.log(err);
        });

//send request with the postDsata form
        req.write(postData);
        req.end();
        browser.sleep(15000);
        expect(postData).toBeDefined(true);

    });

    it('Check and wait for response in json and assert the same', function () {
        fs.readFile('/Users/jatinm/pushData/pushKnot/content/response.json', 'utf8', function (err, data) {
            if (err) throw err;
            jsonData = JSON.parse(data);
            console.log("--------------Notification Information --------");
            console.log('Title=' + jsonData.title);
            var temp = jsonData.message ? jsonData.message : jsonData.msg;
            console.log('Message=' + temp);
            console.log('URL=' + jsonData.url);
            console.log("------------------------------------------------");
        });

        expect(true).toBe(true);
    });


    it('Wait statements so as data is fetched', function () {
        browser.sleep(8000);
        expect(true).toBe(true);
    });

    it('Assertions for notifications content', function () {
        expect(jsonData.title).toEqual(data.title);
        var temp = jsonData.message ? jsonData.message : jsonData.msg;
        expect(temp).toEqual(data.message);
        expect(jsonData.url).toEqual(data.url);
    });

});
