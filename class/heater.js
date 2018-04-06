
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
    for (var index in this) {
        dumpfield( this[index], index);
    }
};

// switching on a heater
Heater.switchOn  = function() {
    this.state     = 'On';
    this.nbHitsOff = 0;
    if (this.nbHitsOn < 3) {
      this.nbHitsOn++;
      // send request to Domoticz API
      // todo: implement request

    }
};

// switching off a heater
Heater.switchOff = function() {
    this.state     = 'Off';
    this.nbHitsOn  = 0;
    if (this.nbHitsOff < 3) {
      this.nbHitsOff++;
      // send request to Domoticz API
      // todo: implement request

    }
};


// old factory function, but I think I just prefer to manipulate the __proto__
// chain manually
// function heaterFactory() {
//    return Object.create(Heater);
// }

module.exports = Heater;
