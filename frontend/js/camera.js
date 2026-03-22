const video = document.getElementById("webcam");
const handCanvas = document.getElementById("handCanvas");
const handCtx = handCanvas.getContext("2d");

const gestureStatus = document.getElementById("gestureStatus");

let collecting = false;
let currentLabel = "idle";
let dataset = [];

// prediction control variables
let lastPredictedGesture = "idle";
let lastJumpTime = 0;
const jumpCooldown = 300; // ms
let lastPredictTime = 0;
const predictInterval = 120; // ms

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults(onResults);

const API_BASE_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://gesture-flappy-bird.onrender.com";

async function predictGesture(flatLandmarks) {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        landmarks: flatLandmarks,
      }),
    });

    const data = await response.json();
    return data.gesture;
  } catch (error) {
    console.error("Predict error:", error);
    return "idle";
  }
}

async function onResults(results) {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (collecting) {
      gestureStatus.textContent = `Collecting: ${currentLabel}`;
    }

    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(handCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 3,
      });

      drawLandmarks(handCtx, landmarks, {
        color: "#FF0000",
        lineWidth: 1,
        radius: 4,
      });

      const flatLandmarks = [];
      for (const point of landmarks) {
        flatLandmarks.push(point.x, point.y, point.z);
      }

      if (collecting) {
        dataset.push({
          label: currentLabel,
          landmarks: flatLandmarks,
        });

        console.log("Collected:", dataset.length, currentLabel);
      }
      const now = Date.now();
      if (now - lastPredictTime >= predictInterval) {
        lastPredictTime = now;

        const predictedGesture = await predictGesture(flatLandmarks);
        gestureStatus.textContent = predictedGesture;

        // idle -> jump will trigger a jump
        if (
          predictedGesture === "jump" &&
          lastPredictedGesture !== "jump" &&
          now - lastJumpTime >= jumpCooldown
        ) {
          if (window.triggerBirdJump) {
            window.triggerBirdJump();
          }
          lastJumpTime = now;
        }
        lastPredictedGesture = predictedGesture;
      }
    }
  } else {
    gestureStatus.textContent = "Idle";
    lastPredictedGesture = "idle";
  }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      handCanvas.width = video.videoWidth;
      handCanvas.height = video.videoHeight;
    };

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 220,
      height: 165,
    });

    camera.start();
  } catch (error) {
    console.error("Camera error:", error);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "1") {
    currentLabel = "jump";
    collecting = true;
    console.log("Start collecting: jump");
  }

  if (e.key === "2") {
    currentLabel = "idle";
    collecting = true;
    console.log("Start collecting: idle");
  }

  if (e.key === "0") {
    collecting = false;
    console.log("Stop collecting");
  }

  if (e.key === "c") {
    dataset = [];
    collecting = false;
    console.log("Dataset cleared");
  }

  if (e.key === "s") {
    collecting = false;

    const blob = new Blob([JSON.stringify(dataset, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gesture_dataset.json";
    a.click();

    console.log("Dataset saved");
  }
});

startCamera();
