// Desenha o painel de um conector num <canvas> (usado na RA como textura e na vista sem RA).
// Dados FICTÍCIOS. Sem dependências.
(function () {
  const COR = { livre: "#0ca30c", reservado: "#fab219", ocupado: "#d03b3b", avariado: "#3b3b3b", desconhecido: "#8a8985" };
  const ORDEM = ["livre", "reservado", "ocupado", "avariado", "desconhecido"];
  const INK = "#0b0b0b", INK2 = "#52514e", MUTED = "#8a8985", AZUL = "#256abf";
  const W = 640, H = 1040;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(ctx, s, x, y, size, opts = {}) {
    ctx.font = `${opts.bold ? "700" : "400"} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
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
    ctx.fillStyle = "rgba(255,255,255,0.96)"; ctx.fill();
    ctx.lineWidth = problema ? 10 : 5; ctx.strokeStyle = problema ? "#d03b3b" : "#3987e5"; ctx.stroke();

    // cabeçalho
    txt(ctx, `${d.id} · ${d.nome}`, 36, 56, 34, { bold: true });
    txt(ctx, "FICTÍCIO", W - 36, 56, 20, { bold: true, cor: "#d03b3b", align: "right" });
    txt(ctx, `${d.tipo} ${d.kw} kW · ${d.tomada} · ${d.operador}`, 36, 98, 24, { cor: INK2 });

    // estado agora
    const est = vivo.estado || "desconhecido";
    rr(ctx, 36, 128, 230, 58, 29); ctx.fillStyle = COR[est]; ctx.fill();
    txt(ctx, "● " + est.toUpperCase(), 151, 158, 26, { bold: true, cor: "#ffffff", align: "center" });
    txt(ctx, vivo.offline ? "sem ligação ao broker" : fmtIdade(vivo.idadeSeg), 284, 150, 22, { cor: INK2 });
    if (vivo.simulado) txt(ctx, "modo simulado", 284, 176, 18, { cor: MUTED });
    let y = 212;
    if (vivo.alerta) {
      rr(ctx, 36, y - 4, W - 72, 52, 12); ctx.fillStyle = "#fbeaea"; ctx.fill();
      txt(ctx, "Aviso: sem dados recentes (falha de comunicação?)", 52, y + 22, 22, { bold: true, cor: "#8c1d1d" });
      y += 64;
    }

    // últimos 7 dias
    txt(ctx, "Últimos 7 dias", 36, y + 14, 26, { bold: true }); y += 40;
    const gx = 110, gw = W - gx - 36, rowH = 34, cw = gw / 96;
    d.dias.forEach((dia, i) => {
      txt(ctx, dia.rotulo, gx - 12, y + i * rowH + rowH / 2, 19, { cor: INK2, align: "right" });
      for (let k = 0; k < 96; k++) {
        ctx.fillStyle = COR[ORDEM[+dia.estados[k]]];
        ctx.fillRect(gx + k * cw, y + i * rowH, Math.ceil(cw), rowH - 3);
      }
    });
    const gy = y + 7 * rowH;
    [["0h", 0], ["6h", 24], ["12h", 48], ["18h", 72], ["24h", 96]].forEach(([s, k]) =>
      txt(ctx, s, gx + k * cw, gy + 16, 18, { cor: INK2, align: "center" }));
    y = gy + 46;
    let lx = 36;
    ORDEM.forEach((e) => {
      ctx.fillStyle = COR[e]; ctx.fillRect(lx, y - 9, 18, 18);
      txt(ctx, e, lx + 24, y, 18, { cor: INK2 });
      ctx.font = "400 18px system-ui, Arial, sans-serif"; lx += 24 + ctx.measureText(e).width + 18;
    });
    y += 36;
    if (d.nota) { txt(ctx, "▲ " + d.nota, 36, y, 21, { bold: true }); y += 40; } else { y += 10; }

    // indicadores
    txt(ctx, "Indicadores (4 semanas)", 36, y, 26, { bold: true }); y += 50;
    const r = d.rede;
    const ref = (v, sufixo) => (v == null ? "" : `${v}${sufixo}`);
    const inds = [
      [`${d.ind.disp} %`, "disponibilidade", `rede ${ref(r.disp, " %")}`],
      [`${d.ind.avarias}`, "avarias", `rede ${String(r.avarias).replace(".", ",")}`],
      [`${d.ind.apos_min} min`, "ligado após a carga", r.apos_min_tipo == null ? "" : `outros ${d.tipo} ${r.apos_min_tipo} min`],
      [`${d.ind.kwh_semana} kWh`, "por semana", `rede ${r.kwh_semana}`],
    ];
    inds.forEach(([v, lab, rf], k) => {
      const cx = 36 + (k % 2) * 290, cy = y + Math.floor(k / 2) * 118;
      txt(ctx, v, cx, cy, 44, { bold: true });
      txt(ctx, lab, cx, cy + 38, 21, { cor: INK2 });
      txt(ctx, rf, cx, cy + 66, 19, { cor: MUTED });
    });
    y += 236;

    // perfil horário
    txt(ctx, `Perfil horário: este conector vs. média ${d.tipo}`, 36, y, 22, { bold: true }); y += 20;
    const px = 52, pw = W - 104, ph = H - y - 70;
    const max = Math.max(...d.perfil.este, ...d.perfil.media, 0.05);
    const linha = (arr, cor, larg, tracejado) => {
      ctx.beginPath(); ctx.setLineDash(tracejado ? [10, 8] : []);
      arr.forEach((v, h) => {
        const X = px + (h / 23) * pw, Y = y + ph - (v / max) * ph;
        h ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      });
      ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.stroke(); ctx.setLineDash([]);
    };
    ctx.strokeStyle = "#cfcdc6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, y + ph); ctx.lineTo(px + pw, y + ph); ctx.stroke();
    linha(d.perfil.media, MUTED, 3, true);
    linha(d.perfil.este, AZUL, 5, false);
    [["0h", 0], ["6h", 6], ["12h", 12], ["18h", 18], ["23h", 23]].forEach(([s, h]) =>
      txt(ctx, s, px + (h / 23) * pw, y + ph + 18, 18, { cor: INK2, align: "center" }));
    txt(ctx, "— este", W - 200, H - 30, 18, { bold: true, cor: AZUL });
    txt(ctx, "- - média", W - 110, H - 30, 18, { cor: MUTED });
    return problema;
  }

  window.Painel = { desenhar, COR, W, H };
})();
