/**
 * ============================================================================
 * @fileoverview Motor principal de telemetría, gestión dinámica de tripulación,
 *               diagnóstico multi-gravedad y visualización biomédica para
 *               el sistema TONALLI VITAL.
 * @version      2.2.0
 * @description  Administra:
 *               1. Navegación SPA entre módulos clínicos.
 *               2. Recalibración física y médica según gravedad (0g, 0.16g, 0.38g, 1g).
 *               3. Alta, selección, baja y persistencia (localStorage) de tripulantes.
 *               4. Validación de umbrales clínicos y protocolo de emergencia autónomo.
 *               5. Escáner anatómico interactivo (5 Peligros NASA HRP).
 *               6. Renderizado en Canvas 2D (ECG a 60 FPS y gráficas de tendencia).
 * ============================================================================
 */

/* ============================================================================
   1. DICCIONARIOS DE CONFIGURACIÓN Y MODELOS DE ENTORNO GRAVITACIONAL
   ============================================================================ */

const titulosVistas = {
  'view-telemetry': 'Telemetría Biomédica y Tendencia Temporal',
  'view-anatomy': 'Escáner Holográfico Anatómico (5 Peligros NASA)',
  'view-checkup': 'Autoevaluación Biomédica y Conductual',
  'view-prevention': 'Protocolo Diario de Prevención y Contramedidas'
};

const escenariosConfig = {
  leo: {
    nombre: 'ÓRBITA BAJA ISS',
    gravedad: '0.00 g (Microgravedad)',
    latencia: '1.2s LATENCIA',
    radVal: '0.42 mSv/h',
    radPct: '35%',
    radStatus: 'Escudo magnético terrestre activo. Exposición nominal.',
    bannerTitle: 'ENTORNO ACTUAL: ÓRBITA BAJA ISS (0.00 g - MICROGRAVEDAD)',
    bannerDesc: 'Riesgo dominante: Desplazamiento cefálico de fluidos (+2L hacia tórax/cabeza) y desorientación vestibular. Acostarse no tiene efecto hidrostático.',
    tag: 'PROTOCOLO: ZERO-G',
    razonGravedad: 'Al no existir gravedad (0.00 g), elevar las piernas no devuelve sangre al corazón porque los fluidos flotan hacia la cabeza. El tratamiento debe forzar el retorno venoso mecánicamente.',
    pasosEmergencia: [
      'Asegurar al tripulante con arneses en el módulo médico para evitar flotación involuntaria durante espasmos o síncope.',
      'Colocar pantalones de Presión Negativa Inferior (LBNP / Chibis) a -40 mmHg para drenar el exceso de fluido acumulado en el cráneo y tórax.',
      'Administrar oxígeno al 100% mediante mascarilla cerrada y estabilizar presión de cabina a 14.7 PSI.',
      'Realizar respiración vagal lenta (4s inhalar / 6s exhalar) y suministrar solución electrolítica por bolsa presurizada.'
    ]
  },
  earth: {
    nombre: 'BASE TIERRA / REENTRADA',
    gravedad: '1.00 g (Gravedad Terrestre)',
    latencia: '0.0s TIEMPO REAL',
    radVal: '0.0003 mSv/h',
    radPct: '5%',
    radStatus: 'Atmósfera y magnetósfera completas. Radiación basal terrestre.',
    bannerTitle: 'ENTORNO ACTUAL: TIERRA / POST-ATERRIZAJE (1.00 g - GRAVEDAD COMPLETA)',
    bannerDesc: 'Riesgo dominante: Intolerancia ortostática severa. Tras volver del espacio, la gravedad 1g arrastra la sangre hacia las piernas causando desmayos y taquicardia.',
    tag: 'PROTOCOLO: 1G-REENTRY',
    razonGravedad: 'Bajo gravedad completa (1.00 g), el sistema cardiovascular desacondicionado pierde presión al estar de pie porque la sangre cae por peso hacia las extremidades inferiores.',
    pasosEmergencia: [
      'Colocar al tripulante inmediatamente en posición supina (acostado boca arriba) con piernas elevadas a 30° para usar la gravedad 1g a favor del riego cerebral.',
      'Activar inflado de trajes anti-G neumáticos en pantorrillas y muslos para impedir el estancamiento venoso.',
      'Administrar carga hídrica oral o intravenosa de 1,000 ml de solución salina isotónica para restaurar volumen plasmático.',
      'Evitar incorporar al paciente verticalmente hasta que el ritmo cardíaco baje de 95 BPM en reposo.'
    ]
  },
  moon: {
    nombre: 'BASE LUNAR ARTEMIS',
    gravedad: '0.16 g (1/6 Gravedad Terrestre)',
    latencia: '2.6s LUNA',
    radVal: '1.35 mSv/h',
    radPct: '68%',
    radStatus: 'Sin atmósfera ni campo magnético. Alerta por tormenta solar y regolito.',
    bannerTitle: 'ENTORNO ACTUAL: SUPERFICIE LUNAR ARTEMIS (0.16 g - GRAVEDAD PARCIAL)',
    bannerDesc: 'Riesgo dominante: Toxicidad pulmonar por polvo de regolito lunar (silicatos abrasivos), radiación solar directa y sobreesfuerzo metabólico en caminatas.',
    tag: 'PROTOCOLO: LUNAR-0.16G',
    razonGravedad: 'Con 0.16 g existe una leve columna hidrostática, pero el peligro crítico en superficie lunar es la hipoxia por inhalación de regolito fino y la hipertermia dentro del traje xEMU.',
    pasosEmergencia: [
      'Retirar al astronauta hacia el hábitat presurizado o rover y ejecutar protocolo de descontaminación electrostática de regolito antes de abrir el casco.',
      'Inclinar la camilla médica a 15° (semi-Fowler) aprovechando el 0.16 g lunar para facilitar la expansión pulmonar.',
      'Suministrar oxígeno hiperbárico filtrado al 100% para contrarrestar inflamación alveolar por polvo lunar y elevar SpO₂ > 96%.',
      'Activar enfriamiento líquido máximo en la prenda interior (LCVG) y reponer glucosa/electrolitos.'
    ]
  },
  mars: {
    nombre: 'SUPERFICIE MARTE',
    gravedad: '0.38 g (38% Gravedad Terrestre)',
    latencia: '14m AUTÓNOMO',
    radVal: '2.10 mSv/h',
    radPct: '88%',
    radStatus: 'Radiación cósmica galáctica elevada. Comunicación diferida con Tierra.',
    bannerTitle: 'ENTORNO ACTUAL: SUPERFICIE MARCIANA (0.38 g - AUTONOMÍA TOTAL)',
    bannerDesc: 'Riesgo dominante: Retardo de comunicación de 14–22 min con Tierra (imposible telemedicina en vivo), exposición a percloratos tóxicos y descalcificación ósea.',
    tag: 'PROTOCOLO: MARS-AUTONOMOUS',
    razonGravedad: 'En Marte (0.38 g), la gravedad parcial no evita la fragilidad ósea y la latencia impide ayuda inmediata desde Houston. La tripulación debe ejecutar soporte vital autónomo.',
    pasosEmergencia: [
      'Activar el Modo Médico Autónomo Local (sin esperar confirmación de Houston por retardo de 14 minutos).',
      'Aislar al tripulante en el refugio blindado contra radiación (paredes de agua/polietileno) si el índice Tonalli supera 1.8 mSv/h.',
      'Estabilizar hemodinamia en camilla con inclinación de 10°, administrar suero intravenoso y monitorear niveles de tiroides/glucosa por posible exposición a percloratos.',
      'Registrar paquete comprimido de telemetría de crisis para transmisión diferida a médicos de vuelo en Tierra.'
    ]
  }
};

