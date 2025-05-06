<script setup lang="ts">
// import PostListComponent from "@/components/Post/PostListComponent.vue";
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";
import { onMounted, ref, nextTick } from "vue";

const { currentUsername, isLoggedIn } = storeToRefs(useUserStore());

const mapApiKey = process.env.API_KEY;

const panorama = ref<google.maps.StreetViewPanorama>();
const mapInstance = ref<google.maps.Map>();

const gameState = ref<{
  actual: { lat: number; lng: number; name?: string } | null;
  guessed: { lat: number; lng: number } | null;
}>({
  actual: null,
  guessed: null,
});

const confirmButtonRef = ref<HTMLElement | null>(null);

const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;

const possibleLocations = [
  { name: "Paris", lat: 48.85193359482978, lng: 2.341119129465712 },
  { name: "Tokyo", lat: 35.6828, lng: 139.7826 },
  { name: "Rio", lat: -22.9068, lng: -43.1729 },
  { name: "San Francisco", lat: 37.78296, lng: -122.409 },
  { name: "New Delhi", lat: 28.61773401616612, lng: 77.22266647775261 },
  { name: "Berlin", lat: 52.51981889591784, lng: 13.40527844851572 },
  { name: "Copenhagen", lat: 55.68528333615939, lng: 12.571065471502148 },
  { name: "London", lat: 51.51384136469413, lng: -0.10135515009950274 },
  { name: "Miami", lat: 25.777763036557612, lng: -80.19204944313353 },
  { name: "New York", lat: 40.78425656438978, lng: -73.95410105377661 },
  { name: "Seattle", lat: 47.60518097176166, lng: -122.33359427779735 },
  { name: "Toronto", lat: 43.65255623264507, lng: -79.37853231921063 },
  { name: "Lima", lat: -12.11822626472855, lng: -77.02898088361121 },
  { name: "Mexico City", lat: 19.43636051795466, lng: -99.11850655115532 },
];

let marker: google.maps.Marker | null = null;

const geoguessr = ref(false);

const gameResult = ref<null | { distance: number; message: string }>(null);

const timer = ref(120); // 120 seconds
let countdownInterval: number | null = null;

async function startGeoGuessr() {
  gameResult.value = null; // clears previous round
  const random = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];
  geoguessr.value = true;
  goToLocation(random.lat, random.lng);
  gameState.value.actual = random;
  gameState.value.guessed = null;

  timer.value = 120;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = window.setInterval(() => {
    if (timer.value > 0) {
      timer.value--;
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      gameResult.value = {
        message: "⏰ Time's up!",
        distance: gameState.value.guessed ? haversineDistance(gameState.value.guessed, gameState.value.actual!) : NaN,
      };
    }
  }, 1000);

  await nextTick(); // Wait for #map to exist
  const confirmBtn = document.getElementById("confirm-button") ?? confirmButtonRef.value;
  console.log(confirmBtn);
  const mapEl = document.getElementById("map");
  if (mapEl) {
    mapInstance.value = new google.maps.Map(mapEl, {
      center: { lat: 0, lng: 0 }, // center anywhere, user will click
      zoom: 2,
    });

    mapInstance.value.addListener("click", handleMapClick);
  }

  if (confirmBtn) {
    confirmBtn.style.display = "block"; // Ensure visible again
    if (confirmBtn.parentElement) {
      confirmBtn.parentElement.removeChild(confirmBtn);
    }
    if (!mapInstance.value.controls[google.maps.ControlPosition.BOTTOM_CENTER].getArray().includes(confirmBtn)) {
      mapInstance.value.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(confirmBtn);
    }
  }
}

