# BBTips Robô — Extensão (v1.0.64)

## 1.0.64  (correcao da leitura invertida)
- A leitura visual estava marcando "Fundo/Descendo" quando a linha estava em cima.
  Causa: o leitor agarrava as linhas tracejadas "Topo"/"Fundo" e os textos do eixo,
  em vez de seguir a linha branca da curva.
- Correcao: a LINHA BRANCA passou a ser a curva principal; os pontos coloridos so
  contam quando estao colados nela; as tracejadas horizontais sao filtradas; e a
  varredura ignora a borda direita (rotulos do eixo). Testado: curva que sobe agora
  marca "Alta" corretamente.

## 1.0.62 / 1.0.63
- Leitura visual por pixel ativada no THTips (canvas puro).
- Diagnostico BBTipsRobo.diag() com bloco "leitura_visual".

## Instalar
edge://extensions -> Modo desenvolvedor -> Carregar sem compactacao -> esta pasta
