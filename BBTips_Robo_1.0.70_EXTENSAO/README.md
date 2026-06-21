# BBTips Robô — Extensão (v1.0.70)

## 1.0.70 (zona corrigida + travamento)
- TRAVAMENTO: apiRealSeries reescrita (de ~2500ms para ~1ms), com cache. Medido ao vivo.
- ZONA: a serie tinha pontos 0% falsos (trechos sem placar valido) que distorciam a
  zona (fundo/topo). Agora: jogos sem placar nao geram 0%, e a zona usa percentil 5/95
  (ignora outliers) em vez de min/max absoluto.
- Histograma corrigido (1.0.68), dados via API sem varrer DOM (1.0.67).

## Instalar
chrome://extensions -> recarregar (ou copiar por cima e Recarregar)
