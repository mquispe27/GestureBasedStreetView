import { GEOCODE_INTERVAL } from "./constants";
import { gameResult, gameState, haversineDistance, possibleLocations, startGeoGuessr } from "./geoguessrUtils";
import { goToLocation, moveStreetViewForward, panHorizontal, panVertical, zoomIn, zoomOut } from "./StreetViewUtils";

const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;
let lastGeocodeTime = 0;

export function setupVoiceRecognition() {
  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser.");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

// Call this function from a button or onMounted if you want auto-start
export function startVoiceRecognition() {
  const wordToNumber: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  if (!recognition) return;

  const statusDiv = document.getElementById("status-message");
  if (statusDiv) statusDiv.innerText = "🎤 Listening...";
  recognition.start();

  const timeoutId = setTimeout(() => {
    if (recognition) recognition.stop();
    if (statusDiv) statusDiv.innerText = "Timeout - no voice input detected. Try again?";
    setTimeout(() => {
      if (statusDiv) statusDiv.innerText = "";
    }, 2000);
  }, 5000); // 5 seconds timeout

  recognition.onresult = async function (event: any) {
    clearTimeout(timeoutId);
    const command = event.results[0][0].transcript.trim().toLowerCase();
    console.log("Voice command:", command);

    const cityMatch = command.match(/(?:i (?:think|guess) (?:it's|it is)|(?:my)? guess is)\s+(.*)/);
    if (cityMatch && cityMatch[1]) {
      const guessName = cityMatch[1].toLowerCase();
      const matched = possibleLocations.find((loc) => loc.name.toLowerCase() === guessName);
      if (matched) {
        gameState.value.guessed = { lat: matched.lat, lng: matched.lng };
        const dist = haversineDistance(gameState.value.guessed, gameState.value.actual!);
        gameResult.value = {
          distance: dist,
          message: dist < 50 ? "🎯 Incredible!" : dist < 500 ? "👍 Not bad!" : "📍 Way off!",
        };
      }
    }

    if (command.includes("geoguessr")) {
      void startGeoGuessr();
      if (statusDiv) statusDiv.innerText = "Starting GeoGuessr mode...";
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }
    if (command.includes("zoom in")) {
      zoomIn();
      if (statusDiv) statusDiv.innerText = "Zooming in";
      setTimeout(() => (statusDiv!.innerText = ""), 1500);
      return;
    }

    if (command.includes("zoom out")) {
      zoomOut();
      if (statusDiv) statusDiv.innerText = "Zooming out";
      setTimeout(() => (statusDiv!.innerText = ""), 1500);
      return;
    }

    if (command.includes("move forward") || command.includes("go forward")) {
      const match = command.match(/(?:move|go) forward(?: (\w+))?/);
      let steps = 1;
      if (match && match[1]) {
        const val = match[1].toLowerCase();
        steps = parseInt(val);
        if (isNaN(steps) && wordToNumber[val]) {
          steps = wordToNumber[val];
        }
      }
      void moveStreetViewForward(steps);
      if (statusDiv) statusDiv.innerText = `🚶 Moving forward ${steps} step${steps > 1 ? "s" : ""}`;
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }
    if (command.includes("look left") || command.includes("turn left")) {
      panHorizontal("left", 150);
      if (statusDiv) statusDiv.innerText = "Looking left";
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }

    if (command.includes("look right") || command.includes("turn right")) {
      panHorizontal("right", 150);
      if (statusDiv) statusDiv.innerText = "Looking right";
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }

    if (command.includes("look up")) {
      panVertical("up", 300); // simulate high hands
      if (statusDiv) statusDiv.innerText = "Looking up";
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }

    if (command.includes("look down")) {
      panVertical("down", 50); // simulate low hands
      if (statusDiv) statusDiv.innerText = "Looking down";
      setTimeout(() => {
        if (statusDiv) statusDiv.innerText = "";
      }, 1000);
      return;
    }
    // Extract destination from command, e.g., "go to Harvard Square"
    const match = command.match(/(?:go to|take me to|navigate to|show me|bring me to|can we go to)\s+(.+)/);
    if (match && match[1]) {
      const address = match[1];
      const coords = await tryGeocode(address);
      console.log(coords);
      if (coords) {
        goToLocation(coords.lat, coords.lng);
        if (statusDiv) statusDiv.innerText = `Going to ${address}...`;
      } else {
        if (statusDiv) statusDiv.innerText = `Couldn't find address ${address}. Try again?`;
      }
    } else {
      if (statusDiv) statusDiv.innerText = "Command not recognized. Try saying 'go to' or 'take me to' or 'look up/down' or 'turn left / right' or 'go forward'.";
    }
    setTimeout(() => {
      if (statusDiv) statusDiv.innerText = "";
    }, 2000);
  };

  recognition.onspeechend = () => {
    if (recognition) recognition.stop();
    clearTimeout(timeoutId);
  };

  recognition.onerror = function (event: any) {
    clearTimeout(timeoutId);
    if (statusDiv) statusDiv.innerText = `Error: ${event.error}`;
    setTimeout(() => {
      if (statusDiv) statusDiv.innerText = "";
    }, 2000);
  };
}

async function tryGeocode(address: string) {
  const now = Date.now();
  if (now - lastGeocodeTime < GEOCODE_INTERVAL) {
    alert("Please wait before making another search.");
    return;
  }
  lastGeocodeTime = now;
  return await geocodeAddress(address);
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve) => {
    void geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        resolve(null);
      }
    });
  });
}
