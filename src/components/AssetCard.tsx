import type { SceneAsset } from '../types/domain';

type Props = {
  asset: SceneAsset;
  onSelect: (asset: SceneAsset) => void;
};

export default function AssetCard({ asset, onSelect }: Props) {
  return (
    <button className="asset-card" type="button" onClick={() => onSelect(asset)}>
      <span className="asset-symbol" aria-hidden="true">{asset.symbol}</span>
      <span className="asset-label">{asset.label}</span>
    </button>
  );
}