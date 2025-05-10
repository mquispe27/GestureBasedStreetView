import { ref } from "vue";
import { geoguessr } from "./geoguessrUtils";

export const panorama = ref<google.maps.StreetViewPanorama | null>();

export function goToLocation(lat: number, lng: number) {
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

export async function moveStreetViewForward(steps = 1) {
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

    if (panorama.value !== undefined) {
      panorama.value = null;
    }

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

    // setTimeout(() => {
    //   const img = document.getElementById("pano-freeze-frame");
    //   if (img) {
    //     img.style.opacity = "0"; // fade it out
    //     img.src = ""; // optional: clear to release memory
    //   }
    // }, 200); // match pano transition + fade duration

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

export function panHorizontal(direction: "left" | "right", distanceFromCenter: number) {
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

export function panVertical(direction: "up" | "down", avgY: number) {
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

export function zoomIn() {
  if (!panorama.value) return;

  const current = panorama.value.getZoom() ?? 1;
  panorama.value.setZoom(Math.min(current + 1, 5));
}

export function zoomOut() {
  if (!panorama.value) return;
  const current = panorama.value.getZoom() ?? 1;
  panorama.value.setZoom(Math.max(current - 1, 0));
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
