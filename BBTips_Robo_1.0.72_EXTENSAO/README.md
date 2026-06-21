# BBTips Robô — Extensão (v1.0.72)

## 1.0.72 (correcao de bugs do algoritmo + melhoria de pagamento)
Auditoria do algoritmo encontrou e corrigiu:

BUG 1 - Funcoes de pagamento duplicadas/frageis: apiMarketPays agora sempre calcula
  total = a+b (nao confia em score.t que podia vir errado) e cobre todos os mercados
  de forma consistente com paysMarket.

BUG 2 - Conflito de sinais: antes varios "if" sobrescreviam o sinal e o ultimo ganhava,
  gerando sinais contraditorios e instaveis (ex: calcular RISCO ALTO e virar COMPRA).
  Agora e uma cascata priorizada unica (o primeiro caso que casar vence), na ordem
  real de trade: pagamento/protecao > risco > parcial > compra > subida > aguardar.

MELHORIA - Pagamento cruzado com dados reais: o payScore agora considera a taxa REAL
  de over dos ultimos jogos (over8). Mercado pagando bem reforca; pagando mal, segura.
  Esse dado ja era calculado mas nao estava ligado a metrica de pagamento.

## Tambem inclui
- 1.0.71: leitura definitiva (le os valores reais que o site escreve no grafico, 0.04ms)
- 1.0.70: zona robusta por percentil; travamento corrigido

## Instalar
chrome://extensions -> recarregar a extensao (ou copiar por cima e Recarregar)
