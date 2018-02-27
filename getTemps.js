"use strict";

const https = require("http");
const fs    = require("fs");

require("./datetime-helpers.js");

// loading configs
const configs = JSON.parse( fs.readFileSync("configs.json") );

// setting current date
const now = new Date();
console.log('---- ' + now.getHours() + ':' + now.getMinutes() + ' ----');


getTempsFromGoogleSheet();


function getTempsFromGoogleSheet() {

    // this should only do something once every hour
//    if (now.getMinutes() !== 01)
//        return;

    const GoogleSpreadsheet = require('google-spreadsheet');
    const creds = require('./client-secret');

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet(configs.GoogleTempSheetID);

    const temps = {
        Bed:    {},
        Living: {},
        Kitchen:{},
        Bath:   {}
    };

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            console.log('Loaded doc     : ' + info.title);  // +' by '+info.author.email);
            console.log('Last updated at: ' + info.updated);

            // check if local file is up to date
            if (fs.existsSync( configs.root + 'wantedTemps/' + now.stringDate8() + '.json')) {
                var stats = fs.statSync( configs.root + 'wantedTemps/' + now.stringDate8() + '.json' );
                console.log(stats.mtime);
                if (stats.mtime > new Date( info.updated )) {
                    console.log("Local file up to date");
                    return;
                }
            }

            // sheet updated: we need to download data
            const sheet = info.worksheets[now.getDay()];
            console.log('Sheet          : ' + sheet.title);

            sheet.getCells({
                'min-row':  2,
                'max-row': 49,
                'min-col':  1,
                'max-col':  5,
                'return-empty':true
            }, function(err, cells) {

                if (err) console.log(err);

                var currentTime;

                cells.forEach( function (oneCell) {
                    // update time for each line
                    if (oneCell.col === 1)
                        currentTime = oneCell.value;

                    if (oneCell.value !== '') {
                        switch (oneCell.col) {
                            case 2: temps.Bed[currentTime]     = oneCell.value; break;
                            case 3: temps.Living[currentTime]  = oneCell.value; break;
                            case 4: temps.Kitchen[currentTime] = oneCell.value; break;
                            case 5: temps.Bath[currentTime]    = oneCell.value; break;
                        }
                    }
                });

                console.log(temps);

                // save temps
                fs.writeFile("wantedTemps/" + now.stringDate8() + ".json", JSON.stringify(temps), function(err){ if(err) throw err; } );

            });

        });

    });


}