let escenarioActual = 'leo';

/* ============================================================================
   2. NAVEGACIÓN Y CONTROL DE INTERFAZ (SPA)
   ============================================================================ */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function cambiarVista(idVista, botonActivo) {
  document.querySelectorAll('.tab-view').forEach(sec => sec.style.display = 'none');
  const destino = document.getElementById(idVista);
  destino.style.display = destino.classList.contains('grid') ? 'grid' : 'block';

  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  if (botonActivo) botonActivo.classList.add('active');

  document.getElementById('viewHeaderTitle').textContent = titulosVistas[idVista];

  if (idVista === 'view-telemetry') {
    dibujarTendencia();
  }

  if (window.innerWidth < 1024) {
    document.getElementById('sidebar').classList.add('-translate-x-full');
  }
}

document.getElementById('envSelector').addEventListener('change', (e) => {
  escenarioActual = e.target.value;
  const cfg = escenariosConfig[escenarioActual];

  document.getElementById('commsLabel').textContent = cfg.latencia;
  document.getElementById('radiationVal').textContent = cfg.radVal;
  document.getElementById('radiationBar').style.width = cfg.radPct;
  document.getElementById('radiationStatus').textContent = cfg.radStatus;
  document.getElementById('sidebarGravityBadge').textContent = cfg.gravedad;

  document.getElementById('scenarioTitle').textContent = cfg.bannerTitle;
  document.getElementById('scenarioRiskDesc').textContent = cfg.bannerDesc;
  document.getElementById('scenarioProtocolTag').textContent = cfg.tag;

  registrarBitacora(`Escenario cambiado a ${cfg.nombre} (${cfg.gravedad}). Protocolos médicos recalibrados.`);
});

/* ============================================================================
   3. GESTIÓN DINÁMICA DE TRIPULACIÓN (ALTA, SELECCIÓN, BAJA Y PERSISTENCIA)
   ============================================================================ */

