
# Manging the temperature in your house with Domoticz, Google Docs and Node JS

This package is to be used with:

* A working Domoticz instance where you have heaters and thermometers
* A first Google Calc spreadsheet where you define which temperature you want per room, day, hour
* A second Google Calc spreadsheet where you simply want to see the total electricity consumption per room, day.
* A state (probably as a state.json file) Javascript object that represents the state of your house, including rooms, heaters, ...

Once you have all this, you can create a simple script (see example.js) that will:

1. Figure out which temperature you want in each of your rooms by fetching that data in a Google Calc sheet
2. Fetch the temperatures in your rooms by asking that to Domoticz
3. Send the right ON/OFF commands to your heaters
4. compute how much power you have used and upload that to Google Calc


# The context

I live in an old house with electric heating. I set up Domoticz so that I could fine tune when the heaters start and stop.
For that I have a few [thermo sensors](https://www.amazon.fr/Oregon-Scientific-THGR-D%C3%A9tecteur-temp%C3%A9rature/dp/B000M98NAI/ref=sr_1_2?s=books&ie=UTF8&qid=1516289462&sr=8-2&keywords=thermom%C3%A8tre+oregon+scientific)
and one [Chacon remote contact](https://www.amazon.fr/Module-Luminaire-On-Off-DiO/dp/B0033ZREXU/ref=sr_1_1?s=books&ie=UTF8&qid=1516289612&sr=8-1&keywords=chacon+dio)
per heater. Most of them are plugged to the pilot thread with a diode in a way that when the Chacon module is ON, it means that the heater is OFF.
Most of my old 1000W heaters are directly plugged to the Chacon so they are ON when the module is ON.

I made some LUA scripts but they were not really nice. I tried to make Python work with Domoticz but couldn't figure it out.

Then I found that you could do everything with Domoticz with its JSON API. You simply need to have access to Domoticz API.
There is nothing to setup in Domoticz for that. If you have access to Domoticz's web interface, then you have access to the JSON API.

So here are the scripts that I use at home. Feel free to fork them to your needs.


# Resending commands

I discovered that some orders sometimes got lost (thick walls) ... so every 15 minutes, I ressend the commands up to three times.


# State machine

This module is basically managing the state machine that represents the house.
The state is inside the state variable. Insite that state var, we have the rooms object that contains all the room objects.
Insite de rooms, we have all the heaters that are in the heaters object that contains all the heater objects.
So for example, we have:
state.rooms.Kitchen.heaters.35 : that is the heater with device ID 35 (in Domoticz) in the room called Kitchen.


:star: Don't hesitate to star that repo if it was of any use for you  ;-)

