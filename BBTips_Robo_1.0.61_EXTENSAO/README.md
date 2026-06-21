# BBTips Robô — Extensão (v1.0.61)

Extensão de navegador (Manifest V3) que injeta o robô de análise BBTips/Caramelo/THTips
após ativação de licença pelo painel admin.

## Arquivos
- `manifest.json` — configuração da extensão
- `background.js` — service worker (busca os JSONs das ligas)
- `content.js` — content script (injeta o robô e ponte de dados)
- `popup.html` / `popup.js` — tela de login/ativação
- `robot.js` — leitor de gráfico, análise e painel na tela

## Mudanças nesta versão (1.0.61)
- Painel compacto: altura limitada a 70% da tela com scroll interno (não tampa mais a tela toda).
- Alertas de âncora mais rígidos para reduzir ruído (mínimos configuráveis no `CONFIG`).
- Função de diagnóstico do gráfico: com o robô ativo, no Console rode `BBTipsRobo.diag()`.

## Como instalar (modo desenvolvedor)
1. Abra `chrome://extensions`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação" e selecione esta pasta