const STORAGE_KEY = 'tonalli_vital_crew_v1';

/** Tripulación inicial por defecto */
const tripulacionBase = [
  {
    id: 1, nombre: 'Cmdt. Elena Vance', modulo: 'Módulo Orión',
    bpm: 72, sys: 118, dia: 76, spo2: 98, glucose: 94, temp: 36.7, sleep: 7.2, mood: 'Óptimo', estado: 'Nominal',
    histBpm: [70, 74, 71, 76, 73, 75, 72],
    histSleep: [7.5, 6.8, 7.0, 6.5, 7.1, 7.4, 7.2]
  },
  {
    id: 2, nombre: 'Ing. Mateo Silva', modulo: 'Esclusa EVA',
    bpm: 84, sys: 124, dia: 80, spo2: 97, glucose: 102, temp: 37.0, sleep: 6.1, mood: 'Fatiga', estado: 'En EVA',
    histBpm: [78, 82, 88, 85, 90, 86, 84],
    histSleep: [6.5, 6.0, 5.8, 6.2, 5.9, 6.0, 6.1]
  },
  {
    id: 3, nombre: 'Dra. Sora Takahashi', modulo: 'Lab. Kibo',
    bpm: 68, sys: 112, dia: 72, spo2: 99, glucose: 89, temp: 36.5, sleep: 7.6, mood: 'Óptimo', estado: 'Nominal',
    histBpm: [66, 69, 68, 70, 67, 69, 68],
    histSleep: [7.8, 7.5, 7.6, 7.4, 7.7, 7.5, 7.6]
  }
];

/** Carga la tripulación desde localStorage o inicia con la plantilla base */
let tripulacion = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(JSON.stringify(tripulacionBase));
let astronautaActual = 0;
let modoEmergencia = false;

/** Guarda el estado actual de la tripulación en el almacenamiento del navegador */
function guardarTripulacionStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tripulacion));
}

/** Abre el modal para dar de alta un nuevo astronauta */
function abrirModalRegistro() {
  document.getElementById('formNewCrew').reset();
  document.getElementById('registerCrewModal').style.display = 'flex';
}

/** Cierra el modal de alta de tripulantes */
function cerrarModalRegistro() {
  document.getElementById('registerCrewModal').style.display = 'none';
}

/**
 * Procesa el formulario de alta, sintetiza un historial basal de 7 días
 * alrededor de los signos ingresados y enfoca al nuevo tripulante.
 * @param {SubmitEvent} event - Evento de envío del formulario.
 */
function registrarNuevoTripulante(event) {
  event.preventDefault();

  const nombre = document.getElementById('regName').value.trim();
  const modulo = document.getElementById('regModule').value;
  const bpm = parseInt(document.getElementById('regBpm').value, 10);
  const sys = parseInt(document.getElementById('regSys').value, 10);
  const dia = parseInt(document.getElementById('regDia').value, 10);
  const spo2 = parseInt(document.getElementById('regSpo2').value, 10);
  const glucose = parseInt(document.getElementById('regGlucose').value, 10);
  const sleep = parseFloat(document.getElementById('regSleep').value);

  // Generar curva histórica coherente de los últimos 6 días + lectura actual
  const histBpm = [
    bpm - 2, bpm + 1, bpm - 1, bpm + 3, bpm - 2, bpm + 1, bpm
  ];
  const histSleep = [
    Math.max(4, sleep + 0.3),
    Math.max(4, sleep - 0.2),
    Math.max(4, sleep + 0.1),
    Math.max(4, sleep - 0.4),
    Math.max(4, sleep + 0.2),
    Math.max(4, sleep - 0.1),
    sleep
  ];

  const nuevoAstronauta = {
    id: Date.now(),
    nombre,
    modulo,
    bpm,
    sys,
    dia,
    spo2,
    glucose,
    temp: 36.6,
    sleep,
    mood: 'Óptimo',
    estado: bpm > 130 || spo2 < 91 ? 'ALERTA' : 'Nominal',
    histBpm,
    histSleep
  };

  tripulacion.push(nuevoAstronauta);
  astronautaActual = tripulacion.length - 1;
  modoEmergencia = nuevoAstronauta.estado === 'ALERTA';

  guardarTripulacionStorage();
  renderizarTripulacion();
  actualizarMetricas();
  dibujarTendencia();
  cerrarModalRegistro();

  registrarBitacora(`Nuevo tripulante integrado: ${nombre} (${modulo}). Telemetría vinculada.`, 'ok');
}

/**
 * Elimina un tripulante adicional (mantiene al menos 1 activo en misión).
 * @param {number} idx - Índice del tripulante en el arreglo.
 * @param {MouseEvent} event - Evento de clic para detener propagación.
 */
