export type AssetCategory = 'person' | 'object' | 'place' | 'animal' | 'verb' | 'time';

export type SceneAsset = {
  id: string;
  label: string;
  category: AssetCategory;
  symbol: string;
};

export type VerbRule = {
  id: string;
  label: string;
  requires: Array<'actor' | 'object' | 'targetPerson' | 'destination' | 'seat'>;
  description: string;
};