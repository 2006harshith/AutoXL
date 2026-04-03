const API_URL = "http://127.0.0.1:8000";

let parsedData = null;
let lastPredictions = [];

const csvFile = document.getElementById("csvFile");
const targetInput = document.getElementById("targetCol");
const trainBtn = document.getElementById("trainBtn");
const predictBtn = document.getElementById("predictBtn");
const downloadBtn = document.getElementById("downloadBtn");

const statusDiv = document.getElementById("status");
const errorBox = document.getElementById("errorBox");
const resultBox = document.getElementById("resultBox");

const taskTypeDiv = document.getElementById("taskType");
const bestModelDiv = document.getElementById("bestModel");
const metricsDiv = document.getElementById("metrics");
const topFeaturesDiv = document.getElementById("topFeatures");


// -------- CSV PARSER --------
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  return lines.slice(1).map(line => {
    const values = line.split(",");
    let obj = {};

    headers.forEach((h, i) => {
      let val = values[i]?.trim();

      if (!isNaN(val) && val !== "") {
        val = Number(val);
      }

      obj[h] = val;
    });

    return obj;
  });
}


// -------- FILE LOAD --------
csvFile.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (!file) {
    showError("No file selected");
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result;

    parsedData = parseCSV(text);
    console.log("Parsed Data:", parsedData);

    showStatus("CSV loaded: " + parsedData.length + " rows");
  };

  reader.onerror = () => {
    showError("Error reading file");
  };

  reader.readAsText(file);
});


// -------- UI --------
function showStatus(msg) {
  statusDiv.textContent = msg;
  statusDiv.classList.remove("hidden");
}

function hideStatus() {
  statusDiv.classList.add("hidden");
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
}


// -------- TRAIN --------
trainBtn.onclick = async () => {
  clearError();

  if (!parsedData) {
    showError("Upload CSV first");
    return;
  }

  const target = targetInput.value.trim().toLowerCase();

  try {
    showStatus("Training...");

    const res = await fetch(`${API_URL}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: parsedData,
        target_column: target
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    hideStatus();

    resultBox.classList.remove("hidden");
    taskTypeDiv.textContent = "Task: " + data.task_type;
    bestModelDiv.textContent = "Best Model: " + data.best_model;
    metricsDiv.textContent = "Metrics: " + JSON.stringify(data.metrics);
    topFeaturesDiv.textContent =
      "Top Features: " +
      (data.explanation?.top_features?.join(", ") || "N/A");

  } catch (err) {
    hideStatus();
    showError(err.message);
  }
};


// -------- PREDICT --------
predictBtn.onclick = async () => {
  clearError();

  if (!parsedData) {
    showError("Upload CSV first");
    return;
  }

  try {
    showStatus("Predicting...");

    const res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsedData })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    hideStatus();

    // ✅ store predictions
    lastPredictions = data.predictions;

    resultBox.classList.remove("hidden");
    bestModelDiv.textContent =
      "Predictions: " + lastPredictions.slice(0, 5).join(", ");

    // ✅ show download button
    downloadBtn.classList.remove("hidden");

  } catch (err) {
    hideStatus();
    showError(err.message);
  }
};


// -------- DOWNLOAD CSV --------
downloadBtn.onclick = () => {
  if (!lastPredictions.length) {
    showError("No predictions available");
    return;
  }

  let csv = "Index,Prediction\n";

  lastPredictions.forEach((p, i) => {
    csv += `${i},${p}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "predictions.csv";
  a.click();

  URL.revokeObjectURL(url);
};
// -------- PARTICLES BACKGROUND --------
// -------- PARTICLES + TOGGLE (SAFE VERSION) --------
document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let particles = [];
  let effectsOn = true;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1
      });
    }
  }

  function drawParticles() {
    if (!effectsOn) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fill();
    });

    requestAnimationFrame(drawParticles);
  }

  initParticles();
  drawParticles();

  const toggleBtn = document.getElementById("toggleEffects");

  toggleBtn.onclick = () => {
    effectsOn = !effectsOn;
    toggleBtn.textContent = "Effects: " + (effectsOn ? "ON" : "OFF");

    if (effectsOn) {
      initParticles();
      drawParticles();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

});