function eliminarTripulante(idx, event) {
  event.stopPropagation();
  if (tripulacion.length <= 1) return;

  const eliminado = tripulacion[idx].nombre;
  tripulacion.splice(idx, 1);

  if (astronautaActual >= tripulacion.length) {
    astronautaActual = tripulacion.length - 1;
  }

  guardarTripulacionStorage();
  renderizarTripulacion();
  actualizarMetricas();
  dibujarTendencia();
  registrarBitacora(`Tripulante ${eliminado} dado de baja del panel activo.`);
}

/** Restaura los 3 tripulantes iniciales por defecto */
function restablecerTripulacionBase() {
  tripulacion = JSON.parse(JSON.stringify(tripulacionBase));
  astronautaActual = 0;
  modoEmergencia = false;
  guardarTripulacionStorage();
  renderizarTripulacion();
  actualizarMetricas();
  dibujarTendencia();
  cerrarModalRegistro();
  registrarBitacora('Plantilla base de 3 tripulantes restaurada.', 'ok');
}

function registrarBitacora(mensaje, tipo = 'info') {
  const log = document.getElementById('eventLog');
  const hora = new Date().toLocaleTimeString('es-MX', { hour12: false });
  const estilo = tipo === 'alert' ? 'text-rose-300 border-rose-500/40 bg-rose-950/40' :
                 tipo === 'ok' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/30' :
                 'text-slate-300 border-slate-800 bg-slate-950/60';
  const item = document.createElement('div');
  item.className = `p-2.5 rounded-xl border ${estilo}`;
  item.innerHTML = `<span class="text-slate-500">[${hora}]</span> ${mensaje}`;
  log.prepend(item);
}

function renderizarTripulacion() {
  const contenedor = document.getElementById('crewList');
  document.getElementById('crewCountBadge').textContent = tripulacion.length;
  contenedor.innerHTML = '';

  tripulacion.forEach((astro, idx) => {
    const activo = idx === astronautaActual;
    const esCritico = astro.estado === 'CRÍTICO' || astro.estado === 'ALERTA';
    const btn = document.createElement('div');
    btn.className = `w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
      activo ? 'bg-cyan-500/15 border-cyan-500/50 text-white' : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
    }`;

    btn.innerHTML = `
      <div class="flex justify-between items-center gap-1">
        <span class="text-xs font-bold truncate">${astro.nombre}</span>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-[10px] font-mono-tech px-1.5 py-0.5 rounded ${
            esCritico ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-cyan-300'
          }">${astro.estado}</span>
          ${tripulacion.length > 1 ? `
            <button type="button" title="Retirar tripulante" onclick="eliminarTripulante(${idx}, event)" class="text-[10px] text-slate-500 hover:text-rose-400 px-1 cursor-pointer">✕</button>
          ` : ''}
        </div>
      </div>
      <span class="text-[10px] text-slate-400 block mt-0.5">${astro.modulo}</span>
    `;

    btn.onclick = () => {
      astronautaActual = idx;
      modoEmergencia = tripulacion[idx].estado === 'CRÍTICO' || tripulacion[idx].estado === 'ALERTA';
      actualizarMetricas();
      renderizarTripulacion();
      dibujarTendencia();
      registrarBitacora(`Enfoque biomédico cambiado a ${astro.nombre}.`);
    };

    contenedor.appendChild(btn);
  });
}

function actualizarMetricas() {
  const a = tripulacion[astronautaActual];
  document.getElementById('activeAstronautTitle').textContent = `Tripulante: ${a.nombre} // ${a.modulo}`;
  document.getElementById('valBpm').textContent = a.bpm;
  document.getElementById('valBp').textContent = `${a.sys}/${a.dia}`;
  document.getElementById('valSpo2').textContent = a.spo2;
  document.getElementById('valGlucose').textContent = a.glucose;
  document.getElementById('valTemp').textContent = `${a.temp.toFixed(1)}°`;
  document.getElementById('valSleep').textContent = `/ ${a.sleep.toFixed(1)}h`;
  document.getElementById('valMood').textContent = a.mood;

  document.getElementById('cardBpm').className = `glass-panel rounded-2xl p-3.5 transition-all ${a.bpm > 130 ? 'border-rose-500 bg-rose-950/40 alert-pulse' : ''}`;
  document.getElementById('cardBp').className = `glass-panel rounded-2xl p-3.5 transition-all ${(a.sys > 150 || a.sys < 85) ? 'border-rose-500 bg-rose-950/40' : ''}`;
  document.getElementById('cardSpo2').className = `glass-panel rounded-2xl p-3.5 transition-all ${a.spo2 < 91 ? 'border-rose-500 bg-rose-950/40' : ''}`;
  document.getElementById('cardGlucose').className = `glass-panel rounded-2xl p-3.5 transition-all ${(a.glucose > 160 || a.glucose < 65) ? 'border-rose-500 bg-rose-950/40' : ''}`;
  document.getElementById('cardTemp').className = `glass-panel rounded-2xl p-3.5 transition-all ${(a.temp > 38.2 || a.sleep < 4.5) ? 'border-amber-500 bg-amber-950/30' : ''}`;
  document.getElementById('cardMood').className = `glass-panel rounded-2xl p-3.5 transition-all ${a.mood === 'Ansiedad' ? 'border-amber-500 bg-amber-950/30' : ''}`;

  const badge = document.getElementById('ecgBadge');
  if (modoEmergencia) {
    badge.textContent = 'ALERTA';
    badge.className = 'text-[10px] font-mono-tech px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40';
  } else {
    badge.textContent = 'NOMINAL';
    badge.className = 'text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-800 text-cyan-400';
  }
}

