"use strict";

/**
    Main module.

 */

// dependencies
const fs        = require("fs");
const MyDate    = require("./class/date");
const domoAPI   = require("./class/domoticzAPI");
const Room      = require("./class/room");
const gsheetAPI = require("./class/googleSheetAPI");

const domoJS = {};
domoJS.configs = {};
domoJS.state   = {};


/**
 * Some stupid console.log wrapper with prepended time
 * @param msg
 */
function say( msg ) {
    console.log(new MyDate().stringTime5() + " " + msg);
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
};


/**
 * Reads the temperatures in Google Calc "proxy" file, and writes them in state.rooms.xxx.wantedTemps
 * @param callback : what to do next
 */
function loadWantedTemps(callback) {
    if (! fs.existsSync(domoJS.configs.root + "wantedTemps.json")) {
        console.log("could not load " + domoJS.configs.root + "wantedTemps.json from local disk");
        return
    }

    let wantedTemps = JSON.parse(fs.readFileSync(domoJS.configs.root + "wantedTemps.json"));
    let now5 = new MyDate().stringTime5();

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
	
    if (typeof callback === "function") {
        callback();
    }
}


/**
 *  Get the wanted temperature
 *  Get the heater switches status
 *  send Domoticz API call
 *  get result as list of switch data
 *  process each switch (heater) in a callback
 *  then count consumption
 */
domoJS.updateSwitchesStatus = function() {
    loadWantedTemps(function() {

		// reset all power of rooms to zero
		for (const name in domoJS.state.rooms) {
			let room = domoJS.state.rooms[name];
			room.power = 0;
		}
		// console.log(domoJS.state);

        domoAPI.getSwitchesInfo( processOneSwitchData, countConsumption );
    });

    // console.log(state.rooms);
};


// switching on a heater
function switchHeaterOn (devIdx, name, isInverted) {
    say( "sending switching ON  command to " + name );

    // this sends the request
    if (isInverted) {
        domoAPI.switchDevice( devIdx, "Off");
    } else {
        domoAPI.switchDevice( devIdx, "On");
    }
};


// switching off a heater
function switchHeaterOff (devIdx, name, isInverted) {
    say( "sending switching OFF command to " + name );

    // this sends the request
    if (isInverted) {
        domoAPI.switchDevice( devIdx, "On");
    } else {
        domoAPI.switchDevice( devIdx, "Off");
    }
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

	console.log(oneSwitch.Name);

	let namebits = oneSwitch.Name.split('-');
	// oneSwitch.idx
	// Heater-Kitchen-Small-dir-36-1000


	// deal with the heaters
	if (namebits[0] == 'Heater') {
		let current_room = domoJS.state.rooms[namebits[1]];

		// now we check if heater and room state are coherent:
		// room should impose the value of heater. If not coherent, we switch heater
		if (current_room.state === "On") {
			if (namebits[3] == 'inv') {
				if (oneSwitch.Status === "On") {
					// something is wrong: heater should be aligned with room
					say(oneSwitch.Name + " (inverted) is On and should be Off !!!");
					switchHeaterOn(oneSwitch.idx, oneSwitch.Name, true);
				} else {
					// resend ?
					if (current_room.resend) {
						say(oneSwitch.Name + " resend On command");
						switchHeaterOn(oneSwitch.idx, oneSwitch.Name, true);
					}
				}
			} else {
				if (oneSwitch.Status === "Off") {
					// something is wrong: heater should be aligned with room
					say(oneSwitch.Name + " is Off and should be On !!!");
					switchHeaterOn(oneSwitch.idx, oneSwitch.Name, false);
				} else {
					// resend ?
					if (current_room.resend) {
						say(oneSwitch.Name + " resend On command");
						switchHeaterOn(oneSwitch.idx, oneSwitch.Name, false);
					}
				}
			}
			current_room.power += parseInt(namebits[4]);
		} else {
			if (namebits[3] == 'inv') {
				if (oneSwitch.Status === "Off") {
					// something is wrong: heater should be aligned with room
					say(oneSwitch.Name + " (inverted) is Off and should be On !!!");
					switchHeaterOff(oneSwitch.idx, oneSwitch.Name, true);
				} else {
					// resend ?
					if (current_room.resend) {
						say(oneSwitch.Name + " resend Off command");
						switchHeaterOff(oneSwitch.idx, oneSwitch.Name, true);
					}
				}
			} else {
				if (oneSwitch.Status === "On") {
					// something is wrong: heater should be aligned with room
					say(oneSwitch.Name + " is On and should be Off !!!");
					switchHeaterOff(oneSwitch.idx, oneSwitch.Name, false);
				} else {
					// resend ?
					if (current_room.resend) {
						say(oneSwitch.Name + " resend Off command");
						switchHeaterOff(oneSwitch.idx, oneSwitch.Name, false);
					}
				}
			}
		}
    }

	// deal with the VMC
	

    // console.log(domoJS.state);
}


/**
 * Count each minute each heater has been ON.
 * Scatter those minutes between High price hours and low price hours.
 */
function countConsumption() {

    const now = new MyDate();

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
    fs.writeFile( domoJS.state.file, JSON.stringify(domoJS.state, null, 4), function(err){ if(err) throw err; } );
}



/**
 * Decide who to switch on or off
 */
function processOneTemperatureData (sensor) {
    // console.log(sensor);

    // we get the room from the name of the device: tempBed -> Bed
    let room_name = sensor.Name.substring(4);

    // update state
    if (! domoJS.state.rooms[room_name]) {
        say("Room " + room_name + " does not exist in domoJS.state");
        return;
    }
    domoJS.state.rooms[room_name].setTemperature(sensor.Temp);
    domoJS.state.rooms[room_name].setHumidity(sensor.Humidity);
    domoJS.state.rooms[room_name].setLastSensorTime(sensor.LastUpdate);
}


/**
 * Wrappers around gsheetAPI just so that I don't need to call
 * gsheetAPI (and have to require it) from the outside world.
 */
domoJS.getTempsFromGoogleSheet = function() {
    gsheetAPI.getTempsFromGoogleSheet(domoJS.configs);
};
domoJS.uploadToGoogleSheet = function() {
    gsheetAPI.uploadToGoogleSheet(domoJS.configs, domoJS.state);
};



module.exports = domoJS;
