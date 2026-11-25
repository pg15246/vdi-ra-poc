// Configuração da PoC (VDI M2, Grupo 5). Dados FICTÍCIOS.
window.CONFIG = {
  // Broker MQTT por WebSocket seguro. O público test.mosquitto.org serve para a demonstração;
  // para a PoC de GD, trocar pelo endereço wss:// do Mosquitto do grupo.
  broker: "wss://test.mosquitto.org:8081",
  // Prefixo dos tópicos, para não colidir com outros utilizadores do broker público.
  prefixo: "uminho-vdi-g5-7f3a",
  // Tópico do estado de cada conector: <prefixo>/gd/v1/chargers/<id>/state
  topico: (id) => `${window.CONFIG.prefixo}/gd/v1/chargers/${id}/state`,
  // Conectores do posto de demonstração: a ordem é a das imagens compiladas em targets.mind.
  alvos: ["CG04", "CG12"],
  // Segundos sem mensagens até aparecer o aviso "sem dados recentes" (300 = 5 min, como no RF7).
  // Na demonstração pode passar-se ?aviso=20 no endereço.
  avisoSeg: 300,
  // Segundos à espera de encontrar o autocolante antes de propor a vista sem RA.
  esperaTrackingSeg: 15,
};
