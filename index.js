/**
    Main module.

 */

const fs      = require("fs");
const MyDate  = require('./class/date');
const domoAPI = require('./class/domoticzAPI');

// setting current date
const now = new MyDate();
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

    // make all heaters base objects a heater object
    forEachHeater( function(heater) {
        heater.__proto__ = heater.prototype;

    } );
}


/**
 * Applies the function func to each heater of each room
 * @param {function} func function to be applied to each heater
 */
function forEachHeater( func ) {
    for ( let room_name in state.rooms )
        for ( let heater_idx in state.rooms[room_name].heaters )
            func( state.rooms[room_name].heaters[heater_idx] );
}


function loadWantedTemps( path ) {
    if ( ! fs.existsSync( path ))
        return;
    wantedTemps = JSON.parse( fs.readFileSync( path ));
    // say(" Wanted Temperatures:"); console.log(wantedTemps);
}


function processOneSwitchData ( oneSwitch ) {

    forEachHeater( function( heater ) {

        if ( heater.devIdx == oneSwitch.idx) {
            // we are on the right heater switch
            // we copy data
            heater.name  = oneSwitch.Name;
            heater.state = oneSwitch.Status;
        }

    });

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

    console.log(state);

    const lastStateUpdate = new MyDate(state.lastUpdate);
    const minSinceLastRun = Math.round( (now - lastStateUpdate) / 1000 / 60 );
    const HCorHP = lastStateUpdate.getHCHP();

    // we add the number of minutes each heater has been on (in state)
    for (let roomname in state.rooms) {
        let room = state.rooms[roomname];

        for (let heateridx in room.heaters) {
            let heater = room.heaters[heateridx];

            if ( heater.isInverted() ) {
                if (heater.state === 'Off') {
                    heater[HCorHP] += minSinceLastRun;
                }
            } else {
                if (heater.state === 'On') {
                    heater[HCorHP] += minSinceLastRun;
                }
            }

            console.log( heater.name + " is " + heater.state);
        }
    }

    console.log( state.rooms.Kitchen );
    return;
}


// 1. get switch states from Domoticz
// 2. from that, put the heater states into heater
// 3. compute the number of minutes of power on
// remark: for all heater whose chacon module is plugged to the pilot thread, Off = heater is on
// only the Bathroom has On = heater is on
// 4. we send the switch commands to Domoticz
function updateSwitchesStatus() {

    domoAPI.getSwitchesInfo( processOneSwitchData, countConsumption );

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
