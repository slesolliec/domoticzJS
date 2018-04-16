"use strict";

/**
 * Room prototypal object.
 * Must be inherited from by all rooms in the state object.
 * @type {MyDate}
 */

const MyDate = require('./date');

const Room = {
    wantedTemp:  10,
    tempModifier: 0,
    heaters: {}
};

// this should not be here ....
function say( msg ) {
    console.log( MyDate().stringTime5() + ' ' + msg);
}

// stupid formatting function to get nicely aligned logs
function constantLength ( str ) {
    return  (str + '      ').slice(0,8);
}


Room.setTemperature = function( temperature ) {

    this.temp = temperature;

    this.checkHeaters();

};


/**
 * Checks if heaters should be turned on or off
 */
Room.checkHeaters = function() {

    const realWantedTemp = this.wantedTemp + this.tempModifier;

    // we now see if heaters need to be switched on or off
    if (this.temp < realWantedTemp) {
        // it's too cold: we turn heater on if not already on
        say( constantLength( this.name ) + " is cold: " + this.temp + '/' + realWantedTemp );

        // switch heaters on
        this.switchHeatersOn();

    } else if (this.temp > realWantedTemp) {
        // it's too how: we turn heater off if not already off
        say( constantLength( this.name ) + " is hot : " + this.temp + '/' + realWantedTemp);

        // switch heaters off
        this.switchHeatersOff();

    } else {
        say( constantLength( this.name ) + " is ok  : " + this.temp + '/' + realWantedTemp);
    }
};



/**
 * Switch all heaters ON in this room
 */
Room.switchHeatersOn = function() {
    for (let heater in this.heaters)
        this.heaters[heater].switchOn();
};

/**
 * Switch all heaters OFF in this room
 */
Room.switchHeatersOff = function() {
    for (let heater in this.heaters)
        this.heaters[heater].switchOff();
};



module.exports = Room;