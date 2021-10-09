"use strict";

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// this is an example of an application using the DomoticzJS module
// Because it is only active a few seconds per minutes,
// I guess running it as a cron job saves ram use.
// If you're on Linux, add this to your crontab:
/// * * * * *  /path/to/node ~/domo/example.js >> ~/domo/logs/domo_`date +\%Y-\%m-\%d`.log

// load main module
const domoJS    = require("./index");
const path      = require("path");


async function work() {

	// load configs (put that file where it suits you)
	domoJS.loadConfigs(path.join(__dirname, "configs.json"));

	// get wanted temperatures from Google Sheet only once an hour
	// (but the first time you run that script, comment off the if)
	if (new Date().getMinutes() === 0)
		await domoJS.getTempsFromGoogleSheet();

	// load house state (put that file where you want)
	await domoJS.loadState(path.join(__dirname, "house_state.json"));

	// change the state with current wanted temperatures
	await domoJS.updateWantedTemps();

	// we load the temperatures from Domoticz
	await domoJS.loadTemperaturesFromDomoticz();

	// from now, we have loaded the current state
	// + updated the wanted temperatures as the time goes by
	// + read the current temperatures from domotics

	await domoJS.updateSwitches();

	await domoJS.writeState(path.join(__dirname, "house_state.json"));

	console.log('');

//	console.log(domoJS.state.rooms.Bed);
//	console.log(domoJS.state.rooms.Bath2);
//	process.exit(1);
}

work();

setInterval(work, 60 * 1000);


// load wanted temperatures from local Google Sheet "cache" file
// then get the state of the switches of the heaters from Domoticz
// then it fetches current temperatures
// then it sends ON / OFF commands


// update power consumption to Google Sheet once an hour
// if (new Date().getMinutes() === 58)
//    domoJS.uploadToGoogleSheet();
