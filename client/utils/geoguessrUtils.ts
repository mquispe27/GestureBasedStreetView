import { nextTick, ref } from "vue";

import { goToLocation, panorama } from "./StreetViewUtils";

let countdownInterval: number | null = null;

export const geoguessr = ref(false);

let marker: google.maps.Marker | null = null;

const mapInstance = ref<google.maps.Map>();

const confirmButtonRef = ref<HTMLElement | null>(null);

export const timer = ref(120); // 120 seconds

export const possibleLocations = [
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

export const gameState = ref<{
  actual: { lat: number; lng: number; name?: string } | null;
  guessed: { lat: number; lng: number } | null;
}>({
  actual: null,
  guessed: null,
});

export const gameResult = ref<null | { distance: number; message: string }>(null);

export async function startGeoGuessr() {
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
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        gameResult.value = {
          message: "⏰ Time's up!",
          distance: gameState.value.guessed ? haversineDistance(gameState.value.guessed, gameState.value.actual!) : NaN,
        };
      }
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
    if (mapInstance.value) {
      if (!mapInstance.value.controls[google.maps.ControlPosition.BOTTOM_CENTER].getArray().includes(confirmBtn)) {
        mapInstance.value.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(confirmBtn);
      }
    }
  }
}

export function endGeoGuessr() {
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

export function submitGuess() {
  if (!gameState.value.guessed || !gameState.value.actual) return;
  const dist = haversineDistance(gameState.value.guessed, gameState.value.actual);
  gameResult.value = {
    distance: dist,
    message: dist < 50 ? "🎯 Incredible!" : dist < 500 ? "👍 Not bad!" : "📍 Way off!",
  };
}

export function haversineDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371; // km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((coord1.lat * Math.PI) / 180) * Math.cos((coord2.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

  gameState.value.guessed = { lat: guess?.lat() ?? 0, lng: guess?.lng() ?? 0 };
}
