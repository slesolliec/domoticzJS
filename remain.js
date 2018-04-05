"use strict";

// this is an example of an application using the DomoticzJS module
// Because it is only active a few seconds per minutes,
// it is supposed to run as a cron job in order to eat as few ram as possible.


const https = require("http");
// const fs    = require("fs");

// load main module
const domoJS = require("./index");

// load configs (put that file where it suits you)
domoJS.loadConfigs( __dirname + '/configs.json');

// load house state (put that file where you want)
domoJS.loadState( __dirname + '/house_state.json');

// load wanted temperatures
domoJS.loadWantedTemps( __dirname + '/wanted_temperatures.json');

domoJS.updateSwitchesStatus();

return;

// compute consumption ?? and update Calc sheet ??

// fetch temperatures ??

// take actions ??

// save down state ??


// domoJS.say("Hello");


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
        say( constantLength( room ) + " is cold: " + thermometer.Temp + '/' + wantedTemp );
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'Off')   switchOn( room );
        } else {
            if ( heaters[room] === 'On')    switchOn( room );
        }

    } else if (thermometer.Temp > wantedTemp) {
        // it's too how: we turn heater off if not already off
        say( constantLength( room ) + " is hot : " + thermometer.Temp + '/' + wantedTemp);
        if (( room === 'Bath' ) || ( room === 'Kitchen' )) {
            if ( heaters[room] === 'On')    switchOff( room );
        } else {
            if ( heaters[room] === 'Off')   switchOff( room );
        }
    } else {
        say( constantLength( room ) + " is ok  : " + thermometer.Temp + '/' + wantedTemp);
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
    say( "Switch " + room + " ON");

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
    say( "Switch " + room + " OFF");

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



// get the wanted temperature given the room and the state of the house
function getWantedTemp( room, state) {
    // we get the normal wanted temp
    let wanted = getBaseWantedTemp( room, state);

    // but we can add some warmth with our Remote Control
    switch ( room ) {
        case 'Kitchen':  if (heaters.TC1B1 === 'On')   wanted += 1;   break;
        case 'Living' :  if (heaters.TC1B2 === 'On')   wanted += 1;   break;
        case 'Bed'    :  if (heaters.TC1B3 === 'On')   wanted += 2;   break;
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

    return Number(wantedTemp);
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

