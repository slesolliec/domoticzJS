

var heater = {};

heater.name      = '';
heater.devIdx    = null;
heater.state     = 'Off';
heater.HC        = 0;
heater.HP        = 0;
heater.nbHitsOn  = 0;
heater.nbHitsOff = 0;

function dumpfield( item, index) {
    console.log( index + ' = ' + item);
}
heater.dump      = function() {
    for (var index in this) {
        dumpfield( this[index], index);
    }
};


heater.switchOn  = function() {
    this.state     = 'On';
    this.nbHitsOff = 0;
    this.nbHitsOn++;
};


heater.switchOff = function() {
    this.state     = 'Off';
    this.nbHitsOff++;
    this.nbHitsOn  = 0;
};


heater.isInverted = function() {
    return true;
};


heater.getPower   = function() {
    return 1000;
};


function heaterFactory() {
    return Object.create(heater);
}


module.exports = heaterFactory;