function endGeoGuessr() {
  const confirmBtn = document.getElementById("confirm-button");
  console.log(confirmBtn);
  confirmButtonRef.value = confirmBtn;

  console.log(confirmBtn);
  geoguessr.value = false;
  gameResult.value = null;
  gameState.value.actual = null;
  gameState.value.guessed = null;

  if (countdownInterval) {
    // clear timer
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  // Back to the dome
  const container = document.getElementById("pano");
  container!.innerHTML = "";
  panorama.value = new google.maps.StreetViewPanorama(container!, {
    position: { lat: 42.35797362455337, lng: -71.0909647613771 },
    pov: { heading: 0, pitch: 0 },
    visible: true,
    addressControl: true,
    showRoadLabels: true,
  });
}

function handleMapClick(event: google.maps.MapMouseEvent) {
  const guess = event.latLng;
  const confirmBtn = document.getElementById("confirm-button");
  if (confirmBtn) confirmBtn.style.display = "block";

  if (marker) marker.setMap(null); // remove previous marker

  marker = new google.maps.Marker({
    position: guess,
    map: mapInstance.value!,
    title: "Your guess",
  });

  gameState.value.guessed = { lat: guess.lat(), lng: guess.lng() };
}

function submitGuess() {
  if (!gameState.value.guessed || !gameState.value.actual) return;
  const dist = haversineDistance(gameState.value.guessed, gameState.value.actual);
  gameResult.value = {
    distance: dist,
    message: dist < 50 ? "🎯 Incredible!" : dist < 500 ? "👍 Not bad!" : "📍 Way off!",
  };
}

function haversineDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371; // km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((coord1.lat * Math.PI) / 180) * Math.cos((coord2.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function setupVoiceRecognition() {
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

let lastMoveTime = 0;
const MOVE_INTERVAL = 1000; // ms debouncing
let lastPanTime = 0;
let lastPanActivityTime = 0;
const PAN_INTERVAL = 300; // ms debounce for panning
const RECOVERY_TIME_AFTER_PAN = 500; // ms debounce from panning to movement
let lastGeocodeTime = 0;
const PAN_THRESHOLD = 0; // mm strict left / right boundary
let lastZoomTime = 0;
const ZOOM_INTERVAL = 300;
const VOICE_AFTER_ZOOM_DELAY = 1000;

const GEOCODE_INTERVAL = 1500; // ms to avoid rate limits

function initialize() {
  const dome = { lat: 42.35797362455337, lng: -71.0909647613771 };

  panorama.value = new google.maps.StreetViewPanorama(document.getElementById("pano") as HTMLElement, {
    position: dome,
    pov: { heading: -20, pitch: 10 },
    visible: true,
    addressControl: true,
  });

  setupLeapMotion();
}

function fadeOut(duration = 400): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.getElementById("fade-overlay")!;
    overlay.style.transition = `opacity ${duration}ms ease`;
    overlay.style.opacity = "1";
    setTimeout(() => resolve(), duration);
  });
}

function fadeIn(duration = 400): void {
  const overlay = document.getElementById("fade-overlay")!;
  overlay.style.transition = `opacity ${duration}ms ease`;
  overlay.style.opacity = "0";
}

