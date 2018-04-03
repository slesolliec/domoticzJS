/**
    Main module.

 */

const fs     = require("fs");
const myDate = require('./class/date');

// setting current date
const now = new myDate();
let configs;
let state;

function say( msg ) {
    console.log( now.stringTime5() + ' ' + msg);
}


function loadConfigs( path ) {
    configs = JSON.parse( fs.readFileSync( path ) );
    say(" Configs:");
    console.log(configs);
}

function loadState( path ) {
    state = JSON.parse( fs.readFileSync( path ) );
    state.file = path;
    say(" State:");
    console.log(state);
}


module.exports = {
    loadConfigs,
    loadState
};
