"use strict";

/**

 Protocal utility object.

 This manages all requests to Domoticz.
 So if there is a change in Domoticz API, all modifications should only be done here.
 The rest of the application should be independent of the Domoticz API protocol.

 */

const https  = require("http");

const domoticzAPI = {};

let url      = '';
let domoticzUrl;
let username;
let password;


/**
 * my stupide console.log wrapper
 * @param {string} msg ; the message that will be logged
 */
function say( msg ) {
    console.log("     " + msg);
}


/**
 * this must be called once before all the other request
 * @param domourl
 * @param user
 * @param pwd
 */
domoticzAPI.setAccess = function ( domourl, user, pwd ) {
    domoticzUrl = domourl;
    username    = user;
    password    = pwd;
};


/**
 * we compute the url to call for accessing Domoticz
 * @returns {string}
 */
function getUrl() {

    // we compute this only once
    if ( url === '') {
        // url of Domoticz JSON API protected by username / password
        url = domoticzUrl
            + "/json.htm"
            + "?username=" + new Buffer( username ).toString('base64')
            + "&password=" + new Buffer( password ).toString('base64');
    }

    return url;
}


/**
 * we get the heater switches data (status, last update, ...)
 * @param {function} callback1 : the function that will be applied to each switch data
 * @param {function} callbackfinal : the function that will be applied once all switches have been processed
 */
domoticzAPI.getSwitchesInfo = function( callback1, callbackfinal ) {

    let switchesData = '';

    https.get( getUrl() + '&type=devices&used=true&filter=light', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( callback1 );

            callbackfinal();
        });
    });

};


/**
 * we get all the temperature probes info (data, last update, ...)
 * @param {function} callback : will be call for each temperature probe
 */
domoticzAPI.getTemperatures = function( callback ) {

    let tempData = '';

    https.get( getUrl() + '&type=devices&used=true&filter=temp', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { tempData += data; });
        res.on("end",  function() {
            // console.log(body);
            tempData = JSON.parse(tempData);
            tempData.result.forEach( callback )
        });
  });

};


/**
 * send a switch command to a heater switch
 * @param {number} deviceIdx : id of the switch (in Domoticz's database)
 * @param {string} command : On or Off
 */
domoticzAPI.switchDevice = function( deviceIdx, command ) {
    // say( "Switch device " + deviceIdx + " " + command);
    https.get( getUrl() + '&type=command&param=switchlight&idx=' + deviceIdx + '&switchcmd=' + command);
};



module.exports = domoticzAPI;