/* ============================================================================
   4. SISTEMA DE EMERGENCIAS AUTÓNOMO Y AUTOEVALUACIÓN CLÍNICA
   ============================================================================ */

function abrirModalCritico(hallazgos, recomendacionesExtra = []) {
  const a = tripulacion[astronautaActual];
  const cfg = escenariosConfig[escenarioActual];

  document.getElementById('modalScenarioBadge').textContent = `PROTOCOLO ${cfg.nombre} • ${cfg.gravedad}`;
  document.getElementById('modalAstronautName').textContent = `Tripulante afectado: ${a.nombre} (${a.modulo})`;
  document.getElementById('modalGravityReason').textContent = cfg.razonGravedad;
  document.getElementById('modalProtocolHeader').textContent = `🩺 ACCIONES DE REGULARIZACIÓN PARA ${cfg.nombre}:`;

  const ulHallazgos = document.getElementById('criticalFindingsList');
  ulHallazgos.innerHTML = hallazgos.map(h => `<li>${h}</li>`).join('');

  const pasosFinales = [...cfg.pasosEmergencia, ...recomendacionesExtra];
  const olRecs = document.getElementById('criticalRecommendationsList');
  olRecs.innerHTML = pasosFinales.map(r => `<li>${r}</li>`).join('');

  document.getElementById('criticalModal').style.display = 'flex';
}

function cerrarModalCritico() {
  document.getElementById('criticalModal').style.display = 'none';
}

function ejecutarEstabilizacion() {
  const a = tripulacion[astronautaActual];
  const cfg = escenariosConfig[escenarioActual];
  a.bpm = 74;
  a.sys = 118;
  a.dia = 76;
  a.spo2 = 98;
  a.glucose = 95;
  a.temp = 36.7;
  a.mood = 'Óptimo';
  a.estado = 'Estabilizado';
  modoEmergencia = false;

  a.histBpm[a.histBpm.length - 1] = a.bpm;
  guardarTripulacionStorage();
  actualizarMetricas();
  renderizarTripulacion();
  dibujarTendencia();
  cerrarModalCritico();
  registrarBitacora(`Protocolo ${cfg.tag} completado. Signos vitales normalizados en ${a.nombre}.`, 'ok');
}

document.getElementById('btnEmergency').addEventListener('click', () => {
  const a = tripulacion[astronautaActual];
  const cfg = escenariosConfig[escenarioActual];
  a.bpm = 154;
  a.sys = 165;
  a.dia = 102;
  a.spo2 = 88;
  a.glucose = 195;
  a.temp = 38.5;
  a.mood = 'Ansiedad';
  a.estado = 'CRÍTICO';
  modoEmergencia = true;

  a.histBpm[a.histBpm.length - 1] = a.bpm;
  guardarTripulacionStorage();
  actualizarMetricas();
  renderizarTripulacion();
  dibujarTendencia();
  registrarBitacora(`ALERTA CRÍTICA en ${cfg.nombre}: Descompensación sistémica en ${a.nombre}.`, 'alert');

  abrirModalCritico([
    `Taquicardia e hipertensión: ${a.bpm} BPM | ${a.sys}/${a.dia} mmHg`,
    `Hipoxia arterial: ${a.spo2}% SpO₂ (Umbral mínimo: 94%)`,
    `Hiperglucemia aguda por estrés: ${a.glucose} mg/dL`,
    `Hipertermia leve: ${a.temp}°C`
  ]);
});

function simularValoresAltos() {
  document.getElementById('inputBpm').value = 146;
  document.getElementById('inputSys').value = 162;
  document.getElementById('inputGlucose').value = 210;
  document.getElementById('inputSpo2').value = 89;
  document.getElementById('inputTemp').value = 38.4;
  document.getElementById('inputSleep').value = 3.5;
  document.getElementById('inputMood').value = 'Ansiedad';
}

