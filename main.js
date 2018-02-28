"use strict";

const https = require("http");
const fs    = require("fs");

require("./datetime-helpers.js");

// loading configs
const configs = JSON.parse( fs.readFileSync("configs.json") );

// loading state of the house
const state   = JSON.parse( fs.readFileSync(configs.root + "house_state.json"));
const lastStateUpdate = new Date(state.lastUpdate);
const goneUntil = new Date(state.goneUntil);

// setting current date
const now = new Date();
console.log('---- ' + now.getHours() + ':' + now.getMinutes() + ' ----');

const minSinceLastRun = Math.round( (now - lastStateUpdate) / 1000 / 60 );
// console.log(' Minutes since last run: ' + minSinceLastRun);

// get status of the house
const houseStatus = getState( now );
console.log("houseState : " + houseStatus);

// we exit if we cannot load wanted temperatures
if ( ! fs.existsSync( configs.root + 'wantedTemps/' + now.stringDate8() + '.json'))
    return;
const wantedTemps = JSON.parse( fs.readFileSync( configs.root + 'wantedTemps/' + now.stringDate8() + '.json'));


// url of Domoticz JSON API protected by username / password
const url = configs.domoticz
    + "/json.htm"
    + "?username=" + new Buffer( configs.username ).toString('base64')
    + "&password=" + new Buffer( configs.password ).toString('base64');
// console.log(url);

let tempData      = '';   // this stores the temperatures
let switchesData  = '';   // this stores the switches states

// data for all the heaters
const heaters = {
    'Bed'    : '-',
    'Living' : '-',
    'Bath'   : '-',
    'Kitchen': '-'
};

// gives the idx of certain devices so we can send the commands to the right device
const devices = {
    'TC1B1': 20,
    'TC1B2': 29,
    'TC1B3': 25
};

// this does it all
getSwitchesStatus();

// here the main flow is finished.
// all that follows is just function definitions



// 1. get switch states from Domoticz
// 2. from that, put the heater states into heater
// 3. compute the number of minutes of power on
// remark: for all heater whose chacon module is plugged to the pilot thread, Off = heater is on
// only the Bathroom has On = heater is on
// 4. we send the switch commands to Domoticz
function getSwitchesStatus() {
    //get the light/switches data
    https.get(url + '&type=devices&used=true&filter=light', function(res) {
        res.setEncoding("utf8");
        res.on("data", function(data) { switchesData += data; });
        res.on("end",  function() {
            // console.log(switchesData);
            switchesData = JSON.parse(switchesData);
            switchesData.result.forEach( function (mySwitch) {
                // for each switch we read the state
                let room = mySwitch.Name.replace('Heater','');
                heaters[room] = mySwitch.Data;
                // console.log( mySwitch.Name + ' is ' + mySwitch.Data + ' ( idx = ' + mySwitch.idx + ')'  );

                // we add the number of minutes each heater has been on (in state)
                switch ( room ) {
                    case 'Bed':
                    case 'Living':
                        if (mySwitch.Data === 'Off') {
                            state[room][getHCHP( now )] += minSinceLastRun;
                        }
                        break;
                    case 'Bath':
                    case 'Kitchen':
                        if (mySwitch.Data === 'On') {
                            state[room][getHCHP( now )] += minSinceLastRun;
                        }
                        break;
                }

                // we automatically switch off the remote control buttons after two hours
                if (mySwitch.Name.substr(0,4) === 'TC1B') {
                    if (mySwitch.Data === 'On') {
                        let lastUpdate = new Date(mySwitch.LastUpdate);
                        let lastUpdateInMinutes = Math.round( (now - lastUpdate) / 1000 / 60 );
                        // console.log("Remote Control Button " + mySwitch.Name + " clicked " + lastUpdateInMinutes + " minutes ago");
                        if (lastUpdateInMinutes > 120) {
                            // we send the command to switch off the remote control button to domoticz
                            https.get(url + '&type=command&param=switchlight&idx=' + devices[mySwitch.Name] + '&switchcmd=Off');
                            console.log("Shut down Remote Control Button " + mySwitch.Name + " after 2 hours");
                        }
                    }
                }

            });

            // update last update in the state and save it to disk
            state.lastUpdate = now.toISOString();
            fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
            uploadToGoogleSheet();
            // console.log( state );

            // let's follow by requesting the temperatures
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
            // for each temperature received, we call manageHeater
            tempData.result.forEach( manageHeater )
        });
    });
}


// that is the function that decides who to switch on or off
function manageHeater (thermometer) {
    // we get the room from the name of the device: tempBed -> Bed
    let room       = thermometer.Name.substring(4);
    // we get the wanted temperature for that room knowing the status of the home (day, night, out, ...)
    let wantedTemp = getWantedTemp(room, houseStatus);

    if (thermometer.Temp < wantedTemp) {
        // it's too cold: we turn heater on if not already on
        console.log( constantLength( room ) + " is cold: " + thermometer.Temp + '/' + wantedTemp );
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'Off')   switchOn( room );
        } else {
            if ( heaters[room] === 'On')    switchOn( room );
        }

    } else if (thermometer.Temp > wantedTemp) {
        // it's too how: we turn heater off if not already off
        console.log( constantLength( room ) + " is hot : " + thermometer.Temp + '/' + wantedTemp);
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'On')    switchOff( room );
        } else {
            if ( heaters[room] === 'Off')   switchOff( room );
        }
    } else {
        console.log( constantLength( room ) + " is ok  : " + thermometer.Temp + '/' + wantedTemp);
    }

    // sometimes, the chacom miss an order sent by the RFXCom
    // so we resend command every quarter if necessary
    if (now.getMinutes() % 15 !== 0) return;
    // when we are gone, we resent orders only once every 4 hours
    if ((getState( now ) === 'gone') && (( now.getHours() % 4 !== 0) || ( now.getMinutes() !== 0 )) ) return;

    if (thermometer.Temp < wantedTemp - 0.3) {
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'On')   switchOn( room );
        } else {
            if ( heaters[room] === 'Off')  switchOn( room );
        }
    } else if (thermometer.Temp > wantedTemp + 0.3) {
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'Off')  switchOff( room );
        } else {
            if ( heaters[room] === 'On')   switchOff( room );
        }
    }

}

