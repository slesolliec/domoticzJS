"use strict";

const googleSheetAPI = {};

const MyDate = require('./date');
const fs     = require('fs');

let configs;


/**
 * Stupid console.log wrapper because I'm lazy
 * @param msg
 */
function say(msg) {
    console.log(msg);
}



googleSheetAPI.loadConfigs = function( path ) {
    configs = JSON.parse( fs.readFileSync( path ) );
};




googleSheetAPI.getTempsFromGoogleSheet = function() {

    // setting current date
    const now = new MyDate();
    say('---- ' + now.stringTime5() + ' ----');

    const wantedTempsFile = configs.root + 'wantedTemps.json';

    const GoogleSpreadsheet = require('google-spreadsheet');
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

                console.log(temps);

                // save temps
                fs.writeFile( wantedTempsFile, JSON.stringify(temps), function(err){ if(err) throw err; } );

            });

        });

    });

};


module.exports = googleSheetAPI;
