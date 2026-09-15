// @signature edufertanapo
import type { SceneAsset } from '../types/domain';
import { AssetVisual } from './Visuals';

type Props = {
  asset: SceneAsset;
  onSelect: (asset: SceneAsset) => void;
  onDragStart?: (asset: SceneAsset) => void;
  selected?: boolean;
};

export default function AssetCard({ asset, onSelect, onDragStart, selected = false }: Props) {
  return (
    <button
      className={selected ? 'asset-card selected' : 'asset-card'}
      type="button"
      aria-pressed={selected}
      draggable={Boolean(onDragStart)}
      onClick={() => onSelect(asset)}
      onDragStart={(event) => {
        if (!onDragStart) return;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-nexo-asset', asset.id);
        event.dataTransfer.setData('text/plain', asset.label);
        onDragStart(asset);
      }}
    >
      <AssetVisual asset={asset} size={70} />
      <span className="asset-label">{asset.label}</span>
    </button>
  );
}
