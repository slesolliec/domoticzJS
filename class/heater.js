"use strict";

/**
 * Heater prototypal object.
 * Must be inherited from by all heater objects in state object.
 * @type {{}}
 */


const domoAPI = require('./domoticzAPI');

function say( msg ) {
    console.log ( '     ' + msg);
}


const Heater = {
    name       : '',    // name of heater
    devIdx     : null,  // device index in Domoticz database
    isInverted : false, // true if chacom module is connected to pilot thread
    power      : 1000   // default heater power is 1000 Watts
};

// private properties ???
// I guess the properties here will just be private but will be of the unique
// Heater prototypal object and not private properties of each "instance of" Heater
// how do I create private properties on the "instance" level ???


// private method
function dumpfield( item, index) {
    console.log( index + ' = ' + item);
}


// dumping properties of the object (for debug)
Heater.dump      = function() {
    for (let index in this) {
        dumpfield( this[index], index);
    }
};


// switching on a heater
Heater.switchOn  = function() {

    // this sends the request
    if (this.isInverted) {
        domoAPI.switchDevice( this.devIdx, 'Off')
    } else {
        domoAPI.switchDevice( this.devIdx, 'On')
    }

};


// switching off a heater
Heater.switchOff = function() {

    // this sends the request
    if (this.isInverted) {
        domoAPI.switchDevice( this.devIdx, 'On')
    } else {
        domoAPI.switchDevice( this.devIdx, 'Off')
    }

};


module.exports = Heater;
