// Historial local: cada envío válido conserva una instantánea de sus importes.
const claveHistorial = "nova-agencia.cotizaciones.v1";
const historialMensaje = document.getElementById("historialMensaje");
const exportarHistorial = document.getElementById("exportarHistorial");
const buscarHistorial = document.getElementById("buscarHistorial");
const alternarHistorial = document.getElementById("alternarHistorial");
const historyContent = document.getElementById("historyContent");
let historial = [];
let filtroHistorial = "";
const normalizarBusqueda = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CO");
const formatoId = (numero) => String(numero).padStart(3, "0");

// Se conservan las cotizaciones antiguas con 0%; las nuevas exigen del 1% al 100%.
function registroValido(registro) {
  return registro !== null && typeof registro === "object"
    && typeof registro.id === "string"
    && typeof registro.fecha === "string" && Number.isFinite(Date.parse(registro.fecha))
    && (registro.venceEn === undefined || (typeof registro.venceEn === "string" && Number.isFinite(Date.parse(registro.venceEn))))
    && typeof registro.cliente === "string" && registro.cliente.trim() !== ""
    && Object.hasOwn(servicioTexto, registro.servicio)
    && ["horas", "tarifa", "descuento", "subtotal", "valorDescuento", "iva", "total"]
      .every((campo) => Number.isFinite(registro[campo]) && registro[campo] >= 0)
    && registro.horas > 0 && registro.tarifa > 0 && registro.descuento <= 100;
}

try {
  const guardado = localStorage.getItem(claveHistorial);
  if (guardado !== null) {
    const registros = JSON.parse(guardado);
    if (!Array.isArray(registros) || !registros.every(registroValido)) throw new Error("Historial inválido");
    historial = registros;
    // Migra las cotizaciones anteriores sin cambiar su fecha original.
    const requiereMigracion = historial.some(c => !c.venceEn);
    historial = historial.map(c => ({ ...c, venceEn: c.venceEn || calcularVencimiento(c.fecha) }));
    // Convierte los UUID anteriores a IDs cortos consecutivos, conservando el orden del historial.
    const requiereIdsCortos = historial.some((c, indice) => c.id !== formatoId(indice + 1));
    if (requiereIdsCortos) historial = historial.map((c, indice) => ({ ...c, id: formatoId(indice + 1) }));
    if (requiereMigracion || requiereIdsCortos) {
      try { localStorage.setItem(claveHistorial, JSON.stringify(historial)); }
      catch (error) { historialMensaje.textContent = "Los vencimientos se calcularon, pero no pudieron guardarse. Exporta el historial para conservarlos."; }
    }
  }
} catch (error) {
  historialMensaje.textContent = "No se pudo recuperar el historial. Las nuevas cotizaciones seguirán disponibles para exportar.";
}

function mostrarHistorial(actualizarDatosGrafico = true) {
  const consulta = normalizarBusqueda(filtroHistorial.trim());
  const registrosVisibles = consulta === "" ? historial : historial.filter((cotizacion) =>
    normalizarBusqueda(cotizacion.id).includes(consulta)
      || normalizarBusqueda(cotizacion.cliente).includes(consulta)
  );
  const filas = document.getElementById("historialFilas");
  filas.replaceChildren();
  const fragmento = document.createDocumentFragment();
  for (const cotizacion of registrosVisibles) {
    const fila = document.createElement("tr");
    const valores = [
      cotizacion.id, new Date(cotizacion.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }),
      cotizacion.cliente, servicioTexto[cotizacion.servicio],
      fechaHoraCorta(cotizacion.venceEn), estadoVigencia(cotizacion), money(cotizacion.total)
    ];
    valores.forEach((valor, indice) => {
      const celda = document.createElement("td");
      celda.textContent = valor;
      if (indice === 0) celda.className = "history-id";
      if (indice === 2) celda.className = "history-client";
      if (indice === 5) {
        const estado = document.createElement("span");
        estado.textContent = valor;
        estado.className = `validity-badge ${valor === "Vencida" ? "expired" : valor === "Vence hoy" ? "expires-today" : "active"}`;
        celda.replaceChildren(estado);
      }
      if (indice === 3) {
        const detalles = document.createElement("small");
        detalles.className = "history-service-detail";
        detalles.textContent = `${cotizacion.horas} h · ${cotizacion.descuento}% desc. · ${clasificarProyecto(cotizacion.horas)}`;
        celda.appendChild(detalles);
      }
      if (indice === 6) celda.className = "amount-column";
      fila.appendChild(celda);
    });
    fragmento.appendChild(fila);
  }
  filas.appendChild(fragmento);
  document.getElementById("historyCount").textContent = historial.length;
  const vacio = document.getElementById("historialVacio");
  if (historial.length === 0) {
    vacio.querySelector("h3").textContent = "Tu primera propuesta empieza arriba";
    vacio.querySelector("p").textContent = "Al calcular una cotización válida, aparecerá aquí automáticamente.";
  } else if (registrosVisibles.length === 0) {
    vacio.querySelector("h3").textContent = "No encontramos coincidencias";
    vacio.querySelector("p").textContent = "Prueba con otro nombre de cliente o ID.";
  }
  vacio.hidden = registrosVisibles.length > 0;
  document.getElementById("historialTabla").hidden = registrosVisibles.length === 0;
  exportarHistorial.disabled = historial.length === 0;
  historialMensaje.textContent = consulta === "" ? `${historial.length} ${historial.length === 1 ? "cotización guardada" : "cotizaciones guardadas"}.` : `${registrosVisibles.length} de ${historial.length} coincidencias.`;
  actualizarCalendario();
  const resumen = document.getElementById("resVencimiento");
  const cotizacionActual = historial.find(c => c.id === resumen.dataset.cotizacion);
  if (cotizacionActual) resumen.textContent = `${estadoVigencia(cotizacionActual)} · Vence el ${fechaHoraCorta(cotizacionActual.venceEn)}`;
  if (actualizarDatosGrafico) actualizarGrafico();
}

