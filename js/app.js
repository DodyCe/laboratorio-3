// Nombres visibles de los servicios (string).
const servicioTexto = {
  web: "Sitio web corporativo",
  ecommerce: "Tienda virtual",
  landing: "Landing page",
  seo: "Posicionamiento SEO"
};

const money = (valor) => valor.toLocaleString("es-CO", {
  style: "currency", currency: "COP", maximumFractionDigits: 0
});

// Funciones tradicionales y flecha para separar las operaciones.
function calcularSubtotal(horas, tarifa) {
  return horas * tarifa;
}
const calcularDescuento = (subtotal, porcentaje) => subtotal * (porcentaje / 100);
// Se usa la base del reto del PDF: IVA sobre subtotal, antes del descuento.
const IVA = 0.19;
const calcularIVA = (subtotal) => subtotal * IVA;
const calcularTotal = (subtotal, descuento, iva) => subtotal - descuento + iva;
const clasificarProyecto = (horas) => {
  if (horas <= 10) {
    return "Básico";
  } else if (horas <= 30) {
    return "Intermedio";
  } else {
    return "Avanzado";
  }
};

function validarDatos(cliente, servicio, horas, tarifa, descuento) {
  if (cliente === "") {
    return "Ingrese el nombre del cliente.";
  } else if (!Object.hasOwn(servicioTexto, servicio)) {
    return "Seleccione un servicio.";
  } else if (!Number.isFinite(horas) || horas <= 0) {
    return "Las horas deben ser mayores que cero.";
  } else if (!Number.isInteger(horas)) {
    return "Las horas deben ser números enteros, sin decimales.";
  } else if (!Number.isFinite(tarifa) || tarifa <= 0) {
    return "La tarifa debe ser mayor que cero.";
  }
  const descuentoValido = Number.isFinite(descuento) && descuento >= 1 && descuento <= 100;
  if (!descuentoValido) {
    return "El descuento debe estar entre 1% y 100%.";
  }
  if (!Number.isFinite(calcularSubtotal(horas, tarifa))) {
    return "Los valores ingresados son demasiado grandes.";
  }
  return "";
}

const formulario = document.getElementById("formCotizacion");
const mensaje = document.getElementById("mensaje");
const estadoCotizacion = document.getElementById("estadoCotizacion");
const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
// Evita negativos al escribir, pegar o usar los controles del campo.
formulario.querySelectorAll('input[type="number"]').forEach((entrada) => {
  let ultimoValor = entrada.value;
  entrada.addEventListener("keydown", (evento) => {
    if (["-", "+", "e", "E"].includes(evento.key) && !evento.ctrlKey && !evento.metaKey) evento.preventDefault();
    if (entrada.id === "horas" && [".", ",", "Decimal"].includes(evento.key)) evento.preventDefault();
  });
  entrada.addEventListener("beforeinput", (evento) => {
    if (evento.data && /[-−]/.test(evento.data)) evento.preventDefault();
    if (entrada.id === "horas" && evento.data && /[.,]/.test(evento.data)) evento.preventDefault();
  });
  entrada.addEventListener("paste", (evento) => {
    if (/[-−]/.test(evento.clipboardData.getData("text"))) evento.preventDefault();
    if (entrada.id === "horas" && /[.,]/.test(evento.clipboardData.getData("text"))) evento.preventDefault();
  });
  entrada.addEventListener("input", () => {
    const valor = Number(entrada.value);
    const fueraDeRango = entrada.value !== "" && (
      !Number.isFinite(valor) || valor < 0 ||
      (entrada.id === "horas" && !Number.isInteger(valor)) ||
      (entrada.id === "descuento" && (valor < 1 || valor > 100))
    );
    if (fueraDeRango) entrada.value = ultimoValor;
    else ultimoValor = entrada.value;
  });
  formulario.addEventListener("reset", () => { ultimoValor = entrada.defaultValue; });
});
movimientoReducido.addEventListener("change", () => {
  if (movimientoReducido.matches) {
    document.querySelectorAll(".ripple").forEach((onda) => onda.remove());
    document.querySelector(".resumen").getAnimations().forEach((animacion) => animacion.cancel());
  }
});

function mostrarError(error) {
  mensaje.textContent = error;
  mensaje.className = "error";
  const campo = error.includes("cliente") ? "cliente"
    : error.includes("servicio") ? "servicio"
    : error.includes("horas") ? "horas"
    : error.includes("tarifa") ? "tarifa"
    : error.includes("descuento") ? "descuento" : null;
  if (campo) {
    const entrada = document.getElementById(campo);
    entrada.setAttribute("aria-invalid", "true");
    entrada.setAttribute("aria-describedby", campo === "descuento" ? "descuentoAyuda mensaje" : "mensaje");
    entrada.focus();
  }
}

