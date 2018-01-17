"use strict";

// todo:    gone functionality
// todo:    upload to Google sheet

const https = require("http");
const fs    = require("fs");

// loading configs
const configs = JSON.parse( fs.readFileSync("configs.json") );

// loading state of the house
const state   = JSON.parse( fs.readFileSync("house_state.json"));
const lastStateUpdate = new Date(state.lastUpdate);

// setting current date
const now = new Date();
console.log('---- ' + now.getHours() + ':' + now.getMinutes() + ' ----');

const minSinceLastRun = Math.round( (now - lastStateUpdate) / 1000 / 60 );
// console.log(' Minutes since last run: ' + minSinceLastRun);

// get status of the house
const houseStatus = getState( now );
console.log("houseState : " + houseStatus);

// url of Domoticz JSON API protected by username / password
const url = configs.domoticz
    + "/json.htm"
    + "?username=" + new Buffer( configs.username ).toString('base64')
    + "&password=" + new Buffer( configs.password ).toString('base64');
// console.log(url);

let tempData      = '';
let switchesData  = '';
const heaters = {
    'Bed'    : '-',
    'Living' : '-',
    'Bath'   : '-',
    'Kitchen': '-'
};

// gives the idx of certain devices
const devices = {
    'TC1B1': 20,
    'TC1B2': 29,
    'TC1B3': 25
};

getSwitchesStatus();



// get switch states from Domoticz
function getSwitchesStatus() {
    https.get(url + '&type=devices&used=true&filter=light', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            // console.log(switchesData);
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( function (mySwitch) {
                let room = mySwitch.Name.replace('Heater','');
                heaters[room] = mySwitch.Data;
                // console.log( mySwitch.Name + ' is ' + mySwitch.Data + ' ( idx = ' + mySwitch.idx + ')'  );

                // conso metering
                switch ( room ) {
                    case 'Bed':
                    case 'Kitchen':
                    case 'Living':
                        if (mySwitch.Data === 'Off') {
                            state[room][getHCHP( now )] += minSinceLastRun;
                        }
                        break;
                    case 'Bath':
                        if (mySwitch.Data === 'On') {
                            state[room][getHCHP( now )] += minSinceLastRun;
                        }
                        break;
                }

                // we switch off the buttons after two hours
                if (mySwitch.Name.substr(0,4) === 'TC1B') {
                    if (mySwitch.Data === 'On') {
                        let lastUpdate = new Date(mySwitch.LastUpdate);
                        let lastUpdateInMinutes = Math.round( (now - lastUpdate) / 1000 / 60 );
                        // console.log("Remote Control Button " + mySwitch.Name + " clicked " + lastUpdateInMinutes + " minutes ago");
                        if (lastUpdateInMinutes > 120) {
                            // we switch off the remote control button
                            https.get(url + '&type=command&param=switchlight&idx=' + devices[mySwitch.Name] + '&switchcmd=Off');
                            console.log("Shut down Remote Control Button " + mySwitch.Name + " after 2 hours");
                        }
                    }
                }

            });

            // update last update
            state.lastUpdate = now.toISOString();
            fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
            console.log( state );

            getTemperatures();
        });
    });
}

