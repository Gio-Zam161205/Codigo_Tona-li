// Datos base de la tripulación (aquí pueden conectar el JSON o API de la NASA)
const crew = [
  { id: 0, name: "Cmdt. Elena Vance", role: "Comandante / EVA", bpm: 72, spo2: 98, temp: 36.7, psi: 4.3, status: "Óptimo" },
  { id: 1, name: "Dr. Mateo Silva", role: "Especialista Médico", bpm: 68, spo2: 99, temp: 36.6, psi: 14.7, status: "Óptimo" },
  { id: 2, name: "Ing. Sora Takahashi", role: "Ingeniera de Vuelo", bpm: 75, spo2: 97, temp: 36.8, psi: 14.7, status: "Óptimo" }
];

let selectedId = 0;
let isEmergency = false;
let deepSpaceMode = false;

// Referencias al DOM
const crewListEl = document.getElementById("crewList");
const alertBannerEl = document.getElementById("alertBanner");
const alertMessageEl = document.getElementById("alertMessage");
const eventLogEl = document.getElementById("eventLog");
const canvas = document.getElementById("ecgCanvas");
const ctx = canvas.getContext("2d");

// Renderizar lista de tripulación
function renderCrew() {
  crewListEl.innerHTML = "";
  crew.forEach((member) => {
    const isSelected = member.id === selectedId;
    const isCrit = member.status === "CRÍTICO";

    const btn = document.createElement("button");
    btn.className = `w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
      isSelected ? "bg-slate-800/90 border-cyan-400/60" : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/50"
    }`;
    btn.onclick = () => selectAstronaut(member.id);

    btn.innerHTML = `
      <div>
        <div class="font-semibold text-sm text-white">${member.name}</div>
        <div class="text-xs text-slate-400">${member.role}</div>
      </div>
      <span class="text-[10px] font-mono-tech px-2 py-0.5 rounded ${
        isCrit ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-400"
      }">
        ${member.status}
      </span>
    `;
    crewListEl.appendChild(btn);
  });
}

// Seleccionar astronauta
function selectAstronaut(id) {
  selectedId = id;
  const person = crew[selectedId];
  document.getElementById("activeAstronautTitle").innerText = `Tripulante: ${person.name} // ${person.role}`;
  updateMetricsUI();
  renderCrew();
  addLog(`Telemetría enfocada en ${person.name}`);
}

// Actualizar valores numéricos y estilos de alerta
function updateMetricsUI() {
  const p = crew[selectedId];
  document.getElementById("valBpm").innerText = p.bpm;
  document.getElementById("valSpo2").innerText = p.spo2;
  document.getElementById("valTemp").innerText = p.temp.toFixed(1);
  document.getElementById("valPsi").innerText = p.psi.toFixed(1);

  const cardBpm = document.getElementById("cardBpm");
  const valBpm = document.getElementById("valBpm");

  if (p.status === "CRÍTICO") {
    cardBpm.classList.add("border-rose-500", "bg-rose-950/30");
    valBpm.classList.replace("text-cyan-400", "text-rose-400");
  } else {
    cardBpm.classList.remove("border-rose-500", "bg-rose-950/30");
    valBpm.classList.replace("text-rose-400", "text-cyan-400");
  }
}

// Alternar modo de comunicación Tierra-Marte
function toggleCommsMode() {
  deepSpaceMode = !deepSpaceMode;
  const label = document.getElementById("commsLabel");
  if (deepSpaceMode) {
    label.innerText = "ENLACE: MARTE (RETARDO 14m 22s)";
    label.classList.add("text-amber-400");
    addLog("Modo Espacio Profundo activado: IA local toma prioridad médica.", "warn");
  } else {
    label.innerText = "ENLACE: ÓRBITA BAJA (1.2s)";
    label.classList.remove("text-amber-400");
    addLog("Enlace directo con Houston restablecido.");
  }
}

// Simular emergencia EVA
function triggerEmergency() {
  isEmergency = true;
  const p = crew[selectedId];
  p.bpm = 158;
  p.spo2 = 86;
  p.psi = 3.1;
  p.status = "CRÍTICO";

  alertBannerEl.classList.remove("hidden");
  alertMessageEl.innerText = `Alerta crítica en ${p.name}: Ritmo cardíaco elevado (${p.bpm} BPM) y caída de SpO₂ (${p.spo2}%). Protocolo autónomo iniciado.`;

  renderCrew();
  updateMetricsUI();
  addLog(`ALERTA CRÍTICA: Anomalía EVA en ${p.name}`, "error");
}

// Estabilizar emergencia
function stabilizeAstronaut() {
  isEmergency = false;
  const p = crew[selectedId];
  p.bpm = 76;
  p.spo2 = 98;
  p.psi = 4.3;
  p.status = "Óptimo";

  alertBannerEl.classList.add("hidden");
  renderCrew();
  updateMetricsUI();
  addLog(`Signos vitales de ${p.name} estabilizados exitosamente.`, "ok");
}

// Agregar registro a la bitácora
function addLog(msg, type = "info") {
  const time = new Date().toLocaleTimeString("es-MX", { hour12: false });
  let color = "text-slate-300";
  if (type === "error") color = "text-rose-400 font-bold";
  if (type === "warn") color = "text-amber-400";
  if (type === "ok") color = "text-emerald-400";

  const entry = document.createElement("div");
  entry.className = `p-2 rounded bg-slate-900/80 border border-slate-800/80 ${color}`;
  entry.innerHTML = `<span class="text-slate-500">[${time}]</span> ${msg}`;
  eventLogEl.prepend(entry);
}

// Simulación de variación fisiológica cada 2 segundos
setInterval(() => {
  crew.forEach((p) => {
    if (p.status !== "CRÍTICO") {
      p.bpm = Math.max(62, Math.min(84, p.bpm + (Math.floor(Math.random() * 5) - 2)));
    } else {
      p.bpm = Math.max(148, Math.min(168, p.bpm + (Math.floor(Math.random() * 7) - 3)));
    }
  });
  updateMetricsUI();
}, 2000);

// Animación de ECG en Canvas
let x = 0;
let lastY = 95;

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawECG() {
  const speed = isEmergency ? 5 : 2.5;
  const midY = canvas.height / 2;

  ctx.fillStyle = "rgba(2, 6, 23, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.strokeStyle = isEmergency ? "#f43f5e" : "#22d3ee";
  ctx.lineWidth = 2.2;
  ctx.moveTo(x, lastY);

  x += speed;
  let y = midY;

  const cycle = x % (isEmergency ? 65 : 130);
  if (cycle > 20 && cycle < 26) y = midY - 12;
  else if (cycle >= 26 && cycle < 32) y = midY + 45;
  else if (cycle >= 32 && cycle < 38) y = midY - 55;
  else if (cycle >= 38 && cycle < 44) y = midY + 18;
  else y = midY + (Math.random() * 4 - 2);

  ctx.lineTo(x, y);
  ctx.stroke();

  lastY = y;
  if (x >= canvas.width) {
    x = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(drawECG);
}

// Eventos de botones principales
document.getElementById("btnComms").addEventListener("click", toggleCommsMode);
document.getElementById("btnEmergency").addEventListener("click", triggerEmergency);
document.getElementById("btnStabilize").addEventListener("click", stabilizeAstronaut);

// Inicialización
renderCrew();
updateMetricsUI();
addLog("Sistema Tonalli Vital inicializado. Listo para telemetría NASA.");
drawECG();