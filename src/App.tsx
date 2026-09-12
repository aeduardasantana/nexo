import { useMemo, useState } from 'react';
import AssetCard from './components/AssetCard';
import { assets } from './data/assets';
import { verbRules } from './data/verbs';
import { executeAction } from './features/actionEngine';
import type {
  ActionDraft,
  AssetCategory,
  EntityState,
  SceneAsset,
  SceneState,
  VerbRule,
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

function toEntity(asset: SceneAsset): EntityState {
  return {
    ...asset,
    instanceId: crypto.randomUUID(),
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
  const [compareMode, setCompareMode] = useState<'before' | 'now' | 'after'>('now');

  const currentScene = history[historyIndex];
  const beforeScene = history[Math.max(0, historyIndex - 1)];
  const afterScene = history[Math.min(history.length - 1, historyIndex + 1)];
  const displayedScene =
    compareMode === 'before' ? beforeScene :
    compareMode === 'after' ? afterScene :
    currentScene;

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

  function addToScene(asset: SceneAsset) {
    const entity = toEntity(asset);
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

    const result = executeAction(currentScene, draft, selectedRule);
    if (!result.ok) {
      setFeedback(`❌ ERRADO — ${result.error}`);
      return;
    }

    const nextHistory = [...history.slice(0, historyIndex + 1), result.scene];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCompareMode('now');
    setFeedback(`✓ ${selectedRule.label}`);
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

  function clearStory() {
    setHistory([initialScene]);
    setHistoryIndex(0);
    setDraft({ verbId: '' });
    setFeedback(null);
    setCompareMode('now');
  }

  function renderEntity(entity: EntityState) {
    const owner = entity.ownerId ? displayedScene.entities.find((item) => item.instanceId === entity.ownerId) : undefined;
    const location = entity.locationId ? displayedScene.entities.find((item) => item.instanceId === entity.locationId) : undefined;

    return (
      <div
        className={[
          'scene-item',
          entity.consumed ? 'is-consumed' : '',
          entity.posture === 'sitting' ? 'is-sitting' : '',
          entity.posture === 'sleeping' ? 'is-sleeping' : '',
        ].join(' ')}
        key={entity.instanceId}
      >
        <span>{entity.symbol}</span>
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
        <button className="teacher-button" type="button">MODO PROFESSORA</button>
      </header>

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
                  {verb.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="stage-panel">
          <div className="stage-heading">
            <div>
              <p className="section-kicker">CENÁRIO</p>
              <h2>{displayedScene.actionLabel ? displayedScene.actionLabel : 'CONSTRUA A CENA'}</h2>
            </div>
            <div className="stage-actions">
              <button type="button" onClick={undo} disabled={historyIndex === 0}>↶ VOLTAR</button>
              <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1}>↷ AVANÇAR</button>
              <button type="button" onClick={clearStory} disabled={history.length === 1}>NOVA HISTÓRIA</button>
            </div>
          </div>

          <div className="stage" aria-live="polite">
            {displayedScene.entities.filter((entity) => !entity.consumed).length === 0 ? (
              <div className="empty-state">
                <span>＋</span>
                <p>ESCOLHA UMA ILUSTRAÇÃO</p>
              </div>
            ) : (
              <div className="scene-strip">
                {displayedScene.entities.filter((entity) => !entity.consumed).map(renderEntity)}
              </div>
            )}
          </div>

          <section className="action-builder">
            <div className="builder-title">
              <p className="section-kicker">AÇÃO</p>
              <strong>{selectedRule?.label ?? 'ESCOLHA UM VERBO'}</strong>
            </div>

            {selectedRule && (
              <div className="builder-fields">
                <label>
                  <span>QUEM</span>
                  <select value={draft.actorId ?? ''} onChange={(event) => updateDraft('actorId', event.target.value || undefined)}>
                    <option value="">?</option>
                    {people.map((person) => <option key={person.instanceId} value={person.instanceId}>{person.label}</option>)}
                  </select>
                </label>

                {selectedRule.requires.includes('object') && (
                  <label>
                    <span>OBJETO</span>
                    <select value={draft.objectId ?? ''} onChange={(event) => updateDraft('objectId', event.target.value || undefined)}>
                      <option value="">?</option>
                      {objects.filter((object) => !object.consumed).map((object) => (
                        <option key={object.instanceId} value={object.instanceId}>{object.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedRule.requires.includes('targetPerson') && (
                  <label>
                    <span>PARA QUEM</span>
                    <select value={draft.targetPersonId ?? ''} onChange={(event) => updateDraft('targetPersonId', event.target.value || undefined)}>
                      <option value="">?</option>
                      {people.map((person) => <option key={person.instanceId} value={person.instanceId}>{person.label}</option>)}
                    </select>
                  </label>
                )}

                {selectedRule.requires.includes('destination') && (
                  <label>
                    <span>PARA ONDE</span>
                    <select value={draft.destinationId ?? ''} onChange={(event) => updateDraft('destinationId', event.target.value || undefined)}>
                      <option value="">?</option>
                      {placesAndSeats.map((item) => <option key={item.instanceId} value={item.instanceId}>{item.label}</option>)}
                    </select>
                  </label>
                )}

                {selectedRule.requires.includes('seat') && (
                  <label>
                    <span>ONDE</span>
                    <select value={draft.seatId ?? ''} onChange={(event) => updateDraft('seatId', event.target.value || undefined)}>
                      <option value="">?</option>
                      {placesAndSeats.filter((item) => ['CADEIRA', 'SOFÁ', 'CAMA'].includes(item.label)).map((item) => (
                        <option key={item.instanceId} value={item.instanceId}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <button className="execute-button" type="button" onClick={runAction}>▶ FAZER</button>
              </div>
            )}

            {feedback && <div className={feedback.startsWith('❌') ? 'feedback error' : 'feedback success'}>{feedback}</div>}
          </section>

          <footer className="stage-footer">
            <button type="button" className={compareMode === 'before' ? 'active' : ''} onClick={() => setCompareMode('before')}>ANTES</button>
            <button type="button" className={compareMode === 'now' ? 'active' : ''} onClick={() => setCompareMode('now')}>AGORA</button>
            <button type="button" className={compareMode === 'after' ? 'active' : ''} onClick={() => setCompareMode('after')}>DEPOIS</button>
            <button type="button" onClick={() => setFeedback('❌ ERRADO')}>❌ ERRADO</button>
            <button type="button" onClick={() => setFeedback('NÃO SEI')}>NÃO SEI</button>
            <button type="button" onClick={() => setFeedback('NÃO ENTENDI')}>NÃO ENTENDI</button>
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
                  setHistoryIndex(index + 1);
                  setCompareMode('now');
                }}
              >
                <span>{index + 1}</span>
                <strong>{scene.actionLabel ?? 'CENA'}</strong>
              </button>
            ))}
            {history.length === 1 && (
              <div className="story-empty">
                <span>1</span>
                <p>A PRIMEIRA AÇÃO APARECERÁ AQUI.</p>
              </div>
            )}
          </div>
          <button className="replay-button" type="button" disabled={history.length <= 1}>▶ REPRODUZIR</button>
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
