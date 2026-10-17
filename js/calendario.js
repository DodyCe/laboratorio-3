// Días naturales: se conserva la hora local de creación al calcular el vencimiento.
const DIAS_VIGENCIA = 15;
const fechaInicialCalendario = new Date();
let mesVisible = new Date(fechaInicialCalendario.getFullYear(), fechaInicialCalendario.getMonth(), 1);
let diaElegido = claveDia(fechaInicialCalendario);

function claveDia(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function calcularVencimiento(fecha) {
  const vencimiento = new Date(fecha);
  vencimiento.setDate(vencimiento.getDate() + DIAS_VIGENCIA);
  return vencimiento.toISOString();
}
function estadoVigencia(cotizacion, ahora = new Date()) {
  const limite = new Date(cotizacion.venceEn);
  if (limite <= ahora) return "Vencida";
  if (claveDia(limite) === claveDia(ahora)) return "Vence hoy";
  return "Vigente";
}
function fechaHoraCorta(fecha) {
  return new Date(fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function actualizarCalendario() {
  document.getElementById("vigenciaAyuda").textContent = `Cada cotización es válida durante ${DIAS_VIGENCIA} días naturales desde su creación.`;
  document.getElementById("mesCalendario").textContent = mesVisible.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const dias = document.getElementById("diasCalendario");
  dias.replaceChildren();
  const desplazamiento = (mesVisible.getDay() + 6) % 7;
  const ultimo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
  for (let i = 0; i < desplazamiento; i++) {
    const espacio = document.createElement("span"); espacio.setAttribute("aria-hidden", "true"); dias.appendChild(espacio);
  }
  const hoy = claveDia(new Date());
  for (let numero = 1; numero <= ultimo; numero++) {
    const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numero);
    const clave = claveDia(fecha);
    const cantidad = historial.filter(c => claveDia(c.venceEn) === clave).length;
    const boton = document.createElement("button");
    boton.type = "button"; boton.className = "calendar-day";
    boton.dataset.fecha = clave;
    boton.textContent = numero;
    boton.setAttribute("aria-pressed", String(clave === diaElegido));
    boton.setAttribute("aria-label", `${fecha.toLocaleDateString("es-CO", {dateStyle:"full"})}. ${cantidad} vencimientos.`);
    if (clave === hoy) boton.setAttribute("aria-current", "date");
    if (cantidad) {
      boton.classList.add("has-expirations");
      const marca = document.createElement("span"); marca.className = "day-count"; marca.textContent = cantidad; marca.setAttribute("aria-hidden", "true"); boton.appendChild(marca);
    }
    boton.addEventListener("click", () => {
      diaElegido = clave; actualizarCalendario();
      document.querySelector(`[data-fecha="${clave}"]`).focus({preventScroll:true});
    });
    dias.appendChild(boton);
  }
  const fechaSeleccionada = new Date(`${diaElegido}T12:00:00`);
  document.getElementById("diaSeleccionado").textContent = fechaSeleccionada.toLocaleDateString("es-CO", {day:"numeric",month:"long",year:"numeric"});
  const lista = document.getElementById("vencimientosDia"); lista.replaceChildren();
  const registros = historial.filter(c => claveDia(c.venceEn) === diaElegido).sort((a,b) => Date.parse(a.venceEn)-Date.parse(b.venceEn));
  if (!registros.length) {
    const vacio = document.createElement("li"); vacio.textContent = "No hay cotizaciones que venzan este día."; vacio.className = "calendar-empty"; lista.appendChild(vacio);
  }
  for (const c of registros) {
    const li = document.createElement("li");
    const nombre = document.createElement("strong"); nombre.textContent = c.cliente;
    const detalle = document.createElement("span"); detalle.textContent = `${new Date(c.venceEn).toLocaleTimeString("es-CO", {hour:"2-digit",minute:"2-digit"})} · ${money(c.total)} · ${estadoVigencia(c)}`;
    li.append(nombre, detalle); lista.appendChild(li);
  }
}

document.getElementById("mesAnterior").addEventListener("click", () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1); actualizarCalendario();
});
document.getElementById("mesSiguiente").addEventListener("click", () => {
  mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1); actualizarCalendario();
});
document.getElementById("calendarioHoy").addEventListener("click", () => {
  const hoy = new Date(); mesVisible = new Date(hoy.getFullYear(), hoy.getMonth(), 1); diaElegido = claveDia(hoy); actualizarCalendario();
});

// Refresca los estados mientras la página permanece abierta y al volver a ella.
window.setInterval(() => mostrarHistorial(false), 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) mostrarHistorial(false); });
