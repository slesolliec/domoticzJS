/**
    Main module.

 */


// get my extended myDate() object factory
var myDate = require('./class/date');

// setting current date
const now = new myDate();


function say( msg ) {
    console.log( now.stringTime5() + ' ' + msg);
}


module.exports = {
    say: say
};
