"use strict";

/**

 Protocal utility object.

 This manages all requests to Domoticz.
 So if there is a change in Domoticz API, all modifications should only be done here.
 The rest of the application should be independent of the Domoticz API protocol.

 */

const axios = require('axios');

let baseurl;

// what will be exported
const domoticzAPI = {};

/**
 * my stupid console.log wrapper
 * @param {string} msg ; the message that will be logged
 */
function say( msg ) {
    console.log("     " + msg);
}


/**
 * this must be called once before all the other request
 * @param configs
 */
domoticzAPI.setUrl = function ( fullurl ) {

	let host     = fullurl.split('@')[1];
	let protocol = fullurl.split('@')[0].split('/')[0];
	let username = fullurl.split('@')[0].split('/')[2].split(':')[0];
	let password = fullurl.split('@')[0].split('/')[2].split(':')[1];

	baseurl = protocol + '//' + host + "/json.htm?"
		+ "username="  + Buffer.from(username).toString("base64")
		+ "&password=" + Buffer.from(password).toString("base64");

};


/**
 * we get the heater switches data (status, last update, ...)
 */
domoticzAPI.getSwitchesInfo = async function() {
	const response = await axios.get(baseurl + "&type=devices&used=true&filter=light");
	// console.log(response.data.result);
	return response.data.result;
};


/**
 * we get all the temperature probes info (data, last update, ...)
 */
domoticzAPI.getTemperatures = async function() {
	const response = await axios.get(baseurl + "&type=devices&used=true&filter=temp");
	// response.data.Sunrise
	// response.data.Sunset
	// console.log(response.data.result);
	return response.data.result;
};


/**
 * send a switch command to a heater switch
 * @param {number} deviceIdx : id of the switch (in Domoticz's database)
 * @param {string} command : On or Off
 */
domoticzAPI.switchDevice = async function( deviceIdx, command ) {
    // say( "Switch device " + deviceIdx + " " + command);

	let fullurl = baseurl + "&type=command&param=switchlight&idx=" + deviceIdx + "&switchcmd=" + command;

	const response = await axios.get(fullurl);
	// response.data.Sunrise
	// response.data.Sunset
	// console.log(response.data);
	return response.data;
};

module.exports = domoticzAPI;
