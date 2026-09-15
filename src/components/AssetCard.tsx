// @signature edufertanapo
import type { SceneAsset } from '../types/domain';
import { AssetVisual } from './Visuals';

type Props = {
  asset: SceneAsset;
  onSelect: (asset: SceneAsset) => void;
  selected?: boolean;
};

export default function AssetCard({ asset, onSelect, selected = false }: Props) {
  return (
    <button
      className={selected ? 'asset-card selected' : 'asset-card'}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(asset)}
    >
      <AssetVisual asset={asset} size={70} />
      <span className="asset-label">{asset.label}</span>
    </button>
  );
}