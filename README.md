# PoC – Realidade aumentada no posto de carregamento

EFA do projeto de VDI (Grupo 5, MECD, Universidade do Minho). O técnico aponta o telemóvel ao
autocolante do conector e vê, por cima do posto, o estado em tempo real, os últimos 7 dias e os
indicadores do gémeo digital. **Todos os dados são fictícios.**

## O que está aqui

| Ficheiro | Para quê |
|---|---|
| `posto.html` | Página de RA (telemóvel). `?id=CG04` diz qual o conector; `&modo=movel` abre a vista sem RA; `&aviso=20` encurta o aviso de "sem dados recentes"; `&sim=1` dispensa o broker. |
| `controlo.html` | Faz de emulador da PoC de GD (portátil): muda o estado dos conectores e corta a comunicação. |
| `autocolantes.html` | Gera os autocolantes com QR (PNG) para compilar e imprimir. |
| `js/config.js` | Broker, prefixo dos tópicos, conectores do posto (`alvos`), tempos. |
| `js/painel.js` | Desenha o painel (o mesmo na RA e na vista sem RA). |
| `js/estado.js` | Liga ao broker MQTT (wss) ou passa a modo simulado. |
| `dados/*.json` | Resumo de cada conector, gerado por `gerar_json.py` a partir dos CSV do M2. |
| `targets.mind` | **Falta:** gera-se no passo 3, a partir dos autocolantes. |

## Passos

1. **Criar um repositório público no GitHub** (por exemplo `vdi-ra-poc`) e carregar para lá o
   conteúdo desta pasta (*Add file → Upload files*; arrastar tudo, incluindo `js/` e `dados/`).
2. **Ativar o GitHub Pages:** *Settings → Pages → Deploy from a branch → main / (root) → Save*.
   Passado um minuto, o site fica em `https://<utilizador>.github.io/vdi-ra-poc/` (com HTTPS,
   que a câmara exige).
3. **Gerar os autocolantes e o `targets.mind`:**
   - abrir `https://<utilizador>.github.io/vdi-ra-poc/autocolantes.html` e descarregar os dois PNG
     (os QR já apontam para o endereço do site);
   - abrir o compilador do MindAR (https://hiukim.github.io/mind-ar-js-doc/tools/compile), juntar
     os PNG **pela mesma ordem** (1_CG04, 2_CG12), *Start*, e descarregar `targets.mind`;
   - carregar `targets.mind` para o repositório, ao lado de `posto.html`.
4. **Imprimir** a página dos autocolantes (papel mate, cada um com cerca de 8 cm) e colá-los numa
   caixa que faz de posto com dois conectores. Imprimir exatamente os PNG que foram compilados.
5. **Demonstração:**
   - no portátil, abrir `controlo.html`;
   - no telemóvel, ler o QR do CG04 com a câmara e abrir a página; autorizar a câmara;
   - apontar à caixa: aparece um painel por cima de cada conector, preso ao autocolante;
   - no portátil, carregar em "avariado": o painel muda em menos de 1 s e ganha contorno vermelho;
   - marcar "comunicação cortada": com `?aviso=20`, o aviso aparece ao fim de 20 s.

## Notas

- **Plano B:** se o tracking não pegar em 15 s, a página propõe a vista sem RA; se faltar a câmara
  ou o `targets.mind`, abre-a logo. O id impresso no autocolante serve se o QR não ler.
- **Broker:** usa o público `test.mosquitto.org` (porta 8081, wss). Qualquer pessoa pode ler ou
  publicar nesses tópicos: serve para dados fictícios e demonstração. Para a PoC de GD, trocar
  `broker` em `js/config.js` pelo `wss://` do Mosquitto do grupo (com TLS e contas, RNF3).
- **Sem autenticação:** os botões "Marcar avaria / reparação" publicam sem login. Na versão final
  ficam dependentes das contas no broker.
- **Atualizar os dados:** `python gerar_json.py ../dados dados` (CSV com separador ";").
- **Bibliotecas** (carregadas de CDN): A-Frame 1.5.0, MindAR 1.2.5, mqtt.js 5, qrcode-generator 1.4.4.
