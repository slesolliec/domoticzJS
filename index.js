"use strict";

/**
    Main module.

 */

// dependencies
const fs        = require("fs");
const MyDate    = require("./class/date");
const domoAPI   = require("./class/domoticzAPI");
const Room      = require("./class/room");
const Heater    = require("./class/heater");
const gsheetAPI = require("./class/googleSheetAPI");

const domoJS = {};
domoJS.configs = {};
domoJS.state   = {};

const now = new MyDate();


/**
 * Some stupid console.log wrapper with prepended time
 * @param msg
 */
function say( msg ) {
    console.log( now.stringTime5() + " " + msg);
}


/**
 * We load the configs from configuration file (URL of Domoticz, user/pwd, ...)
 * @param path
 */
domoJS.loadConfigs = function( path ) {
    domoJS.configs = JSON.parse( fs.readFileSync( path ) );

    // I don't understand why domoAPI does not have access to configs
    domoAPI.setAccess( domoJS.configs.domoticz );
};


/**
 * Get the state of the house from json state file : last update, rooms, temperatures, heaters, ...
 * @param path
 */
domoJS.loadState = function( path ) {
    // load state from file
    domoJS.state = JSON.parse( fs.readFileSync( path ) );

    // make it easier to find which file we read the state from
    domoJS.state.file = path;

    // make all rooms inherit from Room prototypal object
    // (I love prototypal inheritance !!!)
    for (let room in domoJS.state.rooms)
        domoJS.state.rooms[room].__proto__ = Room;

    // make all heaters inherit from Heater prototypal object
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
    for ( let room_name in domoJS.state.rooms )
        for ( let heater_idx in domoJS.state.rooms[room_name].heaters )
            func( domoJS.state.rooms[room_name].heaters[heater_idx] );
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

        domoJS.state.rooms[room].wantedTemp = Number(wantedTemp);

        // console.log(domoJS.state.rooms[room]);
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

    // we automatically switch off the remote control buttons after two hours
    if (oneSwitch.Name.substr(0,4) === "TC1B") {
        // console.log(oneSwitch);
        if (oneSwitch.Data === "On") {
            let lastUpdate = new Date(oneSwitch.LastUpdate);
            let lastUpdateInMinutes = Math.round( ( new Date().getTime() - lastUpdate.getTime()) / 1000 / 60 );
            // console.log("Remote Control Button " + oneSwitch.Name + " clicked " + lastUpdateInMinutes + " minutes ago");
            if (lastUpdateInMinutes > 120) {
                // we send the command to switch off the remote control button to domoticz
                domoAPI.switchDevice(oneSwitch.idx, "Off");
                say("Shut down Remote Control Button " + oneSwitch.Name + " after 2 hours");

                // this is just for the following lines (Remote Control buttons management)
                oneSwitch.Data = "Off";
            }
        }

		// this part will go when web interface is implemented
		/*
        if (oneSwitch.Data === "On") {
            switch (oneSwitch.Name) {
                case "TC1B1":  domoJS.state.rooms["Kitchen"].tempModifier = 1;  break;
                case "TC1B2":  domoJS.state.rooms["Living"].tempModifier  = 1;  break;
                case "TC1B3":  domoJS.state.rooms["Bed"].tempModifier     = 2;  break;
            }
        } else {
            switch (oneSwitch.Name) {
                case "TC1B1":  domoJS.state.rooms["Kitchen"].tempModifier = 0;  break;
                case "TC1B2":  domoJS.state.rooms["Living"].tempModifier  = 0;  break;
                case "TC1B3":  domoJS.state.rooms["Bed"].tempModifier     = 0;  break;
            }
		}
		*/

        return;
    }

    // quite ugly: we loop on all heaters to find the right one
    for (let room_name in domoJS.state.rooms) {
        let current_room = domoJS.state.rooms[room_name];

        for ( let heater_idx in current_room.heaters ) {
            let current_heater = current_room.heaters[heater_idx];

            if (heater_idx === oneSwitch.idx) {
                // we are on the right heater switch
                // we copy the heater name from Domoticz (ok, often useless)
                current_heater.name  = oneSwitch.Name;

                // now we check if heater and room state are coherent:
                // room should impose the value of heater. If not coherent, we switch heater
                if (current_room.state === "On") {
                    if (current_heater.isInverted) {
                        if (oneSwitch.Status === "On") {
                            // something is wrong: heater should be aligned with room
                            say("Heater "+ current_heater.name + " (inverted) is On and should be Off !!!");
                            current_heater.switchOn();
                        }
                    } else {
                        if (oneSwitch.Status === "Off") {
                            // something is wrong: heater should be aligned with room
                            say("Heater "+ current_heater.name + " is Off and should be On !!!");
                            current_heater.switchOn();
                        }
                    }
                } else {
                    if (current_heater.isInverted) {
                        if (oneSwitch.Status === "Off") {
                            // something is wrong: heater should be aligned with room
                            say("Heater "+ current_heater.name + " (inverted) is Off and should be On !!!");
                            current_heater.switchOff();
                        }
                    } else {
                        if (oneSwitch.Status === "On") {
                            // something is wrong: heater should be aligned with room
                            say("Heater "+ current_heater.name + " is On and should be Off !!!");
                            current_heater.switchOff();
                        }
                    }
                }
            }
        }
    }

    // console.log(state);
}


/**
 * Count each minute each heater has been ON.
 * Scatter those minutes between High price hours and low price hours.
 */
function countConsumption() {

    // console.log(state);
    const lastStateUpdate = new MyDate(domoJS.state.lastUpdate);
    const minSinceLastRun = Math.round( (now - lastStateUpdate) / 1000 / 60 );
    const HCorHP = lastStateUpdate.getHCHP();

    // we add the number of minutes each heater has been on (in state)
    for (let room_name in domoJS.state.rooms) {
        let room = domoJS.state.rooms[room_name];
        if (room.state === "On") {
            room[HCorHP] += minSinceLastRun;
            // console.log( room.name + " is " + room.state);
        }
    }

    // update last update in the state and save it to disk
    domoJS.state.lastUpdate = now.toISOString();

    // get temperatures from Domoticz, pass the callback that is going to be applied on each room temperature
    domoAPI.getTemperatures( processOneTemperatureData );

    // we save state in 5 seconds: we want to be sure that everything has been done
    setTimeout( writeState, 5000);

}


/**
 * Write down state in json file
 */
function writeState() {
  fs.writeFile( domoJS.state.file, JSON.stringify(domoJS.state), function(err){ if(err) throw err; } );
}



/**
 * Decide who to switch on or off
 */
function processOneTemperatureData (sensor) {

    // console.log(thermometer.Name);

    // we get the room from the name of the device: tempBed -> Bed
    let room_name = sensor.Name.substring(4);

    // update state
    domoJS.state.rooms[room_name].setTemperature(sensor.Temp);
    domoJS.state.rooms[room_name].setLastSensorTime(sensor.LastUpdate);
}


/**
 * Wrappers around gsheetAPI just so that I don't need to call
 * gsheetAPI (and have to require it) from the outside world.
 */
domoJS.getTempsFromGoogleSheet = function() {
    gsheetAPI.getTempsFromGoogleSheet( domoJS.configs );
};
domoJS.uploadToGoogleSheet = function() {
    gsheetAPI.uploadToGoogleSheet( domoJS.configs, domoJS.state );
};



module.exports = domoJS;
