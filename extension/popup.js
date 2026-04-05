import { getAuthToken } from "./auth.js";

const API_URL = "http://127.0.0.1:8000";

let parsedData = null;
let lastPredictions = [];
let sheetToken = null;
let sheetSpreadsheetId = null;
let lastMlResult = null;

// DOM elements
let csvFile, targetInput, trainBtn, predictBtn, downloadBtn, testBtn;
let statusDiv, errorBox, resultBox;
let taskTypeDiv, bestModelDiv, metricsDiv, topFeaturesDiv;

/* =========================
   DITHER WEBGL BACKGROUND
========================= */
const ditherCanvas = document.getElementById("ditherCanvas");
let gl, program, animFrameId;
let effectsEnabled = true;
let mouseX = 0, mouseY = 0;

const vertSrc = `#version 300 es
  in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragSrc = `#version 300 es
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform vec2 mousePos;
  out vec4 fragColor;

  vec4 mod289(vec4 x) { return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x) { return mod289(((x*34.)+1.)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }
  vec2 fade(vec2 t) { return t*t*t*(t*(t*6.-15.)+10.); }

  float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.,0.,1.,1.);
    vec4 Pf = fract(P.xyxy) - vec4(0.,0.,1.,1.);
    Pi = mod289(Pi);
    vec4 ix = Pi.xzxz, iy = Pi.yyww;
    vec4 fx = Pf.xzxz, fy = Pf.yyww;
    vec4 i = permute(permute(ix)+iy);
    vec4 gx = fract(i*(1./41.))*2.-1.;
    vec4 gy = abs(gx)-0.5;
    vec4 tx = floor(gx+0.5);
    gx -= tx;
    vec2 g00=vec2(gx.x,gy.x), g10=vec2(gx.y,gy.y);
    vec2 g01=vec2(gx.z,gy.z), g11=vec2(gx.w,gy.w);
    vec4 norm = taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
    g00*=norm.x; g01*=norm.y; g10*=norm.z; g11*=norm.w;
    float n00=dot(g00,vec2(fx.x,fy.x));
    float n10=dot(g10,vec2(fx.y,fy.y));
    float n01=dot(g01,vec2(fx.z,fy.z));
    float n11=dot(g11,vec2(fx.w,fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00,n01),vec2(n10,n11),fade_xy.x);
    return 2.3*mix(n_x.x,n_x.y,fade_xy.y);
  }

  float fbm(vec2 p) {
    float v=0., a=1.;
    vec2 pp = p;
    for(int i=0;i<4;i++){
      v+=a*abs(cnoise(pp));
      pp*=3.0; a*=0.3;
    }
    return v;
  }

  float pattern(vec2 p) {
    vec2 p2 = p - time*0.05;
    return fbm(p + fbm(p2));
  }

  const float bayer[64] = float[64](
    0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
    32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0, 19.0/64.0, 47.0/64.0, 31.0/64.0,
    8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0, 59.0/64.0,  7.0/64.0, 55.0/64.0,
    40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0, 27.0/64.0, 39.0/64.0, 23.0/64.0,
    2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0, 49.0/64.0, 13.0/64.0, 61.0/64.0,
    34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0, 17.0/64.0, 45.0/64.0, 29.0/64.0,
    10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0, 57.0/64.0,  5.0/64.0, 53.0/64.0,
    42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0, 25.0/64.0, 37.0/64.0, 21.0/64.0
  );

  float dither(vec2 uv, float brightness) {
    float pixelSize = 2.0;
    vec2 scaled = floor(uv * resolution / pixelSize);
    int x = int(mod(scaled.x, 8.0));
    int y = int(mod(scaled.y, 8.0));
    float threshold = bayer[y*8+x] - 0.25;
    float colorNum = 4.0;
    float step = 1.0/(colorNum-1.0);
    float b = clamp(brightness + threshold*step - 0.2, 0.0, 1.0);
    return floor(b*(colorNum-1.0)+0.5)/(colorNum-1.0);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = uv - 0.5;
    p.x *= resolution.x / resolution.y;

    float f = pattern(p);

    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(p - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, 1.0, dist);
    f -= 0.5 * effect;

    vec3 waveColor = vec3(0.55, 0.65, 0.75);
    vec3 col = mix(vec3(0.0), waveColor, f);

    col.r = dither(uv, col.r);
    col.g = dither(uv, col.g);
    col.b = dither(uv, col.b);

    fragColor = vec4(col, 1.0);
  }
