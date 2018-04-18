"use strict";

// this is an example of an application using the DomoticzJS module
// Because it is only active a few seconds per minutes,
// it is supposed to run as a cron job in order to eat as few ram as possible.

// load main module
const domoJS    = require("./index");
const gsheetAPI = require("./class/googleSheetAPI");
const path      = require('path');

// load configs (put that file where it suits you)
domoJS.loadConfigs( path.join(__dirname, 'configs.json'));

// gsheetAPI.loadConfigs(  __dirname + '/configs.json' );
gsheetAPI.getTempsFromGoogleSheet( domoJS.configs );

// load house state (put that file where you want)
domoJS.loadState( path.join(__dirname, 'house_state.json'));

// load wanted temperatures
domoJS.loadWantedTemps( path.join(__dirname, 'wantedTemps.json'));

// we get the state of the switches of the heaters
// then it fetches current temperatures from Domoticz
// then it sends ON / OFF commands
domoJS.updateSwitchesStatus();

// this should be run only once an hour
gsheetAPI.uploadToGoogleSheet( domoJS.configs, domoJS.state );
