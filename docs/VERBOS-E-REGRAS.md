# Verbos e regras — MVP

## ANDAR
Requer: personagem.
Transformação: deslocamento dentro do cenário.

## IR
Requer: personagem + destino.
Transformação: personagem passa da origem ao destino.

## SENTAR
Requer: personagem + assento/local compatível.
Transformação: em pé → sentado.

## LEVANTAR
Requer: personagem sentado.
Transformação: sentado → em pé.

## PEGAR
Requer: personagem + objeto disponível.
Transformação: objeto disponível → objeto com personagem.

## DAR
Requer: personagem origem + objeto em posse + personagem destino.
Transformação: origem possui → destino possui.

## COLOCAR
Requer: personagem + objeto em posse + destino.
Transformação: objeto com personagem → objeto no destino.

## COMER
Requer: personagem + alimento.
Transformação: alimento disponível → alimento consumido.

## BEBER
Requer: personagem + líquido.
Transformação: líquido disponível → líquido consumido.

## DORMIR
Requer: personagem.
Transformação: acordado → dormindo.

## Regra geral de erro

Se uma pré-condição obrigatória não estiver satisfeita, a ação não é executada. O sistema apresenta ❌ ERRADO e destaca visualmente o elemento ausente ou incompatível.

ERRADO, NÃO SEI e NÃO ENTENDI são estados comunicativos distintos.
