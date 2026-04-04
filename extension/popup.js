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
      if (!isNaN(val) && val !== "") val = Number(val);
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
    parsedData = parseCSV(e.target.result);
    showStatus("CSV loaded: " + parsedData.length + " rows");
  };

  reader.onerror = () => showError("Error reading file");

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

    lastPredictions = data.predictions;

    resultBox.classList.remove("hidden");
    bestModelDiv.textContent =
      "Predictions: " + lastPredictions.slice(0, 5).join(", ");

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


/* ===== PARTICLE SYSTEM (FINAL OPTIMIZED) ===== */
document.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let particles = [];
  let animationId;
  let effectsOn = true;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initParticles() {
    particles = [];

    const count = Math.min(
      Math.floor((canvas.width * canvas.height) / 9000),
      60
    );

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5
      });
    }
  }

  function connectParticles() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = dx * dx + dy * dy;

        if (dist < 10000) {
          ctx.strokeStyle = "rgba(56,189,248,0.08)";
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56,189,248,0.7)";
      ctx.fill();
    });

    connectParticles();

    animationId = requestAnimationFrame(animate);
  }

  function start() {
    resizeCanvas();
    initParticles();
    animate();
  }

  function stop() {
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const toggleBtn = document.getElementById("toggleEffects");

  toggleBtn.onclick = () => {
    effectsOn = !effectsOn;
    toggleBtn.textContent = "Effects: " + (effectsOn ? "ON" : "OFF");

    effectsOn ? start() : stop();
  };

  window.addEventListener("resize", () => {
    if (effectsOn) start();
  });

  start();
});