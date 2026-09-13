// @signature edufertanapo
import { useEffect, useMemo, useRef, useState } from 'react';
import AssetCard from './components/AssetCard';
import { AssetVisual, VerbVisual } from './components/Visuals';
import { assets } from './data/assets';
import { verbRules } from './data/verbs';
import { executeAction } from './features/actionEngine';
import { detectRelations, evaluateRelation } from './features/spatialRelations';
import type {
  ActionDraft,
  AssetCategory,
  EntityState,
  SceneAsset,
  SceneState,
  VerbRule,
  ActivityMode,
  DirectedActivity,
  MediationEvent,
  SpatialRelation,
  SpatialTask,
} from './types/domain';

const categoryLabels: Record<AssetCategory, string> = {
  person: 'PESSOAS',
  object: 'OBJETOS',
  place: 'LUGARES',
  animal: 'ANIMAIS',
  verb: 'AÇÕES',
  time: 'TEMPO',
};

const initialScene: SceneState = {
  id: 'initial',
  entities: [],
};

function toEntity(asset: SceneAsset, index: number): EntityState {
  const columns = [18, 40, 62, 80];
  const rows = [70, 48, 28];
  return {
    ...asset,
    instanceId: crypto.randomUUID(),
    x: columns[index % columns.length],
    y: rows[Math.floor(index / columns.length) % rows.length],
    posture: asset.category === 'person' ? 'standing' : undefined,
  };
}

function findLabel(scene: SceneState, instanceId?: string) {
  if (!instanceId) return '—';
  return scene.entities.find((entity) => entity.instanceId === instanceId)?.label ?? '—';
}