`;

function initWebGL() {
  gl = ditherCanvas.getContext("webgl2");
  if (!gl) { console.error("WebGL2 not supported"); return; }

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = makeShader(gl.VERTEX_SHADER, vertSrc);
  const fs = makeShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return;

  program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1,  1,-1,  -1, 1,
    -1, 1,  1,-1,   1, 1
  ]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
}

function resizeDither() {
  ditherCanvas.width = window.innerWidth;
  ditherCanvas.height = window.innerHeight;
  if (gl) gl.viewport(0, 0, ditherCanvas.width, ditherCanvas.height);
}

function renderDither(time) {
  if (!gl || !program || !effectsEnabled) {
    animFrameId = requestAnimationFrame(renderDither);
    return;
  }
  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, "resolution"), ditherCanvas.width, ditherCanvas.height);
  gl.uniform1f(gl.getUniformLocation(program, "time"), time * 0.001);
  gl.uniform2f(gl.getUniformLocation(program, "mousePos"), mouseX, mouseY);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  animFrameId = requestAnimationFrame(renderDither);
}

function startDither() {
  resizeDither();
  initWebGL();
  animFrameId = requestAnimationFrame(renderDither);
}

function stopDither() {
  cancelAnimationFrame(animFrameId);
  if (gl) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
}

window.addEventListener("resize", resizeDither);
window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });
window.addEventListener("load", startDither);

/* =========================
   CLICK SPARK SYSTEM
========================= */
const sparkCanvas = document.getElementById("sparkCanvas");
const sparkCtx = sparkCanvas.getContext("2d");
let sparks = [];

const SPARK_COLOR = "#38bdf8";
const SPARK_SIZE = 10;
const SPARK_RADIUS = 40;
const SPARK_COUNT = 8;
const SPARK_DURATION = 500;

function resizeSpark() {
  sparkCanvas.width = window.innerWidth;
  sparkCanvas.height = window.innerHeight;
}

function easeOut(t) {
  return t * (2 - t);
}

function drawSparks(timestamp) {
  sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);

  sparks = sparks.filter(spark => {
    const elapsed = timestamp - spark.startTime;
    if (elapsed >= SPARK_DURATION) return false;

    const progress = elapsed / SPARK_DURATION;
    const eased = easeOut(progress);
    const distance = eased * SPARK_RADIUS;
    const lineLength = SPARK_SIZE * (1 - eased);

    const x1 = spark.x + distance * Math.cos(spark.angle);
    const y1 = spark.y + distance * Math.sin(spark.angle);
    const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
    const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

    // fade out as progress increases
    sparkCtx.globalAlpha = 1 - progress;
    sparkCtx.strokeStyle = SPARK_COLOR;
    sparkCtx.lineWidth = 2;
    sparkCtx.beginPath();
    sparkCtx.moveTo(x1, y1);
    sparkCtx.lineTo(x2, y2);
    sparkCtx.stroke();
    sparkCtx.globalAlpha = 1;

    return true;
  });

  requestAnimationFrame(drawSparks);
}

function addSparks(x, y) {
  const now = performance.now();
  for (let i = 0; i < SPARK_COUNT; i++) {
    sparks.push({
      x, y,
      angle: (2 * Math.PI * i) / SPARK_COUNT,
      startTime: now
    });
  }
}

window.addEventListener("resize", resizeSpark);
window.addEventListener("click", (e) => addSparks(e.clientX, e.clientY));
window.addEventListener("load", () => {
  resizeSpark();
  requestAnimationFrame(drawSparks);
});

/* =========================
   GOOGLE SHEETS INTEGRATION
========================= */

async function getSpreadsheetId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) { reject(new Error("No active tab found")); return; }
      const url = tabs[0].url;
      if (!url.includes("docs.google.com/spreadsheets")) {
        reject(new Error("Not a Google Sheets page")); return;
      }
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) { reject(new Error("Could not extract spreadsheet ID")); return; }
      resolve(match[1]);
    });
  });
}

async function getSheetHeaders(token, spreadsheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Failed to fetch headers"); }
  const data = await res.json();
  if (!data.values || data.values.length === 0) throw new Error("Sheet is empty or headers not found");
  return data.values[0];
}

async function getSheetData(token, spreadsheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Failed to fetch sheet data"); }
  const data = await res.json();
  if (!data.values || data.values.length < 2) throw new Error("Not enough data in sheet");
  const headers = data.values[0];
  const rows = data.values.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      const val = row[i] ?? "";
      obj[h] = val !== "" && !isNaN(val) ? Number(val) : val;
    });
    return obj;
  });
}

function populateTargetDropdown(headers) {
  const dropdown = document.getElementById("targetCol");
  if (!dropdown) return;
  while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);
  const placeholder = document.createElement("option");
  placeholder.value = ""; placeholder.textContent = "-- Select target column --"; placeholder.disabled = true;
  dropdown.appendChild(placeholder);
  headers.forEach(header => {
    const option = document.createElement("option");
    option.value = String(header).toLowerCase();
    option.textContent = String(header);
    dropdown.appendChild(option);
  });
  dropdown.selectedIndex = headers.length;
}

/* =========================
   CSV HANDLING
========================= */

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

/* =========================
   UI HELPERS
========================= */

function showStatus(msg) { statusDiv.textContent = msg; statusDiv.classList.remove("hidden"); }
function hideStatus() { statusDiv.classList.add("hidden"); }
function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove("hidden"); }
function clearError() { errorBox.classList.add("hidden"); }
function clearResults() { resultBox.classList.add("hidden"); }

/* =========================
   FORMAT METRICS
========================= */

function formatMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") return "N/A";
  return Object.entries(metrics).map(([model, scores]) => {
    const scoreStr = Object.entries(scores)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
      .join(" | ");
    return `${model}: ${scoreStr}`;
  }).join("\n");
}

/* =========================
   SUMMARIZE HELPER
========================= */

async function fetchSummary(mlResult, question = null) {
  const body = { ml_result: mlResult };
  if (question) body.question = question;
  const res = await fetch(`${API_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Summarize failed");
  return data.summary;
}