function agregarCotizacion(datos) {
  const fecha = new Date().toISOString();
  const siguienteNumero = historial.reduce((mayor, cotizacion) => Math.max(mayor, Number(cotizacion.id) || 0), 0) + 1;
  const cotizacion = { ...datos, id: formatoId(siguienteNumero), fecha, venceEn: calcularVencimiento(fecha) };
  historial.unshift(cotizacion);
  document.getElementById("resVencimiento").dataset.cotizacion = cotizacion.id;
  mostrarHistorial();
  try {
    localStorage.setItem(claveHistorial, JSON.stringify(historial));
    historialMensaje.textContent = `${historial.length} ${historial.length === 1 ? "cotización guardada" : "cotizaciones guardadas"}.`;
  } catch (error) {
    historialMensaje.textContent = "No se pudo guardar en el navegador. Exporta el historial antes de cerrar esta página.";
  }
}

// Comillas y saltos de línea válidos en CSV; evita fórmulas en nombres de cliente.
function celdaCSV(valor) {
  let texto = typeof valor === "number" ? String(valor).replace(".", ",") : String(valor);
  if (typeof valor === "string" && /^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

function crearCSV() {
  const cabecera = ["ID", "Fecha (ISO)", "Cliente", "Servicio", "Horas", "Tarifa COP", "Descuento %", "Subtotal COP", "Descuento COP", "IVA COP", "Total COP", "Nivel", "Vencimiento (ISO)", "Estado"];
  const filas = historial.map((c) => [c.id, c.fecha, c.cliente, servicioTexto[c.servicio], c.horas, c.tarifa, c.descuento, c.subtotal, c.valorDescuento, c.iva, c.total, clasificarProyecto(c.horas), c.venceEn, estadoVigencia(c)]);
  // BOM UTF-8 para conservar tildes al abrir en Excel. Separador regional: punto y coma.
  return "\uFEFF" + [cabecera, ...filas].map((fila) => fila.map(celdaCSV).join(";")).join("\r\n");
}

exportarHistorial.addEventListener("click", () => {
  if (historial.length === 0) return;
  const archivo = new Blob([crearCSV()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `cotizaciones-nova-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  historialMensaje.textContent = "Exportación CSV preparada.";
});

buscarHistorial.addEventListener("input", () => {
  filtroHistorial = buscarHistorial.value;
  mostrarHistorial(false);
});

function actualizarRepliegue(replegado) {
  historyContent.hidden = replegado;
  alternarHistorial.setAttribute("aria-expanded", String(!replegado));
  alternarHistorial.querySelector("span").textContent = replegado ? "Expandir" : "Replegar";
  alternarHistorial.querySelector(".icon").style.transform = replegado ? "rotate(180deg)" : "";
  alternarHistorial.setAttribute("aria-label", replegado ? "Expandir historial de cotizaciones" : "Replegar historial de cotizaciones");
}

let historialReplegado = localStorage.getItem("nova-agencia.historial-replegado") === "1";
alternarHistorial.addEventListener("click", () => {
  historialReplegado = !historialReplegado;
  localStorage.setItem("nova-agencia.historial-replegado", historialReplegado ? "1" : "0");
  actualizarRepliegue(historialReplegado);
});

mostrarHistorial();
actualizarRepliegue(historialReplegado);