function getTemperatures() {
// get temperatures from Domoticz
    https.get(url + '&type=devices&used=true&filter=temp', function(res) {
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
    let room       = thermometer.Name.substring(4);
    let wantedTemp = getWantedTemp(room, houseStatus);

    if (thermometer.Temp < wantedTemp) {
        console.log( constantLength( room ) + " is cold: " + thermometer.Temp + '/' + wantedTemp );
        if ( room === 'Bath' ) {
            if ( heaters[room] === 'Off')   switchOn( room );
        } else {
            if ( heaters[room] === 'On')    switchOn( room );
        }

    } else if (thermometer.Temp > wantedTemp) {
        console.log( constantLength( room ) + " is hot : " + thermometer.Temp + '/' + wantedTemp);
        if ( room === 'Bath' ) {
            if ( heaters[room] === 'On')    switchOff( room );
        } else {
            if ( heaters[room] === 'Off')   switchOff( room );
        }
    } else {
        console.log( constantLength( room ) + " is ok  : " + thermometer.Temp + '/' + wantedTemp);
    }

    // resend command every quarter if necessary
    if (now.getMinutes() % 15 === 0) {
        if (thermometer.Temp < wantedTemp - 0.25) {
            if ( room === 'Bath' ) {
                if ( heaters[room] === 'On')   switchOn( room );
            } else {
                if ( heaters[room] === 'Off')  switchOn( room );
            }
        } else if (thermometer.Temp > wantedTemp + 0.25) {
            if ( room === 'Bath' ) {
                if ( heaters[room] === 'Off')  switchOff( room );
            } else {
                if ( heaters[room] === 'On')   switchOff( room );
            }
        }
    }

}


function constantLength ( str ) {
    let size = str.length;
    for ( let i = size ; i < 7 ; i++) {
        str += ' ';
    }
    return str;
}


function switchOn( room ) {
    console.log( now.getHours() + ':' + now.getMinutes() + " Switch " + room + " ON");

    switch ( room ) {
        case 'Bed':
            https.get(url + '&type=command&param=switchlight&idx=3&switchcmd=Off');
            break;
        case 'Kitchen':
            https.get(url + '&type=command&param=switchlight&idx=30&switchcmd=Off');
            https.get(url + '&type=command&param=switchlight&idx=36&switchcmd=On');
            break;
        case 'Living':
            https.get(url + '&type=command&param=switchlight&idx=12&switchcmd=Off');
            https.get(url + '&type=command&param=switchlight&idx=13&switchcmd=Off');
            https.get(url + '&type=command&param=switchlight&idx=37&switchcmd=Off');
            break;
        case 'Bath':
            https.get(url + '&type=command&param=switchlight&idx=39&switchcmd=On');
            break;
    }

}


function switchOff( room ) {
    console.log( now.getHours() + ':' + now.getMinutes() + " Switch " + room + " OFF");

    switch (room) {
        case 'Bed':
            https.get(url + '&type=command&param=switchlight&idx=3&switchcmd=On');
            break;
        case 'Kitchen':
            https.get(url + '&type=command&param=switchlight&idx=30&switchcmd=On');
            https.get(url + '&type=command&param=switchlight&idx=36&switchcmd=Off');
            break;
        case 'Living':
            https.get(url + '&type=command&param=switchlight&idx=12&switchcmd=On');
            https.get(url + '&type=command&param=switchlight&idx=13&switchcmd=On');
            https.get(url + '&type=command&param=switchlight&idx=37&switchcmd=On');
            break;
        case 'Bath':
            https.get(url + '&type=command&param=switchlight&idx=39&switchcmd=Off');
            break;
    }

}



// we get the state of the house: night, out, day, gone
function getState( now ) {

    // Gone?
    // todo: test if we are all gone

    // Home day or Work day?
    switch ( now.getDay() ) {
        case 1:
        case 2:
        case 4:
            // working days
            if ((now.getHours() < 5 ) || (now.getHours() > 21) || (now.getHours() === 21) && (now.getMinutes() > 30))
                return 'night';

            if ((now.getHours() > 7 ) || (now.getHours() === 7) && (now.getMinutes() > 30))
                if (now.getHours() < 17 )
                    return 'out';
            break;

        case 3:
        case 5:
            // normal day: heat from 5:30 to 22:00
            if ((now.getHours() < 5 ) || (now.getHours() === 5 ) && (now.getMinutes() > 30 ) || (now.getHours() > 21))
                return 'night';
            break;

        default:
            // week-end:   heat from 8:00 to 22:00
            if ((now.getHours() < 8 ) || (now.getHours() > 21))
                return 'night';
    }

    return 'day';
}

// Heures Pleines ou Heures Creuses?
// This is a French specific parameter to some electricity subscription: from 22:30 to 06:30, power is cheaper
function getHCHP ( date ) {
    if ( date.getHours() < 6)   return 'HC';
    if ( (date.getHours() === 6)  && (date.getMinutes() < 30) ) return 'HC';
    if ( (date.getHours() === 22) && (date.getMinutes() > 29) ) return 'HC';
    if ( date.getHours() > 22 ) return 'HC';

    return 'HP';
}


function getWantedTemp( room, state) {
    let wanted = getBaseWantedTemp( room, state);

    // add some warmth with Remote Control
    switch ( room ) {
        case 'Kitchen':  if (heaters.TC1B1 === 'On')   wanted += 1;   break;
        case 'Living' :  if (heaters.TC1B2 === 'On')   wanted += 1;   break;
        case 'Bed'    :  if (heaters.TC1B3 === 'On')   wanted += 2;   break;
    }

    // special case of Bathroom: heat from 4:30 during the week, switch off at 21:00
    if (room === 'Bath') {
        if ( now.getDay() < 6 && now.getDay() > 0 ) {
            if ( now.getHours() === 4 && now.getMinutes() > 30 )    return 21;
            if ( now.getHours() === 21 )                            return 15;
        }
    }

    return wanted;
}


function getBaseWantedTemp ( room, state ) {

    if (state === 'gone')  return 12;
    if (state === 'out')   return 15;
    if (state === 'night') return 15;

    // only state left is day:
    switch (room) {
        case 'Bed':      return 17;
        case 'Kitchen':  return 18;
        case 'Bath':     return 21;

        case 'Living':
            if ( now.getHours() < 12 ) {
                return 17;
            } else {
                return 18;
            }
    }
}
