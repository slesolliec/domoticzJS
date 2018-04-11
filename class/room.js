"use strict";

const MyDate = require('./date');

const Room = {};

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
    // we now see if heaters need to be switched on or off
    if (this.temp < this.wantedTemp) {
        // it's too cold: we turn heater on if not already on
        say( constantLength( this.name ) + " is cold: " + this.temp + '/' + this.wantedTemp );

        // switch heaters on
        this.switchHeatersOn();

    } else if (this.temp > this.wantedTemp) {
        // it's too how: we turn heater off if not already off
        say( constantLength( this.name ) + " is hot : " + this.temp + '/' + this.wantedTemp);

        // switch heaters off
        this.switchHeatersOff();

    } else {
        say( constantLength( this.name ) + " is ok  : " + this.temp + '/' + this.wantedTemp);
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