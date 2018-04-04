/**
    Main module.

 */

const fs      = require("fs");
const myDate  = require('./class/date');
const domoAPI = require('./class/domoticzAPI');

// setting current date
const now = new myDate();
let configs;
let state;
let wantedTemps;


function say( msg ) {
    console.log( now.stringTime5() + ' ' + msg);
}


function loadConfigs( path ) {
    configs = JSON.parse( fs.readFileSync( path ) );

    // I don't understand why domoAPI does not have access to configs
    domoAPI.setAccess( configs.domoticz, configs.username, configs.password );
}


function loadState( path ) {
    state = JSON.parse( fs.readFileSync( path ) );
    state.file = path;
}


function loadWantedTemps( path ) {
    if ( ! fs.existsSync( path ))
        return;
    wantedTemps = JSON.parse( fs.readFileSync( path ));
    say(" Wanted Temperatures:");
    console.log(wantedTemps);
}


function processOneSwitchData ( oneSwitch ) {

    // we look for that switch in our state / rooms / heaters
    for ( let roomname in state.rooms ) {
        let room = state.rooms[roomname];

        for ( let heatername in room.heaters ) {
            let heater = room.heaters[heatername];

            if ( heater.devIdx == oneSwitch.idx) {
                // we are on the right heater switch
                // we copy data
                heater.name  = oneSwitch.Name;
                heater.state = oneSwitch.Status;
            }
        }
    }

    return;


    // we automatically switch off the remote control buttons after two hours
    if (mySwitch.Name.substr(0,4) === 'TC1B') {
        if (mySwitch.Data === 'On') {
            let lastUpdate = new Date(mySwitch.LastUpdate);
            let lastUpdateInMinutes = Math.round( (now - lastUpdate) / 1000 / 60 );
            // console.log("Remote Control Button " + mySwitch.Name + " clicked " + lastUpdateInMinutes + " minutes ago");
            if (lastUpdateInMinutes > 120) {
                // we send the command to switch off the remote control button to domoticz
                https.get(url + '&type=command&param=switchlight&idx=' + devices[mySwitch.Name] + '&switchcmd=Off');
                say("Shut down Remote Control Button " + mySwitch.Name + " after 2 hours");
            }
        }
    }

    say(" State:");
    console.log(state);

}


function countConsumption() {

    // we update counter
    for (let roomname in state.rooms) {
        let room = state.rooms[roomname];

        for (let heateridx in room.heaters) {
            let heater = room.heaters[heateridx];


        }
    }


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

    console.log( state.rooms.Kitchen );

}


// 1. get switch states from Domoticz
// 2. from that, put the heater states into heater
// 3. compute the number of minutes of power on
// remark: for all heater whose chacon module is plugged to the pilot thread, Off = heater is on
// only the Bathroom has On = heater is on
// 4. we send the switch commands to Domoticz
function updateSwitchesStatus() {

    domoAPI.getSwitchesInfo( processOneSwitchData, final );

//    console.log( state.rooms.Kitchen );

//    setTimeout( function() { console.log( state.rooms.Kitchen );}, 5000);

    return;

    // update last update in the state and save it to disk
    state.lastUpdate = now.toISOString();
    fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
    uploadToGoogleSheet();
    // console.log( state );

    // let's follow by requesting the temperatures
    getTemperatures();
}



module.exports = {
    configs,
    state,

    loadConfigs,
    loadState,
    loadWantedTemps,
    updateSwitchesStatus
};