// stupid formatting function to get nicely aligned logs
function constantLength ( str ) {
    let size = str.length;
    for ( let i = size ; i < 7 ; i++) {
        str += ' ';
    }
    return str;
}


// we send the order to turn heaters on
// as most of the heaters are pluggen on the chacom module via the pilot thread,
// setting the chacom on ON turns off the heater.
function switchOn( room ) {
    console.log( now.getHours() + ':' + now.getMinutes() + " Switch " + room + " ON");

    switch ( room ) {
        case 'Bed':
            https.get(url + '&type=command&param=switchlight&idx=3&switchcmd=Off');
            break;
        case 'Kitchen':
            https.get(url + '&type=command&param=switchlight&idx=30&switchcmd=On');
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

// same as above, but with off
function switchOff( room ) {
    console.log( now.getHours() + ':' + now.getMinutes() + " Switch " + room + " OFF");

    switch (room) {
        case 'Bed':
            https.get(url + '&type=command&param=switchlight&idx=3&switchcmd=On');
            break;
        case 'Kitchen':
            https.get(url + '&type=command&param=switchlight&idx=30&switchcmd=Off');
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
    if (now < goneUntil) {
        return 'gone';
    }
    // todo: test if we are all gone
    // todo: ping cellphones or computers as a presence indicator

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
// This is a French specific parameter to some electricity subscriptions:
//      from 22:30 to 06:30, power is slightly cheaper
function getHCHP ( date ) {
    if ( date.getHours() < 6)   return 'HC';
    if ( (date.getHours() === 6)  && (date.getMinutes() < 30) ) return 'HC';
    if ( (date.getHours() === 22) && (date.getMinutes() > 29) ) return 'HC';
    if ( date.getHours() > 22 ) return 'HC';

    return 'HP';
}

// get the wanted temperature given the room and the state of the house
function getWantedTemp( room, state) {
    // we get the normal wanted temp
    let wanted = getBaseWantedTemp( room, state);

    // but we can add some warmth with our Remote Control
    switch ( room ) {
        case 'Kitchen':  if (heaters.TC1B1 === 'On')   wanted = 1 + Number(wanted);   break;
        case 'Living' :  if (heaters.TC1B2 === 'On')   wanted = 1 + Number(wanted);   break;
        case 'Bed'    :  if (heaters.TC1B3 === 'On')   wanted = 2 + Number(wanted);   break;
    }

    return wanted;
}

// this is the wanted temp in each room without the remote control command
// and without the special scenario for the Bathroom
function getBaseWantedTemp ( room, state ) {

    if (state === 'gone')  return 12;

    var now5 = now.stringTime5();
    var wantedTemp = 12;

    for (var keyHours in wantedTemps[room]) {
        if (now5 > keyHours) {
            wantedTemp = wantedTemps[room][keyHours];
        }
    }

    return wantedTemp;
}


//  At last some good tuto for accessing Google Sheets with node
//   https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html
function uploadToGoogleSheet() {

    // this should only do something once every hour
    if (now.getMinutes() !== 0)
        return;

    const GoogleSpreadsheet = require('google-spreadsheet');
    const creds = require('./client-secret');

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet(configs.GoogleSheetID);

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            const sheet = info.worksheets[1];
            console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);

            // Get today's cells
            const myRow = 2 + now.getDayOfYear() ;

            sheet.getCells({
                'min-row': myRow,
                'max-row': myRow,
                'min-col': 2,
                'max-col': 16,
                'return-empty': true
            }, function(err, cells) {

                // we display what is in the cells
                cells.forEach( function (oneCell) {
                    console.log('Cell R' + oneCell.row + ' C' + oneCell.col + ' = ' + oneCell.value);
                });

                // we write the new cell's values
                if ( now.getHours() < 10) {
                    // we don't update HC after 10:00
                    if (state.Bed.HC     !== 0) cells[1].value  = state.Bed.HC;
                    if (state.Living.HC  !== 0) cells[5].value  = state.Living.HC;
                    if (state.Kitchen.HC !== 0) cells[9].value  = state.Kitchen.HC;
                    if (state.Bath.HC    !== 0) cells[13].value = state.Bath.HC;
                }

                if (state.Bed.HP     !== 0) cells[2].value  = state.Bed.HP;
                if (state.Living.HP  !== 0) cells[6].value  = state.Living.HP;
                if (state.Kitchen.HP !== 0) cells[10].value = state.Kitchen.HP;
                if (state.Bath.HP    !== 0) cells[14].value = state.Bath.HP;

                sheet.bulkUpdateCells(cells, function(err) {
                    // block zeroing values if we got an error
                    if (err != null) throw err;

                    // we can zero values
                    if (getHCHP( now ) === 'HC') {
                        state.Bed.HP     = 0;
                        state.Living.HP  = 0;
                        state.Kitchen.HP = 0;
                        state.Bath.HP    = 0;
                    } else {
                        state.Bed.HC     = 0;
                        state.Living.HC  = 0;
                        state.Kitchen.HC = 0;
                        state.Bath.HC    = 0;
                    }

                    // save state
                    fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
                });
                

            })
        });

    });

}

