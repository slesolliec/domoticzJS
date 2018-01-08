"use strict";

const https = require("http");
const fs = require("fs");

// loading configs
var configs = fs.readFileSync("configs.json");
configs = JSON.parse(configs);

// url of Domoticz JSON API protected by username / password
const url = configs.domoticz
    + "/json.htm"
    + "?username=" + Buffer.from( configs.username ).toString('base64')
    + "&password=" + Buffer.from( configs.password ).toString('base64')
    + "&type=devices&used=true&filter=temp";


// get temperatures from Domoticz
https.get(url, function(res) {
    res.setEncoding("utf8");
    let body = "";
    res.on("data", function(data) { body += data; });
    res.on("end",  function() {
        // console.log(body);
        body = JSON.parse(body);
        body.result.forEach( showTemp )
    });
});


const houseState = getState( new Date() );
console.log("houseState : " + houseState);

function showTemp (element) {
    console.log(
        'Temp ' + element.Temp + ' for ' + element.Name + ' with idx=' + element.idx
    );
}


// we get the state of the house: night, out, day, gone
function getState( now ) {

    // Gone?
    // todo: test if we are all gone

    // Night?
    if ((now.getHours() < 5 ) || (now.getHours() === 6)  && (now.getMinutes() < 30))
        return 'night';
    if ((now.getHours() > 22) || (now.getHours() === 22) && (now.getMinutes() > 30))
        return 'night';

    // Home day or Work day?
    switch ( now.getDay() ) {
        case 1:
        case 2:
            if ((now.getHours() > 7 ) || (now.getHours() === 7) && (now.getMinutes() > 30))
                if (now.getHours() < 17 )
                    return 'out';
            break;
    }

    return 'day';
}

function getWantedTemp( room, state) {

    if (state === 'gone')  return 12;
    if (state === 'out')   return 15;
    if (state === 'night') return 15;

    // only state left is day:
    switch (room) {
        case 'parents':
            return 17;

        case 'living':
            if ( new Date().getHours() < 12 ) {
                return 17;
            } else {
                return 18;
            }

        case 'kitchen':
            return 18;

        case 'bath':
            return 20;
    }

}

['parents','living','kitchen','bath'].forEach( function(item) {
    console.log( "Wanted temp is " + getWantedTemp(item,houseState) + " for "+ item);
});