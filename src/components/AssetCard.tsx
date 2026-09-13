// @signature edufertanapo
import type { SceneAsset } from '../types/domain';
import { AssetVisual } from './Visuals';

type Props = {
  asset: SceneAsset;
  onSelect: (asset: SceneAsset) => void;
};

export default function AssetCard({ asset, onSelect }: Props) {
  return (
    <button className="asset-card" type="button" onClick={() => onSelect(asset)}>
      <AssetVisual asset={asset} size={70} />
      <span className="asset-label">{asset.label}</span>
    </button>
  );
}