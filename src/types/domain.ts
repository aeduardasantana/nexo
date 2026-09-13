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
  difficulty?: DifficultyLevel;
  optionCount?: 2 | 3 | 4;
  useDistractors?: boolean;
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


export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeeklyEvent = {
  id: string;
  label: string;
  weekday: Weekday;
  recurring: boolean;
};


export type WeekTaskKind =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'previous'
  | 'next'
  | 'event';

export type WeekTask = {
  kind: WeekTaskKind;
  referenceWeekday?: Weekday;
  eventId?: string;
};


export type NarrativeTaskKind = 'first' | 'next' | 'order';

export type NarrativeTask = {
  kind: NarrativeTaskKind;
  sceneIds: string[];
};


export type CausalRole = 'problem' | 'action' | 'result';

export type CausalTaskKind = 'what_after' | 'what_result' | 'build_chain';

export type CausalTask = {
  kind: CausalTaskKind;
  problemSceneId?: string;
  actionSceneId?: string;
  resultSceneId?: string;
};


export type MentalStateKind = 'want' | 'know' | 'understand' | 'like';

export type MentalStateValue = 'yes' | 'no';

export type MentalState = {
  id: string;
  personId: string;
  kind: MentalStateKind;
  value: MentalStateValue;
  targetLabel?: string;
};

export type MentalTaskKind = 'identify' | 'choose_self';

export type MentalTask = {
  kind: MentalTaskKind;
  personId?: string;
  expectedKind?: MentalStateKind;
  expectedValue?: MentalStateValue;
  targetLabel?: string;
};


export type PerspectiveTaskKind = 'same_different' | 'other_state';

export type PerspectiveTask = {
  kind: PerspectiveTaskKind;
  selfPersonId?: string;
  otherPersonId?: string;
  stateKind?: MentalStateKind;
  targetLabel?: string;
};


export type AccessState = 'saw' | 'did_not_see';

export type InformationAccess = {
  id: string;
  personId: string;
  sceneId: string;
  state: AccessState;
};

export type AccessTaskKind = 'who_saw' | 'who_knows';

export type AccessTask = {
  kind: AccessTaskKind;
  sceneId?: string;
  expectedPersonId?: string;
};


export type HiddenInfoTask = {
  sceneId?: string;
  objectId?: string;
  locationId?: string;
  witnessPersonIds: string[];
};


export type RelocationPerspectiveTask = {
  objectId?: string;
  initialLocationId?: string;
  currentLocationId?: string;
  sawMovePersonIds: string[];
  referencePersonId?: string;
};


export type RelocationSequenceStep = 'current_location' | 'who_saw' | 'person_search';

export type RelocationSequenceState = {
  step: RelocationSequenceStep;
  completedSteps: RelocationSequenceStep[];
};


export type DifficultyLevel = 1 | 2 | 3;
export type MediationLevel = 0 | 1 | 2 | 3;

export type ActivitySupportConfig = {
  difficulty: DifficultyLevel;
  optionCount: 2 | 3 | 4;
  useDistractors: boolean;
};

export type MediationAssessment = {
  id: string;
  sourceEventId?: string;
  level: MediationLevel;
  difficulty: DifficultyLevel;
  optionCount: 2 | 3 | 4;
  useDistractors: boolean;
  createdAt: string;
};
