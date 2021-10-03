"use strict";

//  A good tutorial for accessing Google Sheets with node
//   https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html

const googleSheetAPI = {};

const MyDate            = require("./date");
const fs                = require("fs");
const {GoogleSpreadsheet} = require("google-spreadsheet");


/**
 * Stupid console.log wrapper because I'm lazy
 * @param msg
 */
function say(msg) {
    console.log(msg);
}

/**
 * We read wanted temperatures from the Google Calc sheet
 * @param configs
 */
googleSheetAPI.getTempsFromGoogleSheet = function( configs ) {

    // setting current date
    const now = new MyDate();
    say("---- " + now.stringTime5() + " ----");

    const wantedTempsFile = configs.root + "wantedTemps.json";

    const creds = require( configs.GoogleAPIclientSecret );

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet( configs.GoogleTempSheetID );

    const temps = {};

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

		if (err) {
			say("Error authenticating to Google: " + err);
			process.exit(1);
		}

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
			if (err) {
				say("Error getting Google sheet: " + err);
				process.exit(1);
			}
			
			say("Loaded doc     : " + info.title);  // +' by '+info.author.email);
            say("Last updated at: " + info.updated);

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
            say("Sheet          : " + sheet.title);

            sheet.getCells({
                "min-row":  1,
                "max-row": 20,
                "min-col":  1,
                "max-col": 10,
                "return-empty":true
            }, function(err, cells) {

                if (err) say(err);

                let currentCell = cells.shift();
                let temps    = {};
                let roomcols = {};

                // read the rooms names in the first row
                while (currentCell.row === 1) {
                    if ((currentCell.col > 1) && (currentCell.value !== "")) {
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
                        if (oneCell.value !== "") {
                            temps[ roomcols[oneCell.col] ][currentTime] = oneCell.value;
                        }
                    }

                });

                say(temps);

                // save wanted temperatures cache file
                // so that we don't need to bother Google Sheets every minute
                fs.writeFile( wantedTempsFile, JSON.stringify(temps, null, 4), function(err){ if(err) throw err; } );
            });
        });
    });
};


/**
 * We copy consumption data into a different Google Calc sheet
 * @param configs
 * @param state
 */
googleSheetAPI.uploadToGoogleSheet = function( configs, state ) {

    // we check some data have changed since last data update to Google Sheet
    let consoFingerprint = "";
    for ( let roomName in state.rooms) {
        let oneRoom = state.rooms[roomName];
        consoFingerprint += oneRoom.HC + ":" + oneRoom.HP + ";";
    }
    if (consoFingerprint === state.consoFingerprint) {
        // there is nothing new to update to Google
        zeroSomeValues(null, state);
        return;
    }
    state.consoFingerprint = consoFingerprint;

    const now = new MyDate();

    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    const doc = new GoogleSpreadsheet(configs.GoogleSheetID);

    const creds = require( configs.GoogleAPIclientSecret );

    // Authenticate with the Google Spreadsheets API.
    doc.useServiceAccountAuth(creds, function (err) {

        // Get infos and worksheets
        doc.getInfo( function(err, info) {
            say("Loaded doc: "+info.title+" by "+info.author.email);
            const sheet = info.worksheets[1];
            say("sheet 1: "+sheet.title+" "+sheet.rowCount+"x"+sheet.colCount);

            // Get today's cells
            const myRow = 2 + now.getDayOfYear() ;

            sheet.getCells({
                "min-row": myRow,
                "max-row": myRow,
                "min-col": 2,
                "max-col": 4 * Object.keys( state.rooms ).length,
                "return-empty": true
            }, function(err, cells) {

                // we display what is in the cells
                cells.forEach( function (oneCell) {
                    say("Cell R" + oneCell.row + " C" + oneCell.col + " = " + oneCell.value);
                });

                let i = 0;  // column counter

                // we write the new values from state.rooms.xx.HC and HP
                for ( let roomName in state.rooms) {
                    let oneRoom = state.rooms[roomName];

                    say( roomName + " : HC=" + oneRoom.HC + " HP=" + oneRoom.HP);

                    if (oneRoom.HC !== 0) cells[1 + i * 4].value = oneRoom.HC;
                    if (oneRoom.HP !== 0) cells[2 + i * 4].value = oneRoom.HP;

                    i++;
                }

                // we send the request to update the Google Calc sheet
                // in order to avoid callback hell, while still having access to state:
                // we need to use bind
                sheet.bulkUpdateCells(cells, zeroSomeValues.bind({},err,state));

            });
        });

    });

};


/**
 * This is just the same function as above, but without the return closure stuff.
 * It will be called with bind() so we can still have access to state var
 * @param err : error passed by bulkUpdateCells in case of failure
 * @param {*} state : state of the application
 */
function  zeroSomeValues(err, state) {

    // block zeroing values if we got an error
    if (err != null) {
        say("Error saving consumption values to Google Calc because:");
        console.log(err);
        return;
    }

    const now = new MyDate();

    // now that values are saved, we can zero some of them
    if ( now.getHCHP() === "HC") {
        for ( let roomName in state.rooms) {
            state.rooms[roomName].HP = 0;
        }
    } else {
        for ( let roomName in state.rooms) {
            state.rooms[roomName].HC = 0;
        }
    }

    // save state // should not be needed
    // fs.writeFile( state.file, JSON.stringify(state), function(err){ if(err) throw err; } );
}


module.exports = googleSheetAPI;
