"use strict";

/**

 Protocal utility object.

 This manages all requests to Domoticz.
 So if there is a change in Domoticz API, all modifications should only be done here.
 The rest of the application should be independent of the Domoticz API protocol.

 */

const url = require("url");

// const https  = require("https");
let http;
let httpOptions;
let username;
let password;

// what will be exported
const domoticzAPI = {};

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
domoticzAPI.setAccess = function ( domoURL ) {

    httpOptions = url.parse( domoURL );
    httpOptions.pathname = "json.htm";

    [username, password] = httpOptions.auth.split(":",2);
    httpOptions.auth = null;

    if (httpOptions.protocol === "https:") {
        // we are using https
        http = require("https");
        httpOptions.rejectUnauthorized = false;
    } else {
        // we are using http
        http = require("http");
    }

};


/**
 * Compose the option object that will be passed to http.get( options, callback )
 * @param query
 * @returns {*}
 */
function getHttpOptions(query) {

    // compose part after the ?
    httpOptions.search = "username=" + Buffer.from(username).toString("base64")
        + "&password=" + Buffer.from(password).toString("base64")
        + "&" + query;

    // complete url (for debug)
    httpOptions.href = httpOptions.protocol + "//" + httpOptions.hostname;
    if (httpOptions.port) httpOptions.href += ":" + httpOptions.port;
    httpOptions.href += "/" + httpOptions.pathname + "?" + httpOptions.search;

    // path (for http.get() )
    httpOptions.path = "/" + httpOptions.pathname + "?" + httpOptions.search;

    return httpOptions;
}


/**
 * we get the heater switches data (status, last update, ...)
 * @param {function} callback1 : the function that will be applied to each switch data
 * @param {function} callbackfinal : the function that will be applied once all switches have been processed
 */
domoticzAPI.getSwitchesInfo = function( callback1, callbackfinal ) {

    let switchesData = "";
    const httpOpts = getHttpOptions("type=devices&used=true&filter=light");

    http.get( httpOpts, function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( callback1 );

            callbackfinal();
        });
    }).on("error", function(err) {
        console.log( "Error getting switches info from Domoticz at URL:");
        console.log( "  " + httpOpts.href );
        console.log( "  with: "  + err);
        console.log( "  Please paste the URL in your web browser to check it is valid.");
    });

};


/**
 * we get all the temperature probes info (data, last update, ...)
 * @param {function} callback : will be call for each temperature probe
 */
domoticzAPI.getTemperatures = function( callback ) {

    let tempData = "";

    http.get( getHttpOptions("type=devices&used=true&filter=temp"), function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { tempData += data; });
        res.on("end",  function() {
            // console.log(body);
            tempData = JSON.parse(tempData);
            tempData.result.forEach( callback );
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
    http.get( getHttpOptions("type=command&param=switchlight&idx=" + deviceIdx + "&switchcmd=" + command));
};



module.exports = domoticzAPI;
