# BBTips Robô — Extensão (v1.0.66)

## 1.0.66  (corrige o "LENDO" travado)
A serie real (dados da API) gerava so 18 pontos, mas o robo exigia 20 -> ficava preso
em "LENDO" e caia de volta na leitura de pixel (pesado). Agora a serie usa janela
deslizante (1 ponto por jogo) e gera centenas de pontos. O minimo para fonte de dados
real caiu para 14. Resultado: o grafico le os dados reais e nao trava mais.

## 1.0.65
- Passou a usar os dados REAIS da API do thtips em vez de ler pixel.

## Instalar
edge://extensions -> Modo desenvolvedor -> Carregar sem compactacao -> esta pasta
(ou copie os arquivos por cima da pasta atual e clique em Recarregar)
