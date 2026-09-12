import { useMemo, useState } from 'react';
import AssetCard from './components/AssetCard';
import { assets } from './data/assets';
import { verbRules } from './data/verbs';
import type { AssetCategory, SceneAsset } from './types/domain';

const categoryLabels: Record<AssetCategory, string> = {
  person: 'PESSOAS',
  object: 'OBJETOS',
  place: 'LUGARES',
  animal: 'ANIMAIS',
  verb: 'AÇÕES',
  time: 'TEMPO',
};

export default function App() {
  const [category, setCategory] = useState<AssetCategory>('person');
  const [sceneItems, setSceneItems] = useState<SceneAsset[]>([]);

  const visibleAssets = useMemo(
    () => assets.filter((item) => item.category === category),
    [category],
  );

  function addToScene(asset: SceneAsset) {
    setSceneItems((current) => [...current, asset]);
  }

  function undo() {
    setSceneItems((current) => current.slice(0, -1));
  }

  function clearScene() {
    setSceneItems([]);
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
            <p className="section-kicker">AÇÕES DO MVP</p>
            <div className="verb-list">
              {verbRules.map((verb) => <span key={verb.id}>{verb.label}</span>)}
            </div>
          </section>
        </aside>

        <section className="stage-panel">
          <div className="stage-heading">
            <div>
              <p className="section-kicker">CENÁRIO</p>
              <h2>CONSTRUA A CENA</h2>
            </div>
            <div className="stage-actions">
              <button type="button" onClick={undo} disabled={!sceneItems.length}>↶ VOLTAR</button>
              <button type="button" onClick={clearScene} disabled={!sceneItems.length}>NOVA CENA</button>
            </div>
          </div>

          <div className="stage" aria-live="polite">
            {sceneItems.length === 0 ? (
              <div className="empty-state">
                <span>＋</span>
                <p>ESCOLHA UMA ILUSTRAÇÃO</p>
              </div>
            ) : (
              <div className="scene-strip">
                {sceneItems.map((item, index) => (
                  <div className="scene-item" key={item.id + index}>
                    <span>{item.symbol}</span>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="stage-footer">
            <button type="button">ANTES</button>
            <button type="button">AGORA</button>
            <button type="button">DEPOIS</button>
            <button type="button">❌ ERRADO</button>
            <button type="button">NÃO SEI</button>
            <button type="button">NÃO ENTENDI</button>
          </footer>
        </section>

        <aside className="story-panel">
          <p className="section-kicker">HISTÓRIA</p>
          <h2>SEQUÊNCIA</h2>
          <div className="story-empty">
            <span>1</span>
            <p>A PRIMEIRA CENA APARECERÁ AQUI.</p>
          </div>
          <button className="replay-button" type="button" disabled>▶ REPRODUZIR</button>
        </aside>
      </section>
    </main>
  );
}