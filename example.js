"use strict";

// this is an example of an application using the DomoticzJS module
// Because it is only active a few seconds per minutes,
// I guess running it as a cron job saves ram use.
// If you're on Linux, add this to your crontab:
/// * * * * *  /path/to/node ~/domo/example.js >> ~/domo/logs/domo_`date +\%Y-\%m-\%d`.log

// load main module
const domoJS    = require("./index");
const path      = require("path");

// load configs (put that file where it suits you)
domoJS.loadConfigs(path.join(__dirname, "configs.json"));

// get wanted temperatures from Google Sheet only once an hour
// (but the first time you run that script, comment off the if)
if (new Date().getMinutes() === 0)
    domoJS.getTempsFromGoogleSheet();

// load house state (put that file where you want)
domoJS.loadState(path.join(__dirname, "house_state.json"));

// load wanted temperatures from local Google Sheet "cache" file
// then get the state of the switches of the heaters from Domoticz
// then it fetches current temperatures
// then it sends ON / OFF commands
domoJS.updateSwitchesStatus();

// update power consumption to Google Sheet once an hour
if (new Date().getMinutes() === 58)
    domoJS.uploadToGoogleSheet();