/* =========================
   MAIN INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  csvFile = document.getElementById("csvFile");
  targetInput = document.getElementById("targetCol");
  trainBtn = document.getElementById("trainBtn");
  predictBtn = document.getElementById("predictBtn");
  downloadBtn = document.getElementById("downloadBtn");
  testBtn = document.getElementById("testBtn");
  statusDiv = document.getElementById("status");
  errorBox = document.getElementById("errorBox");
  resultBox = document.getElementById("resultBox");
  taskTypeDiv = document.getElementById("taskType");
  bestModelDiv = document.getElementById("bestModel");
  metricsDiv = document.getElementById("metrics");
  topFeaturesDiv = document.getElementById("topFeatures");

  const summarySection = document.getElementById("summarySection");
  const summaryBox = document.getElementById("summaryBox");
  const chatSection = document.getElementById("chatSection");
  const chatInput = document.getElementById("chatInput");
  const chatBtn = document.getElementById("chatBtn");
  const chatResponse = document.getElementById("chatResponse");

  /* ===== CSV Upload ===== */
  csvFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) { showError("No file selected"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      parsedData = parseCSV(e.target.result);
      showStatus(`CSV loaded: ${parsedData.length} rows`);
    };
    reader.readAsText(file);
  });

  /* ===== TEST GOOGLE SHEETS ===== */
  testBtn?.addEventListener("click", async () => {
    try {
      clearError();
      showStatus("Connecting to Google Sheets...");
      sheetToken = await getAuthToken();
      sheetSpreadsheetId = await getSpreadsheetId();
      const headers = await getSheetHeaders(sheetToken, sheetSpreadsheetId);
      populateTargetDropdown(headers);
      showStatus(`Connected ✅ ${headers.length} columns found`);
    } catch (err) {
      console.error(err);
      hideStatus();
      showError(err.message);
    }
  });

  /* ===== TRAIN ===== */
  trainBtn.onclick = async () => {
    clearError();
    clearResults();
    summarySection.classList.add("hidden");
    chatSection.classList.add("hidden");
    chatResponse.classList.add("hidden");

    const target = targetInput.value.trim().toLowerCase();
    if (!target) { showError("Please select a target column"); return; }

    try {
      let dataToSend = parsedData;
      if (sheetToken && sheetSpreadsheetId && !parsedData) {
        showStatus("Reading sheet data...");
        dataToSend = await getSheetData(sheetToken, sheetSpreadsheetId);
      }
      if (!dataToSend) { showError("Upload a CSV or connect Google Sheets first"); return; }

      showStatus("Training model...");

      const res = await fetch(`${API_URL}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataToSend, target_column: target })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      lastMlResult = data;
      hideStatus();
      resultBox.classList.remove("hidden");
      taskTypeDiv.textContent = `🎯 Task: ${data.task_type}`;
      bestModelDiv.textContent = `🏆 Best Model: ${data.best_model}`;
      metricsDiv.textContent = `📊 Metrics:\n${formatMetrics(data.metrics)}`;
      topFeaturesDiv.textContent = `⭐ Top Features: ${data.explanation?.top_features?.join(", ") || "N/A"}`;

      summarySection.classList.remove("hidden");
      summaryBox.textContent = "Generating summary...";
      try {
        const summary = await fetchSummary(data);
        summaryBox.textContent = summary;
      } catch (sumErr) {
        summaryBox.textContent = "Could not generate summary: " + sumErr.message;
      }

      chatSection.classList.remove("hidden");

    } catch (err) {
      hideStatus();
      showError(err.message);
    }
  };

  /* ===== CHAT BUTTON ===== */
  chatBtn.onclick = async () => {
    const question = chatInput.value.trim();
    if (!question) { showError("Please type a question first"); return; }
    if (!lastMlResult) { showError("Train a model first before asking questions"); return; }

    clearError();
    chatResponse.classList.remove("hidden");
    chatResponse.textContent = "Thinking...";

    try {
      const answer = await fetchSummary(lastMlResult, question);
      chatResponse.textContent = answer;
      chatInput.value = "";
    } catch (err) {
      chatResponse.textContent = "Error: " + err.message;
    }
  };

  /* ===== PREDICT ===== */
  predictBtn.onclick = async () => {
    clearError();
    clearResults();

    try {
      let dataToSend = parsedData;
      if (sheetToken && sheetSpreadsheetId && !parsedData) {
        showStatus("Reading sheet data...");
        dataToSend = await getSheetData(sheetToken, sheetSpreadsheetId);
      }
      if (!dataToSend) { showError("Upload a CSV or connect Google Sheets first"); return; }

      showStatus("Running predictions...");

      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataToSend })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      hideStatus();
      lastPredictions = data.predictions;
      resultBox.classList.remove("hidden");
      const preview = lastPredictions.slice(0, 5).join(", ");
      const total = lastPredictions.length;
      bestModelDiv.textContent = `Predictions (first 5): ${preview}${total > 5 ? ` ... (+${total - 5} more)` : ""}`;
      downloadBtn.classList.remove("hidden");

    } catch (err) {
      hideStatus();
      showError(err.message);
    }
  };

  /* ===== DOWNLOAD ===== */
  downloadBtn.onclick = () => {
    if (!lastPredictions.length) { showError("No predictions available"); return; }
    let csv = "Index,Prediction\n";
    lastPredictions.forEach((p, i) => { csv += `${i},${p}\n`; });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

});