function evaluarSaludLocal() {
  const bpm = parseFloat(document.getElementById('inputBpm').value);
  const sys = parseFloat(document.getElementById('inputSys').value);
  const glucosa = parseFloat(document.getElementById('inputGlucose').value);
  const spo2 = parseFloat(document.getElementById('inputSpo2').value);
  const temp = parseFloat(document.getElementById('inputTemp').value);
  const sleep = parseFloat(document.getElementById('inputSleep').value);
  const mood = document.getElementById('inputMood').value;
  const archivo = document.getElementById('inputScan').files[0];

  const a = tripulacion[astronautaActual];
  const cfg = escenariosConfig[escenarioActual];
  a.bpm = bpm;
  a.sys = sys;
  a.glucose = glucosa;
  a.spo2 = spo2;
  a.temp = temp;
  a.sleep = sleep;
  a.mood = mood;

  a.histBpm[a.histBpm.length - 1] = bpm;
  a.histSleep[a.histSleep.length - 1] = sleep;

  let hallazgos = [];
  let recsExtra = [];

  if (bpm > 130) hallazgos.push(`Ritmo cardíaco elevado (${bpm} BPM).`);
  if (sys > 150 || sys < 85) hallazgos.push(`Presión arterial alterada (${sys}/${a.dia} mmHg).`);
  if (glucosa > 160) {
    hallazgos.push(`Hiperglucemia detectada (${glucosa} mg/dL).`);
    recsExtra.push('Suspender carbohidratos simples durante 3 horas y monitorear cetonas en sangre.');
  } else if (glucosa < 65) {
    hallazgos.push(`Hipoglucemia crítica (${glucosa} mg/dL).`);
    recsExtra.push('Suministrar inmediatamente 15g de gel de glucosa de absorción rápida.');
  }
  if (spo2 < 91) hallazgos.push(`Saturación de oxígeno crítica (${spo2}% SpO₂).`);
  if (temp > 38.2) hallazgos.push(`Fiebre / Hipertermia (${temp}°C) — posible reactivación inmune.`);
  if (sleep < 4.5 || mood === 'Ansiedad') {
    hallazgos.push(`Déficit de sueño (${sleep}h) o estrés conductual (${mood}).`);
    recsExtra.push('Aplicar protocolo de higiene circadiana (luz cálida) y sesión de descarga cognitiva.');
  }

  const salida = document.getElementById('checkupResult');

  if (hallazgos.length > 0) {
    modoEmergencia = true;
    a.estado = 'ALERTA';
    guardarTripulacionStorage();
    actualizarMetricas();
    renderizarTripulacion();
    dibujarTendencia();
    salida.innerHTML = `🚨 <strong>ALERTA EN ${cfg.nombre}:</strong> Protocolo específico para ${cfg.gravedad} desplegado.`;
    salida.className = 'text-rose-400 font-semibold';
    registrarBitacora(`Autoevaluación crítica en ${cfg.nombre} (${a.nombre}).`, 'alert');
    abrirModalCritico(hallazgos, recsExtra);
  } else {
    modoEmergencia = false;
    a.estado = 'Nominal';
    guardarTripulacionStorage();
    actualizarMetricas();
    renderizarTripulacion();
    dibujarTendencia();
    let msg = `✅ Parámetros (${bpm} BPM, ${sys}/${a.dia} mmHg, ${glucosa} mg/dL, ${sleep}h sueño) estables en ${cfg.nombre}.`;
    if (archivo) msg += ` Imagen "${archivo.name}" archivada sin anomalías.`;
    salida.innerHTML = msg;
    salida.className = 'text-emerald-300';
    registrarBitacora(`Autoevaluación nominal en ${cfg.nombre} para ${a.nombre}.`, 'ok');
  }
}

/* ============================================================================
   5. ESCÁNER HOLOGRÁFICO ANATÓMICO 3D (5 PELIGROS NASA HRP)
   ============================================================================ */

