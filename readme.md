# Gesture and Voice Based Street View (ft. GeoGuessr)

## Guide to Files

api/index.ts -- boilerplate
client/assets -- boierplate
client/router/index.ts -- routing boilerplate (just home page and not found)
client/utils:
constants.ts -- A few constants for my project, mainly debouncing / cooldown times to not conflate two gestures at once
geoguessrUtils.ts -- contains all functionality for the GeoGuessr game mode.
leapMotion.ts -- handles gesture logic from Leap Motion web socket and passes it to app as commands
StreetViewUtils.ts -- handles panorama changes and all things Street View -- all commands implemented
voiceRecognition.ts -- handles voice commands from Web Speech API and passes it to app as commands

client/views
HomeView.vue -- The home page with initial screen and styles.
leap.d.ts -- A necessary wrapper for TypeScript purposes.
NotFoundView.vue -- Placeholder boilerplate for errors.

client/App.vue -- boilerplate and more styles.
client/main.ts -- boilerplate
index.html -- boilerplate
vite.config.ts -- boilerplate
public/favicon.ico -- boilerplate


## Instructions to Run

First, clone this and set your own Google Maps API key in a hidden .env file as API_KEY.

Then, acquire a Leap controller and clone the web socket functionality at:

https://github.com/ultraleap/UltraleapTrackingWebSocket

and keep it in a folder with the same parent as GestureBasedStreetView.

In file explorer, navigate to build and run UltraleapTracking-WS by clicking the executable.

Then in another terminal, run GestureBasedStreetView with npm run dev:client

Open localhost:5173 in CHROME for the Web Speech API to work.
