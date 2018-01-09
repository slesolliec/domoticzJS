"use strict";

const https = require("http");
const fs = require("fs");

// loading configs
var configs = fs.readFileSync("configs.json");
configs = JSON.parse(configs);

const houseState = getState( new Date() );
console.log("houseState : " + houseState);

// url of Domoticz JSON API protected by username / password
const url = configs.domoticz
    + "/json.htm"
    + "?username=" + Buffer( configs.username ).toString('base64')
    + "&password=" + Buffer( configs.password ).toString('base64')
    + "&type=devices&used=true";
// console.log(url);

var tempData      = '';
var switchesData  = '';
var heaters = {
    'parents': '-',
    'living' : '-',
    'bath'   : '-',
    'kitchen': '-'
};

getSwitchesStatus();



// get switch states from Domoticz
function getSwitchesStatus() {
    https.get(url + '&filter=light', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            // console.log(switchesData);
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( function (mySwitch) {
                 var room = mySwitch.Name.substring(6);

                 if (room === 'Parents') heaters.parents = mySwitch.Data;

                console.log( mySwitch.Name + ' is ' + mySwitch.Data + ' (idx=' + mySwitch.idx + ')'  );
            });
            console.log('-----------------');
            getTemperatures();
        });
    });
}

function getTemperatures() {
// get temperatures from Domoticz
    https.get(url + '&filter=temp', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { tempData += data; });
        res.on("end",  function() {
            // console.log(body);
            tempData = JSON.parse(tempData);
            tempData.result.forEach( manageHeater )
        });
    });
}






function manageHeater (thermometer) {
    var room = thermometer.Name.substring(4);
    var wantedTemp = getWantedTemp(room, houseState);

    if (thermometer.Temp < wantedTemp) {
        console.log( room + " is cold: " + thermometer.Temp + '/' + wantedTemp );

        if ( heaters[room] === 'On') {
            // switch parent ON
            console.log("Switch "+room+" ON");
        }
    }


    if (thermometer.Temp > wantedTemp) {
        console.log( room + " is  hot: " + thermometer.Temp + '/' + wantedTemp);

        if ( heaters[room] === 'Off') {
            // switch parent OFF
            switchOn(room);
        }
    }

}


function switchOn( room ) {
    console.log("Switch " + room + " OFF");

    

}



// we get the state of the house: night, out, day, gone
function getState( now ) {

    // Gone?
    // todo: test if we are all gone

    // Home day or Work day?
    switch ( now.getDay() ) {
        case 1:
        case 2:
            // working days
            if ((now.getHours() < 5 ) || (now.getHours() > 21) || (now.getHours() === 21) && (now.getMinutes() > 30))
                return 'night';

            if ((now.getHours() > 7 ) || (now.getHours() === 7) && (now.getMinutes() > 30))
                if (now.getHours() < 17 )
                    return 'out';
            break;

        default:
            // normal day
            if ((now.getHours() < 8 ) || (now.getHours() > 21))
                return 'night';
    }

    return 'day';
}


function getWantedTemp( room, state) {

    if (state === 'gone')  return 12;
    if (state === 'out')   return 15;
    if (state === 'night') return 15;

    // only state left is day:
    switch (room) {
        case 'parents':  return 17;
        case 'kitchen':  return 18;
        case 'bath':     return 19;

        case 'living':
            if ( new Date().getHours() < 12 ) {
                return 17;
            } else {
                return 18;
            }
    }
}


