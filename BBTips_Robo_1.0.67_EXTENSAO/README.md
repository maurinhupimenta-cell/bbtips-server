# BBTips Robô — Extensão (v1.0.67)

## 1.0.67  (TIRA O TRAVAMENTO)
A leitura do grafico ja usava dados reais (1.0.66), mas varios scans pesados continuavam
rodando a cada ciclo numa pagina Angular pesada (thtips), travando a aba:
- querySelectorAll("table/tr/td") + getBoundingClientRect na pagina inteira (resultados)
- varredura do DOM atras de jogos futuros e placares

Agora, quando a API ja entrega os dados (caso do thtips):
- Resultados, jogos futuros e gols (BTTS/Over) vem direto do API_ROWS, SEM varrer o DOM.
- O scan de tabelas/celulas da pagina e PULADO quando ha >= 30 resultados da API.
- O ciclo do grafico passou de 10s para 15s.
Resultado: muito mais leve, sem os congelamentos que impediam analisar o site.

## Historico
- 1.0.66 corrige "LENDO" (janela deslizante da serie real)
- 1.0.65 passa a usar dados REAIS da API no thtips
- 1.0.64 e anteriores: leitura visual (substituida)

## Instalar
edge://extensions -> Modo desenvolvedor -> Carregar sem compactacao -> esta pasta
(ou copie por cima da pasta atual e clique em Recarregar)
