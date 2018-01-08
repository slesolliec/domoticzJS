"use strict";

const https = require("http");

const url = "http://xxx.xxx.com/json.htm?username=&password=&type=devices&filter=temp&used=true";


function processTemp (element) {
    console.log(
        'Temp ' + element.Temp + ' for ' + element.Name + ' with idx=' + element.idx
    );
}


/*
https.get(url, function(res) {
    res.setEncoding("utf8");
    let body = "";
    res.on("data", function(data) { body += data; });
    res.on("end",  function() {
        console.log(body);
        body = JSON.parse(body);
        body.result.forEach( processTemp )
    });
});
*/

// we get the state of the house: night, out, day, gone
function getState( now ) {

    // Gone?
    // todo: test if we are all gone

    // Night?
    if ((now.getHours() < 5 ) || (now.getHours() === 6)  && (now.getMinutes() < 30))
        return 'night';
    if ((now.getHours() > 22) || (now.getHours() === 22) && (now.getMinutes() > 30))
        return 'night';

    // Home day or Work day?
    switch ( now.getDay() ) {
        case 1:
        case 2:
            if ((now.getHours() > 7 ) || (now.getHours() === 7) && (now.getMinutes() > 30))
                if (now.getHours() < 17 )
                    return 'out';
            break;
    }

    return 'day';
}


console.log( 'toto = ' + getState( new Date() ) );