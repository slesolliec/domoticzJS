
var Heater = {};

Heater.name      = '';
Heater.devIdx    = null;
Heater.state     = 'Off';
Heater.HC        = 0;
Heater.HP        = 0;
Heater.nbHitsOn  = 0;
Heater.nbHitsOff = 0;

function dumpfield( item, index) {
    console.log( index + ' = ' + item);
}
Heater.dump      = function() {
    for (var index in this) {
        dumpfield( this[index], index);
    }
};


Heater.switchOn  = function() {
    this.state     = 'On';
    this.nbHitsOff = 0;
    this.nbHitsOn++;
};


Heater.switchOff = function() {
    this.state     = 'Off';
    this.nbHitsOff++;
    this.nbHitsOn  = 0;
};


Heater.isInverted = function() {
    return true;
};


Heater.getPower   = function() {
    return 1000;
};


function heaterFactory() {
    return Object.create(Heater);
}


module.exports = {
    Heater,
    heaterFactory
};

