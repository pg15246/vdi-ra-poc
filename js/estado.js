// Estado em tempo real dos conectores: MQTT por wss (mqtt.js) ou, se falhar, simulação local.
(function () {
  const MQTT_JS = "https://unpkg.com/mqtt@5/dist/mqtt.min.js";
  const params = new URLSearchParams(location.search);

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s);
    });
  }

  // onMsg(id, {estado, ts}); onStatus("ligado" | "simulado" | "offline", texto)
  async function ligar(ids, onMsg, onStatus, inicial) {
    const cfg = window.CONFIG;
    const broker = params.get("broker") || cfg.broker;
    if (params.get("sim") === "1") return simular(ids, onMsg, onStatus, inicial, "pedido no endereço");
    try {
      await carregarScript(MQTT_JS);
    } catch (e) {
      return simular(ids, onMsg, onStatus, inicial, "biblioteca MQTT indisponível");
    }
    return new Promise((resolve) => {
      const cliente = window.mqtt.connect(broker, { connectTimeout: 6000, reconnectPeriod: 4000, clean: true });
      let decidido = false;
      const desistir = setTimeout(() => {
        if (decidido) return; decidido = true;
        try { cliente.end(true); } catch (e) {}
        resolve(simular(ids, onMsg, onStatus, inicial, "broker não respondeu"));
      }, 8000);
      cliente.on("connect", () => {
        onStatus("ligado", broker);
        ids.forEach((id) => cliente.subscribe(cfg.topico(id)));
        if (!decidido) { decidido = true; clearTimeout(desistir); resolve({ publicar: (id, m) => cliente.publish(cfg.topico(id), JSON.stringify(m), { retain: true }) }); }
      });
      cliente.on("reconnect", () => onStatus("offline", "a tentar voltar a ligar…"));
      cliente.on("offline", () => onStatus("offline", "sem ligação ao broker"));
      cliente.on("message", (topico, buf) => {
        const id = ids.find((i) => topico === cfg.topico(i));
        if (!id) return;
        try { onMsg(id, JSON.parse(buf.toString())); } catch (e) {}
      });
    });
  }

  // Simulação: cada conector envia um "batimento" a cada 5 s com o estado atual.
  function simular(ids, onMsg, onStatus, inicial, motivo) {
    onStatus("simulado", motivo);
    const atual = {};
    ids.forEach((id) => { atual[id] = (inicial && inicial[id]) || "livre"; onMsg(id, { estado: atual[id], ts: Date.now() }); });
    setInterval(() => ids.forEach((id) => onMsg(id, { estado: atual[id], ts: Date.now() })), 5000);
    return { publicar: (id, m) => { atual[id] = m.estado; onMsg(id, m); }, simulado: true };
  }

  window.Estado = { ligar };
})();