const organData = {
  neuro: {
    code: 'SYS-01: NEURO',
    coords: 'translate(90, 30)',
    glow: 'rgba(56, 189, 248, 0.22)',
    colorHex: '#38bdf8',
    stress: '78%',
    riskLabel: 'RIESGO EN ENTORNO: ALTO (78%)',
    tag: 'SISTEMA NEURO-OCULAR (SANS) Y CONDUCTUAL',
    title: 'Redistribución Cefálica y Aislamiento',
    desc: 'En microgravedad (0g), ~2L de líquido migran hacia la cabeza elevando la presión intracraneal. Además, el confinamiento y ciclos de luz cada 90 min alteran el sueño y el ánimo.',
    exam: 'Tonometría intraocular, escaneo OCT de retina, registro diario de horas de sueño y test cognitivo.',
    action: 'Terapia de luz circadiana LED, traje de presión negativa (LBNP) en 0g y soporte psicológico periódico.'
  },
  cardio: {
    code: 'SYS-02: CARDIO',
    coords: 'translate(96, 84)',
    glow: 'rgba(52, 211, 153, 0.22)',
    colorHex: '#34d399',
    stress: '65%',
    riskLabel: 'RIESGO EN ENTORNO: MODERADO (65%)',
    tag: 'SISTEMA CARDIOVASCULAR',
    title: 'Desacondicionamiento Cardíaco y Ortostatismo',
    desc: 'El corazón reduce su masa muscular al no bombear contra la gravedad; al aterrizar en Tierra (1g) o Marte (0.38g), la gravedad arrastra sangre a las piernas provocando síncopes.',
    exam: 'ECG continuo de 500 Hz, presión arterial sistólica/diastólica y prueba de tolerancia ortostática.',
    action: 'Protocolo aeróbico diario en cicloergómetro CEVIS + carga de fluidos isotónicos antes de reentrada.'
  },
  immune: {
    code: 'SYS-03: INMUNE',
    coords: 'translate(84, 118)',
    glow: 'rgba(251, 191, 36, 0.22)',
    colorHex: '#fbbf24',
    stress: '72%',
    riskLabel: 'RIESGO EN ENTORNO: ELEVADO (72%)',
    tag: 'INMUNIDAD, RADIACIÓN Y METABOLISMO',
    title: 'Alteración Inmunológica y Estrés Oxidativo',
    desc: 'La radiación cósmica y el cortisol por estrés de misión desregulan los linfocitos T, reactivan virus latentes y generan resistencia a la insulina.',
    exam: 'Glucemia capilar (mg/dL), temperatura corporal y dosimetría acumulada Tonalli.',
    action: 'Suplementación antioxidante, control glucémico y refugio en zona blindada contra tormentas solares.'
  },
  musculo: {
    code: 'SYS-04: ÓSEO',
    coords: 'translate(67, 186)',
    glow: 'rgba(167, 139, 250, 0.22)',
    colorHex: '#a78bfa',
    stress: '84%',
    riskLabel: 'RIESGO EN ENTORNO: CRÍTICO SIN EJERCICIO (84%)',
    tag: 'SISTEMA MUSCULOESQUELÉTICO',
    title: 'Osteopenia Espacial y Atrofia Muscular',
    desc: 'En 0g se pierde entre 1% y 1.5% de densidad mineral ósea por mes en fémur y columna; en Luna (0.16g) y Marte (0.38g) la carga parcial sigue siendo insuficiente.',
    exam: 'Densitometría ósea pre/post misión y monitoreo de fuerza isocinética.',
    action: 'Sesión obligatoria de 90 min en equipo resistivo ARED + suplemento diario de Vitamina D3.'
  }
};

function seleccionarOrgano(clave) {
  const info = organData[clave];
  document.getElementById('activeReticle').setAttribute('transform', info.coords);
  document.getElementById('holoTargetCode').textContent = info.code;
  document.getElementById('holoAmbientGlow').style.backgroundColor = info.glow;

  document.getElementById('organTag').textContent = info.tag;
  document.getElementById('organTitle').textContent = info.title;
  document.getElementById('organDesc').textContent = info.desc;
  document.getElementById('organExam').textContent = info.exam;
  document.getElementById('organAction').textContent = info.action;
  document.getElementById('organRiskBadge').textContent = info.riskLabel;
  document.getElementById('organStressPct').textContent = info.stress;
  document.getElementById('organStressPct').style.color = info.colorHex;
  document.getElementById('organStressBar').style.width = info.stress;
  document.getElementById('organStressBar').style.backgroundColor = info.colorHex;

  document.querySelectorAll('.organ-pill').forEach(btn => {
    btn.className = 'organ-pill px-3 py-2 rounded-xl bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer';
  });
  const btnActivo = document.getElementById(`btn-organ-${clave}`);
  if (btnActivo) {
    btnActivo.className = 'organ-pill px-3 py-2 rounded-xl bg-cyan-500/20 text-white border border-cyan-400 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/10';
  }
}

function actualizarBienestar() {
  const total = document.querySelectorAll('.wellness-task').length;
  const marcadas = document.querySelectorAll('.wellness-task:checked').length;
  const pct = Math.round((marcadas / total) * 100);
  document.getElementById('wellnessScore').textContent = pct + '%';
  document.getElementById('sidebarWellnessBadge').textContent = pct + '%';
  document.getElementById('wellnessBar').style.width = pct + '%';
  registrarBitacora(`Índice preventivo actualizado al ${pct}%.`, 'ok');
}

/* ============================================================================
   6. MOTOR DE SIMULACIÓN FISIOLÓGICA Y GRÁFICAS EN CANVAS 2D
   ============================================================================ */