export default function App() {
  const [category, setCategory] = useState<AssetCategory>('person');
  const [history, setHistory] = useState<SceneState[]>([initialScene]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draft, setDraft] = useState<ActionDraft>({ verbId: '' });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'before' | 'now' | 'after' | 'compare'>('now');
  const [isReplaying, setIsReplaying] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [activityMode, setActivityMode] = useState<ActivityMode>('free');
  const [directedActivity, setDirectedActivity] = useState<DirectedActivity>({
    instruction: 'ESCOLHA A AÇÃO',
    allowUnknown: true,
    allowNotUnderstood: true,
  });
  const [mediationEvents, setMediationEvents] = useState<MediationEvent[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const [relationReferenceId, setRelationReferenceId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<SpatialRelation>('near');
  const [spatialTask, setSpatialTask] = useState<SpatialTask>({
    kind: 'place',
    relation: 'near',
    instruction: 'COLOQUE O ELEMENTO NO LUGAR CERTO',
  });
  const [spatialTaskActive, setSpatialTaskActive] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const replayTimer = useRef<number | null>(null);

  const currentScene = history[historyIndex];
  const beforeScene = history[Math.max(0, historyIndex - 1)];
  const afterScene = history[Math.min(history.length - 1, historyIndex + 1)];
  const displayedScene =
    compareMode === 'before' ? beforeScene :
    compareMode === 'after' ? afterScene :
    currentScene;

  useEffect(() => {
    return () => {
      if (replayTimer.current !== null) window.clearInterval(replayTimer.current);
    };
  }, []);

  const visibleAssets = useMemo(
    () => assets.filter((item) => item.category === category),
    [category],
  );

  const people = currentScene.entities.filter((entity) => entity.category === 'person');
  const objects = currentScene.entities.filter((entity) => entity.category === 'object');
  const placesAndSeats = currentScene.entities.filter((entity) =>
    entity.category === 'place' || ['CADEIRA', 'SOFÁ', 'CAMA'].includes(entity.label),
  );

  const selectedRule = verbRules.find((verb) => verb.id === draft.verbId);
  const selectedEntity = currentScene.entities.find((entity) => entity.instanceId === selectedEntityId);
  const relationReference = currentScene.entities.find((entity) => entity.instanceId === relationReferenceId);
  const detectedRelations =
    selectedEntity && relationReference
      ? detectRelations(selectedEntity, relationReference)
      : [];
  const relationCheck =
    selectedEntity && relationReference
      ? evaluateRelation(selectedEntity, relationReference, relationType)
      : null;

  const spatialTaskSubject = currentScene.entities.find((entity) => entity.instanceId === spatialTask.subjectId);
  const spatialTaskReference = currentScene.entities.find((entity) => entity.instanceId === spatialTask.referenceId);
  const spatialTaskCheck =
    spatialTaskSubject && spatialTaskReference
      ? evaluateRelation(spatialTaskSubject, spatialTaskReference, spatialTask.relation)
      : null;

  function addToScene(asset: SceneAsset) {
    const entity = toEntity(asset, currentScene.entities.length);
    const editedScene: SceneState = {
      ...currentScene,
      entities: [...currentScene.entities, entity],
    };
    setHistory((current) =>
      current.map((scene, index) => index === historyIndex ? editedScene : scene),
    );
    setCompareMode('now');
    setFeedback(null);
  }

  function updateEntityPosition(instanceId: string, x: number, y: number) {
    if (historyIndex !== history.length - 1) {
      setFeedback('VOLTE PARA A CENA MAIS ATUAL PARA EDITAR');
      return;
    }

    const nextX = Math.max(5, Math.min(95, x));
    const nextY = Math.max(8, Math.min(88, y));

    setHistory((current) =>
      current.map((scene, index) =>
        index === historyIndex
          ? {
              ...scene,
              entities: scene.entities.map((entity) =>
                entity.instanceId === instanceId
                  ? { ...entity, x: nextX, y: nextY, ownerId: undefined, locationId: undefined }
                  : entity,
              ),
            }
          : scene,
      ),
    );
  }

  function pointerToPercent(clientX: number, clientY: number) {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  function handleScenePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingEntityId) return;
    const point = pointerToPercent(event.clientX, event.clientY);
    if (!point) return;
    updateEntityPosition(draggingEntityId, point.x, point.y);
  }

  function handleScenePointerUp() {
    setDraggingEntityId(null);
  }

  function handleSceneBackgroundPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!selectedEntityId || draggingEntityId) return;
    const target = event.target as HTMLElement;
    if (target.closest('.scene-item')) return;
    const point = pointerToPercent(event.clientX, event.clientY);
    if (!point) return;
    updateEntityPosition(selectedEntityId, point.x, point.y);
  }

  function startSpatialTask() {
    if (!spatialTask.subjectId || !spatialTask.referenceId) {
      setFeedback('ESCOLHA OS DOIS ELEMENTOS DA ATIVIDADE');
      return;
    }
    setSpatialTaskActive(true);
    setSelectedEntityId(spatialTask.kind === 'place' ? spatialTask.subjectId : null);
    setFeedback(null);
  }

  function validateSpatialTask() {
    if (!spatialTaskSubject || !spatialTaskReference) {
      setFeedback('ATIVIDADE INCOMPLETA');
      return;
    }

    const result = evaluateRelation(spatialTaskSubject, spatialTaskReference, spatialTask.relation);
    const correct = result.matched;

    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `RELAÇÃO ${result.label}`,
      createdAt: new Date().toISOString(),
    }]);

    if (correct) setSpatialTaskActive(false);
  }

  function chooseSpatialAnswer(instanceId: string) {
    if (!spatialTaskActive || spatialTask.kind !== 'identify') return;
    const candidate = currentScene.entities.find((entity) => entity.instanceId === instanceId);
    const reference = spatialTaskReference;
    if (!candidate || !reference) return;

    const result = evaluateRelation(candidate, reference, spatialTask.relation);
    const correct = result.matched;

    setSelectedEntityId(instanceId);
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `IDENTIFICAR ${result.label}`,
      createdAt: new Date().toISOString(),
    }]);

    if (correct) setSpatialTaskActive(false);
  }

  function selectVerb(rule: VerbRule) {
    setDraft({ verbId: rule.id });
    setFeedback(null);
  }

  function updateDraft<K extends keyof ActionDraft>(key: K, value: ActionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function runAction() {
    if (!selectedRule) {
      setFeedback('❌ ESCOLHA UMA AÇÃO');
      return;
    }

    if (
      activityMode === 'directed' &&
      directedActivity.expectedVerbId &&
      selectedRule.id !== directedActivity.expectedVerbId
    ) {
      setFeedback('❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: 'error',
        label: selectedRule.label,
        createdAt: new Date().toISOString(),
      }]);
      return;
    }

    const result = executeAction(currentScene, draft, selectedRule);
    if (!result.ok) {
      setFeedback(`❌ ERRADO — ${result.error}`);
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: 'error',
        label: result.error,
        createdAt: new Date().toISOString(),
      }]);
      return;
    }

    const nextHistory = [...history.slice(0, historyIndex + 1), result.scene];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCompareMode('now');
    setFeedback(`✓ ${selectedRule.label}`);
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: 'correct',
      label: selectedRule.label,
      createdAt: new Date().toISOString(),
    }]);
    setDraft({ verbId: '' });
  }

  function undo() {
    if (historyIndex === 0) return;
    setHistoryIndex((index) => index - 1);
    setCompareMode('now');
    setFeedback(null);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex((index) => index + 1);
    setCompareMode('now');
    setFeedback(null);
  }

  function stopReplay() {
    if (replayTimer.current !== null) {
      window.clearInterval(replayTimer.current);
      replayTimer.current = null;
    }
    setIsReplaying(false);
  }

  function replayStory() {
    if (history.length <= 1) return;
    stopReplay();
    setCompareMode('now');
    setHistoryIndex(1);
    setIsReplaying(true);

    let index = 1;
    replayTimer.current = window.setInterval(() => {
      index += 1;
      if (index >= history.length) {
        stopReplay();
        return;
      }
      setHistoryIndex(index);
    }, 1400);
  }

  function clearStory() {
    stopReplay();
    setHistory([initialScene]);
    setHistoryIndex(0);
    setDraft({ verbId: '' });
    setFeedback(null);
    setSelectedEntityId(null);
    setDraggingEntityId(null);
    setRelationReferenceId(null);
    setSpatialTaskActive(false);
    setCompareMode('now');
  }

  function renderEntity(entity: EntityState) {
    const owner = entity.ownerId ? displayedScene.entities.find((item) => item.instanceId === entity.ownerId) : undefined;
    const location = entity.locationId ? displayedScene.entities.find((item) => item.instanceId === entity.locationId) : undefined;

    return (
      <div
        className={[
          'scene-item',
          selectedEntityId === entity.instanceId ? 'is-selected' : '',
          draggingEntityId === entity.instanceId ? 'is-dragging' : '',
          entity.consumed ? 'is-consumed' : '',
          entity.posture === 'sitting' ? 'is-sitting' : '',
          entity.posture === 'sleeping' ? 'is-sleeping' : '',
        ].join(' ')}
        key={entity.instanceId}
        style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (spatialTaskActive && spatialTask.kind === 'identify') {
            chooseSpatialAnswer(entity.instanceId);
            return;
          }
          setSelectedEntityId(entity.instanceId);
          if (historyIndex === history.length - 1) {
            setDraggingEntityId(entity.instanceId);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setDraggingEntityId(null);
        }}
      >
        <AssetVisual asset={entity} size={92} className={entity.activity ? `activity-${entity.activity}` : ''} />
        <small>{entity.label}</small>
        {entity.posture && entity.posture !== 'standing' && (
          <em>{entity.posture === 'sitting' ? 'SENTADO' : 'DORMINDO'}</em>
        )}
        {owner && <em>COM {owner.label}</em>}
        {location && <em>EM {location.label}</em>}
      </div>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJETO EU, NÓS E O OUTRO</p>
          <h1>NEXO</h1>
          <p className="subtitle">Sistema Visual de Ação e Narrativa</p>
        </div>
        <button className="teacher-button" type="button" onClick={() => setTeacherOpen((open) => !open)}>
          {teacherOpen ? 'FECHAR PROFESSORA' : 'MODO PROFESSORA'}
        </button>
      </header>

      {teacherOpen && (
        <section className="teacher-panel">
          <div>
            <p className="section-kicker">CONFIGURAÇÃO PEDAGÓGICA</p>
            <h2>MODO PROFESSORA</h2>
          </div>

          <label>
            <span>TIPO DE ATIVIDADE</span>
            <select value={activityMode} onChange={(event) => setActivityMode(event.target.value as ActivityMode)}>
              <option value="free">LIVRE</option>
              <option value="directed">DIRIGIDA</option>
            </select>
          </label>

          {activityMode === 'directed' && (
            <>
              <label>
                <span>INSTRUÇÃO</span>
                <input
                  value={directedActivity.instruction}
                  onChange={(event) => setDirectedActivity((current) => ({ ...current, instruction: event.target.value.toUpperCase() }))}
                />
              </label>
              <label>
                <span>RESPOSTA ESPERADA</span>
                <select
                  value={directedActivity.expectedVerbId ?? ''}
                  onChange={(event) => setDirectedActivity((current) => ({ ...current, expectedVerbId: event.target.value || undefined }))}
                >
                  <option value="">SEM RESPOSTA ÚNICA</option>
                  {verbRules.map((verb) => <option key={verb.id} value={verb.id}>{verb.label}</option>)}
                </select>
              </label>
            </>
          )}

          <div className="teacher-stats">
            <span>CORRETAS {mediationEvents.filter((event) => event.type === 'correct').length}</span>
            <span>ERROS {mediationEvents.filter((event) => event.type === 'error').length}</span>
            <span>NÃO SEI {mediationEvents.filter((event) => event.type === 'unknown').length}</span>
            <span>NÃO ENTENDI {mediationEvents.filter((event) => event.type === 'not_understood').length}</span>
          </div>
        </section>
      )}

      <section className="workspace">
        <aside className="library">
          <nav className="category-tabs" aria-label="Biblioteca visual">
            {(['person', 'object', 'place'] as AssetCategory[]).map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'tab active' : 'tab'}
                onClick={() => setCategory(item)}
              >
                {categoryLabels[item]}
              </button>
            ))}
          </nav>

          <div className="asset-grid">
            {visibleAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onSelect={addToScene} />
            ))}
          </div>

          <section className="verb-preview">
            <p className="section-kicker">AÇÕES</p>
            <div className="verb-grid">
              {verbRules.map((verb) => (
                <button
                  key={verb.id}
                  type="button"
                  className={draft.verbId === verb.id ? 'verb-button active' : 'verb-button'}
                  onClick={() => selectVerb(verb)}
                >
                  <VerbVisual verb={verb} size={52} animated={draft.verbId === verb.id} />
                  <small>{verb.label}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="stage-panel">
          <div className="stage-heading">
            <div>
              <p className="section-kicker">{activityMode === 'directed' ? 'ATIVIDADE DIRIGIDA' : 'CENÁRIO'}</p>
              <h2>
                {activityMode === 'directed'
                  ? directedActivity.instruction
                  : (displayedScene.actionLabel ? displayedScene.actionLabel : 'CONSTRUA A CENA')}
              </h2>
            </div>
            <div className="stage-actions">
              <button type="button" onClick={undo} disabled={historyIndex === 0}>↶ VOLTAR</button>
              <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1}>↷ AVANÇAR</button>
              <button type="button" onClick={clearStory} disabled={history.length === 1}>NOVA HISTÓRIA</button>
            </div>
          </div>

          {compareMode === 'compare' ? (
            <div className="compare-stage" aria-live="polite">
              <section>
                <strong>ANTES</strong>
                <div className="mini-stage">
                  {beforeScene.entities.filter((entity) => !entity.consumed).map((entity) => (
                    <div className="mini-entity" key={entity.instanceId} style={{ left: `${entity.x}%`, top: `${entity.y}%` }}>
                      <AssetVisual asset={entity} size={50} />
                      <small>{entity.label}</small>
                    </div>
                  ))}
                </div>
              </section>
              <div className="compare-arrow" aria-hidden="true">→</div>
              <section>
                <strong>DEPOIS</strong>
                <div className="mini-stage">
                  {currentScene.entities.filter((entity) => !entity.consumed).map((entity) => (
                    <div className="mini-entity" key={entity.instanceId} style={{ left: `${entity.x}%`, top: `${entity.y}%` }}>
                      <AssetVisual asset={entity} size={50} />
                      <small>{entity.label}</small>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className={isReplaying ? 'stage is-replaying' : 'stage'} aria-live="polite">
              {displayedScene.entities.filter((entity) => !entity.consumed).length === 0 ? (
                <div className="empty-state">
                  <span>＋</span>
                  <p>ESCOLHA UMA ILUSTRAÇÃO</p>
                </div>
              ) : (
                <div
                  className="spatial-scene"
                  ref={sceneRef}
                  onPointerMove={handleScenePointerMove}
                  onPointerUp={handleScenePointerUp}
                  onPointerCancel={handleScenePointerUp}
                  onPointerDown={handleSceneBackgroundPointerDown}
                >
                  <div className="ground-line" aria-hidden="true" />
                  {displayedScene.entities.filter((entity) => !entity.consumed).map(renderEntity)}
                  {selectedEntityId && historyIndex === history.length - 1 && (
                    <div className="move-hint">ARRASTE OU TOQUE NO LOCAL</div>
                  )}
                  {selectedEntity && relationReference && (
                    <div className="relation-badge">
                      {detectedRelations.length > 0
                        ? detectedRelations.map((relation) => relation.label).join(' • ')
                        : 'SEM RELAÇÃO MARCADA'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <section className="spatial-task-builder">
            <div className="builder-title">
              <p className="section-kicker">ATIVIDADE ESPACIAL DIRIGIDA</p>
              <strong>{spatialTaskActive ? spatialTask.instruction : 'CONFIGURAR ATIVIDADE'}</strong>
            </div>

            <div className="relation-controls">
              <label>
                <span>TIPO</span>
                <select
                  value={spatialTask.kind}
                  onChange={(event) => setSpatialTask((current) => ({
                    ...current,
                    kind: event.target.value as SpatialTask['kind'],
                  }))}
                >
                  <option value="place">COLOCAR</option>
                  <option value="identify">IDENTIFICAR</option>
                </select>
              </label>

              <label>
                <span>{spatialTask.kind === 'place' ? 'MOVER' : 'RESPOSTA-ALVO'}</span>
                <select
                  value={spatialTask.subjectId ?? ''}
                  onChange={(event) => setSpatialTask((current) => ({
                    ...current,
                    subjectId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {currentScene.entities.filter((entity) => !entity.consumed).map((entity) => (
                    <option key={entity.instanceId} value={entity.instanceId}>{entity.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>RELAÇÃO</span>
                <select
                  value={spatialTask.relation}
                  onChange={(event) => setSpatialTask((current) => ({
                    ...current,
                    relation: event.target.value as SpatialRelation,
                  }))}
                >
                  <option value="near">PERTO</option>
                  <option value="far">LONGE</option>
                  <option value="above">EM CIMA</option>
                  <option value="below">EMBAIXO</option>
                  <option value="inside">DENTRO</option>
                  <option value="outside">FORA</option>
                </select>
              </label>

              <label>
                <span>REFERÊNCIA</span>
                <select
                  value={spatialTask.referenceId ?? ''}
                  onChange={(event) => setSpatialTask((current) => ({
                    ...current,
                    referenceId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {currentScene.entities
                    .filter((entity) => !entity.consumed && entity.instanceId !== spatialTask.subjectId)
                    .map((entity) => (
                      <option key={entity.instanceId} value={entity.instanceId}>{entity.label}</option>
                    ))}
                </select>
              </label>
            </div>

            <div className="spatial-task-preview">
              {spatialTask.kind === 'place' ? (
                <>
                  <strong>COLOQUE</strong>
                  <span>{findLabel(currentScene, spatialTask.subjectId)}</span>
                  <strong>{spatialTask.relation === 'near' ? 'PERTO DE' :
                    spatialTask.relation === 'far' ? 'LONGE DE' :
                    spatialTask.relation === 'above' ? 'EM CIMA DE' :
                    spatialTask.relation === 'below' ? 'EMBAIXO DE' :
                    spatialTask.relation === 'inside' ? 'DENTRO DE' : 'FORA DE'}</strong>
                  <span>{findLabel(currentScene, spatialTask.referenceId)}</span>
                </>
              ) : (
                <>
                  <strong>QUEM/O QUE ESTÁ</strong>
                  <span>{spatialTask.relation === 'near' ? 'PERTO DE' :
                    spatialTask.relation === 'far' ? 'LONGE DE' :
                    spatialTask.relation === 'above' ? 'EM CIMA DE' :
                    spatialTask.relation === 'below' ? 'EMBAIXO DE' :
                    spatialTask.relation === 'inside' ? 'DENTRO DE' : 'FORA DE'}</span>
                  <span>{findLabel(currentScene, spatialTask.referenceId)}</span>
                </>
              )}
            </div>

            <div className="spatial-task-actions">
              <button type="button" onClick={startSpatialTask}>
                {spatialTaskActive ? 'REINICIAR ATIVIDADE' : 'INICIAR ATIVIDADE'}
              </button>
              {spatialTask.kind === 'place' && (
                <button type="button" disabled={!spatialTaskActive} onClick={validateSpatialTask}>
                  VERIFICAR
                </button>
              )}
            </div>

            {spatialTaskActive && spatialTask.kind === 'identify' && (
              <div className="identify-options">
                {currentScene.entities
                  .filter((entity) => !entity.consumed && entity.instanceId !== spatialTask.referenceId)
                  .map((entity) => (
                    <button type="button" key={entity.instanceId} onClick={() => chooseSpatialAnswer(entity.instanceId)}>
                      <AssetVisual asset={entity} size={46} />
                      <span>{entity.label}</span>
                    </button>
                  ))}
              </div>
            )}

            {spatialTaskCheck && spatialTask.kind === 'place' && spatialTaskActive && (
              <div className={spatialTaskCheck.matched ? 'relation-result matched' : 'relation-result'}>
                POSIÇÃO ATUAL: {spatialTaskCheck.matched ? 'CORRESPONDE' : 'AINDA NÃO CORRESPONDE'}
              </div>
            )}
          </section>

          <section className="relation-builder">
            <div className="builder-title">
              <p className="section-kicker">RELAÇÃO ESPACIAL</p>
              <strong>COMPARE DOIS ELEMENTOS</strong>
            </div>
            <div className="relation-controls">
              <label>
                <span>ELEMENTO 1</span>
                <select value={selectedEntityId ?? ''} onChange={(event) => setSelectedEntityId(event.target.value || null)}>
                  <option value="">?</option>
                  {currentScene.entities.filter((entity) => !entity.consumed).map((entity) => (
                    <option key={entity.instanceId} value={entity.instanceId}>{entity.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>RELAÇÃO</span>
                <select value={relationType} onChange={(event) => setRelationType(event.target.value as SpatialRelation)}>
                  <option value="near">PERTO</option>
                  <option value="far">LONGE</option>
                  <option value="above">EM CIMA</option>
                  <option value="below">EMBAIXO</option>
                  <option value="inside">DENTRO</option>
                  <option value="outside">FORA</option>
                </select>
              </label>
              <label>
                <span>ELEMENTO 2</span>
                <select value={relationReferenceId ?? ''} onChange={(event) => setRelationReferenceId(event.target.value || null)}>
                  <option value="">?</option>
                  {currentScene.entities.filter((entity) => !entity.consumed && entity.instanceId !== selectedEntityId).map((entity) => (
                    <option key={entity.instanceId} value={entity.instanceId}>{entity.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {relationCheck && (
              <div className={relationCheck.matched ? 'relation-result matched' : 'relation-result'}>
                {relationCheck.matched ? '✓' : '✕'} {relationCheck.label}
              </div>
            )}
          </section>

          <section className="action-builder">
            <div className="builder-title">
              <p className="section-kicker">AÇÃO</p>
              <strong>{selectedRule?.label ?? 'ESCOLHA UM VERBO'}</strong>
            </div>

            {selectedRule && (
              <>
                <div className="visual-sentence" aria-label="Prévia visual da ação">
                  <div className="sentence-slot">
                    <span className="slot-label">QUEM</span>
                    <strong>{findLabel(currentScene, draft.actorId)}</strong>
                  </div>
                  <div className="sentence-arrow">→</div>
                  <div className="sentence-slot action-slot">
                    <VerbVisual verb={selectedRule} size={54} animated />
                    <strong>{selectedRule.label}</strong>
                  </div>
                  {selectedRule.requires.includes('object') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className="sentence-slot">
                        <span className="slot-label">OBJETO</span>
                        <strong>{findLabel(currentScene, draft.objectId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('targetPerson') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className="sentence-slot">
                        <span className="slot-label">PARA QUEM</span>
                        <strong>{findLabel(currentScene, draft.targetPersonId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('destination') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className="sentence-slot">
                        <span className="slot-label">PARA ONDE</span>
                        <strong>{findLabel(currentScene, draft.destinationId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('seat') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className="sentence-slot">
                        <span className="slot-label">ONDE</span>
                        <strong>{findLabel(currentScene, draft.seatId)}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="visual-picker">
                  <section>
                    <span className="picker-title">QUEM</span>
                    <div className="picker-options">
                      {people.map((person) => (
                        <button
                          type="button"
                          key={person.instanceId}
                          className={draft.actorId === person.instanceId ? 'visual-option active' : 'visual-option'}
                          onClick={() => updateDraft('actorId', person.instanceId)}
                        >
                          <AssetVisual asset={person} size={54} />
                          <small>{person.label}</small>
                        </button>
                      ))}
                    </div>
                  </section>

                  {selectedRule.requires.includes('object') && (
                    <section>
                      <span className="picker-title">OBJETO</span>
                      <div className="picker-options">
                        {objects.filter((object) => !object.consumed).map((object) => (
                          <button
                            type="button"
                            key={object.instanceId}
                            className={draft.objectId === object.instanceId ? 'visual-option active' : 'visual-option'}
                            onClick={() => updateDraft('objectId', object.instanceId)}
                          >
                            <AssetVisual asset={object} size={54} />
                            <small>{object.label}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedRule.requires.includes('targetPerson') && (
                    <section>
                      <span className="picker-title">PARA QUEM</span>
                      <div className="picker-options">
                        {people.map((person) => (
                          <button
                            type="button"
                            key={person.instanceId}
                            className={draft.targetPersonId === person.instanceId ? 'visual-option active' : 'visual-option'}
                            onClick={() => updateDraft('targetPersonId', person.instanceId)}
                          >
                            <AssetVisual asset={person} size={54} />
                            <small>{person.label}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedRule.requires.includes('destination') && (
                    <section>
                      <span className="picker-title">PARA ONDE</span>
                      <div className="picker-options">
                        {placesAndSeats.map((item) => (
                          <button
                            type="button"
                            key={item.instanceId}
                            className={draft.destinationId === item.instanceId ? 'visual-option active' : 'visual-option'}
                            onClick={() => updateDraft('destinationId', item.instanceId)}
                          >
                            <AssetVisual asset={item} size={54} />
                            <small>{item.label}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedRule.requires.includes('seat') && (
                    <section>
                      <span className="picker-title">ONDE</span>
                      <div className="picker-options">
                        {placesAndSeats.filter((item) => ['CADEIRA', 'SOFÁ', 'CAMA'].includes(item.label)).map((item) => (
                          <button
                            type="button"
                            key={item.instanceId}
                            className={draft.seatId === item.instanceId ? 'visual-option active' : 'visual-option'}
                            onClick={() => updateDraft('seatId', item.instanceId)}
                          >
                            <AssetVisual asset={item} size={54} />
                            <small>{item.label}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <button className="execute-button visual-execute" type="button" onClick={runAction}>▶ FAZER</button>
              </>
            )}

            {feedback && <div className={feedback.startsWith('❌') ? 'feedback error' : 'feedback success'}>{feedback}</div>}
          </section>

          <footer className="stage-footer">
            <button type="button" className={compareMode === 'before' ? 'active' : ''} onClick={() => setCompareMode('before')}>ANTES</button>
            <button type="button" className={compareMode === 'now' ? 'active' : ''} onClick={() => setCompareMode('now')}>AGORA</button>
            <button type="button" className={compareMode === 'after' ? 'active' : ''} onClick={() => setCompareMode('after')}>DEPOIS</button>
            <button type="button" className={compareMode === 'compare' ? 'active' : ''} onClick={() => setCompareMode('compare')}>ANTES × DEPOIS</button>
            <button type="button" onClick={() => {
              setFeedback('❌ ERRADO');
              setMediationEvents((events) => [...events, {
                id: crypto.randomUUID(),
                type: 'error',
                label: 'ERRADO',
                createdAt: new Date().toISOString(),
              }]);
            }}>❌ ERRADO</button>
            <button type="button" onClick={() => {
              setFeedback('NÃO SEI');
              setMediationEvents((events) => [...events, {
                id: crypto.randomUUID(),
                type: 'unknown',
                label: 'NÃO SEI',
                createdAt: new Date().toISOString(),
              }]);
            }}>NÃO SEI</button>
            <button type="button" onClick={() => {
              setFeedback('NÃO ENTENDI — MOSTRE NOVAMENTE');
              setCompareMode('before');
              setMediationEvents((events) => [...events, {
                id: crypto.randomUUID(),
                type: 'not_understood',
                label: 'NÃO ENTENDI',
                createdAt: new Date().toISOString(),
              }]);
            }}>NÃO ENTENDI</button>
          </footer>
        </section>

        <aside className="story-panel">
          <p className="section-kicker">HISTÓRIA</p>
          <h2>SEQUÊNCIA</h2>
          <div className="story-list">
            {history.slice(1).map((scene, index) => (
              <button
                key={scene.id}
                type="button"
                className={historyIndex === index + 1 ? 'story-card active' : 'story-card'}
                onClick={() => {
                  stopReplay();
                  setHistoryIndex(index + 1);
                  setCompareMode('now');
                }}
              >
                <span className="scene-number">{index + 1}</span>
                <div className="story-card-content">
                  <strong>{scene.actionLabel ?? 'CENA'}</strong>
                  <div className="scene-thumbnail" aria-hidden="true">
                    {scene.entities
                      .filter((entity) => !entity.consumed)
                      .slice(0, 6)
                      .map((entity) => <span key={entity.instanceId}>{entity.symbol}</span>)}
                  </div>
                </div>
              </button>
            ))}
            {history.length === 1 && (
              <div className="story-empty">
                <span>1</span>
                <p>A PRIMEIRA AÇÃO APARECERÁ AQUI.</p>
              </div>
            )}
          </div>
          <button
            className="replay-button"
            type="button"
            disabled={history.length <= 1}
            onClick={isReplaying ? stopReplay : replayStory}
          >
            {isReplaying ? '■ PARAR' : '▶ REPRODUZIR'}
          </button>
        </aside>
      </section>

      <aside className="debug-caption" aria-hidden="true">
        {selectedRule && (
          <span>
            {findLabel(currentScene, draft.actorId)} → {selectedRule.label} →
            {draft.objectId ? ` ${findLabel(currentScene, draft.objectId)}` : ''}
            {draft.targetPersonId ? ` → ${findLabel(currentScene, draft.targetPersonId)}` : ''}
            {draft.destinationId ? ` → ${findLabel(currentScene, draft.destinationId)}` : ''}
            {draft.seatId ? ` → ${findLabel(currentScene, draft.seatId)}` : ''}
          </span>
        )}
      </aside>
    </main>
  );
}
