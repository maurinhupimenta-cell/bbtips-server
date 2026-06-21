# BBTips Robô — Extensão (v1.0.68)

## 1.0.68
- Removida a tabela "Conferencia dos ultimos resultados" do painel (a pedido + alivia render).
- Corrigido o histograma travado em "verde forte": agora reflete subida (verde) e descida
  (vermelho) reais, com desempate pela tendencia quando o MACD fica perto de zero.

## Importante (performance)
Esta versao precisa estar de fato INSTALADA para os ganhos valerem. Inclui tambem (de 1.0.67):
- resultados/jogos/gols vem do API_ROWS, sem varrer o DOM da pagina (principal causa de travar)
- scan de tabelas pulado quando a API tem >= 30 resultados
- ciclo do grafico de 10s -> 15s

## Instalar
chrome://extensions -> Modo desenvolvedor -> Carregar sem compactacao -> esta pasta
(ou copie por cima da pasta atual e clique em Recarregar)
