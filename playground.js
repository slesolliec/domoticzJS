



var heater = require('./class/heater');

heaterKitchen = heater.heaterFactory();
heaterKitchen.switchOn();
heaterKitchen.switchOn();
// heaterKitchen.dump();
heaterLiving = Object.create(heater.Heater);
heaterKitchen.switchOn();
heaterLiving.switchOn();
heaterKitchen.switchOn();
// heaterKitchen.dump();

pro = Object.getPrototypeOf(heaterKitchen);

pro.titi = 22;

console.log( heaterKitchen.__proto__);
console.log( heaterKitchen.prototype);
console.log( heaterKitchen.constructor);

/*

tutu = {
    age: 12,
    name: 'Robert'
};

function Tata() {
    this.oldage = 75;
    this.oldname = "grrrrr";

    return this;
}



titi = {};
Object.setPrototypeOf( titi, tutu );
toto = Object.setPrototypeOf( {}, tutu);

tutu.weight = 75;


// titi = new Tata();

console.log(titi);
console.log('-----');
console.log( Object.getPrototypeOf( titi ));
console.log('-----');
console.log( titi.__proto__ );
console.log('-----');
console.log( titi.prototype );
console.log('-----');

/*
toto =  heaterFactory();

console.log( Object.getPrototypeOf( toto ));

console.log( toto.__proto__ );

*/