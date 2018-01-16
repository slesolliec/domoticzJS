
//  At least some good tuto for accessing Google Sheets with node
//   https://www.twilio.com/blog/2017/03/google-spreadsheets-and-javascriptnode-js.html

var GoogleSpreadsheet = require('google-spreadsheet');
var creds = require('./client-secret');

// Create a document object using the ID of the spreadsheet - obtained from its URL.
var doc = new GoogleSpreadsheet('1IRk5PMhBQxvdJwA27Q7cFHOjEASY599Po3DJCIdj20U');

// Authenticate with the Google Spreadsheets API.
doc.useServiceAccountAuth(creds, function (err) {

    /* Get all of the rows from the spreadsheet.
    doc.getRows(1, function (err, rows) {
        console.log(rows);
    });
    */

    var sheet;

    // Get infos and worksheets
    doc.getInfo( function(err, info) {
        console.log('Loaded doc: '+info.title+' by '+info.author.email);
        var sheet = info.worksheets[1];
        console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);

        // Get a cell
        sheet.getCells({
            'min-row': 5,
            'max-row': 6,
            'min-col': 4,
            'max-col': 5,
            'return-empty': true
        }, function(err, cells) {
            console.log('Cell R' + cells[0].row + ' C' + cells[0].col + ' = ' + cells[0].value);
            console.log('Cell R' + cells[1].row + ' C' + cells[1].col + ' = ' + cells[1].value);
            console.log('Cell R' + cells[2].row + ' C' + cells[2].col + ' = ' + cells[2].value);
        })


    });



});

