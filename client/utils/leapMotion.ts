import { moveStreetViewForward, panHorizontal, panVertical, zoomIn, zoomOut } from "./StreetViewUtils";
import { MOVE_INTERVAL, PAN_INTERVAL, PAN_THRESHOLD, RECOVERY_TIME_AFTER_PAN, VOICE_AFTER_ZOOM_DELAY, ZOOM_INTERVAL } from "./constants";
import { startVoiceRecognition } from "./voiceRecognition";
let lastMoveTime = 0;

let lastPanTime = 0;
let lastPanActivityTime = 0;

let lastZoomTime = 0;

export function setupLeapMotion() {
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
              console.log("steps: " + steps);
              void moveStreetViewForward(steps);
            }
          }
        }
      }
    }
  };
}
