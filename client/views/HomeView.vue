<script setup lang="ts">
import { onMounted } from "vue";
import { mapApiKey } from "../utils/constants";
import { endGeoGuessr, gameResult, gameState, geoguessr, startGeoGuessr, submitGuess, timer } from "../utils/geoguessrUtils";
import { setupLeapMotion } from "../utils/leapMotion";
import { panorama } from "../utils/StreetViewUtils";
import { setupVoiceRecognition, startVoiceRecognition } from "../utils/voiceRecognition";

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
