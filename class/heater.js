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


const Heater = {};

// private properties ???
// I guess the properties here will just be private but will be of the unique
// Heater prototypal object and not private properties of each "instance of" Heater
// how do I create private properties on the "instance" level ???

// public properties
Heater.name       = '';
Heater.devIdx     = null;
Heater.state      = 'Off';
Heater.HC         = 0;
Heater.HP         = 0;
Heater.nbHitsOn   = 0;
Heater.nbHitsOff  = 0;
Heater.lastUpdate = new Date().toISOString();
Heater.isInverted = false;
Heater.power      = 1000;

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

    const now = new Date();

    // this sends the request
    // warning: inner functions (closures) normally loose access to this
    // call it with doSwitch.call(this); to get this back
    function doSwitch() {
        if (this.isInverted) {
            domoAPI.switchDevice( this.devIdx, 'Off')
        } else {
            domoAPI.switchDevice( this.devIdx, 'On')
        }
    }

    // first switching
    if (this.state === 'Off') {
        say("Switching ON  " + this.name);
        this.nbHitsOn = 1;
        this.nbHitsOff = 0;
        this.state = 'On';
        this.lastUpdate = now.toISOString();
        doSwitch.call(this);
    }

    // sometimes, the chacom heater switch misses an order sent by the RFXCom
    // so we resend and possibly re-resend command after 15 minutes if necessary
    if (this.nbHitsOn > 2)
        return;

    // At first, I would check temperature was not above wanted, but in summer
    // it could lead to having heaters ON for hours when temperature is above let's say 25°
    // if (this.getRoom().temp <= this.getRoom().wantedTemp)
    //    return;

    // check it's been at least 15 minutes
    if ( (now.getTime() - new Date( this.lastUpdate ).getTime()) / 1000 < 900 )
        return;

    // resend switch order
    say( "Switching ON " + this.name + " (resent)" );
    this.nbHitsOn++;
    this.lastUpdate = now.toISOString();
    doSwitch.call(this);
};


// switching off a heater
Heater.switchOff = function() {

    const now = new Date();

    // this sends the request
    // warning: inner functions (closures) normally loose access to this
    // call it with doSwitch.call(this); to get this back
    function doSwitch() {
        if (this.isInverted) {
            domoAPI.switchDevice( this.devIdx, 'On')
        } else {
            domoAPI.switchDevice( this.devIdx, 'Off')
        }
    }

    // first switching
    if (this.state === 'On') {
        say("Switching OFF " + this.name);
        this.nbHitsOn   = 0;
        this.nbHitsOff  = 1;
        this.state      = 'Off';
        this.lastUpdate = now.toISOString();
        doSwitch.call(this);
        return;
    }

    // sometimes, the chacom heater switch misses an order sent by the RFXCom
    // so we resend and possibly re-resend command after 15 minutes if necessary
    if (this.nbHitsOff > 2)
        return;

    // At first, I would check temperature was not above wanted, but in summer
    // it could lead to having heaters ON for hours when temperature is above let's say 25°
    // if (this.getRoom().temp <= this.getRoom().wantedTemp)
    //    return;

    // check it's been at least 15 minutes
    if ( (now.getTime() - new Date( this.lastUpdate ).getTime()) / 1000 < 900 )
        return;

    // resend switch order
    say( "Switching OFF " + this.name + " (resent)" );
    this.nbHitsOff++;
    this.lastUpdate = now.toISOString();
    doSwitch.call(this);

};


// old factory function, but I think I just prefer to manipulate the __proto__
// chain manually
// function heaterFactory() {
//    return Object.create(Heater);
// }

module.exports = Heater;