setInterval(() => {
  tripulacion.forEach((p) => {
    if (p.estado !== 'CRÍTICO' && p.estado !== 'ALERTA') {
      p.bpm = Math.max(62, Math.min(84, p.bpm + (Math.floor(Math.random() * 5) - 2)));
    } else {
      p.bpm = Math.max(145, Math.min(165, p.bpm + (Math.floor(Math.random() * 7) - 3)));
    }
  });
  actualizarMetricas();
}, 2000);

function dibujarTendencia() {
  const tCanvas = document.getElementById('trendCanvas');
  if (!tCanvas || tCanvas.offsetWidth === 0) return;
  tCanvas.width = tCanvas.offsetWidth;
  tCanvas.height = tCanvas.offsetHeight;

  const tCtx = tCanvas.getContext('2d');
  const w = tCanvas.width;
  const h = tCanvas.height;
  const pad = 22;
  const a = tripulacion[astronautaActual];
  const dias = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'Ayer', 'Hoy'];

  tCtx.clearRect(0, 0, w, h);

  tCtx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  tCtx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + ((h - pad * 2) / 3) * i;
    tCtx.beginPath();
    tCtx.moveTo(pad, y);
    tCtx.lineTo(w - pad, y);
    tCtx.stroke();
  }

  const stepX = (w - pad * 2) / (dias.length - 1);

  tCtx.fillStyle = '#64748b';
  tCtx.font = '10px JetBrains Mono';
  tCtx.textAlign = 'center';
  dias.forEach((d, i) => {
    tCtx.fillText(d, pad + i * stepX, h - 5);
  });

  tCtx.strokeStyle = '#22d3ee';
  tCtx.lineWidth = 2.5;
  tCtx.beginPath();
  a.histBpm.forEach((val, i) => {
    const px = pad + i * stepX;
    const norm = Math.min(1, Math.max(0, (val - 50) / 110));
    const py = (h - pad) - norm * (h - pad * 2);
    if (i === 0) tCtx.moveTo(px, py);
    else tCtx.lineTo(px, py);
  });
  tCtx.stroke();

  a.histBpm.forEach((val, i) => {
    const px = pad + i * stepX;
    const norm = Math.min(1, Math.max(0, (val - 50) / 110));
    const py = (h - pad) - norm * (h - pad * 2);
    tCtx.fillStyle = val > 130 ? '#f43f5e' : '#22d3ee';
    tCtx.beginPath();
    tCtx.arc(px, py, 3.5, 0, Math.PI * 2);
    tCtx.fill();
  });

  tCtx.strokeStyle = '#fbbf24';
  tCtx.lineWidth = 2;
  tCtx.setLineDash([4, 3]);
  tCtx.beginPath();
  a.histSleep.forEach((val, i) => {
    const px = pad + i * stepX;
    const norm = Math.min(1, Math.max(0, (val - 3) / 6));
    const py = (h - pad) - norm * (h - pad * 2);
    if (i === 0) tCtx.moveTo(px, py);
    else tCtx.lineTo(px, py);
  });
  tCtx.stroke();
  tCtx.setLineDash([]);
}

const canvas = document.getElementById('ecgCanvas');
const ctx = canvas.getContext('2d');
let x = 0;
let ultimoY = 85;

function dibujarECG() {
  if (canvas.width !== canvas.offsetWidth && canvas.offsetWidth > 0) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ultimoY = canvas.height / 2;
  }
  const mid = canvas.height / 2;
  const velocidad = modoEmergencia ? 5.2 : 2.5;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.14)';
  ctx.fillRect(x, 0, 16, canvas.height);

  ctx.strokeStyle = modoEmergencia ? '#f43f5e' : '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, ultimoY);

  x += velocidad;
  if (x > canvas.width) {
    x = 0;
    ctx.moveTo(0, mid);
  }

  const ciclo = (x % (modoEmergencia ? 44 : 95));
  let y = mid + (Math.random() * 4 - 2);
  if (ciclo > 10 && ciclo < 15) y = mid - 10;
  else if (ciclo >= 15 && ciclo < 20) y = mid + 12;
  else if (ciclo >= 20 && ciclo < 26) y = mid - (modoEmergencia ? 62 : 44);
  else if (ciclo >= 26 && ciclo < 32) y = mid + 20;
  else if (ciclo >= 40 && ciclo < 50) y = mid - 10;

  ctx.lineTo(x, y);
  ctx.stroke();
  ultimoY = y;

  requestAnimationFrame(dibujarECG);
}

/* ============================================================================
   7. INICIALIZACIÓN DEL SISTEMA
   ============================================================================ */
window.addEventListener('resize', dibujarTendencia);

renderizarTripulacion();
actualizarMetricas();
dibujarTendencia();
registrarBitacora(`Sistema Multi-Gravedad Tonalli Vital iniciado (${tripulacion.length} tripulantes activos).`);
dibujarECG();