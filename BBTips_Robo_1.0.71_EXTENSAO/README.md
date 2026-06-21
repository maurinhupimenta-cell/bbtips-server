# BBTips Robô — Extensão (v1.0.71)

## 1.0.71 (SOLUCAO DEFINITIVA DA LEITURA - testada ao vivo no navegador)
O robo agora le os VALORES REAIS que o site escreve no grafico (intercepta os rotulos
40/45/50 desenhados na linha), em vez de:
- ler pixel (travava a aba e confundia bola branca com verde/vermelha)
- recalcular por formula propria (divergia do grafico do site)

Resultado medido ao vivo no navegador do usuario:
- Serie identica ao grafico do site (ex: [45,40,40,45,50,50,45,45,50,50,45,45,50,45,45])
- Zona correta (Meio 50% quando a linha esta no meio da faixa)
- Velocidade: 0,04ms (antes 2500ms). Nao trava mais.

Fonte exibida no painel: "VALORES REAIS DO GRAFICO (N pontos lidos do site)".
Se o site nao desenhar rotulos, cai para a serie da API; pixel so em ultimo caso.

## Instalar
chrome://extensions -> recarregar a extensao (ou copiar por cima e Recarregar)
