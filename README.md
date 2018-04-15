
# Managing Domoticz with node.js

I live in an old house with electric heating. I set up Domoticz so that I could fine tune when the heaters start and stop.
For that I have a few [thermo sensors](https://www.amazon.fr/Oregon-Scientific-THGR-D%C3%A9tecteur-temp%C3%A9rature/dp/B000M98NAI/ref=sr_1_2?s=books&ie=UTF8&qid=1516289462&sr=8-2&keywords=thermom%C3%A8tre+oregon+scientific)
and one [Chacon remote contact](https://www.amazon.fr/Module-Luminaire-On-Off-DiO/dp/B0033ZREXU/ref=sr_1_1?s=books&ie=UTF8&qid=1516289612&sr=8-1&keywords=chacon+dio)
per heater. Most of them are plugged to the pilot thread with a diode in a way that when the Chacon module is ON, it means that the heater is OFF.
Two of the heaters (old 1000W heaters) are directly plugged to the Chacon so they are on when the module is on.

I made some LUA scripts but they were not really nice. I tried to make Python work with Domoticz but couldn't figure it out.

Then I found that you could do everything with Domoticz with its JSON API. You simply need to have access to Domoticz API.
There is nothing to setup in Domoticz for that. If you have access to Domoticz's web interface, then you have access to the JSON API.

So here are the scripts that I use at home. Feel free to fork them to your needs.

What they do is basically:
1. Get the switches state
2. Get the temperatures
3. For each room and taking the time and day of the week into accound, they compute the wanted temperature
4. Send commands to Domoticz for each switch accordingly

I discovered that some orders sometimes get lost (thick walls) ... so every 15 minutes, if measured temperature is too far away
from wanted temperature, the order is re-sent.

The script also sums all minutes of heating for each room and uploads that data to a **Google Spreadsheet** every hour.
That way I have a precise view of my power and money consumption for each room for each day.

:star: Don't hesitate to star that repo if it was of any use for you  ;-)



# State machine

This module is basically managing the state machine that represents the house.
The state is inside the state variable. Insite that state var, we have the rooms object that contains all the room objects.
Insite de rooms, we have all the heaters that are in the heaters object that contains all the heater objects.
So for example, we have:
state.rooms.Kitchen.heaters.35 : that is the heater with device ID 35 (in Domoticz) in the room called Kitchen.
See example of state. (link to add)

