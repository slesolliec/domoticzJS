"use strict";

/**
 * Room prototypal object.
 * Must be inherited from by all rooms in the state object.
 * @type {MyDate}
 */

const MyDate = require("./date");

const Room = {
    name:  "a room",
    temp:        10,
    wantedTemp:  10,
    tempModifier: 0,
    heaters:     {},
    state:    "Off",
    HC:           0,
    HP:           0,
    nbHitsOn:     0,
    nbHitsOff:    0,
    lastSwitchTime: new Date().toISOString()
};

// this should not be here ....
function say( msg ) {
    console.log( MyDate().stringTime5() + " " + msg);
}

// stupid formatting function to get nicely aligned logs
function constantLength ( str ) {
    return  (str + "      ").slice(0,8);
}


Room.setTemperature = function( temperature ) {
    // say(" Setting temperature "+ temperature + " to room " + this.name);
    this.temp = temperature;
    this.checkHeat();
};


/**
 * Checks if heaters should be turned on or off
 */
Room.checkHeat = function() {

    const realWantedTemp = this.wantedTemp + this.tempModifier;

    // say("checking heat for room " + this.name);

    // we now see if heaters need to be switched on or off
    if (this.temp < realWantedTemp) {
        // it's too cold: we turn heater on if not already on
        say( constantLength( this.name ) + " is cold: " + this.temp + "/" + realWantedTemp );

        // switch heaters on
        this.switchOn();

    } else if (this.temp > realWantedTemp) {
        // it's too how: we turn heater off if not already off
        say( constantLength( this.name ) + " is hot : " + this.temp + "/" + realWantedTemp);

        // switch heaters off
        this.switchOff();

    } else {
        say( constantLength( this.name ) + " is ok  : " + this.temp + "/" + realWantedTemp);
    }
};


// switching on the room
Room.switchOn  = function() {

    const now = new Date();

    // first switching
    if (this.state === "Off") {
        say("Switching ON  " + this.name);
        this.nbHitsOn   = 1;
        this.nbHitsOff  = 0;
        this.state      = "On";
        this.lastSwitchTime = now.toISOString();
        this.switchHeatersOn();
        return;
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
    if ( (now.getTime() - new Date( this.lastSwitchTime ).getTime()) / 1000 < 900 )
        return;

    // resend switch order
    say( "Switching ON " + this.name + " (resent)" );
    this.nbHitsOn++;
    this.lastSwitchTime = now.toISOString();
    this.switchHeatersOn();
};


/**
 * Switch all heaters ON in this room
 */
Room.switchHeatersOn = function() {
    for (let heater in this.heaters)
        this.heaters[heater].switchOn();
};


// switching off the room
Room.switchOff = function() {

    const now = new Date();

    // first switching
    if (this.state === "On") {
        say("Switching OFF " + this.name);
        this.nbHitsOn   = 0;
        this.nbHitsOff  = 1;
        this.state      = "Off";
        this.lastSwitchTime = now.toISOString();
        this.switchHeatersOff();
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
    if ( (now.getTime() - new Date( this.lastSwitchTime ).getTime()) / 1000 < 900 )
        return;

    // resend switch order
    say( "Switching OFF " + this.name + " (resent)" );
    this.nbHitsOff++;
    this.lastSwitchTime = now.toISOString();
    this.switchHeatersOff();
};


/**
 * Switch all heaters OFF in this room
 */
Room.switchHeatersOff = function() {
    for (let heater in this.heaters)
        this.heaters[heater].switchOff();
};



module.exports = Room;