function setupLeapMotion() {
  const ws = new WebSocket("ws://localhost:6437/v6.json");

  ws.onopen = () => {
    ws.send(JSON.stringify({}));
  };

  ws.onmessage = (event) => {
    const frame = JSON.parse(event.data);
    const now = Date.now();
    if (frame.hands) {
      // --- Pan left/right with two hands on left or right of sensor ---
      if (frame.hands.length === 2 && now - lastPanTime > PAN_INTERVAL) {
        const [hand1, hand2] = frame.hands;
        const x1 = hand1.palmPosition?.[0] ?? hand1.palmPosition?.x ?? 0;
        const x2 = hand2.palmPosition?.[0] ?? hand2.palmPosition?.x ?? 0;
        const y1 = hand1.palmPosition?.[1] ?? 0;
        const y2 = hand2.palmPosition?.[1] ?? 0;
        const avgY = (y1 + y2) / 2;
        console.log("height of hands: ", avgY);
        if (avgY > 250) {
          lastPanTime = now;
          lastPanActivityTime = now;
          panVertical("up", avgY);
          return;
        } else if (avgY < 150) {
          lastPanTime = now;
          lastPanActivityTime = now;
          panVertical("down", avgY);
          return;
        }

        // Both hands left
        if (x1 < -PAN_THRESHOLD && x2 < -PAN_THRESHOLD) {
          lastPanTime = now;
          lastPanActivityTime = now;
          const avgLeftDistance = Math.abs((x1 + x2) / 2);
          panHorizontal("left", avgLeftDistance);
          return;
        }
        // Both hands right
        if (x1 > PAN_THRESHOLD && x2 > PAN_THRESHOLD) {
          const avgRightDistance = Math.abs((x1 + x2) / 2);
          lastPanTime = now;
          lastPanActivityTime = now;
          panHorizontal("right", avgRightDistance);
          return;
        }
      } else {
        if (frame.hands.length === 1) {
          // only one hand at a time!
          // Move forward gesture or move backwards right / left
          const hand = frame.hands[0];
          const fingers = frame.pointables.filter((f: any) => f.handId === hand.id);
          const isFiveFingersExtended = fingers.length === 5 && fingers.every((f: any) => f.extended);
          const z = hand.palmPosition?.[2] ?? 0; // forward/backward (depth)
          const x = hand.palmPosition?.[0] ?? 0; // left/right
          const isInCenterZone = Math.abs(x) < 80 && z > 0 && z < 200;
          const isThumbOnly = fingers.length === 5 && fingers[0]?.extended === true && [1, 2, 3, 4].every((i) => fingers[i]?.extended === false);
          const isThumbAndIndexOnly = fingers.length === 5 && fingers[0]?.extended === true && fingers[1]?.extended === true && [2, 3, 4].every((i) => fingers[i]?.extended === false);
          if (isThumbAndIndexOnly) {
            const thumb = fingers[0];
            const index = fingers[1];
            const thumbPos = thumb.tipPosition;
            const indexPos = index.tipPosition;

            const dx = thumbPos[0] - indexPos[0];
            const dy = thumbPos[1] - indexPos[1];
            const dz = thumbPos[2] - indexPos[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            // console.log(distance);

            if (distance < 60 && now - lastPanTime > PAN_INTERVAL && now - lastZoomTime > ZOOM_INTERVAL) {
              lastPanTime = now;
              lastZoomTime = now;
              zoomIn();
              return;
            } else if (distance > 100 && now - lastPanTime > PAN_INTERVAL && now - lastZoomTime > ZOOM_INTERVAL) {
              lastPanTime = now;
              lastZoomTime = now;
              zoomOut();
              return;
            }
          }
          if (isThumbOnly && now - lastMoveTime > MOVE_INTERVAL && isInCenterZone && now - lastPanActivityTime > RECOVERY_TIME_AFTER_PAN && now - lastZoomTime > VOICE_AFTER_ZOOM_DELAY) {
            lastMoveTime = now;
            console.log("Triggering voice recognition");
            startVoiceRecognition();
            return;
          }
          const isIndexFingerOnly = fingers.length === 5 && fingers[1]?.extended === true && [0, 2, 3, 4].every((i) => fingers[i]?.extended === false);
          const isIndexAndMiddleFingerOnly = fingers.length === 5 && fingers[1]?.extended === true && fingers[2]?.extended === true && [0, 3, 4].every((i) => fingers[i]?.extended === false);
          if (isInCenterZone && now - lastMoveTime > MOVE_INTERVAL && now - lastPanActivityTime > RECOVERY_TIME_AFTER_PAN) {
            lastMoveTime = now;
            let steps = 0;
            if (hand.type === "right") {
              if (isIndexFingerOnly) {
                steps = 1;
              } else if (isIndexAndMiddleFingerOnly) {
                steps = 2;
              } else if (isFiveFingersExtended) {
                steps = 3;
              }
              console.log("moving forward");
              console.log(steps);
              void moveStreetViewForward(steps);
            }
          }
        }
      }
    }
  };
}

async function moveStreetViewForward(steps = 1) {
  if (!panorama.value || steps <= 0) return;

  const currentPov = panorama.value.getPov();
  const currentHeading = currentPov.heading;
  const currentLinks = panorama.value.getLinks();

  if (!currentLinks || currentLinks.length === 0) return;

  // Find the link whose heading is closest to the current POV heading
  let minDiff = 360;
  let bestLink = currentLinks[0];

  for (const link of currentLinks) {
    const diff = Math.abs((((link?.heading ?? 0) - currentHeading + 540) % 360) - 180);
    if (diff < minDiff) {
      minDiff = diff;
      bestLink = link;
    }
  }

  if (bestLink && bestLink.pano) {
    const container = document.getElementById("pano");
    if (container) {
      container.style.filter = "blur(6px)";
    }
    await fadeOut(200);
    container!.innerHTML = ""; // destroy previous instance, necessary due to pano transition bug

    panorama.value = null;

    panorama.value = new google.maps.StreetViewPanorama(container!, {
      pano: bestLink.pano,
      pov: { heading: bestLink.heading ?? currentHeading, pitch: 0 },
      visible: true,
      addressControl: !geoguessr.value,
      showRoadLabels: !geoguessr.value,
    });

    panorama.value?.setPov({
      heading: bestLink?.heading ?? 0, // Use the link's heading
      pitch: 0,
    });

    fadeIn(200);
    setTimeout(() => {
      if (container) {
        container.style.filter = "none"; // remove blur
      }
    }, 200);

    setTimeout(() => {
      const img = document.getElementById("pano-freeze-frame");
      if (img) {
        img.style.opacity = "0"; // fade it out
        img.src = ""; // optional: clear to release memory
      }
    }, 200); // match pano transition + fade duration

    // Wait briefly for pano to load before next step
    setTimeout(() => {
      // Recursively move again if steps remain
      void moveStreetViewForward(steps - 1);
    }, 400); // Slight delay to avoid collapsing transitions
  }
}

// function moveStreetViewBackward() {
//   if (!panorama.value) return;

//   const currentPov = panorama.value.getPov();
//   const currentLinks = panorama.value.getLinks();
//   if (!currentLinks || currentLinks.length === 0) return;

//   let minDiff = 360;
//   let bestLink = currentLinks[0];
//   const backwardHeading = (currentPov.heading + 180) % 360;

//   for (const link of currentLinks) {
//     const diff = Math.abs(((link?.heading ?? 0 - backwardHeading + 540) % 360) - 180);
//     if (diff < 90 && diff < minDiff) {
//       minDiff = diff;
//       bestLink = link;
//     }
//   }

//   const container = document.getElementById("pano");
//   container!.innerHTML = ""; // destroy previous instance

//   panorama.value = new google.maps.StreetViewPanorama(container!, {
//     pano: bestLink?.pano,
//     pov: { heading: currentPov.heading, pitch: 0 },
//     visible: true,
//   });
// }

function panHorizontal(direction: "left" | "right", distanceFromCenter: number) {
  if (!panorama.value) return;
  const pov = panorama.value.getPov();

  // Clamp distance to a reasonable range (in mm)
  const clampedDistance = Math.min(Math.abs(distanceFromCenter), 150); // max boost at 150mm
  const baseDelta = 10;
  const maxExtra = 30; // maximum additional degrees at full distance
  const delta = baseDelta + (clampedDistance / 150) * maxExtra;

  let newHeading = direction === "left" ? pov.heading - delta : pov.heading + delta;
  newHeading = (newHeading + 360) % 360;

  panorama.value.setPov({ ...pov, heading: newHeading });
}

function panVertical(direction: "up" | "down", avgY: number) {
  if (!panorama.value) return;

  const pov = panorama.value.getPov();

  // Adjust pitch scaling based on hand height
  let delta = 10; // base pitch change
  if (direction === "up") {
    const factor = Math.min((avgY - 250) / 100, 1); // max boost at Y=350
    delta += factor * 20; // max 30° change
    panorama.value.setPov({ ...pov, pitch: Math.min(pov.pitch + delta, 90) });
  } else {
    const factor = Math.min((120 - avgY) / 70, 1); // max boost at Y=50
    delta += factor * 20;
    panorama.value.setPov({ ...pov, pitch: Math.max(pov.pitch - delta, -90) });
  }

  console.log(`Looking ${direction}, delta: ${delta}`);
}

function zoomIn() {
  if (!panorama.value) return;

  const current = panorama.value.getZoom() ?? 1;
  panorama.value.setZoom(Math.min(current + 1, 5));
}

function zoomOut() {
  if (!panorama.value) return;
  const current = panorama.value.getZoom() ?? 1;
  panorama.value.setZoom(Math.max(current - 1, 0));
}

// Call this function from a button or onMounted if you want auto-start
function startVoiceRecognition() {
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

  let timeoutId = setTimeout(() => {
    recognition.stop();
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
        alert(`Voice guess: ${matched.name}. You were ${dist.toFixed(1)} km away!`);
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
    recognition.stop();
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

function goToLocation(lat: number, lng: number) {
  const container = document.getElementById("pano");
  container!.innerHTML = "";
  panorama.value = new google.maps.StreetViewPanorama(container!, {
    position: { lat, lng },
    pov: { heading: 0, pitch: 0 },
    addressControl: !geoguessr.value,
    showRoadLabels: !geoguessr.value,
    visible: true,
  });
}

onMounted(() => {
  window.initialize = initialize;
  setupVoiceRecognition();

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&callback=initialize`;
  document.head.appendChild(script);
});

declare global {
  interface Window {
    initialize: () => void;
  }
}
</script>

<template>
  <main>
    <!-- <h1>Home Page</h1> -->
    <section>
      <h1 v-if="isLoggedIn">Welcome {{ currentUsername }}!</h1>
      <h1 v-else>Please login!</h1>
    </section>
    <div v-if="geoguessr" class="timer-overlay">⏱️ {{ Math.floor(timer / 60) }}:{{ (timer % 60).toString().padStart(2, "0") }}</div>
    <button @click="startGeoGuessr">🎲 Start GeoGuessr</button>
    <button @click="startVoiceRecognition">🎤 Voice Command</button>

    <div id="status-message" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: #000c; color: white; padding: 8px 16px; border-radius: 8px; z-index: 1000"></div>
    <div style="position: relative; width: 100%; height: 550px">
      <div id="pano" style="width: 100%; height: 100%"></div>
      <div v-if="geoguessr" id="map" class="guess-map"></div>
      <button v-if="geoguessr" id="confirm-button" :disabled="!gameState.guessed" @click="submitGuess">✅ Confirm Guess</button>
      <div id="fade-overlay"></div>
    </div>
    <div v-if="gameResult" class="result-popup">
      <h2>{{ gameResult.message }}</h2>
      <p>You were {{ gameResult.distance.toFixed(1) }} km away.</p>
      <div style="margin-top: 16px">
        <button @click="startGeoGuessr">🔁 Play Again</button>
        <button @click="endGeoGuessr">❌ Exit</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
h1 {
  text-align: center;
}
</style>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Roboto, sans-serif;
  background-color: #0f1117;
  color: #f5f5f5;
  margin: 0;
  padding: 0;
}

main {
  padding: 16px;
  max-width: 960px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #f0f4ff;
}
button {
  background: linear-gradient(135deg, #4a90e2, #6f79ff);
  border: none;
  color: white;
  padding: 12px 20px;
  margin: 0.5rem;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.25s ease;
}

button:hover:not(:disabled) {
  background: linear-gradient(135deg, #6f79ff, #4a90e2);
  transform: scale(1.03);
}

button:disabled {
  background: #444;
  opacity: 0.6;
  cursor: not-allowed;
}

#confirm-button {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  font-size: 18px;
  height: 60px;
  z-index: 1003;
  border-radius: 0;
}

#status-message {
  font-family: monospace;
  letter-spacing: 0.5px;
  text-align: center;
  font-size: 14px;
}

#fade-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 1000;
}

.guess-map {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border: 2px solid white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1001;
  transform: scale(1);
  transition: all 0.3s ease;
}

.guess-map:hover {
  width: 500px;
  height: 350px;
  bottom: 10px;
  right: 10px;
  transform: scale(1.03);
  z-index: 1002;
}

.timer-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(22, 30, 50, 0.9);
  color: #ffffff;
  font-size: 18px;
  padding: 6px 14px;
  border-radius: 8px;
  z-index: 1001;
  font-family: monospace;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
}

.result-popup {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -30%);
  background: linear-gradient(to right, #21242d, #2c2f3a);
  padding: 24px 36px;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  text-align: center;
  color: #f0f0f0;
  animation: fadeIn 0.4s ease;
}

.result-popup h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.result-popup p {
  font-size: 18px;
  margin-bottom: 20px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -40%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -30%);
  }
}
</style>
