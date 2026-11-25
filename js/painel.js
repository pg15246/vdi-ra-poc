// Desenha o painel de um conector num <canvas> (usado na RA como textura e na vista sem RA).
// Versão para o técnico: estado, últimos 7 dias (funcional / avariado / sem comunicação),
// disponibilidade, avarias e o histórico de intervenções. Dados FICTÍCIOS. Sem dependências.
(function () {
  // cores dos estados em tempo real (pílula do estado agora)
  const COR = { livre: "#0ca30c", reservado: "#fab219", ocupado: "#d03b3b", avariado: "#3b3b3b", desconhecido: "#8a8985" };
  // categorias da faixa dos 7 dias: as mesmas cores da visão da coordenação (Cena 2)
  const COR3 = ["#0ca30c", "#3b3b3b", "#f59e4c"];
  const LAB3 = ["funcional", "avariado", "sem comunicação"];
  const CAT = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2 };            // livre/reservado/ocupado -> funcional
  const INK = "#0b0b0b", INK2 = "#52514e", MUTED = "#8a8985";
  const W = 640, H = 1180;
  const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(ctx, s, x, y, size, opts = {}) {
    ctx.font = `${opts.bold ? "700" : "400"} ${size}px ${FONTE}`;
    ctx.fillStyle = opts.cor || INK; ctx.textAlign = opts.align || "left"; ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  }
  function fmtIdade(seg) {
    if (seg == null) return "sem dados em tempo real";
    if (seg < 60) return `última mensagem há ${Math.round(seg)} s`;
    if (seg < 3600) return `última mensagem há ${Math.round(seg / 60)} min`;
    return `última mensagem há ${Math.round(seg / 3600)} h`;
  }

  // vivo = { estado, idadeSeg, alerta (bool), simulado (bool), offline (bool) }
  function desenhar(canvas, d, vivo) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const problema = vivo.alerta || vivo.estado === "avariado" || vivo.estado === "desconhecido";
    ctx.clearRect(0, 0, W, H);
    rr(ctx, 6, 6, W - 12, H - 12, 28);
    ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.fill();
    ctx.lineWidth = problema ? 10 : 5; ctx.strokeStyle = problema ? "#d03b3b" : "#3987e5"; ctx.stroke();

    // cabeçalho
    txt(ctx, `${d.id} · ${d.nome}`, 36, 56, 34, { bold: true });
    txt(ctx, "FICTÍCIO", W - 36, 56, 20, { bold: true, cor: "#d03b3b", align: "right" });
    txt(ctx, `${d.tipo} ${d.kw} kW · ${d.tomada} · ${d.operador}`, 36, 98, 24, { cor: INK2 });

    // estado agora
    const est = vivo.estado || "desconhecido";
    rr(ctx, 36, 128, 230, 58, 29); ctx.fillStyle = COR[est]; ctx.fill();
    txt(ctx, "● " + est.toUpperCase(), 151, 158, 26, { bold: true, cor: "#ffffff", align: "center" });
    txt(ctx, vivo.offline ? "sem ligação ao broker" : fmtIdade(vivo.idadeSeg), 284, vivo.simulado ? 150 : 158, 22, { cor: INK2 });
    if (vivo.simulado) txt(ctx, "modo simulado", 284, 176, 18, { cor: MUTED });
    let y = 222;
    if (vivo.alerta) {
      rr(ctx, 36, y - 6, W - 72, 48, 12); ctx.fillStyle = "#fbeaea"; ctx.fill();
      txt(ctx, "Aviso: sem dados recentes (falha de comunicação?)", 52, y + 18, 21, { bold: true, cor: "#8c1d1d" });
      y += 60;
    }

    // últimos 7 dias: 3 categorias
    txt(ctx, "Últimos 7 dias", 36, y, 26, { bold: true }); y += 26;
    const gx = 110, gw = W - gx - 36, rowH = 34, cw = gw / 96;
    d.dias.forEach((dia, i) => {
      txt(ctx, dia.rotulo, gx - 12, y + i * rowH + rowH / 2, 19, { cor: INK2, align: "right" });
      for (let k = 0; k < 96; k++) {
        ctx.fillStyle = COR3[CAT[+dia.estados[k]]];
        ctx.fillRect(gx + k * cw, y + i * rowH, Math.ceil(cw), rowH - 3);
      }
    });
    const gy = y + 7 * rowH;
    [["0h", 0], ["6h", 24], ["12h", 48], ["18h", 72], ["24h", 96]].forEach(([s, k]) =>
      txt(ctx, s, gx + k * cw, gy + 16, 18, { cor: INK2, align: "center" }));
    y = gy + 48;
    let lx = 36;
    LAB3.forEach((e, i) => {
      ctx.fillStyle = COR3[i]; ctx.fillRect(lx, y - 10, 20, 20);
      txt(ctx, e, lx + 28, y, 20, { cor: INK2 });
      ctx.font = `400 20px ${FONTE}`; lx += 28 + ctx.measureText(e).width + 28;
    });
    y += 40;
    if (d.nota) { txt(ctx, "▲ " + d.nota, 36, y, 21, { bold: true }); y += 50; } else { y += 16; }

    // indicadores: disponibilidade e avarias
    txt(ctx, "Indicadores (4 semanas)", 36, y, 26, { bold: true }); y += 50;
    [[`${d.ind.disp} %`, "disponibilidade", `rede ${d.rede.disp} %`],
     [`${d.ind.avarias}`, "avarias", `rede ${String(d.rede.avarias).replace(".", ",")}`]].forEach(([v, l, r], k) => {
      const cx = 36 + k * 290;
      txt(ctx, v, cx, y, 44, { bold: true });
      txt(ctx, l, cx, y + 38, 21, { cor: INK2 });
      txt(ctx, r, cx, y + 64, 19, { cor: MUTED });
    });
    y += 110;

    // histórico de intervenções (grelha)
    txt(ctx, "Avarias e intervenções", 36, y, 26, { bold: true }); y += 30;
    const cols = [36, 112, 232, 456], wtab = W - 72;
    ctx.fillStyle = "#f1eee6"; ctx.fillRect(36, y, wtab, 36);
    ["Data", "Tipo", "Descrição", "Resultado"].forEach((h, i) => txt(ctx, h, cols[i] + 6, y + 18, 17, { bold: true, cor: INK2 }));
    y += 36;
    const lista = (d.intervencoes || []).slice(0, vivo.alerta ? 5 : 6);
    if (!lista.length) txt(ctx, "Sem intervenções registadas", 42, y + 26, 17, { cor: MUTED });
    lista.forEach((r, i) => {
      const h = 50;
      if (i % 2) { ctx.fillStyle = "#faf9f5"; ctx.fillRect(36, y, wtab, h); }
      ctx.strokeStyle = "#e4e0d6"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(36, y + h); ctx.lineTo(36 + wtab, y + h); ctx.stroke();
      txt(ctx, r.data, cols[0] + 6, y + 16, 17, { bold: true });
      txt(ctx, r.hora, cols[0] + 6, y + 36, 15, { cor: MUTED });
      const avaria = r.tipo === "Avaria";
      rr(ctx, cols[1] + 4, y + 12, 108, 26, 13); ctx.fillStyle = avaria ? "#3b3b3b" : "#fde0c5"; ctx.fill();
      txt(ctx, r.tipo, cols[1] + 58, y + 25, 15, { bold: true, cor: avaria ? "#ffffff" : "#8a4a0b", align: "center" });
      txt(ctx, r.descricao, cols[2] + 6, y + 25, 15.5);
      txt(ctx, r.resultado, cols[3] + 6, y + 16, 16, { bold: true, cor: r.resultado.startsWith("Sem") ? "#b35806" : INK });
      txt(ctx, r.detalhe, cols[3] + 6, y + 36, 15, { cor: MUTED });
      y += h;
    });
    return problema;
  }

  window.Painel = { desenhar, COR, W, H };
})();
