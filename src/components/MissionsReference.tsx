// @signature edufertanapo
import {
  missionCoverageLabels,
  missionProgressionLabels,
  missionReferences,
  missionTheoryReferences,
} from '../data/missionsReference';

export default function MissionsReference() {
  const ready = missionReferences.filter((item) => item.coverage === 'ready').length;
  const partial = missionReferences.filter((item) => item.coverage === 'partial').length;
  const pending = missionReferences.filter((item) => item.coverage === 'new').length;

  return (
    <section className="missions-reference" aria-labelledby="missions-title">
      <header className="missions-hero">
        <div>
          <p className="section-kicker">REFERÊNCIA DE DESENVOLVIMENTO</p>
          <h2 id="missions-title">MISSÕES - O EU, O OUTRO E O NÓS</h2>
          <p>
            ESTA PÁGINA NÃO EXECUTA MISSÕES. ELA DOCUMENTA O QUE O NEXO JÁ CONSEGUE
            OPERACIONALIZAR E O QUE AINDA PRECISA SER DESENVOLVIDO.
          </p>
        </div>
        <div className="missions-summary" aria-label="Resumo da cobertura">
          <div><strong>{ready}</strong><span>PRONTOS PARA MISSÕES</span></div>
          <div><strong>{partial}</strong><span>BASE PARCIAL</span></div>
          <div><strong>{pending}</strong><span>NOVO RECURSO</span></div>
        </div>
      </header>

      <section className="missions-method">
        <article>
          <strong>REFERÊNCIA BNCC</strong>
          <p>O código e o texto oficial são preservados. O NEXO não altera o objetivo oficial.</p>
        </article>
        <article>
          <strong>OBJETIVO FUNCIONAL NEXO</strong>
          <p>Reformula a finalidade em linguagem aplicável a diferentes idades, sem declarar equivalência curricular fora da Educação Infantil.</p>
        </article>
        <article>
          <strong>COBERTURA TÉCNICA</strong>
          <p>Indica se os recursos atuais já permitem criar missões, se a base é parcial ou se um novo recurso é necessário.</p>
        </article>
        <article>
          <strong>PROGRESSO FUTURO</strong>
          <p>Missão, mediação e generalização devem ser registradas separadamente para evitar transformar apoio necessário em nota.</p>
        </article>
      </section>

      <section className="missions-measurement">
        <h3>MATRIZ SUGERIDA PARA MENSURAÇÃO FUTURA</h3>
        <div className="missions-measure-grid">
          <article>
            <span>COMPLEXIDADE DA MISSÃO</span>
            <strong>C1 - C3</strong>
            <p>C1 concreto e direto. C2 relação entre elementos. C3 antecipação, transferência ou resolução em situação nova.</p>
          </article>
          <article>
            <span>NÍVEL DE MEDIAÇÃO</span>
            <strong>M0 - M3</strong>
            <p>M0 não demonstrado. M1 após modelagem direta. M2 com pista ou mediação. M3 espontâneo.</p>
          </article>
          <article>
            <span>GENERALIZAÇÃO</span>
            <strong>G0 - G2</strong>
            <p>G0 apenas no item treinado. G1 novo item com a mesma estrutura. G2 nova pessoa, situação ou contexto.</p>
          </article>
        </div>
        <p className="missions-caution">
          A MATRIZ É OBSERVACIONAL E PEDAGÓGICA. NÃO É DIAGNÓSTICO, TESTE DE INTELIGÊNCIA OU MEDIDA CLÍNICA.
        </p>
      </section>

      <section className="missions-progression">
        <h3>ORDEM DE PROGRESSÃO SUGERIDA</h3>
        <div>
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <span key={level}>{missionProgressionLabels[level]}</span>
          ))}
        </div>
        <p>
          A ORDEM É UMA REFERÊNCIA DE COMPLEXIDADE, NÃO UMA REGRA ETÁRIA. O MEDIADOR PODE
          INICIAR EM OUTRO PONTO quando houver repertório já demonstrado.
        </p>
      </section>

      <div className="missions-list">
        {missionReferences.map((item) => (
          <article className="mission-reference-card" key={item.code}>
            <header>
              <div>
                <span className="mission-code">{item.code}</span>
                <strong>{missionProgressionLabels[item.progression]}</strong>
              </div>
              <span className={`coverage coverage-${item.coverage}`}>
                {missionCoverageLabels[item.coverage]}
              </span>
            </header>

            <div className="mission-official">
              <span>OBJETIVO OFICIAL BNCC</span>
              <p>{item.bncc}</p>
            </div>

            <div className="mission-functional">
              <span>OBJETIVO FUNCIONAL NEXO</span>
              <strong>{item.functionalObjective}</strong>
            </div>

            <div className="mission-columns">
              <section>
                <h4>RECURSOS ATUAIS</h4>
                <div className="mission-tags">
                  {item.currentResources.map((resource) => <span key={resource}>{resource}</span>)}
                </div>
                <p>{item.coverageReason}</p>
              </section>

              <section>
                <h4>O QUE PRECISA SER CRIADO</h4>
                <ul>
                  {item.developmentNeeded.map((need) => <li key={need}>{need}</li>)}
                </ul>
              </section>
            </div>

            <div className="mission-columns">
              <section>
                <h4>EXEMPLOS DE MISSÕES FUTURAS</h4>
                <ul>
                  {item.futureMissionExamples.map((mission) => <li key={mission}>{mission}</li>)}
                </ul>
              </section>
              <section>
                <h4>EVIDÊNCIAS OBSERVÁVEIS</h4>
                <ul>
                  {item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}
                </ul>
              </section>
            </div>

            {item.scopeNote && <p className="mission-scope-note">{item.scopeNote}</p>}

            <footer>
              <span>REFERENCIAL RELACIONADO</span>
              <div>
                {item.theory.map((key) => {
                  const reference = missionTheoryReferences.find((entry) => entry.key === key);
                  return reference ? <small key={key}>{reference.key}</small> : null;
                })}
              </div>
            </footer>
          </article>
        ))}
      </div>

      <section className="missions-theory">
        <h3>REFERÊNCIAS TEÓRICAS E DOCUMENTAIS</h3>
        <p>
          AS FONTES ABAIXO ORIENTAM A ARQUITETURA PEDAGÓGICA E OS CUIDADOS DE INTERPRETAÇÃO.
          ELAS NÃO TRANSFORMAM O NEXO EM INSTRUMENTO DIAGNÓSTICO.
        </p>
        <div>
          {missionTheoryReferences.map((reference) => (
            <article key={reference.key}>
              <strong>{reference.key}</strong>
              <p>{reference.label}</p>
              <span>{reference.use}</span>
              <a href={reference.url} target="_blank" rel="noreferrer">ABRIR FONTE</a>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
