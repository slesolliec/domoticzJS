"use strict";

/**
    Main module.

 */

// dependencies
const fs      = require("fs");
const MyDate  = require('./class/date');
const domoAPI = require('./class/domoticzAPI');
const Room    = require('./class/room');
const Heater  = require('./class/heater');


const domoJS = {};

const now = new MyDate();
let configs;
let state;
let wantedTemps;


/**
 * Some stupid console.log wrapper with prepended time
 * @param msg
 */
function say( msg ) {
    console.log( now.stringTime5() + ' ' + msg);
}


/**
 * We load the configs from configuration file (URL of Domoticz, user/pwd, ...)
 * @param path
 */
domoJS.loadConfigs = function( path ) {
    configs = JSON.parse( fs.readFileSync( path ) );

    // I don't understand why domoAPI does not have access to configs
    domoAPI.setAccess( configs.domoticz, configs.username, configs.password );
};


/**
 * Get the state of the house from json state file : last update, rooms, temperatures, heaters, ...
 * @param path
 */
domoJS.loadState = function( path ) {
    // load state from file
    state = JSON.parse( fs.readFileSync( path ) );

    // make it easier to find which file we read the state from
    state.file = path;

    // make all rooms instances of Room prototypal object
    // (I love prototypal inheritance !!!)
    for (let room in state.rooms)
        state.rooms[room].__proto__ = Room;

    // make all heaters instances of Heater prototypal object
    // (Have I ever told you I loved prototypal inheritance?)
    forEachHeater( function(heater) {
        heater.__proto__ = Heater;
    });
};


/**
 * Utility: applies the function func to each heater of each room
 * @param {function} func function to be applied to each heater
 */
function forEachHeater( func ) {
    for ( let room_name in state.rooms )
        for ( let heater_idx in state.rooms[room_name].heaters )
            func( state.rooms[room_name].heaters[heater_idx] );
}


/**
 * Reads the temperatures in Google Calc "proxy" file, and writes them in state.rooms.xxx.wantedTemps
 * @param path of the json file that has the temperatures per hours (from Google Calc)
 */
domoJS.loadWantedTemps = function( path ) {
    if ( ! fs.existsSync( path ))
        return;

    let wantedTemps = JSON.parse( fs.readFileSync( path ));
    let now5 = now.stringTime5();

    // from the sheet of wanted temps, we get which temperature we now want
    for (let room in wantedTemps) {

        let wantedTemp = 10;

        for (let keyHours in wantedTemps[room])
            if (now5 > keyHours)
                wantedTemp = wantedTemps[room][keyHours];

        state.rooms[room].wantedTemp = Number(wantedTemp);

        // console.log(state.rooms[room]);
    }
    // say(" Wanted Temperatures:"); console.log(wantedTemps);
};

/**
 * Get the heater switches status
 *  send Domoticz API call
 *  get result as list of switch data
 *  process each switch (heater) in a callback
 *  then count consumption
 */
domoJS.updateSwitchesStatus = function() {
    domoAPI.getSwitchesInfo( processOneSwitchData, countConsumption );
    // console.log(state.rooms);
};


/**
 * We process the data from one switch (to read name and status of each heater switch)
 * @param oneSwitch
 */
function processOneSwitchData ( oneSwitch ) {
    // quite ugly: we loop on all heaters to find the right one
    forEachHeater( function( heater ) {

        if ( heater.devIdx == oneSwitch.idx) {
            // we are on the right heater switch
            // we copy data
            heater.name  = oneSwitch.Name;
            heater.state = oneSwitch.Status;
        }
        // console.log(heater);
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

    // console.log(state);
}


/**
 * Count each minute each heater has been ON.
 * Scatter those minutes between High price hours and low price hours.
 */
// todo: HC and HP should belong to rooms instead of each heaters
function countConsumption() {

    // console.log(state);
    const lastStateUpdate = new MyDate(state.lastUpdate);
    const minSinceLastRun = Math.round( (now - lastStateUpdate) / 1000 / 60 );
    const HCorHP = lastStateUpdate.getHCHP();

    // we add the number of minutes each heater has been on (in state)
    for (let room_name in state.rooms) {
        let room = state.rooms[room_name];

        for (let heater_idx in room.heaters) {
            let heater = room.heaters[heater_idx];

            if ( heater.isInverted ) {
                if (heater.state === 'Off') {
                    heater[HCorHP] += minSinceLastRun;
                }
            } else {
                if (heater.state === 'On') {
                    heater[HCorHP] += minSinceLastRun;
                }
            }

            // console.log( heater.name + " is " + heater.state);
        }
    }

    // update last update in the state and save it to disk
    state.lastUpdate = now.toISOString();
//    fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
    // uploadToGoogleSheet();

    // let's follow by requesting the temperatures
    getTemperatures();
}


/**
 * We get the current temperatures from Domoticz.
 */
function getTemperatures() {
    // get temperatures from Domoticz, pass the callback that is going to be applied on each room temperature
    domoAPI.getTemperatures( processOneTemperatureData );
}


/**
 * Decide who to switch on or off
 */
function processOneTemperatureData (thermometer) {

    // console.log(thermometer.Name);

    // we get the room from the name of the device: tempBed -> Bed
    let room       = thermometer.Name.substring(4);

    // update state
    state.rooms[room].setTemperature(thermometer.Temp);

    // todo: a check on the last update to catch empty batteries
    // if (thermometer.LastUpdate( la date en CET ) > 1 heure et 5 minutes (pour être DST23 proof) = alerte !!


    return;

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

// creating aliases so state and configs are visble from the outside
domoJS.configs = configs;
domoJS.state   = state;

module.exports = domoJS;

