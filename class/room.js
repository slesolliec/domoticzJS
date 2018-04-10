
Room = {};


function say( msg ) {
    console.log( now.stringTime5() + ' ' + msg);
}



Room.setTemperature = function( temperature ) {

    this.Temp = temperature;

    this.checkHeaters();

};


/**
 * Checks if heaters should be turned on or off
 */
Room.checkHeaters = function() {
    // we now see if heaters need to be switched on or off
    if (this.Temp < this.wantedTemp) {
        // it's too cold: we turn heater on if not already on
        say( constantLength( this.Name ) + " is cold: " + this.Temp + '/' + this.wantedTemp );

        // switch heaters on
        this.switchHeatersOn();

    } else if (this.Temp > this.wantedTemp) {
        // it's too how: we turn heater off if not already off
        say( constantLength( this.Name ) + " is hot : " + this.Temp + '/' + this.wantedTemp);

        // switch heaters off
        this.switchHeatersOff();

    } else {
        say( constantLength( room ) + " is ok  : " + this.Temp + '/' + this.wantedTemp);
    }
};



/**
 * Switch all heaters ON in this room
 */
Room.switchHeatersOn = function() {
    for (heater in this.heaters)
        this.heaters[heater].switchOn();
};

/**
 * Switch all heaters OFF in this room
 */
Room.switchHeatersOff = function() {
    for (heater in this.heaters)
        this.heaters[heater].switchOff();
};



module.exports = Room;