# BBTips Robô — Extensão (v1.0.62)

Extensão de navegador (Manifest V3) que injeta o robô de análise BBTips/Caramelo/THTips.

## Mudanças 1.0.62
- LEITURA DO GRAFICO NO THTIPS: o thtips usa canvas puro (Angular, sem dados internos
  expostos). Antes o robo travava em "AGUARDANDO DADOS" porque exigia a serie interna
  que so existe no Caramelo. Agora, quando nao ha dados internos, ele cai automaticamente
  na LEITURA VISUAL por pixel do canvas (le a linha branca e os pontos verde/vermelho).
  O modo Caramelo (dados internos) continua igual, sem regressao.

## Mudanças 1.0.61
- Painel compacto (altura limitada a 70% da tela com scroll, nao tampa mais a tela).
- Alertas de ancora mais rigidos (minimos configuraveis no CONFIG).
- Diagnostico: BBTipsRobo.diag() no console.

## Instalar (modo desenvolvedor)
1. chrome://extensions (ou edge://extensions)
2. Ative "Modo do desenvolvedor"
3. "Carregar sem compactacao" e selecione esta pasta
