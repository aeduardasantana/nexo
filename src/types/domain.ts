// @signature edufertanapo
export type AssetCategory = 'person' | 'object' | 'place' | 'animal' | 'verb' | 'time';

export type SceneAsset = {
  id: string;
  label: string;
  category: AssetCategory;
  symbol: string;
};

export type RequiredRole = 'actor' | 'object' | 'targetPerson' | 'destination' | 'seat';

export type VerbRule = {
  id: string;
  label: string;
  symbol: string;
  requires: RequiredRole[];
  description: string;
};

export type Posture = 'standing' | 'sitting' | 'sleeping';

export type EntityState = SceneAsset & {
  instanceId: string;
  x: number;
  y: number;
  posture?: Posture;
  ownerId?: string;
  locationId?: string;
  consumed?: boolean;
  activity?: string;
};

export type TemporalDay = 'yesterday' | 'today' | 'tomorrow';

export type SceneState = {
  id: string;
  entities: EntityState[];
  actionLabel?: string;
  temporalDay?: TemporalDay;
};

export type ActionDraft = {
  verbId: string;
  actorId?: string;
  objectId?: string;
  targetPersonId?: string;
  destinationId?: string;
  seatId?: string;
};

export type ActionExecution =
  | { ok: true; scene: SceneState }
  | { ok: false; error: string };

export type ActivityMode = 'free' | 'directed';

export type DirectedActivity = {
  instruction: string;
  expectedVerbId?: string;
  allowUnknown: boolean;
  allowNotUnderstood: boolean;
};

export type MediationEventType = 'correct' | 'error' | 'unknown' | 'not_understood';

export type MediationEvent = {
  id: string;
  type: MediationEventType;
  label: string;
  createdAt: string;
};


export type SpatialRelation = 'near' | 'far' | 'above' | 'below' | 'inside' | 'outside';

export type SpatialRelationResult = {
  type: SpatialRelation;
  label: string;
  subjectId: string;
  referenceId: string;
  matched: boolean;
};


export type SpatialTaskKind = 'place' | 'identify';

export type SpatialTask = {
  kind: SpatialTaskKind;
  subjectId?: string;
  relation: SpatialRelation;
  referenceId?: string;
  instruction: string;
};


export type TemporalEvent = {
  id: string;
  label: string;
  day: TemporalDay;
  symbol: string;
};
