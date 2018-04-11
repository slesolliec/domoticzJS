"use strict";


const domoAPI = require('./domoticzAPI');

function say( msg ) {
    console.log ( '     ' + msg);
}


var Heater = {};

// private properties
// I guess the properties here will just be private but will be of the unique
// Heater object and not private properties of each instance of Heater
// how do I create private properties on the instance level ???

// public properties
Heater.name       = '';
Heater.devIdx     = null;
Heater.state      = 'Off';
Heater.HC         = 0;
Heater.HP         = 0;
Heater.nbHitsOn   = 0;
Heater.nbHitsOff  = 0;
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

    console.log(this);
    say("  switching device " + this.name);

    // this sends the request
    function doSwitch() {
        if (this.isInverted) {
            domoAPI.switchDevice( this.devIdx, 'Off')
        } else {
            domoAPI.switchDevice( this.devIdx, 'On')
        }
    }

    // first switching
    if (this.state === 'Off') {
        say( "Switching ON  " + this.name );
        this.nbHitsOn  = 1;
        this.nbHitsOff = 0;
        this.state     = 'On';
        doSwitch();

    // switch ressent
    } else if ((this.nbHitsOn < 3) && ( new Date().getMinute() % 5 === 0))  {
        say( "Switching ON  " + this.name + " (resent)" );
        this.nbHitsOn++;
        doSwitch();
    }

};

// switching off a heater
Heater.switchOff = function() {
    // this sends the request
    function doSwitch() {

        console.log(this);

        say("  switching device " + this.name);

        if (this.isInverted) {
            domoAPI.switchDevice( this.devIdx, 'On')
        } else {
            domoAPI.switchDevice( this.devIdx, 'Off')
        }
    }

    // first switching
    if (this.state === 'On') {
        say( "Switching OFF " + this.name );
        this.nbHitsOn  = 0;
        this.nbHitsOff = 1;
        this.state     = 'Off';
        doSwitch();

        // switch ressent
    } else if ((this.nbHitsOff < 3) && ( new Date().getMinutes() % 5 === 0))  {
        say( "Switching OFF " + this.name + " (resent)" );
        this.nbHitsOff++;
        doSwitch();
    }
};


// old factory function, but I think I just prefer to manipulate the __proto__
// chain manually
// function heaterFactory() {
//    return Object.create(Heater);
// }

module.exports = Heater;