function limpiarValidacion() {
  formulario.querySelectorAll("[aria-invalid]").forEach((entrada) => {
    entrada.removeAttribute("aria-invalid");
    if (entrada.id === "descuento") entrada.setAttribute("aria-describedby", "descuentoAyuda");
    else entrada.removeAttribute("aria-describedby");
  });
}
// let conserva el número de cotizaciones válidas realizadas en esta sesión.
let cotizacionesRealizadas = 0;

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  limpiarValidacion();
  const cliente = document.getElementById("cliente").value.trim();
  const servicio = document.getElementById("servicio").value;
  const horas = Number(document.getElementById("horas").value);
  const tarifa = Number(document.getElementById("tarifa").value);
  const descuentoTexto = document.getElementById("descuento").value;
  const descuento = descuentoTexto === "" ? NaN : Number(descuentoTexto);
  const error = validarDatos(cliente, servicio, horas, tarifa, descuento);
  if (error !== "") {
    mostrarError(error);
    return;
  }

  const subtotal = calcularSubtotal(horas, tarifa);
  const valorDescuento = calcularDescuento(subtotal, descuento);
  const iva = calcularIVA(subtotal);
  const total = calcularTotal(subtotal, valorDescuento, iva);
  if (!Number.isFinite(total)) {
    mostrarError("Los valores ingresados son demasiado grandes.");
    return;
  }
  document.getElementById("resCliente").textContent = cliente;
  document.getElementById("resServicio").textContent = servicioTexto[servicio];
  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("descuentoValor").textContent = money(valorDescuento);
  document.getElementById("total").textContent = money(total);
  document.getElementById("ivaValor").textContent = money(iva);
  document.getElementById("resNivel").textContent = `Nivel: ${clasificarProyecto(horas)}`;
  document.getElementById("resHoras").textContent = `Horas cotizadas: ${horas}`;
  document.getElementById("resDedicacion").textContent = horas > 40 ? "Proyecto de alta dedicación" : "";
  document.getElementById("resAprobacion").textContent = total > 2000000 ? "Requiere aprobación comercial" : "";
  mensaje.textContent = "Cotización calculada correctamente.";
  mensaje.className = "ok";
  estadoCotizacion.textContent = "Cotización lista";
  if (!movimientoReducido.matches) {
    document.querySelector(".resumen").animate(
      [{ opacity: 0.5, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 200, easing: "ease-out" }
    );
  }
  cotizacionesRealizadas += 1;
  agregarCotizacion({ cliente, servicio, horas, tarifa, descuento, subtotal, valorDescuento, iva, total });
  console.log(`Cotización ${cotizacionesRealizadas}: ${cliente} / ${money(total)}`);
});

// reset restaura los campos a sus valores iniciales y limpia todo el resumen.
formulario.addEventListener("reset", () => {
  document.getElementById("resVencimiento").textContent = "";
  delete document.getElementById("resVencimiento").dataset.cotizacion;
  limpiarValidacion();
  estadoCotizacion.textContent = "Por calcular";
  document.getElementById("resCliente").textContent = "Sin datos";
  document.getElementById("resServicio").textContent = "Seleccione un servicio";
  document.getElementById("resNivel").textContent = "Nivel: sin datos";
  document.getElementById("resHoras").textContent = "Horas cotizadas: 0";
  for (const id of ["subtotal", "descuentoValor", "ivaValor", "total"]) {
    document.getElementById(id).textContent = "$0";
  }
  document.getElementById("resDedicacion").textContent = "";
  document.getElementById("resAprobacion").textContent = "";
  mensaje.textContent = "";
  mensaje.className = "";
  cotizacionesRealizadas = 0;
});

// Un cambio indica que el resumen corresponde a la última cotización calculada.
formulario.addEventListener("input", () => {
  limpiarValidacion();
  mensaje.textContent = "";
  mensaje.className = "";
  if (cotizacionesRealizadas > 0) estadoCotizacion.textContent = "Cambios pendientes";
});

// Onda discreta inspirada en Ripple Button de Lightswind, sin dependencias.
document.querySelector(".primary").addEventListener("click", (evento) => {
  if (movimientoReducido.matches) return;
  const boton = evento.currentTarget;
  const limites = boton.getBoundingClientRect();
  const onda = document.createElement("span");
  onda.className = "ripple";
  onda.setAttribute("aria-hidden", "true");
  onda.style.left = `${(evento.detail ? evento.clientX - limites.left : limites.width / 2) - 10}px`;
  onda.style.top = `${(evento.detail ? evento.clientY - limites.top : limites.height / 2) - 10}px`;
  boton.appendChild(onda);
  onda.addEventListener("animationend", () => onda.remove(), { once: true });
  // También elimina la onda si el usuario activa movimiento reducido durante el efecto.
  window.setTimeout(() => onda.remove(), 600);
});
