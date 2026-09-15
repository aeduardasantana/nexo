# NEXO - QA geral da versão MVP

Data de revisão: 15/09/2026  
URL pública: http://nexo.compassrosesystems.com.br/

## Critério de aprovação

Cada fluxo crítico deve ter uma alternativa utilizável por toque. Arrastar não pode ser a única forma de interação.

| Área | Cenário verificado | Resultado |
| --- | --- | --- |
| Biblioteca visual | Categorias Pessoas, Objetos e Lugares carregam seus cartões | Aprovado na URL pública |
| Inclusão na cena | Clique em um cartão adiciona o item à cena | Aprovado na URL pública |
| Posicionamento por toque | Item selecionado pode ser reposicionado tocando em área vazia do cenário | Aprovado no código; a instrução foi explicitada nesta versão |
| Arrastar | Cartões podem ser arrastados da biblioteca ao cenário no computador | Implementado nesta versão; requer validação após publicação |
| Modo participante | Interface apresenta biblioteca, cenário, história e orientação direta de uso | Ajustado nesta versão |
| Modo mediador | Painel de sessão, atividade, mediação, salvamento e exportação é exibido ao trocar de modo | Aprovado na URL pública |
| Persistência local | Indicação de salvamento local aparece no modo mediador | Aprovado na URL pública |
| Avaliação longitudinal | Escala 0-3 e comando de registrar no histórico estão disponíveis | Aprovado na URL pública |
| VLibras | Widget é carregado como apoio complementar | Aprovado na URL pública |
| Responsividade | Estrutura possui organização específica para telas menores | Revisão manual necessária após publicação |
| Build TypeScript/Vite | `npm install` e `npm run build` no GitHub Actions | Aprovado no deploy da versão 6825303a |
| Recuperação de falha | Exceção inesperada durante uma ação não pode resultar em tela branca sem orientação | Proteção adicionada; a sessão anterior é preservada antes da abertura de sessão limpa |

## Regressão obrigatória após publicação

1. Em celular: tocar em Pessoa 1; confirmar inclusão; tocar em uma área vazia; confirmar reposicionamento.
2. Em computador: arrastar um objeto da biblioteca para três pontos diferentes do cenário.
3. Alternar Participante -> Mediador -> Participante e confirmar que a cena permanece.
4. No modo mediador: preencher identificação, registrar uma mediação e exportar JSON.
5. Recarregar a página e confirmar a sessão local.
6. Conferir os módulos Tempo, Narrativa, Perspectiva, Missões e Relatório sem perda da cena atual.
7. Acionar o VLibras e confirmar que controles essenciais seguem operáveis sem ele.

## Limites conhecidos

- Não há testes automatizados configurados no MVP. O QA atual é funcional e manual.
- A persistência é local ao navegador; limpeza de dados do navegador pode removê-la. A exportação JSON é o meio de guarda e transferência da sessão.
