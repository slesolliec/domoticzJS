/**

 This manages all requests to Domoticz.
 So if there is a change in Domoticz API, all modifications should only be done here.
 The rest of the application should be independent of the Domoticz API protocol.

 */

const https  = require("http");
let url      = '';
let domoticzUrl;
let username;
let password;


function setAccess( domourl, user, pwd ) {
    domoticzUrl = domourl;
    username    = user;
    password    = pwd;
}


function getUrl() {

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
 *
 * @param {function} callback : the function that will be applied to each switch data
 * @param {function} callbackfinal : the function that will be applied once all switches have been processed
 */
function getSwitchesInfo( callback, callbackfinal ) {

    let switchesData = '';

    https.get( getUrl() + '&type=devices&used=true&filter=light', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( callback );

            callbackfinal();
        });
    });

}


function getTemperatures( callback ) {

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

}




module.exports = {
    setAccess,
    getSwitchesInfo,
    getTemperatures
};
