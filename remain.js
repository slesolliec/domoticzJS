"use strict";

// this is an example of an application using the DomoticzJS module
// Because it is only active a few seconds per minutes,
// it is supposed to run as a cron job in order to eat as few ram as possible.


// const https = require("http");
// const fs    = require("fs");

// load main module
const domoJS = require("./index");
const gsheetAPI = require("./class/googleSheetAPI");

// load configs (put that file where it suits you)
domoJS.loadConfigs( __dirname + '/configs.json');

// gsheetAPI.loadConfigs(  __dirname + '/configs.json' );
// gsheetAPI.getTempsFromGoogleSheet();

// load house state (put that file where you want)
domoJS.loadState( __dirname + '/house_state.json');

// load wanted temperatures
domoJS.loadWantedTemps( __dirname + '/wantedTemps.json');

// we get the state of the switches of the heaters
// then it fetches current temperatures from Domoticz
// then it sends ON / OFF commands
domoJS.updateSwitchesStatus();

return;

// todo: update Calc sheet

// todo: save down state







//  A good tutorial for accessing Google Sheets with node
//   https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html
function uploadToGoogleSheet() {

    // this should only do something once every hour
    if (now.getMinutes() !== 0)
        return;

    const GoogleSpreadsheet = require('google-spreadsheet');
    const creds = require('./client-secret');

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet(configs.GoogleSheetID);

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            const sheet = info.worksheets[1];
            console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);

            // Get today's cells
            const myRow = 2 + now.getDayOfYear() ;

            sheet.getCells({
                'min-row': myRow,
                'max-row': myRow,
                'min-col': 2,
                'max-col': 16,
                'return-empty': true
            }, function(err, cells) {

                // we display what is in the cells
                cells.forEach( function (oneCell) {
                    console.log('Cell R' + oneCell.row + ' C' + oneCell.col + ' = ' + oneCell.value);
                });

                // we write the new cell's values
                if ( now.getHours() < 10) {
                    // we don't update HC after 10:00
                    if (state.Bed.HC     !== 0) cells[1].value  = state.Bed.HC;
                    if (state.Living.HC  !== 0) cells[5].value  = state.Living.HC;
                    if (state.Kitchen.HC !== 0) cells[9].value  = state.Kitchen.HC;
                    if (state.Bath.HC    !== 0) cells[13].value = state.Bath.HC;
                }

                if (state.Bed.HP     !== 0) cells[2].value  = state.Bed.HP;
                if (state.Living.HP  !== 0) cells[6].value  = state.Living.HP;
                if (state.Kitchen.HP !== 0) cells[10].value = state.Kitchen.HP;
                if (state.Bath.HP    !== 0) cells[14].value = state.Bath.HP;

                sheet.bulkUpdateCells(cells, function(err) {
                    // block zeroing values if we got an error
                    if (err != null) throw err;

                    // we can zero values
                    if (getHCHP( now ) === 'HC') {
                        state.Bed.HP     = 0;
                        state.Living.HP  = 0;
                        state.Kitchen.HP = 0;
                        state.Bath.HP    = 0;
                    } else {
                        state.Bed.HC     = 0;
                        state.Living.HC  = 0;
                        state.Kitchen.HC = 0;
                        state.Bath.HC    = 0;
                    }

                    // save state
                    fs.writeFile("house_state.json", JSON.stringify(state), function(err){ if(err) throw err; } );
                });


            })
        });

    });

}
