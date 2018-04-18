"use strict";

//  A good tutorial for accessing Google Sheets with node
//   https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html

const googleSheetAPI = {};

const MyDate            = require('./date');
const fs                = require('fs');
const GoogleSpreadsheet = require('google-spreadsheet');


/**
 * Stupid console.log wrapper because I'm lazy
 * @param msg
 */
function say(msg) {
    console.log(msg);
}


googleSheetAPI.getTempsFromGoogleSheet = function( configs ) {

    // setting current date
    const now = new MyDate();
    say('---- ' + now.stringTime5() + ' ----');

    const wantedTempsFile = configs.root + 'wantedTemps.json';

    const creds = require( configs.GoogleAPIclientSecret );

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet( configs.GoogleTempSheetID );

    const temps = {};

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            say('Loaded doc     : ' + info.title);  // +' by '+info.author.email);
            say('Last updated at: ' + info.updated);

            // check if local file is up to date
            if (fs.existsSync( wantedTempsFile)) {
                const stats = fs.statSync( wantedTempsFile);
                const lastWritten = new MyDate(stats.mtime);

                if ((lastWritten.toISOString() > info.updated) && ( lastWritten.stringDate8() === now.stringDate8())) {
                    say("Local file up to date");
                    return;
                }
            }

            // sheet updated or new day: we need to download data
            const sheet = info.worksheets[now.getDay()];
            say('Sheet          : ' + sheet.title);

            sheet.getCells({
                'min-row':  1,
                'max-row': 10,
                'min-col':  1,
                'max-col': 10,
                'return-empty':true
            }, function(err, cells) {

                if (err) say(err);

                let currentCell = cells.shift();
                let temps    = {};
                let roomcols = {};

                // read the rooms names in the first row
                while (currentCell.row === 1) {
                    if ((currentCell.col > 1) && (currentCell.value !== '')) {
                        temps[currentCell.value] = {};
                        roomcols[currentCell.col] = currentCell.value;
                    }
                    currentCell = cells.shift();
                }
                cells.unshift(currentCell);

                let currentTime;

                // read all the other cells
                cells.forEach( function (oneCell) {
                    // update time for each line
                    if (oneCell.col === 1) {
                        currentTime = oneCell.value;
                    } else {
                        // add temp
                        if (oneCell.value !== '') {
                            temps[ roomcols[oneCell.col] ][currentTime] = oneCell.value;
                        }
                    }

                });

                say(temps);

                // save wanted temperatures cache file
                // so that we don't need to bother Google Sheets every minute
                fs.writeFile( wantedTempsFile, JSON.stringify(temps), function(err){ if(err) throw err; } );
            });
        });
    });
};


googleSheetAPI.uploadToGoogleSheet = function( configs, state ) {

    const now = new MyDate();

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet(configs.GoogleSheetID);

    const creds = require( configs.GoogleAPIclientSecret );

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            say('Loaded doc: '+info.title+' by '+info.author.email);
            const sheet = info.worksheets[1];
            say('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);

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
                    say('Cell R' + oneCell.row + ' C' + oneCell.col + ' = ' + oneCell.value);
                });

                for ( let roomName in state.rooms) {
                    let oneRoom = state.rooms[roomName];

                    say( roomName + ' : HC=' + oneRoom.HC + ' HP=' + oneRoom.HP);

                }

                /*

                // we write the new cell's values
                if ((now.getHours() < 10) || (now.getHours() > 21)) {
                    // we don't update HC after 10:00 or before 22:00
                    if (state.Bed.HC     !== 0) cells[1].value  = state.Bed.HC;
                    if (state.Living.HC  !== 0) cells[5].value  = state.Living.HC;
                    if (state.Kitchen.HC !== 0) cells[9].value  = state.Kitchen.HC;
                    if (state.Bath.HC    !== 0) cells[13].value = state.Bath.HC;
                }

                if ((now.getHours() > 5) || (now.getHours() < 23)) {
                    // we don't update HP after 23:00 or before 06:00
                    if (state.Bed.HP !== 0) cells[2].value = state.Bed.HP;
                    if (state.Living.HP !== 0) cells[6].value = state.Living.HP;
                    if (state.Kitchen.HP !== 0) cells[10].value = state.Kitchen.HP;
                    if (state.Bath.HP !== 0) cells[14].value = state.Bath.HP;
                }

                sheet.bulkUpdateCells(cells, function(err) {
                    // block zeroing values if we got an error
                    if (err != null) throw err;

                    // we can zero values
                    if ( now.getHCHP() === 'HC') {
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
*/

            })
        });

    });

};




module.exports = googleSheetAPI;
