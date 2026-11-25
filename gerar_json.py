"""Gera um JSON por conector (dados FICTÍCIOS) para a página de RA.
Lê D0, D1 e D2 (CSV ";") e escreve dados/<id>.json com:
  identificação, últimos 7 dias (96 células de 15 min por dia), indicadores de 4 semanas,
  referências da rede, perfil horário (este vs. média do mesmo tipo) e uma nota automática.
Uso: python gerar_json.py [pasta_csv] [pasta_saida]
"""
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

DADOS = Path(sys.argv[1] if len(sys.argv) > 1 else "../dados")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "dados")
OUT.mkdir(parents=True, exist_ok=True)

ESTADOS = ["livre", "reservado", "ocupado", "avariado", "desconhecido"]
INICIO, PASSO = pd.Timestamp("2026-10-26"), 5
N, SPD = 28 * 288, 288
DIAS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

d0 = pd.read_csv(DADOS / "D0_carregadores.csv", sep=";", decimal=",")
d1 = pd.read_csv(DADOS / "D1_estados.csv", sep=";", parse_dates=["data_hora"])
d2 = pd.read_csv(DADOS / "D2_sessoes.csv", sep=";", decimal=",", parse_dates=["inicio", "fim_carga", "desligado"])
d2["apos_min"] = (d2["desligado"] - d2["fim_carga"]).dt.total_seconds() / 60

grade = {}
for cid, g in d1.groupby("id"):
    g = g.sort_values("data_hora")
    k = ((g["data_hora"] - INICIO).dt.total_seconds() // (PASSO * 60)).astype(int).to_numpy()
    cod = g["estado"].map(ESTADOS.index).to_numpy()
    a = np.empty(N, int)
    for j in range(len(k)):
        a[k[j]:(k[j + 1] if j + 1 < len(k) else N)] = cod[j]
    grade[cid] = a

ind = {}
for cid, a in grade.items():
    s = d2[d2.id == cid]
    ind[cid] = {
        "disp": round(100 * (1 - np.isin(a, [3, 4]).mean()), 0),
        "avarias": int(((a[1:] == 3) & (a[:-1] != 3)).sum() + (a[0] == 3)),
        "apos_min": round(float(s.apos_min.mean()), 0),
        "kwh_semana": round(float(s.kwh.sum() / 4), 0),
    }
tipo = dict(zip(d0.id, d0.tipo))
# intervenções (D3), se existirem: as 6 mais recentes de cada conector
d3p = DADOS / "D3_intervencoes.csv"
d3 = pd.read_csv(d3p, sep=";", parse_dates=["data_hora"]) if d3p.exists() else None
def intervencoes(cid):
    if d3 is None:
        return []
    out = []
    for r in d3[d3.id == cid].sort_values("data_hora", ascending=False).head(6).itertuples():
        remota = r.tipo == "remota"
        horas = r.resultado.split("(")[-1].split(" h")[0] if "(" in r.resultado else ""
        out.append({"data": r.data_hora.strftime("%d/%m"), "hora": r.data_hora.strftime("%H:%M"),
                    "tipo": "Reinício" if remota else "Avaria", "descricao": r.descricao.replace("de madrugada ", ""),
                    "resultado": "Sem efeito" if remota else "Reparado",
                    "detalhe": "remoto" if remota else f"no local · {horas} h"})
    return out
ocup_h = {c: (a.reshape(28, 24, 12) == 2).mean(axis=(0, 2)) for c, a in grade.items()}

for _, c in d0.iterrows():
    cid = c["id"]
    a = grade[cid]
    # últimos 7 dias em células de 15 min; uma falha na célula prevalece (para não desaparecer)
    dias = []
    for d in range(21, 28):
        bloco = a[d * SPD:(d + 1) * SPD].reshape(96, 3)
        cel = []
        for b in bloco:
            if 3 in b:
                cel.append(3)
            elif 4 in b:
                cel.append(4)
            else:
                cel.append(int(np.bincount(b, minlength=5).argmax()))
        data = INICIO + pd.Timedelta(days=d)
        dias.append({"rotulo": f"{DIAS_PT[data.dayofweek]} {data.day}", "estados": "".join(map(str, cel))})
    # nota automática: horas em que se concentra o estado desconhecido
    desc_h = (a.reshape(28, 24, 12) == 4).sum(axis=(0, 2)) * PASSO / 60
    nota = ""
    if desc_h.sum() >= 5:
        top = np.flatnonzero(desc_h >= 0.6 * desc_h.max())
        nota = f"Falhas de comunicação entre as {top.min()}h e as {top.max() + 1}h"
    elif ind[cid]["avarias"] >= 3:
        nota = "Avarias repetidas a várias horas: verificar hardware"
    pares = [k for k in grade if tipo[k] == tipo[cid] and k != cid]
    media = np.mean([ocup_h[k] for k in pares], axis=0) if pares else ocup_h[cid]
    outros = [ind[k] for k in grade if k != cid]
    out = {
        "id": cid, "nome": c["nome"], "kw": int(c["kw"]), "tipo": c["tipo"], "tomada": c["tomada"],
        "operador": c["operador"], "dias": dias, "ind": ind[cid],
        "rede": {
            "disp": round(float(np.mean([ind[k]["disp"] for k in grade])), 0),
            "avarias": round(float(np.mean([ind[k]["avarias"] for k in grade])), 1),
            "apos_min_tipo": round(float(np.mean([ind[k]["apos_min"] for k in pares])), 0) if pares else None,
            "kwh_semana": round(float(np.mean([ind[k]["kwh_semana"] for k in grade])), 0),
        },
        "perfil": {"este": [round(float(x), 3) for x in ocup_h[cid]], "media": [round(float(x), 3) for x in media]},
        "nota": nota,
        "intervencoes": intervencoes(cid),
        "estado_inicial": ESTADOS[a[-1]] if a[-1] in (0, 1, 2) else "livre",
        "ficticio": True,
    }
    (OUT / f"{cid}.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("JSON gerados:", len(d0), "->", OUT)
