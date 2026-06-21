# BBTips Robô — Extensão (v1.0.65)

## 1.0.65  (MUDANCA GRANDE: dados reais no lugar de leitura de imagem)
O thtips nao expoe os dados internos do grafico, entao o robo lia os PIXELS do canvas.
Isso causava: travamento da aba (getImageData no canvas inteiro a cada ciclo) e leituras
erradas (pegava as linhas tracejadas Topo/Fundo).

Agora o robo usa os DADOS REAIS que o proprio site baixa da API (api.thtips.com.br),
ja capturados pelo hook de rede. Com isso:
- SEM travamento: a leitura de imagem (getImageData) foi desligada quando ha dados reais.
- Grafico exato: a serie e montada com os placares verdadeiros, nao com a imagem.
- Ancoras, ranking de odd e placares passam a usar a mesma base real (mais confiavel).

Obs: o robo depende dos dados que o site baixa. Se demorar, clique em "Atualizar" no site
para forcar o carregamento. O painel mostra "LENDO API" enquanto junta os jogos.

## Historico
- 1.0.64 leitura visual corrigida (depois substituida pela API real)
- 1.0.62/63 leitura visual ativada no thtips
- 1.0.61 painel compacto, ancora mais rigida, BBTipsRobo.diag()

## Instalar
edge://extensions -> Modo desenvolvedor -> Carregar sem compactacao -> esta pasta
