// Gráfico y exportación PDF local, sin dependencias externas.
const botonGrafico = document.getElementById("exportarGrafico");
const mensajeGrafico = document.getElementById("graficoMensaje");
const registrosPorPagina = 8;
let revisionGrafico = 0;
const selectorOrdenGrafico = document.getElementById("ordenGrafico");
const nombresOrden = { recientes: "Más recientes primero", mayor: "Mayor a menor valor", menor: "Menor a mayor valor" };

function cotizacionesOrdenadas() {
  // Ordena una copia: el historial y el calendario conservan su organización.
  return [...historial].sort((a, b) => {
    const porFecha = Date.parse(b.fecha) - Date.parse(a.fecha);
    if (selectorOrdenGrafico.value === "mayor") return b.total - a.total || porFecha;
    if (selectorOrdenGrafico.value === "menor") return a.total - b.total || porFecha;
    return porFecha;
  });
}
selectorOrdenGrafico.addEventListener("change", () => {
  actualizarGrafico();
});

function textoRecortado(contexto, texto, ancho) {
  const caracteres = Array.from(texto);
  while (caracteres.length && contexto.measureText(caracteres.join("") + "…").width > ancho) caracteres.pop();
  return caracteres.length === Array.from(texto).length ? texto : caracteres.join("") + "…";
}

function dibujarPagina(registros, pagina, cantidadPaginas, maximo, cantidad, fecha) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1132;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `Página ${pagina + 1}. ` + registros.map(c => `${c.cliente}: ${money(c.total)}`).join(". "));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1600, 1132);
  ctx.fillStyle = "#432344"; ctx.fillRect(0, 0, 1600, 115);
  ctx.fillStyle = "#ffffff"; ctx.font = "600 34px Inter, Arial";
  ctx.fillText("Nova Agencia", 60, 70);
  ctx.font = "400 22px Inter, Arial"; ctx.textAlign = "right";
  ctx.fillText("HISTORIAL DE COTIZACIONES", 1540, 68); ctx.textAlign = "left";
  ctx.fillStyle = "#432344"; ctx.font = "600 37px Inter, Arial";
  ctx.fillText("Valor de las cotizaciones", 60, 183);
  ctx.fillStyle = "#766b78"; ctx.font = "400 22px Inter, Arial";
  ctx.fillText(`Total con IVA · COP · ${cantidad} cotizaciones · ${nombresOrden[selectorOrdenGrafico.value]}`, 60, 229);
  const izquierda = 395, ancho = 880, arriba = 315, fila = 82;
  const altura = registros.length * fila;
  for (let i = 0; i <= 4; i++) {
    const x = izquierda + ancho * i / 4;
    ctx.strokeStyle = "#e9e1e8"; ctx.beginPath(); ctx.moveTo(x, arriba - 16); ctx.lineTo(x, arriba + altura - 12); ctx.stroke();
    ctx.fillStyle = "#766b78"; ctx.font = "400 17px Inter, Arial"; ctx.textAlign = "center";
    ctx.fillText(new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(maximo * i / 4), x, arriba - 36);
  }
  ctx.textAlign = "left";
  registros.forEach((c, i) => {
    const y = arriba + i * fila;
    ctx.fillStyle = "#432344"; ctx.font = "600 23px Inter, Arial";
    ctx.fillText(textoRecortado(ctx, c.cliente, 310), 60, y + 22);
    ctx.fillStyle = "#766b78"; ctx.font = "400 16px Inter, Arial";
    ctx.fillText(new Date(c.fecha).toLocaleString("es-CO", {dateStyle:"short", timeStyle:"short"}), 60, y + 48);
    ctx.fillStyle = "#f3eaf2"; ctx.fillRect(izquierda, y, ancho, 43);
    ctx.fillStyle = "#875080"; ctx.fillRect(izquierda, y, (maximo ? c.total / maximo : 0) * ancho, 43);
    ctx.fillStyle = "#432344"; ctx.font = "600 23px Inter, Arial";
    const importe = money(c.total);
    // Reduce solo los importes extraordinariamente largos para evitar recortes.
    if (ctx.measureText(importe).width > 240) ctx.font = `${Math.max(7, 23 * 240 / ctx.measureText(importe).width)}px Inter, Arial`;
    ctx.fillText(importe, 1295, y + 29);
  });
  ctx.strokeStyle = "#e9e1e8"; ctx.beginPath(); ctx.moveTo(60, 1042); ctx.lineTo(1540, 1042); ctx.stroke();
  ctx.fillStyle = "#766b78"; ctx.font = "400 18px Inter, Arial";
  ctx.fillText(`Generado: ${fecha} · Importes estimados, no ventas confirmadas.`, 60, 1084);
  ctx.textAlign = "right"; ctx.fillText(`Página ${pagina + 1} de ${cantidadPaginas}`, 1540, 1084);
  return canvas;
}

