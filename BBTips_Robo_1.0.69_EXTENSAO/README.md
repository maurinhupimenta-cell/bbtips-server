# BBTips Robô — Extensão (v1.0.69)

## 1.0.69  (CORRECAO REAL DO TRAVAMENTO - medido ao vivo)
Diagnostico feito direto no navegador encontrou o gargalo: a funcao que monta a serie
dos dados reais (apiRealResultsSeries) levava ~2,5 SEGUNDOS por ciclo, congelando a aba.
Causa: sort com parse de horario em 2467 jogos + filtros aninhados na janela deslizante.

Reescrita: idade calculada/cacheada 1x, janela deslizante por soma corrente, cache de 8s.
Medido no proprio navegador do usuario: caiu de ~2500ms para ~1ms (2500x mais rapido).
O congelamento periodico de 2-3s desaparece.

## Tambem inclui
- 1.0.68: histograma corrigido (nao trava em "verde forte"), tabela de conferencia removida
- 1.0.67: dados via API_ROWS sem varrer DOM

## Instalar
chrome://extensions -> recarregar a extensao (ou copiar por cima e Recarregar)
