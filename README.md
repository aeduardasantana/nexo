# NEXO

Sistema Visual de Ação e Narrativa.

O NEXO é um **Recurso Pedagógico Acessível Digital de Mediação Visual e Apoio à Comunicação**, voltado à organização de ações, relações, temporalidade, perspectiva e construção narrativa.

Foi concebido inicialmente a partir de uma necessidade de mediação visual com pessoa surda em contexto de acesso linguístico limitado. Sua arquitetura também pode apoiar pessoas com **necessidades complexas de comunicação** e outros usuários que se beneficiem de recursos visuais para compreender, organizar ou expressar informações.

## Princípio central

**VER → ESCOLHER → AGIR → MUDAR → COMPARAR → SEQUENCIAR → NARRAR**

## Classificação técnico-pedagógica

### Categoria principal

**Recurso Pedagógico Acessível Digital de Mediação Visual e Apoio à Comunicação.**

Essa é a classificação descritiva principal do NEXO para documentação pedagógica, apresentação institucional e organização do desenvolvimento do produto.

### Tecnologia Assistiva

O NEXO é desenvolvido sob princípios de **Tecnologia Assistiva, acessibilidade, autonomia e participação**.

A Lei Brasileira de Inclusão - Lei nº 13.146/2015 - define Tecnologia Assistiva de forma ampla, incluindo produtos, dispositivos, recursos, metodologias, estratégias, práticas e serviços destinados a promover funcionalidade, atividade e participação da pessoa com deficiência.

O enquadramento do NEXO como recurso de Tecnologia Assistiva deve ser considerado conforme sua finalidade e contexto de uso. O produto não se apresenta como equipamento médico, instrumento diagnóstico ou tecnologia sujeita a certificação clínica.

### Comunicação Aumentativa e Alternativa - CAA

O NEXO **não é classificado atualmente como um sistema completo de Comunicação Aumentativa e Alternativa - CAA**.

Seus recursos visuais podem apoiar estratégias de CAA e de comunicação acessível, mas a arquitetura atual possui escopo mais amplo: ação, temporalidade, relações, perspectiva, narrativa, mediação pedagógica e registro observacional.

Uma futura camada específica de CAA exigiria, entre outros elementos, vocabulário comunicativo estruturado, necessidades, emoções, funções comunicativas, personalização de símbolos e estratégias próprias de expressão receptiva e expressiva.

## Público e aplicação

### Origem

O projeto nasceu de uma demanda ligada à **mediação visual com pessoa surda**, sem pressupor que pessoas surdas, de forma geral, possuam limitações de linguagem ou comunicação.

### Aplicações possíveis

O NEXO pode apoiar, conforme avaliação pedagógica e contexto de uso:

- pessoas surdas que se beneficiem de mediação visual adicional;
- pessoas com necessidades complexas de comunicação;
- pessoas com dificuldades significativas de linguagem expressiva ou receptiva;
- usuários de estratégias de Comunicação Aumentativa e Alternativa;
- pessoas em processos de aquisição linguística ou alfabetização;
- outros contextos educacionais em que a organização visual de ações, tempo, relações e narrativa seja pertinente.

A Lei nº 15.249/2025 utiliza a expressão **pessoa com necessidades complexas de comunicação** para quem, por qualquer motivo, apresenta dificuldades significativas para compreender ou expressar mensagens por formas convencionais e necessita de recursos ou estratégias alternativas ou aumentativas para viabilizar interação, acesso à informação e participação.

## Limites de uso

O NEXO é uma ferramenta pedagógica e observacional. Não constitui:

- diagnóstico clínico;
- avaliação de inteligência;
- teste psicológico;
- avaliação fonoaudiológica;
- comprovação isolada de compreensão;
- substituição da Libras, quando esta for a língua da pessoa;
- substituição de acompanhamento profissional quando necessário.

Dificuldade de expressão no NEXO não deve ser interpretada automaticamente como ausência de compreensão.

## Arquitetura

- React
- TypeScript
- Vite
- CSS responsivo
- sem banco de dados remoto na versão atual
- salvamento local e exportação de dados

## Estrutura

- `src/components` - componentes visuais
- `src/data` - vocabulário, referências e regras declarativas
- `src/types` - tipos do domínio
- `docs` - documentação pedagógica e técnica

## Execução local

```bash
npm install
npm run dev
```

## Identificação institucional

**NEXO - Sistema Visual de Ação e Narrativa**  
Desenvolvido por **Compass Rose Systems**  
Contato institucional: **contato@compassrosesystems.com.br**

O endereço `suporte@compassrosesystems.com.br` fica reservado para uma futura operação formal de suporte e assinatura e não é divulgado como canal principal nesta versão.

© 2026 Compass Rose Systems - Todos os direitos reservados.