async function actualizarGrafico() {
  const revision = ++revisionGrafico;
  botonGrafico.disabled = true;
  await document.fonts.ready;
  if (revision !== revisionGrafico) return;
  const contenedor = document.getElementById("graficos");
  contenedor.replaceChildren();
  document.getElementById("graficoVacio").hidden = historial.length > 0;
  contenedor.hidden = historial.length === 0;
  mensajeGrafico.textContent = "";
  const paginas = Math.ceil(historial.length / registrosPorPagina);
  const ordenadas = cotizacionesOrdenadas();
  const maximo = historial.reduce((max, c) => Math.max(max, c.total), 0);
  const fecha = new Date().toLocaleString("es-CO");
  for (let i = 0; i < paginas; i++) {
    contenedor.appendChild(dibujarPagina(ordenadas.slice(i * registrosPorPagina, (i + 1) * registrosPorPagina), i, paginas, maximo, historial.length, fecha));
  }
  botonGrafico.disabled = historial.length === 0;
}

// PDF 1.4: cada página contiene el gráfico como JPEG de alta resolución.
// Los offsets se calculan en bytes, no en caracteres, para preservar un PDF válido.
function crearPDFGraficos(canvases) {
  const encoder = new TextEncoder();
  const partes = []; const offsets = [0]; let longitud = 0;
  function escribir(dato) {
    const bytes = typeof dato === "string" ? encoder.encode(dato) : dato;
    partes.push(bytes); longitud += bytes.length;
  }
  function objeto(numero, contenido) {
    offsets[numero] = longitud;
    escribir(`${numero} 0 obj\n`); escribir(contenido); escribir("\nendobj\n");
  }
  escribir("%PDF-1.4\n");
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, `<< /Type /Pages /Count ${canvases.length} /Kids [${canvases.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
  canvases.forEach((canvas, i) => {
    const numero = 3 + i * 3;
    const jpeg = Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.96).split(",")[1]), c => c.charCodeAt(0));
    objeto(numero, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Grafico ${numero + 1} 0 R >> >> /Contents ${numero + 2} 0 R >>`);
    offsets[numero + 1] = longitud;
    escribir(`${numero + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    escribir(jpeg); escribir("\nendstream\nendobj\n");
    const contenido = "q\n842 0 0 595 0 0 cm\n/Grafico Do\nQ";
    objeto(numero + 2, `<< /Length ${encoder.encode(contenido).length} >>\nstream\n${contenido}\nendstream`);
  });
  const xref = longitud;
  escribir(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i++) escribir(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  escribir(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(partes, { type: "application/pdf" });
}

botonGrafico.addEventListener("click", () => {
  const canvases = Array.from(document.querySelectorAll("#graficos canvas"));
  if (!canvases.length) return;
  try {
    const url = URL.createObjectURL(crearPDFGraficos(canvases));
    const enlace = document.createElement("a");
    enlace.href = url; enlace.download = `grafico-cotizaciones-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(enlace); enlace.click(); enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    mensajeGrafico.textContent = `PDF preparado con ${canvases.length} ${canvases.length === 1 ? "página" : "páginas"}.`;
  } catch (error) {
    mensajeGrafico.textContent = "No se pudo exportar el gráfico. Inténtalo de nuevo.";
  }
});
