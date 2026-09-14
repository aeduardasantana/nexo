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
  TemporalDay,
  TemporalEvent,
  Weekday,
  WeeklyEvent,
  WeekTask,
  NarrativeTask,
  CausalTask,
  MentalState,
  MentalStateKind,
  MentalStateValue,
  MentalTask,
  PerspectiveTask,
  InformationAccess,
  AccessState,
  AccessTask,
  HiddenInfoTask,
  RelocationPerspectiveTask,
  RelocationSequenceState,
  ActivitySupportConfig,
  MediationAssessment,
  MediationLevel,
  SessionMetadata,
  SessionReport,
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
  if (!instanceId) return ' - ';
  return scene.entities.find((entity) => entity.instanceId === instanceId)?.label ?? ' - ';
}

function shuffledCopy<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
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
  const [temporalTaskActive, setTemporalTaskActive] = useState(false);
  const [expectedTemporalDay, setExpectedTemporalDay] = useState<TemporalDay>('today');
  const [temporalEvents, setTemporalEvents] = useState<TemporalEvent[]>([]);
  const [newTemporalEventLabel, setNewTemporalEventLabel] = useState('');
  const [newTemporalEventDay, setNewTemporalEventDay] = useState<TemporalDay>('today');
  const [temporalEventQuestionId, setTemporalEventQuestionId] = useState<string | null>(null);
  const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvent[]>([]);
  const [newWeeklyEventLabel, setNewWeeklyEventLabel] = useState('');
  const [newWeeklyEventDay, setNewWeeklyEventDay] = useState<Weekday>(2);
  const [newWeeklyEventRecurring, setNewWeeklyEventRecurring] = useState(true);
  const [weekTask, setWeekTask] = useState<WeekTask>({ kind: 'today' });
  const [weekTaskActive, setWeekTaskActive] = useState(false);
  const [narrativeTask, setNarrativeTask] = useState<NarrativeTask>({ kind: 'first', sceneIds: [] });
  const [narrativeTaskActive, setNarrativeTaskActive] = useState(false);
  const [narrativeAnswer, setNarrativeAnswer] = useState<string[]>([]);
  const [narrativeOptionIds, setNarrativeOptionIds] = useState<string[]>([]);
  const [causalTask, setCausalTask] = useState<CausalTask>({ kind: 'what_after' });
  const [causalTaskActive, setCausalTaskActive] = useState(false);
  const [causalAnswer, setCausalAnswer] = useState<string[]>([]);
  const [causalOptionIds, setCausalOptionIds] = useState<string[]>([]);
  const [mentalStates, setMentalStates] = useState<MentalState[]>([]);
  const [mentalTask, setMentalTask] = useState<MentalTask>({ kind: 'choose_self' });
  const [mentalTaskActive, setMentalTaskActive] = useState(false);
  const [mentalTargetLabel, setMentalTargetLabel] = useState('');
  const [perspectiveTask, setPerspectiveTask] = useState<PerspectiveTask>({ kind: 'same_different' });
  const [perspectiveTaskActive, setPerspectiveTaskActive] = useState(false);
  const [informationAccess, setInformationAccess] = useState<InformationAccess[]>([]);
  const [accessTask, setAccessTask] = useState<AccessTask>({ kind: 'who_saw' });
  const [accessTaskActive, setAccessTaskActive] = useState(false);
  const [accessAnswerPersonIds, setAccessAnswerPersonIds] = useState<string[]>([]);
  const [hiddenInfoTask, setHiddenInfoTask] = useState<HiddenInfoTask>({ witnessPersonIds: [] });
  const [hiddenInfoTaskActive, setHiddenInfoTaskActive] = useState(false);
  const [hiddenInfoAnswerPersonIds, setHiddenInfoAnswerPersonIds] = useState<string[]>([]);
  const [relocationTask, setRelocationTask] = useState<RelocationPerspectiveTask>({
    initialWitnessPersonIds: [],
    sawMovePersonIds: [],
  });
  const [relocationTaskActive, setRelocationTaskActive] = useState(false);
  const [relocationSequence, setRelocationSequence] = useState<RelocationSequenceState>({
    step: 'current_location',
    completedSteps: [],
  });
  const [relocationSequenceActive, setRelocationSequenceActive] = useState(false);
  const [sequenceWitnessAnswer, setSequenceWitnessAnswer] = useState<string[]>([]);
  const [supportConfig, setSupportConfig] = useState<ActivitySupportConfig>({
    difficulty: 1,
    optionCount: 2,
    useDistractors: false,
  });
  const [mediationAssessments, setMediationAssessments] = useState<MediationAssessment[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<'scenario' | 'time' | 'narrative' | 'perspective' | 'report'>('scenario');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata>({
    participant: '',
    date: new Date().toISOString().slice(0, 10),
    objective: '',
    notes: '',
  });
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

  function mediationLevelLabel(level: MediationLevel) {
    if (level === 0) return 'NÃO DEMONSTRADO';
    if (level === 1) return 'APÓS MODELAGEM';
    if (level === 2) return 'COM PISTA / MEDIAÇÃO';
    return 'ESPONTÂNEO';
  }

  function registerMediationAssessment(level: MediationLevel) {
    const latestEvent = mediationEvents.length > 0 ? mediationEvents[mediationEvents.length - 1] : undefined;
    if (!latestEvent) {
      setFeedback('REGISTRE PRIMEIRO UMA RESPOSTA OU ATIVIDADE');
      return;
    }

    setMediationAssessments((items) => {
      const nextAssessment: MediationAssessment = {
        id: crypto.randomUUID(),
        sourceEventId: latestEvent.id,
        level,
        difficulty: supportConfig.difficulty,
        optionCount: supportConfig.optionCount,
        useDistractors: supportConfig.useDistractors,
        createdAt: new Date().toISOString(),
      };
      return [
        ...items.filter((item) => item.sourceEventId !== latestEvent.id),
        nextAssessment,
      ];
    });

    setFeedback(`MEDIAÇÃO ${level} - ${mediationLevelLabel(level)}`);
  }

  function buildSessionReport(): SessionReport {
    return {
      metadata: sessionMetadata,
      scenes: history,
      mediationEvents,
      mediationAssessments,
      mentalStates,
      informationAccess,
      temporalEvents,
      weeklyEvents,
      supportConfig,
      activityMode,
      directedActivity,
      generatedAt: new Date().toISOString(),
    };
  }

  function downloadTextFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function isSessionReport(value: unknown): value is SessionReport {
    if (!value || typeof value !== 'object') return false;
    const report = value as Partial<SessionReport>;
    return Boolean(
      report.metadata &&
      typeof report.metadata === 'object' &&
      Array.isArray(report.scenes) &&
      Array.isArray(report.mediationEvents) &&
      Array.isArray(report.mediationAssessments) &&
      Array.isArray(report.mentalStates) &&
      Array.isArray(report.informationAccess) &&
      report.supportConfig &&
      typeof report.supportConfig === 'object'
    );
  }

  function restoreSessionReport(report: SessionReport) {
    const scenes = report.scenes.length > 0 ? report.scenes : [initialScene];
    setSessionMetadata(report.metadata);
    setHistory(scenes);
    setHistoryIndex(Math.max(0, scenes.length - 1));
    setMediationEvents(report.mediationEvents);
    setMediationAssessments(report.mediationAssessments);
    setMentalStates(report.mentalStates);
    setInformationAccess(report.informationAccess);
    setTemporalEvents(report.temporalEvents ?? []);
    setWeeklyEvents(report.weeklyEvents ?? []);
    setSupportConfig(report.supportConfig);
    setActivityMode(report.activityMode ?? 'free');
    setDirectedActivity(report.directedActivity ?? {
      instruction: 'ESCOLHA A AÇÃO',
      allowUnknown: true,
      allowNotUnderstood: true,
    });
    setDraft({ verbId: '' });
    setFeedback('SESSÃO RESTAURADA');
    setCompareMode('now');
    setReportOpen(false);
    setActiveModule('scenario');
    setSelectedEntityId(null);
    setDraggingEntityId(null);
    setRelationReferenceId(null);
    setSpatialTaskActive(false);
    setTemporalTaskActive(false);
    setWeekTaskActive(false);
    setNarrativeTaskActive(false);
    setCausalTaskActive(false);
    setMentalTaskActive(false);
    setPerspectiveTaskActive(false);
    setAccessTaskActive(false);
    setAccessAnswerPersonIds([]);
    setHiddenInfoTaskActive(false);
    setHiddenInfoAnswerPersonIds([]);
    setRelocationTaskActive(false);
    setRelocationSequenceActive(false);
  }

  async function importSessionJson(file: File) {
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isSessionReport(parsed)) {
        setFeedback('ARQUIVO INVÁLIDO - NÃO É UMA SESSÃO NEXO COMPATÍVEL');
        return;
      }
      restoreSessionReport(parsed);
    } catch {
      setFeedback('ERRO AO LER O ARQUIVO JSON');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  function exportSessionJson() {
    const report = buildSessionReport();
    const safeParticipant = (sessionMetadata.participant || 'SESSAO').trim().replace(/[^A-Za-z0-9_-]+/g, '_');
    downloadTextFile(
      `NEXO_${safeParticipant}_${sessionMetadata.date}.json`,
      JSON.stringify(report, null, 2),
      'application/json',
    );
  }

  function exportSessionCsv() {
    const rows = [
      ['DATA', 'TIPO', 'DESCRICAO', 'NIVEL_MEDIACAO', 'DIFICULDADE', 'OPCOES', 'DISTRATORES'],
    ];

    for (const event of mediationEvents) {
      const assessment = [...mediationAssessments]
        .reverse()
        .find((item) => item.sourceEventId === event.id);
      rows.push([
        event.createdAt,
        event.type,
        event.label,
        assessment ? String(assessment.level) : '',
        assessment ? String(assessment.difficulty) : '',
        assessment ? String(assessment.optionCount) : '',
        assessment ? (assessment.useDistractors ? 'SIM' : 'NAO') : '',
      ]);
    }

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const safeParticipant = (sessionMetadata.participant || 'SESSAO').trim().replace(/[^A-Za-z0-9_-]+/g, '_');
    downloadTextFile(
      `NEXO_${safeParticipant}_${sessionMetadata.date}.csv`,
      '\uFEFF' + csv,
      'text/csv;charset=utf-8',
    );
  }

  function mediationCounts() {
    return {
      correct: mediationEvents.filter((event) => event.type === 'correct').length,
      error: mediationEvents.filter((event) => event.type === 'error').length,
      unknown: mediationEvents.filter((event) => event.type === 'unknown').length,
      notUnderstood: mediationEvents.filter((event) => event.type === 'not_understood').length,
    };
  }

  function assessmentCounts() {
    return ([0, 1, 2, 3] as MediationLevel[]).map((level) => ({
      level,
      count: mediationAssessments.filter((assessment) => assessment.level === level).length,
    }));
  }

  function printSessionReport() {
    setReportOpen(true);
    window.setTimeout(() => window.print(), 50);
  }

  function setSceneTemporalDay(day: TemporalDay) {
    setHistory((current) =>
      current.map((scene, index) =>
        index === historyIndex ? { ...scene, temporalDay: day } : scene,
      ),
    );
  }

  function temporalLabel(day?: TemporalDay) {
    if (day === 'yesterday') return 'ONTEM';
    if (day === 'today') return 'HOJE';
    if (day === 'tomorrow') return 'AMANHÃ';
    return 'SEM MARCAÇÃO';
  }

  function temporalSymbol(day?: TemporalDay) {
    if (day === 'yesterday') return '←';
    if (day === 'tomorrow') return '→';
    return '●';
  }

  function addTemporalEvent() {
    const label = newTemporalEventLabel.trim().toUpperCase();
    if (!label) {
      setFeedback('DIGITE O NOME DO EVENTO');
      return;
    }
    const symbols: Record<TemporalDay, string> = {
      yesterday: '←',
      today: '●',
      tomorrow: '→',
    };
    setTemporalEvents((events) => [...events, {
      id: crypto.randomUUID(),
      label,
      day: newTemporalEventDay,
      symbol: symbols[newTemporalEventDay],
    }]);
    setNewTemporalEventLabel('');
    setFeedback(null);
  }

  function answerTemporalEvent(day: TemporalDay) {
    if (!temporalEventQuestionId) return;
    const event = temporalEvents.find((item) => item.id === temporalEventQuestionId);
    if (!event) return;
    const correct = event.day === day;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `EVENTO ${event.label} - ${temporalLabel(day)}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setTemporalEventQuestionId(null);
  }

  function weekdayLabel(day: Weekday) {
    return ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'][day];
  }

  function getWeekDays() {
    const today = new Date();
    const currentDay = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - currentDay);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        weekday: index as Weekday,
        date,
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }

  function weekTaskQuestion() {
    const today = new Date().getDay() as Weekday;
    if (weekTask.kind === 'today') return 'QUE DIA É HOJE?';
    if (weekTask.kind === 'yesterday') return 'QUAL DIA FOI ONTEM?';
    if (weekTask.kind === 'tomorrow') return 'QUAL DIA SERÁ AMANHÃ?';
    if (weekTask.kind === 'previous') return `QUAL DIA VEM ANTES DE ${weekdayLabel(weekTask.referenceWeekday ?? today)}?`;
    if (weekTask.kind === 'next') return `QUAL DIA VEM DEPOIS DE ${weekdayLabel(weekTask.referenceWeekday ?? today)}?`;
    const event = weeklyEvents.find((item) => item.id === weekTask.eventId);
    return event ? `EM QUE DIA ACONTECE ${event.label}?` : 'ESCOLHA UM EVENTO';
  }

  function expectedWeekdayForTask(): Weekday | null {
    const today = new Date().getDay() as Weekday;
    if (weekTask.kind === 'today') return today;
    if (weekTask.kind === 'yesterday') return ((today + 6) % 7) as Weekday;
    if (weekTask.kind === 'tomorrow') return ((today + 1) % 7) as Weekday;
    if (weekTask.kind === 'previous') return (((weekTask.referenceWeekday ?? today) + 6) % 7) as Weekday;
    if (weekTask.kind === 'next') return (((weekTask.referenceWeekday ?? today) + 1) % 7) as Weekday;
    if (weekTask.kind === 'event') {
      return weeklyEvents.find((item) => item.id === weekTask.eventId)?.weekday ?? null;
    }
    return null;
  }

  function answerWeekTask(day: Weekday) {
    if (!weekTaskActive) return;
    const expected = expectedWeekdayForTask();
    if (expected === null) {
      setFeedback('ATIVIDADE INCOMPLETA');
      return;
    }
    const correct = day === expected;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `SEMANA ${weekdayLabel(day)}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setWeekTaskActive(false);
  }

  function availableNarrativeScenes() {
    return history.slice(1);
  }

  function startNarrativeTask() {
    const scenes = availableNarrativeScenes().slice(0, 3);
    if (scenes.length < 2) {
      setFeedback('CRIE PELO MENOS DUAS CENAS NA HISTÓRIA');
      return;
    }
    const orderedSceneIds = scenes.map((scene) => scene.id);
    setNarrativeTask((current) => ({
      ...current,
      sceneIds: orderedSceneIds,
    }));
    setNarrativeAnswer([]);
    setNarrativeOptionIds(shuffledCopy(orderedSceneIds));
    setNarrativeTaskActive(true);
    setFeedback(null);
  }

  function narrativeQuestion() {
    if (narrativeTask.kind === 'first') return 'O QUE ACONTECEU PRIMEIRO?';
    if (narrativeTask.kind === 'next') {
      const reference = history.find((scene) => scene.id === narrativeTask.sceneIds[0]);
      return `O QUE ACONTECEU DEPOIS DE ${reference?.actionLabel ?? 'ESTA CENA'}?`;
    }
    return 'COLOQUE AS CENAS NA ORDEM';
  }

  function answerNarrativeScene(sceneId: string) {
    if (!narrativeTaskActive) return;
    const orderedIds = narrativeTask.sceneIds;
    if (orderedIds.length < 2) return;

    if (narrativeTask.kind === 'first' || narrativeTask.kind === 'next') {
      const expected = narrativeTask.kind === 'first' ? orderedIds[0] : orderedIds[1];
      const correct = sceneId === expected;
      setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: correct ? 'correct' : 'error',
        label: narrativeTask.kind === 'first' ? 'NARRATIVA PRIMEIRO' : 'NARRATIVA DEPOIS',
        createdAt: new Date().toISOString(),
      }]);
      if (correct) setNarrativeTaskActive(false);
      return;
    }

    if (narrativeAnswer.includes(sceneId)) return;
    const nextAnswer = [...narrativeAnswer, sceneId];
    setNarrativeAnswer(nextAnswer);

    if (nextAnswer.length === orderedIds.length) {
      const correct = nextAnswer.every((id, index) => id === orderedIds[index]);
      setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: correct ? 'correct' : 'error',
        label: 'NARRATIVA ORDEM',
        createdAt: new Date().toISOString(),
      }]);
      if (correct) {
        setNarrativeTaskActive(false);
      } else {
        setNarrativeAnswer([]);
      }
    }
  }

  function startCausalTask() {
    if (!causalTask.problemSceneId || !causalTask.actionSceneId || !causalTask.resultSceneId) {
      setFeedback('DEFINA PROBLEMA, AÇÃO E RESULTADO');
      return;
    }
    const distinctScenes = new Set([
      causalTask.problemSceneId,
      causalTask.actionSceneId,
      causalTask.resultSceneId,
    ]);
    if (distinctScenes.size !== 3) {
      setFeedback('USE TRÊS CENAS DIFERENTES');
      return;
    }
    setCausalAnswer([]);
    setCausalOptionIds(shuffledCopy([
      causalTask.problemSceneId,
      causalTask.actionSceneId,
      causalTask.resultSceneId,
    ]));
    setCausalTaskActive(true);
    setFeedback(null);
  }

  function causalQuestion() {
    const problem = history.find((scene) => scene.id === causalTask.problemSceneId);
    const action = history.find((scene) => scene.id === causalTask.actionSceneId);
    if (causalTask.kind === 'what_after') {
      return `O QUE ACONTECEU DEPOIS DE ${problem?.actionLabel ?? 'ESTA SITUAÇÃO'}?`;
    }
    if (causalTask.kind === 'what_result') {
      return `QUAL FOI O RESULTADO DE ${action?.actionLabel ?? 'ESTA AÇÃO'}?`;
    }
    return 'MONTE: PROBLEMA - AÇÃO - RESULTADO';
  }

  function answerCausalScene(sceneId: string) {
    if (!causalTaskActive) return;

    if (causalTask.kind === 'what_after') {
      const correct = sceneId === causalTask.actionSceneId;
      setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: correct ? 'correct' : 'error',
        label: 'CAUSA E CONSEQUÊNCIA - DEPOIS',
        createdAt: new Date().toISOString(),
      }]);
      if (correct) setCausalTaskActive(false);
      return;
    }

    if (causalTask.kind === 'what_result') {
      const correct = sceneId === causalTask.resultSceneId;
      setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: correct ? 'correct' : 'error',
        label: 'CAUSA E CONSEQUÊNCIA - RESULTADO',
        createdAt: new Date().toISOString(),
      }]);
      if (correct) setCausalTaskActive(false);
      return;
    }

    if (causalAnswer.includes(sceneId)) return;
    const nextAnswer = [...causalAnswer, sceneId];
    setCausalAnswer(nextAnswer);

    if (nextAnswer.length === 3) {
      const expected = [
        causalTask.problemSceneId,
        causalTask.actionSceneId,
        causalTask.resultSceneId,
      ];
      const correct = nextAnswer.every((id, index) => id === expected[index]);
      setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
      setMediationEvents((events) => [...events, {
        id: crypto.randomUUID(),
        type: correct ? 'correct' : 'error',
        label: 'CAUSA E CONSEQUÊNCIA - CADEIA',
        createdAt: new Date().toISOString(),
      }]);
      if (correct) {
        setCausalTaskActive(false);
      } else {
        setCausalAnswer([]);
      }
    }
  }

  function mentalLabel(kind: MentalStateKind, value: MentalStateValue) {
    const map: Record<MentalStateKind, Record<MentalStateValue, string>> = {
      want: { yes: 'QUERO', no: 'NÃO QUERO' },
      know: { yes: 'SEI', no: 'NÃO SEI' },
      understand: { yes: 'ENTENDI', no: 'NÃO ENTENDI' },
      like: { yes: 'GOSTO', no: 'NÃO GOSTO' },
    };
    return map[kind][value];
  }

  function saveMentalState(
    personId: string,
    kind: MentalStateKind,
    value: MentalStateValue,
    targetLabel?: string,
  ) {
    setMentalStates((states) => [
      ...states.filter((state) => !(state.personId === personId && state.kind === kind && state.targetLabel === targetLabel)),
      {
        id: crypto.randomUUID(),
        personId,
        kind,
        value,
        targetLabel: targetLabel?.trim().toUpperCase() || undefined,
      },
    ]);
    setFeedback(mentalLabel(kind, value));
  }

  function startMentalTask() {
    if (!mentalTask.personId || !mentalTask.expectedKind) {
      setFeedback('CONFIGURE PESSOA E CONCEITO');
      return;
    }
    if (mentalTask.kind === 'identify' && !mentalTask.expectedValue) {
      setFeedback('CONFIGURE A RESPOSTA ESPERADA');
      return;
    }
    setMentalTaskActive(true);
    setFeedback(null);
  }

  function answerMentalTask(value: MentalStateValue) {
    if (!mentalTaskActive || !mentalTask.personId || !mentalTask.expectedKind) return;

    if (mentalTask.kind === 'choose_self') {
      saveMentalState(
        mentalTask.personId,
        mentalTask.expectedKind,
        value,
        mentalTask.targetLabel,
      );
      setMentalTaskActive(false);
      return;
    }

    if (!mentalTask.expectedValue) return;
    const correct = value === mentalTask.expectedValue;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `ESTADO DECLARADO - ${mentalLabel(mentalTask.expectedKind!, value)}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setMentalTaskActive(false);
  }

  function getDeclaredMentalState(personId?: string, kind?: MentalStateKind, targetLabel?: string) {
    if (!personId || !kind) return undefined;
    return mentalStates.find((state) =>
      state.personId === personId &&
      state.kind === kind &&
      (state.targetLabel ?? '') === (targetLabel?.trim().toUpperCase() ?? ''),
    );
  }

  function perspectiveQuestion() {
    const selfName = findLabel(currentScene, perspectiveTask.selfPersonId);
    const otherName = findLabel(currentScene, perspectiveTask.otherPersonId);
    const kind = perspectiveTask.stateKind;
    if (!kind) return 'ESCOLHA UM CONCEITO';
    const label = mentalLabel(kind, 'yes').replace('QUERO', 'QUERER').replace('SEI', 'SABER').replace('ENTENDI', 'ENTENDER').replace('GOSTO', 'GOSTAR');
    if (perspectiveTask.kind === 'same_different') {
      return `${selfName} E ${otherName}: ${label} É IGUAL OU DIFERENTE?`;
    }
    return `O QUE ${otherName} DECLAROU SOBRE ${perspectiveTask.targetLabel || 'ISSO'}?`;
  }

  function startPerspectiveTask() {
    if (!perspectiveTask.selfPersonId || !perspectiveTask.otherPersonId || !perspectiveTask.stateKind) {
      setFeedback('ESCOLHA DUAS PESSOAS E UM CONCEITO');
      return;
    }
    const selfState = getDeclaredMentalState(
      perspectiveTask.selfPersonId,
      perspectiveTask.stateKind,
      perspectiveTask.targetLabel,
    );
    const otherState = getDeclaredMentalState(
      perspectiveTask.otherPersonId,
      perspectiveTask.stateKind,
      perspectiveTask.targetLabel,
    );
    if (!selfState || !otherState) {
      setFeedback('FALTAM ESTADOS DECLARADOS DAS DUAS PESSOAS');
      return;
    }
    setPerspectiveTaskActive(true);
    setFeedback(null);
  }

  function answerPerspectiveSameDifferent(answer: 'same' | 'different') {
    if (!perspectiveTaskActive || !perspectiveTask.stateKind) return;
    const selfState = getDeclaredMentalState(
      perspectiveTask.selfPersonId,
      perspectiveTask.stateKind,
      perspectiveTask.targetLabel,
    );
    const otherState = getDeclaredMentalState(
      perspectiveTask.otherPersonId,
      perspectiveTask.stateKind,
      perspectiveTask.targetLabel,
    );
    if (!selfState || !otherState) return;
    const expected = selfState.value === otherState.value ? 'same' : 'different';
    const correct = answer === expected;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `PERSPECTIVA ${answer === 'same' ? 'IGUAL' : 'DIFERENTE'}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setPerspectiveTaskActive(false);
  }

  function answerPerspectiveOther(value: MentalStateValue) {
    if (!perspectiveTaskActive || !perspectiveTask.stateKind) return;
    const otherState = getDeclaredMentalState(
      perspectiveTask.otherPersonId,
      perspectiveTask.stateKind,
      perspectiveTask.targetLabel,
    );
    if (!otherState) return;
    const correct = value === otherState.value;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `PERSPECTIVA OUTRO - ${mentalLabel(perspectiveTask.stateKind!, value)}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setPerspectiveTaskActive(false);
  }

  function setInformationAccessState(personId: string, sceneId: string, state: AccessState) {
    setInformationAccess((items) => [
      ...items.filter((item) => !(item.personId === personId && item.sceneId === sceneId)),
      {
        id: crypto.randomUUID(),
        personId,
        sceneId,
        state,
      },
    ]);
    setFeedback(state === 'saw' ? 'VIU' : 'NÃO VIU');
  }

  function getInformationAccessState(personId?: string, sceneId?: string) {
    if (!personId || !sceneId) return undefined;
    return informationAccess.find((item) => item.personId === personId && item.sceneId === sceneId);
  }

  function startAccessTask() {
    if (!accessTask.sceneId) {
      setFeedback('ESCOLHA UMA CENA');
      return;
    }
    const configured = people.filter((person) => getInformationAccessState(person.instanceId, accessTask.sceneId));
    if (configured.length === 0) {
      setFeedback('CONFIGURE QUEM VIU OU NÃO VIU A CENA');
      return;
    }
    setAccessAnswerPersonIds([]);
    setAccessTaskActive(true);
    setFeedback(null);
  }

  function toggleAccessAnswer(personId: string) {
    if (!accessTaskActive) return;
    setAccessAnswerPersonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }

  function verifyAccessAnswer() {
    if (!accessTaskActive || !accessTask.sceneId) return;
    const expected = people
      .filter((person) => getInformationAccessState(person.instanceId, accessTask.sceneId)?.state === 'saw')
      .map((person) => person.instanceId)
      .sort();
    const answer = [...accessAnswerPersonIds].sort();
    const correct =
      expected.length === answer.length &&
      expected.every((id, index) => id === answer[index]);

    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: accessTask.kind === 'who_saw'
        ? 'ACESSO VISUAL - QUEM VIU'
        : 'ACESSO VISUAL - QUEM TEM ACESSO À INFORMAÇÃO',
      createdAt: new Date().toISOString(),
    }]);

    if (correct) setAccessTaskActive(false);
  }

  function toggleHiddenWitness(personId: string) {
    setHiddenInfoTask((current) => ({
      ...current,
      witnessPersonIds: current.witnessPersonIds.includes(personId)
        ? current.witnessPersonIds.filter((id) => id !== personId)
        : [...current.witnessPersonIds, personId],
    }));
  }

  function startHiddenInfoTask() {
    if (!hiddenInfoTask.sceneId || !hiddenInfoTask.objectId || !hiddenInfoTask.locationId) {
      setFeedback('CONFIGURE CENA, OBJETO E LOCAL');
      return;
    }
    if (hiddenInfoTask.witnessPersonIds.length === 0) {
      setFeedback('MARQUE QUEM VIU A COLOCAÇÃO');
      return;
    }
    setHiddenInfoAnswerPersonIds([]);
    setHiddenInfoTaskActive(true);
    setFeedback(null);
  }

  function toggleHiddenInfoAnswer(personId: string) {
    if (!hiddenInfoTaskActive) return;
    setHiddenInfoAnswerPersonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }

  function verifyHiddenInfoAnswer() {
    if (!hiddenInfoTaskActive) return;
    const expected = [...hiddenInfoTask.witnessPersonIds].sort();
    const answer = [...hiddenInfoAnswerPersonIds].sort();
    const correct =
      expected.length === answer.length &&
      expected.every((id, index) => id === answer[index]);

    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: 'INFORMAÇÃO OCULTA - BASE PARA SABER',
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setHiddenInfoTaskActive(false);
  }

  function toggleInitialWitness(personId: string) {
    setRelocationTask((current) => ({
      ...current,
      initialWitnessPersonIds: current.initialWitnessPersonIds.includes(personId)
        ? current.initialWitnessPersonIds.filter((id) => id !== personId)
        : [...current.initialWitnessPersonIds, personId],
    }));
  }

  function toggleSawMove(personId: string) {
    setRelocationTask((current) => ({
      ...current,
      sawMovePersonIds: current.sawMovePersonIds.includes(personId)
        ? current.sawMovePersonIds.filter((id) => id !== personId)
        : [...current.sawMovePersonIds, personId],
    }));
  }

  function startRelocationTask() {
    if (!relocationTask.objectId || !relocationTask.initialLocationId || !relocationTask.currentLocationId || !relocationTask.referencePersonId) {
      setFeedback('CONFIGURE OBJETO, LOCAIS E PESSOA');
      return;
    }
    if (relocationTask.initialLocationId === relocationTask.currentLocationId) {
      setFeedback('O LOCAL INICIAL E O ATUAL PRECISAM SER DIFERENTES');
      return;
    }
    setRelocationTaskActive(true);
    setFeedback(null);
  }

  function expectedSearchLocationForPerson(personId: string): string | null {
    if (relocationTask.sawMovePersonIds.includes(personId)) {
      return relocationTask.currentLocationId ?? null;
    }
    if (relocationTask.initialWitnessPersonIds.includes(personId)) {
      return relocationTask.initialLocationId ?? null;
    }
    return null;
  }

  function answerRelocationTask(locationId: string | null) {
    if (!relocationTaskActive || !relocationTask.referencePersonId) return;
    const expected = expectedSearchLocationForPerson(relocationTask.referencePersonId);
    const correct = locationId === expected;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: 'MUDANÇA DE LOCAL - ONDE TEM BASE PARA PROCURAR',
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setRelocationTaskActive(false);
  }

  function startRelocationSequence() {
    if (!relocationTask.objectId || !relocationTask.initialLocationId || !relocationTask.currentLocationId || !relocationTask.referencePersonId) {
      setFeedback('CONFIGURE OBJETO, LOCAIS E PESSOA');
      return;
    }
    if (relocationTask.initialLocationId === relocationTask.currentLocationId) {
      setFeedback('O LOCAL INICIAL E O ATUAL PRECISAM SER DIFERENTES');
      return;
    }
    setRelocationSequence({
      step: 'current_location',
      completedSteps: [],
    });
    setSequenceWitnessAnswer([]);
    setRelocationSequenceActive(true);
    setFeedback(null);
  }

  function registerRelocationSequenceResult(label: string, correct: boolean) {
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label,
      createdAt: new Date().toISOString(),
    }]);
  }

  function answerSequenceCurrentLocation(locationId: string) {
    if (!relocationSequenceActive || relocationSequence.step !== 'current_location') return;
    const correct = locationId === relocationTask.currentLocationId;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    registerRelocationSequenceResult('SEQUÊNCIA PERSPECTIVA - LOCAL ATUAL', correct);
    if (correct) {
      setRelocationSequence({
        step: 'who_saw',
        completedSteps: ['current_location'],
      });
    }
  }

  function toggleSequenceWitness(personId: string) {
    if (!relocationSequenceActive || relocationSequence.step !== 'who_saw') return;
    setSequenceWitnessAnswer((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }

  function verifySequenceWitnesses() {
    if (!relocationSequenceActive || relocationSequence.step !== 'who_saw') return;
    const expected = [...relocationTask.sawMovePersonIds].sort();
    const answer = [...sequenceWitnessAnswer].sort();
    const correct =
      expected.length === answer.length &&
      expected.every((id, index) => id === answer[index]);

    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    registerRelocationSequenceResult('SEQUÊNCIA PERSPECTIVA - QUEM VIU', correct);

    if (correct) {
      setRelocationSequence({
        step: 'person_search',
        completedSteps: ['current_location', 'who_saw'],
      });
    }
  }

  function answerSequenceSearchLocation(locationId: string | null) {
    if (!relocationSequenceActive || relocationSequence.step !== 'person_search' || !relocationTask.referencePersonId) return;
    const expected = expectedSearchLocationForPerson(relocationTask.referencePersonId);
    const correct = locationId === expected;
    setFeedback(correct ? '✓ CORRETO - SEQUÊNCIA CONCLUÍDA' : '❌ ERRADO');
    registerRelocationSequenceResult('SEQUÊNCIA PERSPECTIVA - LOCAL DE PROCURA', correct);

    if (correct) {
      setRelocationSequence({
        step: 'person_search',
        completedSteps: ['current_location', 'who_saw', 'person_search'],
      });
      setRelocationSequenceActive(false);
    }
  }

  function addWeeklyEvent() {
    const label = newWeeklyEventLabel.trim().toUpperCase();
    if (!label) {
      setFeedback('DIGITE O NOME DO EVENTO SEMANAL');
      return;
    }
    const matchingDate = getWeekDays().find((item) => item.weekday === newWeeklyEventDay)?.date;
    setWeeklyEvents((events) => [...events, {
      id: crypto.randomUUID(),
      label,
      weekday: newWeeklyEventDay,
      recurring: newWeeklyEventRecurring,
      date: newWeeklyEventRecurring || !matchingDate ? undefined : matchingDate.toISOString().slice(0, 10),
    }]);
    setNewWeeklyEventLabel('');
    setFeedback(null);
  }

  function getCalendarDate(day: TemporalDay) {
    const date = new Date();
    if (day === 'yesterday') date.setDate(date.getDate() - 1);
    if (day === 'tomorrow') date.setDate(date.getDate() + 1);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date).toUpperCase();
  }

  function validateTemporalTask(day: TemporalDay) {
    if (!temporalTaskActive) return;
    const correct = day === expectedTemporalDay;
    setFeedback(correct ? '✓ CORRETO' : '❌ ERRADO');
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: correct ? 'correct' : 'error',
      label: `TEMPO ${temporalLabel(day)}`,
      createdAt: new Date().toISOString(),
    }]);
    if (correct) setTemporalTaskActive(false);
  }

  function addToScene(asset: SceneAsset) {
    if (historyIndex !== history.length - 1) {
      setFeedback('VOLTE PARA A CENA MAIS ATUAL PARA EDITAR');
      return;
    }
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
    if (historyIndex !== history.length - 1) {
      setFeedback('VOLTE PARA A CENA MAIS ATUAL PARA CRIAR UMA NOVA AÇÃO');
      return;
    }

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
      setFeedback(`❌ ERRADO - ${result.error}`);
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
    setDraft({ verbId: '' });
    setSelectedEntityId(null);
    setDraggingEntityId(null);
    setCompareMode('now');
    setFeedback(null);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex((index) => index + 1);
    setDraft({ verbId: '' });
    setSelectedEntityId(null);
    setDraggingEntityId(null);
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
    setTemporalTaskActive(false);
    setTemporalEventQuestionId(null);
    setWeekTaskActive(false);
    setNarrativeTaskActive(false);
    setNarrativeAnswer([]);
    setNarrativeOptionIds([]);
    setCausalTaskActive(false);
    setCausalAnswer([]);
    setCausalOptionIds([]);
    setMentalTaskActive(false);
    setPerspectiveTaskActive(false);
    setAccessTaskActive(false);
    setHiddenInfoTaskActive(false);
    setRelocationTaskActive(false);
    setRelocationSequenceActive(false);
    setRelocationSequence({ step: 'current_location', completedSteps: [] });
    setRelocationTask((current) => ({
      ...current,
      initialWitnessPersonIds: current.initialWitnessPersonIds ?? [],
      sawMovePersonIds: current.sawMovePersonIds ?? [],
    }));
    setSequenceWitnessAnswer([]);
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
    <main className={`app-shell module-${activeModule}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJETO EU, NÓS E O OUTRO</p>
          <div className="brand-lockup">
            <h1>NEXO</h1>
            <span className="brand-mark" aria-hidden="true">↔</span>
          </div>
          <p className="subtitle">Ação, tempo, relações e narrativa visual</p>
        </div>
        <button className="teacher-button" type="button" onClick={() => setTeacherOpen((open) => !open)}>
          {teacherOpen ? 'FECHAR PROFESSORA' : 'MODO PROFESSORA'}
        </button>
      </header>

      <nav className="module-nav no-print" aria-label="Módulos do NEXO">
        {[
          ['scenario', 'CENÁRIO'],
          ['time', 'TEMPO'],
          ['narrative', 'NARRATIVA'],
          ['perspective', 'PERSPECTIVA'],
          ['report', 'RELATÓRIO'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={activeModule === id ? 'active' : ''}
            onClick={() => {
              setActiveModule(id as typeof activeModule);
              setReportOpen(id === 'report');
            }}
          >
            {label}
          </button>
        ))}
      </nav>

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

          <div className="session-panel">
            <label>
              <span>PARTICIPANTE</span>
              <input
                value={sessionMetadata.participant}
                onChange={(event) => setSessionMetadata((current) => ({
                  ...current,
                  participant: event.target.value.toUpperCase(),
                }))}
                placeholder="NOME"
              />
            </label>

            <label>
              <span>DATA</span>
              <input
                type="date"
                value={sessionMetadata.date}
                onChange={(event) => setSessionMetadata((current) => ({
                  ...current,
                  date: event.target.value,
                }))}
              />
            </label>

            <label className="session-wide">
              <span>OBJETIVO</span>
              <input
                value={sessionMetadata.objective}
                onChange={(event) => setSessionMetadata((current) => ({
                  ...current,
                  objective: event.target.value.toUpperCase(),
                }))}
                placeholder="OBJETIVO DA SESSÃO"
              />
            </label>

            <label className="session-wide">
              <span>OBSERVAÇÕES</span>
              <textarea
                value={sessionMetadata.notes}
                onChange={(event) => setSessionMetadata((current) => ({
                  ...current,
                  notes: event.target.value,
                }))}
                placeholder="REGISTRO LIVRE DA PROFESSORA"
              />
            </label>

            <div className="session-summary">
              <span>CENAS {Math.max(0, history.length - 1)}</span>
              <span>EVENTOS {mediationEvents.length}</span>
              <span>MEDIAÇÕES {mediationAssessments.length}</span>
              <span>ESTADOS DECLARADOS {mentalStates.length}</span>
            </div>

            <div className="session-export">
              <button type="button" onClick={exportSessionJson}>EXPORTAR JSON</button>
              <button type="button" onClick={exportSessionCsv}>EXPORTAR CSV</button>
              <button type="button" onClick={() => importInputRef.current?.click()}>IMPORTAR JSON</button>
              <button type="button" onClick={() => {
                setActiveModule('report');
                setReportOpen(true);
              }}>VER RELATÓRIO</button>
              <button type="button" onClick={printSessionReport}>IMPRIMIR / PDF</button>
              <input
                ref={importInputRef}
                className="session-import-input"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importSessionJson(file);
                }}
              />
            </div>
          </div>

          <div className="teacher-support">
            <label>
              <span>DIFICULDADE</span>
              <select
                value={supportConfig.difficulty}
                onChange={(event) => setSupportConfig((current) => ({
                  ...current,
                  difficulty: Number(event.target.value) as ActivitySupportConfig['difficulty'],
                }))}
              >
                <option value={1}>NÍVEL 1</option>
                <option value={2}>NÍVEL 2</option>
                <option value={3}>NÍVEL 3</option>
              </select>
            </label>

            <label>
              <span>OPÇÕES</span>
              <select
                value={supportConfig.optionCount}
                onChange={(event) => setSupportConfig((current) => ({
                  ...current,
                  optionCount: Number(event.target.value) as ActivitySupportConfig['optionCount'],
                }))}
              >
                <option value={2}>2 OPÇÕES</option>
                <option value={3}>3 OPÇÕES</option>
                <option value={4}>4 OPÇÕES</option>
              </select>
            </label>

            <label className="teacher-check">
              <input
                type="checkbox"
                checked={supportConfig.useDistractors}
                onChange={(event) => setSupportConfig((current) => ({
                  ...current,
                  useDistractors: event.target.checked,
                }))}
              />
              <span>USAR DISTRATORES</span>
            </label>
          </div>

          <div className="teacher-stats">
            <span>CORRETAS {mediationEvents.filter((event) => event.type === 'correct').length}</span>
            <span>ERROS {mediationEvents.filter((event) => event.type === 'error').length}</span>
            <span>NÃO SEI {mediationEvents.filter((event) => event.type === 'unknown').length}</span>
            <span>NÃO ENTENDI {mediationEvents.filter((event) => event.type === 'not_understood').length}</span>
          </div>

          <div className="mediation-scale">
            <span>REGISTRAR MEDIAÇÃO 0 - 3</span>
            <div>
              {([0, 1, 2, 3] as MediationLevel[]).map((level) => (
                <button type="button" key={level} onClick={() => registerMediationAssessment(level)}>
                  <strong>{level}</strong>
                  <small>{mediationLevelLabel(level)}</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {reportOpen && (
        <section className="session-report-view">
          <header className="report-header">
            <div>
              <p>PROJETO EU, NÓS E O OUTRO</p>
              <h2>RELATÓRIO DE SESSÃO - NEXO</h2>
            </div>
            <div className="report-actions no-print">
              <button type="button" onClick={() => {
                setReportOpen(false);
                setActiveModule('scenario');
              }}>FECHAR</button>
              <button type="button" onClick={() => window.print()}>IMPRIMIR / PDF</button>
            </div>
          </header>

          <section className="report-identification">
            <div><span>PARTICIPANTE</span><strong>{sessionMetadata.participant || 'NÃO INFORMADO'}</strong></div>
            <div><span>DATA</span><strong>{sessionMetadata.date || 'NÃO INFORMADA'}</strong></div>
            <div className="wide"><span>OBJETIVO</span><strong>{sessionMetadata.objective || 'NÃO INFORMADO'}</strong></div>
          </section>

          <section className="report-kpis">
            <div><strong>{Math.max(0, history.length - 1)}</strong><span>CENAS</span></div>
            <div><strong>{mediationEvents.length}</strong><span>EVENTOS</span></div>
            <div><strong>{mediationAssessments.length}</strong><span>REGISTROS 0 - 3</span></div>
            <div><strong>{mentalStates.length}</strong><span>ESTADOS DECLARADOS</span></div>
          </section>

          <section className="report-section">
            <h3>RESPOSTAS REGISTRADAS</h3>
            <div className="report-response-grid">
              <div><strong>{mediationCounts().correct}</strong><span>CORRETAS</span></div>
              <div><strong>{mediationCounts().error}</strong><span>ERROS</span></div>
              <div><strong>{mediationCounts().unknown}</strong><span>NÃO SEI</span></div>
              <div><strong>{mediationCounts().notUnderstood}</strong><span>NÃO ENTENDI</span></div>
            </div>
          </section>

          <section className="report-section">
            <h3>ESCALA DE MEDIAÇÃO 0 - 3</h3>
            <div className="report-mediation-grid">
              {assessmentCounts().map(({ level, count }) => (
                <div key={level}>
                  <strong>{level}</strong>
                  <span>{mediationLevelLabel(level)}</span>
                  <em>{count} REGISTRO(S)</em>
                </div>
              ))}
            </div>
          </section>

          <section className="report-section">
            <h3>ATIVIDADES / EVENTOS DA SESSÃO</h3>
            <div className="report-event-list">
              {mediationEvents.length === 0 ? (
                <p>SEM EVENTOS REGISTRADOS.</p>
              ) : (
                mediationEvents.map((event, index) => {
                  const assessment = [...mediationAssessments].reverse().find((item) => item.sourceEventId === event.id);
                  return (
                    <article key={event.id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{event.label}</strong>
                        <small>
                          {event.type.toUpperCase()}
                          {assessment ? ` • MEDIAÇÃO ${assessment.level} • DIFICULDADE ${assessment.difficulty} • ${assessment.optionCount} OPÇÕES` : ''}
                        </small>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="report-section">
            <h3>CENAS TRABALHADAS</h3>
            <div className="report-scenes">
              {history.slice(1).map((scene, index) => (
                <article key={scene.id}>
                  <header>
                    <strong>CENA {index + 1}</strong>
                    <span>{scene.actionLabel ?? 'SEM AÇÃO NOMEADA'}</span>
                    <small>{temporalLabel(scene.temporalDay)}</small>
                  </header>
                  <div>
                    {scene.entities
                      .filter((entity) => !entity.consumed)
                      .slice(0, 8)
                      .map((entity) => (
                        <div key={entity.instanceId}>
                          <AssetVisual asset={entity} size={42} />
                          <span>{entity.label}</span>
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="report-section">
            <h3>ESTADOS DECLARADOS</h3>
            <div className="report-tags">
              {mentalStates.length === 0 ? (
                <span>SEM ESTADOS DECLARADOS.</span>
              ) : (
                mentalStates.map((state) => (
                  <span key={state.id}>
                    {findLabel(currentScene, state.personId)} - {mentalLabel(state.kind, state.value)}
                    {state.targetLabel ? ` - ${state.targetLabel}` : ''}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="report-section">
            <h3>OBSERVAÇÕES DA PROFESSORA</h3>
            <p className="report-notes">{sessionMetadata.notes || 'SEM OBSERVAÇÕES REGISTRADAS.'}</p>
          </section>

          <footer className="report-footer">
            <p>
              RELATÓRIO DESCRITIVO DE SESSÃO. OS DADOS REPRESENTAM RESPOSTAS E MEDIAÇÕES REGISTRADAS NO NEXO E NÃO CONSTITUEM DIAGNÓSTICO.
            </p>
          </footer>
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
                  <span aria-hidden="true">＋</span>
                  <strong>COMECE A CENA</strong>
                  <p>ESCOLHA UMA PESSOA, UM OBJETO OU UM LUGAR</p>
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

          <section className="relocation-builder">
            <div className="builder-title">
              <p className="section-kicker">MUDANÇA DE LOCAL</p>
              <strong>INFORMAÇÃO DIFERENTE ENTRE PESSOAS</strong>
            </div>

            <div className="relocation-config">
              <label>
                <span>OBJETO</span>
                <select
                  value={relocationTask.objectId ?? ''}
                  onChange={(event) => setRelocationTask((current) => ({
                    ...current,
                    objectId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {objects.filter((object) => !object.consumed).map((object) => (
                    <option key={object.instanceId} value={object.instanceId}>{object.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>LOCAL INICIAL</span>
                <select
                  value={relocationTask.initialLocationId ?? ''}
                  onChange={(event) => setRelocationTask((current) => ({
                    ...current,
                    initialLocationId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {placesAndSeats.map((place) => (
                    <option key={place.instanceId} value={place.instanceId}>{place.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>LOCAL ATUAL</span>
                <select
                  value={relocationTask.currentLocationId ?? ''}
                  onChange={(event) => setRelocationTask((current) => ({
                    ...current,
                    currentLocationId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {placesAndSeats.map((place) => (
                    <option key={place.instanceId} value={place.instanceId}>{place.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>PESSOA DA PERGUNTA</span>
                <select
                  value={relocationTask.referencePersonId ?? ''}
                  onChange={(event) => setRelocationTask((current) => ({
                    ...current,
                    referencePersonId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {people.map((person) => (
                    <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="relocation-witnesses">
              <span>QUEM VIU A COLOCAÇÃO INICIAL?</span>
              <div>
                {people.map((person) => {
                  const selected = relocationTask.initialWitnessPersonIds.includes(person.instanceId);
                  return (
                    <button
                      type="button"
                      key={person.instanceId}
                      className={selected ? 'active' : ''}
                      onClick={() => toggleInitialWitness(person.instanceId)}
                    >
                      <AssetVisual asset={person} size={44} />
                      <strong>{person.label}</strong>
                      <small>{selected ? 'VIU O LOCAL INICIAL' : 'NÃO VIU O LOCAL INICIAL'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relocation-witnesses">
              <span>QUEM VIU O OBJETO MUDAR DE LOCAL?</span>
              <div>
                {people.map((person) => {
                  const selected = relocationTask.sawMovePersonIds.includes(person.instanceId);
                  return (
                    <button
                      type="button"
                      key={person.instanceId}
                      className={selected ? 'active' : ''}
                      onClick={() => toggleSawMove(person.instanceId)}
                    >
                      <AssetVisual asset={person} size={44} />
                      <strong>{person.label}</strong>
                      <small>{selected ? 'VIU A MUDANÇA' : 'NÃO VIU A MUDANÇA'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relocation-start-row">
              <button className="relocation-start" type="button" onClick={startRelocationTask}>
                {relocationTaskActive ? 'PERGUNTA ISOLADA ATIVA' : 'INICIAR PERGUNTA ISOLADA'}
              </button>
              <button className="relocation-start sequence" type="button" onClick={startRelocationSequence}>
                {relocationSequenceActive ? 'SEQUÊNCIA ATIVA' : 'INICIAR SEQUÊNCIA 3 ETAPAS'}
              </button>
            </div>

            {relocationTaskActive && relocationTask.referencePersonId && (
              <div className="relocation-question">
                <strong>
                  ONDE {findLabel(currentScene, relocationTask.referencePersonId)} TEM BASE PARA PROCURAR {findLabel(currentScene, relocationTask.objectId)}?
                </strong>
                <div>
                  {[relocationTask.initialLocationId, relocationTask.currentLocationId]
                    .filter((id): id is string => Boolean(id))
                    .map((locationId) => (
                      <button type="button" key={locationId} onClick={() => answerRelocationTask(locationId)}>
                        <span>{findLabel(currentScene, locationId)}</span>
                      </button>
                    ))}
                  <button type="button" onClick={() => answerRelocationTask(null)}>
                    <span>SEM INFORMAÇÃO</span>
                  </button>
                </div>
              </div>
            )}

            {(relocationSequenceActive || relocationSequence.completedSteps.length > 0) && (
              <div className="relocation-sequence">
                <div className="sequence-progress">
                  {[
                    ['current_location', '1. ONDE ESTÁ AGORA?'],
                    ['who_saw', '2. QUEM VIU?'],
                    ['person_search', '3. ONDE VAI PROCURAR?'],
                  ].map(([step, label]) => (
                    <div
                      key={step}
                      className={[
                        'sequence-step',
                        relocationSequence.step === step && relocationSequenceActive ? 'active' : '',
                        relocationSequence.completedSteps.includes(step as RelocationSequenceState['step']) ? 'done' : '',
                      ].join(' ')}
                    >
                      <strong>{label}</strong>
                    </div>
                  ))}
                </div>

                {relocationSequenceActive && relocationSequence.step === 'current_location' && (
                  <div className="sequence-question">
                    <strong>
                      ONDE ESTÁ {findLabel(currentScene, relocationTask.objectId)} AGORA?
                    </strong>
                    <div className="sequence-location-options">
                      {[relocationTask.initialLocationId, relocationTask.currentLocationId]
                        .filter((id): id is string => Boolean(id))
                        .map((locationId) => (
                          <button type="button" key={locationId} onClick={() => answerSequenceCurrentLocation(locationId)}>
                            {findLabel(currentScene, locationId)}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {relocationSequenceActive && relocationSequence.step === 'who_saw' && (
                  <div className="sequence-question">
                    <strong>QUEM VIU O OBJETO MUDAR DE LOCAL?</strong>
                    <div className="sequence-witness-options">
                      {people.map((person) => {
                        const selected = sequenceWitnessAnswer.includes(person.instanceId);
                        return (
                          <button
                            type="button"
                            key={person.instanceId}
                            className={selected ? 'active' : ''}
                            onClick={() => toggleSequenceWitness(person.instanceId)}
                          >
                            <AssetVisual asset={person} size={42} />
                            <span>{person.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button className="sequence-check" type="button" onClick={verifySequenceWitnesses}>
                      CONFERIR
                    </button>
                  </div>
                )}

                {relocationSequenceActive && relocationSequence.step === 'person_search' && relocationTask.referencePersonId && (
                  <div className="sequence-question">
                    <strong>
                      ONDE {findLabel(currentScene, relocationTask.referencePersonId)} TEM BASE PARA PROCURAR {findLabel(currentScene, relocationTask.objectId)}?
                    </strong>
                    <div className="sequence-location-options">
                      {[relocationTask.initialLocationId, relocationTask.currentLocationId]
                        .filter((id): id is string => Boolean(id))
                        .map((locationId) => (
                          <button type="button" key={locationId} onClick={() => answerSequenceSearchLocation(locationId)}>
                            {findLabel(currentScene, locationId)}
                          </button>
                        ))}
                      <button type="button" onClick={() => answerSequenceSearchLocation(null)}>
                        SEM INFORMAÇÃO
                      </button>
                    </div>
                  </div>
                )}

                {!relocationSequenceActive && relocationSequence.completedSteps.includes('person_search') && (
                  <div className="sequence-complete">
                    <strong>SEQUÊNCIA CONCLUÍDA</strong>
                    <span>LOCAL ATUAL → ACESSO À MUDANÇA → LOCAL DE PROCURA</span>
                  </div>
                )}
              </div>
            )}

            <div className="relocation-summary">
              <span>ANTES: {findLabel(currentScene, relocationTask.initialLocationId)}</span>
              <span>AGORA: {findLabel(currentScene, relocationTask.currentLocationId)}</span>
              <span>
                VIU O INÍCIO: {relocationTask.initialWitnessPersonIds.length
                  ? relocationTask.initialWitnessPersonIds.map((id) => findLabel(currentScene, id)).join(', ')
                  : 'NINGUÉM MARCADO'}
              </span>
              <span>
                VIU A MUDANÇA: {relocationTask.sawMovePersonIds.length
                  ? relocationTask.sawMovePersonIds.map((id) => findLabel(currentScene, id)).join(', ')
                  : 'NINGUÉM MARCADO'}
              </span>
            </div>

            <p className="access-note">
              A RESPOSTA USA APENAS O HISTÓRICO DE ACESSO CONFIGURADO: QUEM VIU A MUDANÇA TEM O LOCAL ATUAL; QUEM VIU APENAS O INÍCIO TEM O LOCAL INICIAL; QUEM NÃO VIU NENHUM DOS DOIS FICA SEM INFORMAÇÃO.
            </p>
          </section>

          <section className="hidden-info-builder">
            <div className="builder-title">
              <p className="section-kicker">INFORMAÇÃO PRIVADA</p>
              <strong>QUEM VIU ONDE O OBJETO FOI COLOCADO?</strong>
            </div>

            <div className="hidden-info-config">
              <label>
                <span>CENA</span>
                <select
                  value={hiddenInfoTask.sceneId ?? ''}
                  onChange={(event) => setHiddenInfoTask((current) => ({
                    ...current,
                    sceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>OBJETO</span>
                <select
                  value={hiddenInfoTask.objectId ?? ''}
                  onChange={(event) => setHiddenInfoTask((current) => ({
                    ...current,
                    objectId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {objects.filter((object) => !object.consumed).map((object) => (
                    <option key={object.instanceId} value={object.instanceId}>{object.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>LOCAL</span>
                <select
                  value={hiddenInfoTask.locationId ?? ''}
                  onChange={(event) => setHiddenInfoTask((current) => ({
                    ...current,
                    locationId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {placesAndSeats.map((place) => (
                    <option key={place.instanceId} value={place.instanceId}>{place.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hidden-witnesses">
              <span>QUEM VIU A COLOCAÇÃO?</span>
              <div>
                {people.map((person) => {
                  const selected = hiddenInfoTask.witnessPersonIds.includes(person.instanceId);
                  return (
                    <button
                      type="button"
                      key={person.instanceId}
                      className={selected ? 'active' : ''}
                      onClick={() => toggleHiddenWitness(person.instanceId)}
                    >
                      <AssetVisual asset={person} size={44} />
                      <strong>{person.label}</strong>
                      <small>{selected ? 'VIU' : 'NÃO MARCADO'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="hidden-info-start" type="button" onClick={startHiddenInfoTask}>
              {hiddenInfoTaskActive ? 'ATIVIDADE ATIVA' : 'INICIAR ATIVIDADE'}
            </button>

            {hiddenInfoTaskActive && (
              <div className="hidden-info-question">
                <strong>
                  QUEM TEM BASE PARA SABER ONDE ESTÁ {findLabel(currentScene, hiddenInfoTask.objectId)}?
                </strong>
                <div>
                  {people.map((person) => (
                    <button
                      type="button"
                      key={person.instanceId}
                      className={hiddenInfoAnswerPersonIds.includes(person.instanceId) ? 'active' : ''}
                      onClick={() => toggleHiddenInfoAnswer(person.instanceId)}
                    >
                      <AssetVisual asset={person} size={46} />
                      <span>{person.label}</span>
                    </button>
                  ))}
                </div>
                <button className="sequence-check" type="button" onClick={verifyHiddenInfoAnswer}>
                  CONFERIR
                </button>
              </div>
            )}

            <div className="hidden-info-summary">
              <span>OBJETO: {findLabel(currentScene, hiddenInfoTask.objectId)}</span>
              <span>LOCAL: {findLabel(currentScene, hiddenInfoTask.locationId)}</span>
              <span>
                VIRAM: {hiddenInfoTask.witnessPersonIds.length
                  ? hiddenInfoTask.witnessPersonIds.map((id) => findLabel(currentScene, id)).join(', ')
                  : 'NINGUÉM MARCADO'}
              </span>
            </div>

            <p className="access-note">
              A RESPOSTA CORRETA É BASEADA EM QUEM TEVE ACESSO À COLOCAÇÃO. O SISTEMA NÃO AFIRMA CONHECIMENTO INTERNO ALÉM DISSO.
            </p>
          </section>

          <section className="access-builder">
            <div className="builder-title">
              <p className="section-kicker">VIU / NÃO VIU</p>
              <strong>ACESSO À INFORMAÇÃO</strong>
            </div>

            <div className="access-config">
              <label>
                <span>CENA</span>
                <select
                  value={accessTask.sceneId ?? ''}
                  onChange={(event) => setAccessTask((current) => ({
                    ...current,
                    sceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>ATIVIDADE</span>
                <select
                  value={accessTask.kind}
                  onChange={(event) => setAccessTask((current) => ({
                    ...current,
                    kind: event.target.value as AccessTask['kind'],
                  }))}
                >
                  <option value="who_saw">QUEM VIU?</option>
                  <option value="who_knows">QUEM TEM ACESSO À INFORMAÇÃO?</option>
                </select>
              </label>
            </div>

            {accessTask.sceneId && (
              <div className="access-people">
                {people.map((person) => {
                  const access = getInformationAccessState(person.instanceId, accessTask.sceneId);
                  return (
                    <div className="access-person" key={person.instanceId}>
                      <AssetVisual asset={person} size={52} />
                      <strong>{person.label}</strong>
                      <div>
                        <button
                          type="button"
                          className={access?.state === 'saw' ? 'active' : ''}
                          onClick={() => setInformationAccessState(person.instanceId, accessTask.sceneId!, 'saw')}
                        >
                          VIU
                        </button>
                        <button
                          type="button"
                          className={access?.state === 'did_not_see' ? 'active' : ''}
                          onClick={() => setInformationAccessState(person.instanceId, accessTask.sceneId!, 'did_not_see')}
                        >
                          NÃO VIU
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="access-start" type="button" onClick={startAccessTask}>
              {accessTaskActive ? 'ATIVIDADE ATIVA' : 'INICIAR ATIVIDADE'}
            </button>

            {accessTaskActive && accessTask.sceneId && (
              <div className="access-question">
                <strong>{accessTask.kind === 'who_saw' ? 'QUEM VIU A CENA?' : 'QUEM TEM ACESSO À INFORMAÇÃO DA CENA?'}</strong>
                <div className="access-answer-options">
                  {people.map((person) => (
                    <button
                      type="button"
                      key={person.instanceId}
                      className={accessAnswerPersonIds.includes(person.instanceId) ? 'active' : ''}
                      onClick={() => toggleAccessAnswer(person.instanceId)}
                    >
                      <AssetVisual asset={person} size={46} />
                      <span>{person.label}</span>
                    </button>
                  ))}
                </div>
                <button className="sequence-check" type="button" onClick={verifyAccessAnswer}>
                  CONFERIR
                </button>
              </div>
            )}

            {accessTask.sceneId && (
              <div className="access-summary">
                {people.map((person) => {
                  const access = getInformationAccessState(person.instanceId, accessTask.sceneId);
                  return (
                    <span key={person.instanceId}>
                      {person.label}: {access ? (access.state === 'saw' ? 'VIU' : 'NÃO VIU') : 'SEM DADO'}
                    </span>
                  );
                })}
              </div>
            )}

            <p className="access-note">
              O NEXO REGISTRA ACESSO VISUAL À INFORMAÇÃO. ISSO NÃO É O MESMO QUE PROVAR CONHECIMENTO INTERNO.
            </p>
          </section>

          <section className="perspective-builder">
            <div className="builder-title">
              <p className="section-kicker">EU × OUTRO</p>
              <strong>PERSPECTIVA E DISTINÇÃO ENTRE PESSOAS</strong>
            </div>

            <div className="perspective-config">
              <label>
                <span>EU</span>
                <select
                  value={perspectiveTask.selfPersonId ?? ''}
                  onChange={(event) => setPerspectiveTask((current) => ({
                    ...current,
                    selfPersonId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {people.map((person) => (
                    <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>OUTRO</span>
                <select
                  value={perspectiveTask.otherPersonId ?? ''}
                  onChange={(event) => setPerspectiveTask((current) => ({
                    ...current,
                    otherPersonId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {people
                    .filter((person) => person.instanceId !== perspectiveTask.selfPersonId)
                    .map((person) => (
                      <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                    ))}
                </select>
              </label>

              <label>
                <span>CONCEITO</span>
                <select
                  value={perspectiveTask.stateKind ?? ''}
                  onChange={(event) => setPerspectiveTask((current) => ({
                    ...current,
                    stateKind: (event.target.value || undefined) as MentalStateKind | undefined,
                  }))}
                >
                  <option value="">?</option>
                  <option value="want">QUERER</option>
                  <option value="know">SABER</option>
                  <option value="understand">ENTENDER</option>
                  <option value="like">GOSTAR</option>
                </select>
              </label>

              <label>
                <span>SOBRE</span>
                <input
                  value={perspectiveTask.targetLabel ?? ''}
                  onChange={(event) => setPerspectiveTask((current) => ({
                    ...current,
                    targetLabel: event.target.value.toUpperCase(),
                  }))}
                  placeholder="EX.: CROCHÊ"
                />
              </label>

              <label>
                <span>ATIVIDADE</span>
                <select
                  value={perspectiveTask.kind}
                  onChange={(event) => setPerspectiveTask((current) => ({
                    ...current,
                    kind: event.target.value as PerspectiveTask['kind'],
                  }))}
                >
                  <option value="same_different">IGUAL OU DIFERENTE?</option>
                  <option value="other_state">O QUE O OUTRO DECLAROU?</option>
                </select>
              </label>
            </div>

            <button className="perspective-start" type="button" onClick={startPerspectiveTask}>
              {perspectiveTaskActive ? 'ATIVIDADE ATIVA' : 'INICIAR ATIVIDADE'}
            </button>

            {perspectiveTaskActive && (
              <div className="perspective-question">
                <strong>{perspectiveQuestion()}</strong>
                {perspectiveTask.kind === 'same_different' ? (
                  <div className="perspective-answers">
                    <button type="button" onClick={() => answerPerspectiveSameDifferent('same')}>IGUAL</button>
                    <button type="button" onClick={() => answerPerspectiveSameDifferent('different')}>DIFERENTE</button>
                  </div>
                ) : (
                  <div className="perspective-answers">
                    <button type="button" onClick={() => answerPerspectiveOther('yes')}>
                      {perspectiveTask.stateKind ? mentalLabel(perspectiveTask.stateKind, 'yes') : 'SIM'}
                    </button>
                    <button type="button" onClick={() => answerPerspectiveOther('no')}>
                      {perspectiveTask.stateKind ? mentalLabel(perspectiveTask.stateKind, 'no') : 'NÃO'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {perspectiveTask.selfPersonId && perspectiveTask.otherPersonId && perspectiveTask.stateKind && (
              <div className="perspective-declarations">
                {[perspectiveTask.selfPersonId, perspectiveTask.otherPersonId].map((personId) => {
                  const state = getDeclaredMentalState(
                    personId,
                    perspectiveTask.stateKind,
                    perspectiveTask.targetLabel,
                  );
                  return (
                    <div key={personId}>
                      <strong>{findLabel(currentScene, personId)}</strong>
                      <span>
                        {state
                          ? `${mentalLabel(state.kind, state.value)}${state.targetLabel ? ` - ${state.targetLabel}` : ''}`
                          : 'SEM DECLARAÇÃO'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mental-state-builder">
            <div className="builder-title">
              <p className="section-kicker">EU PENSO / EU QUERO / EU GOSTO</p>
              <strong>COMUNICAÇÃO DE ESTADOS E PREFERÊNCIAS</strong>
            </div>

            <div className="mental-config">
              <label>
                <span>TIPO</span>
                <select
                  value={mentalTask.kind}
                  onChange={(event) => setMentalTask((current) => ({
                    ...current,
                    kind: event.target.value as MentalTask['kind'],
                    expectedValue: event.target.value === 'choose_self' ? undefined : current.expectedValue,
                  }))}
                >
                  <option value="choose_self">DECLARAR</option>
                  <option value="identify">IDENTIFICAR</option>
                </select>
              </label>

              <label>
                <span>PESSOA</span>
                <select
                  value={mentalTask.personId ?? ''}
                  onChange={(event) => setMentalTask((current) => ({
                    ...current,
                    personId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {people.map((person) => (
                    <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>CONCEITO</span>
                <select
                  value={mentalTask.expectedKind ?? ''}
                  onChange={(event) => setMentalTask((current) => ({
                    ...current,
                    expectedKind: (event.target.value || undefined) as MentalStateKind | undefined,
                  }))}
                >
                  <option value="">?</option>
                  <option value="want">QUERER</option>
                  <option value="know">SABER</option>
                  <option value="understand">ENTENDER</option>
                  <option value="like">GOSTAR</option>
                </select>
              </label>

              <label>
                <span>SOBRE</span>
                <input
                  value={mentalTask.targetLabel ?? mentalTargetLabel}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    setMentalTargetLabel(value);
                    setMentalTask((current) => ({ ...current, targetLabel: value }));
                  }}
                  placeholder="EX.: IGREJA"
                />
              </label>

              {mentalTask.kind === 'identify' && (
                <label>
                  <span>RESPOSTA ESPERADA</span>
                  <select
                    value={mentalTask.expectedValue ?? ''}
                    onChange={(event) => setMentalTask((current) => ({
                      ...current,
                      expectedValue: (event.target.value || undefined) as MentalStateValue | undefined,
                    }))}
                  >
                    <option value="">?</option>
                    <option value="yes">SIM</option>
                    <option value="no">NÃO</option>
                  </select>
                </label>
              )}
            </div>

            <div className="mental-actions">
              <button type="button" onClick={startMentalTask}>
                {mentalTaskActive ? 'ATIVIDADE ATIVA' : 'INICIAR ATIVIDADE'}
              </button>
            </div>

            {mentalTaskActive && mentalTask.expectedKind && (
              <div className="mental-choice">
                <button type="button" onClick={() => answerMentalTask('yes')}>
                  <span>✓</span>
                  <strong>{mentalLabel(mentalTask.expectedKind, 'yes')}</strong>
                </button>
                <button type="button" onClick={() => answerMentalTask('no')}>
                  <span>✕</span>
                  <strong>{mentalLabel(mentalTask.expectedKind, 'no')}</strong>
                </button>
              </div>
            )}

            {mentalTask.personId && (
              <div className="mental-summary">
                {mentalStates
                  .filter((state) => state.personId === mentalTask.personId)
                  .map((state) => (
                    <span key={state.id}>
                      {mentalLabel(state.kind, state.value)}
                      {state.targetLabel ? ` - ${state.targetLabel}` : ''}
                    </span>
                  ))}
              </div>
            )}
          </section>

          <section className="causal-task-builder">
            <div className="builder-title">
              <p className="section-kicker">CAUSA E CONSEQUÊNCIA</p>
              <strong>PROBLEMA → AÇÃO → RESULTADO</strong>
            </div>

            <div className="causal-config">
              <label>
                <span>PROBLEMA</span>
                <select
                  value={causalTask.problemSceneId ?? ''}
                  onChange={(event) => setCausalTask((current) => ({
                    ...current,
                    problemSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>AÇÃO</span>
                <select
                  value={causalTask.actionSceneId ?? ''}
                  onChange={(event) => setCausalTask((current) => ({
                    ...current,
                    actionSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>RESULTADO</span>
                <select
                  value={causalTask.resultSceneId ?? ''}
                  onChange={(event) => setCausalTask((current) => ({
                    ...current,
                    resultSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>PERGUNTA</span>
                <select
                  value={causalTask.kind}
                  onChange={(event) => setCausalTask((current) => ({
                    ...current,
                    kind: event.target.value as CausalTask['kind'],
                  }))}
                >
                  <option value="what_after">O QUE ACONTECEU DEPOIS?</option>
                  <option value="what_result">QUAL FOI O RESULTADO?</option>
                  <option value="build_chain">MONTAR PROBLEMA → AÇÃO → RESULTADO</option>
                </select>
              </label>
            </div>

            <button className="causal-start" type="button" onClick={startCausalTask}>
              {causalTaskActive ? 'REINICIAR ATIVIDADE' : 'INICIAR ATIVIDADE'}
            </button>

            {causalTaskActive && (
              <>
                <div className="causal-question">
                  <strong>{causalQuestion()}</strong>
                  {causalTask.kind === 'build_chain' && (
                    <span>{causalAnswer.length}/3 SELECIONADAS</span>
                  )}
                </div>

                <div className="causal-options">
                  {causalOptionIds.map((sceneId) => {
                      const scene = history.find((item) => item.id === sceneId);
                      if (!scene) return null;
                      const order = causalAnswer.indexOf(sceneId);
                      return (
                        <button
                          type="button"
                          className={order >= 0 ? 'causal-option selected' : 'causal-option'}
                          key={sceneId}
                          onClick={() => answerCausalScene(sceneId)}
                        >
                          {order >= 0 && <span className="order-number">{order + 1}</span>}
                          <strong>{scene.actionLabel ?? 'CENA'}</strong>
                          <div className="narrative-thumb">
                            {scene.entities
                              .filter((entity) => !entity.consumed)
                              .slice(0, 4)
                              .map((entity) => (
                                <AssetVisual key={entity.instanceId} asset={entity} size={38} />
                              ))}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </section>

          <section className="narrative-task-builder">
            <div className="builder-title">
              <p className="section-kicker">NARRATIVA TEMPORAL</p>
              <strong>PRIMEIRO → DEPOIS → SEQUÊNCIA</strong>
            </div>

            <div className="narrative-task-config">
              <label>
                <span>ATIVIDADE</span>
                <select
                  value={narrativeTask.kind}
                  onChange={(event) => setNarrativeTask({
                    kind: event.target.value as NarrativeTask['kind'],
                    sceneIds: narrativeTask.sceneIds,
                  })}
                >
                  <option value="first">O QUE ACONTECEU PRIMEIRO?</option>
                  <option value="next">O QUE ACONTECEU DEPOIS?</option>
                  <option value="order">ORDENAR 2 - 3 CENAS</option>
                </select>
              </label>
              <button type="button" onClick={startNarrativeTask}>
                {narrativeTaskActive ? 'REINICIAR' : 'INICIAR'}
              </button>
            </div>

            {narrativeTaskActive && (
              <>
                <div className="narrative-question">
                  <strong>{narrativeQuestion()}</strong>
                  {narrativeTask.kind === 'order' && (
                    <span>{narrativeAnswer.length}/{narrativeTask.sceneIds.length} SELECIONADAS</span>
                  )}
                </div>

                <div className="narrative-options">
                  {narrativeOptionIds.map((sceneId) => {
                    const scene = history.find((item) => item.id === sceneId);
                    if (!scene) return null;
                    const selectedOrder = narrativeAnswer.indexOf(sceneId);
                    return (
                      <button
                        type="button"
                        key={sceneId}
                        className={selectedOrder >= 0 ? 'narrative-option selected' : 'narrative-option'}
                        onClick={() => answerNarrativeScene(sceneId)}
                      >
                        {selectedOrder >= 0 && <span className="order-number">{selectedOrder + 1}</span>}
                        <strong>CENA</strong>
                        <small>{scene.actionLabel ?? 'AÇÃO'}</small>
                        <div className="narrative-thumb">
                          {scene.entities
                            .filter((entity) => !entity.consumed)
                            .slice(0, 4)
                            .map((entity) => (
                              <AssetVisual key={entity.instanceId} asset={entity} size={38} />
                            ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {narrativeTask.kind === 'order' && narrativeAnswer.length > 0 && (
                  <button
                    type="button"
                    className="narrative-reset"
                    onClick={() => setNarrativeAnswer([])}
                  >
                    LIMPAR ORDEM
                  </button>
                )}
              </>
            )}
          </section>

          <section className="week-builder">
            <div className="builder-title">
              <p className="section-kicker">SEMANA VISUAL</p>
              <strong>DOMINGO → SÁBADO</strong>
            </div>

            <div className="week-grid">
              {getWeekDays().map(({ weekday, date, isToday }) => (
                <button
                  type="button"
                  className={[
                    'week-day',
                    isToday ? 'today' : '',
                    weekTaskActive ? 'answerable' : '',
                  ].join(' ')}
                  key={weekday}
                  onClick={() => answerWeekTask(weekday)}
                >
                  <header>
                    <strong>{weekdayLabel(weekday)}</strong>
                    <span>{String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}</span>
                    {isToday && <small>HOJE</small>}
                  </header>
                  <div className="week-events">
                    {weeklyEvents
                      .filter((event) =>
                        event.weekday === weekday &&
                        (event.recurring || event.date === date.toISOString().slice(0, 10))
                      )
                      .map((event) => (
                        <div className="week-event" key={event.id}>
                          <strong>{event.label}</strong>
                          {event.recurring && <small>SEMANAL</small>}
                        </div>
                      ))}
                    {weeklyEvents.every((event) =>
                      event.weekday !== weekday ||
                      (!event.recurring && event.date !== date.toISOString().slice(0, 10))
                    ) && (
                      <div className="week-empty"> - </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="week-task-panel">
              <div className="week-task-config">
                <label>
                  <span>ATIVIDADE</span>
                  <select
                    value={weekTask.kind}
                    onChange={(event) => setWeekTask({ kind: event.target.value as WeekTask['kind'] })}
                  >
                    <option value="today">QUE DIA É HOJE?</option>
                    <option value="yesterday">QUAL DIA FOI ONTEM?</option>
                    <option value="tomorrow">QUAL DIA SERÁ AMANHÃ?</option>
                    <option value="previous">QUAL DIA VEM ANTES?</option>
                    <option value="next">QUAL DIA VEM DEPOIS?</option>
                    <option value="event">EM QUE DIA ACONTECE O EVENTO?</option>
                  </select>
                </label>

                {(weekTask.kind === 'previous' || weekTask.kind === 'next') && (
                  <label>
                    <span>DIA DE REFERÊNCIA</span>
                    <select
                      value={weekTask.referenceWeekday ?? 0}
                      onChange={(event) => setWeekTask((current) => ({
                        ...current,
                        referenceWeekday: Number(event.target.value) as Weekday,
                      }))}
                    >
                      {[0,1,2,3,4,5,6].map((day) => (
                        <option key={day} value={day}>{weekdayLabel(day as Weekday)}</option>
                      ))}
                    </select>
                  </label>
                )}

                {weekTask.kind === 'event' && (
                  <label>
                    <span>EVENTO</span>
                    <select
                      value={weekTask.eventId ?? ''}
                      onChange={(event) => setWeekTask((current) => ({
                        ...current,
                        eventId: event.target.value || undefined,
                      }))}
                    >
                      <option value="">?</option>
                      {weeklyEvents.map((event) => (
                        <option key={event.id} value={event.id}>{event.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (weekTask.kind === 'event' && !weekTask.eventId) {
                      setFeedback('ESCOLHA UM EVENTO');
                      return;
                    }
                    setWeekTaskActive(true);
                    setFeedback(null);
                  }}
                >
                  {weekTaskActive ? 'ATIVIDADE ATIVA' : 'INICIAR'}
                </button>
              </div>

              {weekTaskActive && (
                <div className="week-task-question">
                  <strong>{weekTaskQuestion()}</strong>
                  <span>TOQUE NO DIA CORRETO</span>
                </div>
              )}
            </div>

            <div className="week-create">
              <label>
                <span>EVENTO SEMANAL</span>
                <input
                  value={newWeeklyEventLabel}
                  onChange={(event) => setNewWeeklyEventLabel(event.target.value)}
                  placeholder="EX.: ENCONTRO"
                />
              </label>
              <label>
                <span>DIA</span>
                <select
                  value={newWeeklyEventDay}
                  onChange={(event) => setNewWeeklyEventDay(Number(event.target.value) as Weekday)}
                >
                  <option value={0}>DOMINGO</option>
                  <option value={1}>SEGUNDA</option>
                  <option value={2}>TERÇA</option>
                  <option value={3}>QUARTA</option>
                  <option value={4}>QUINTA</option>
                  <option value={5}>SEXTA</option>
                  <option value={6}>SÁBADO</option>
                </select>
              </label>
              <label className="week-check">
                <input
                  type="checkbox"
                  checked={newWeeklyEventRecurring}
                  onChange={(event) => setNewWeeklyEventRecurring(event.target.checked)}
                />
                <span>REPETIR TODA SEMANA</span>
              </label>
              <button type="button" onClick={addWeeklyEvent}>＋ ADICIONAR</button>
            </div>
          </section>

          <section className="calendar-builder">
            <div className="builder-title">
              <p className="section-kicker">CALENDÁRIO VISUAL</p>
              <strong>EVENTOS REAIS</strong>
            </div>

            <div className="calendar-columns">
              {(['yesterday', 'today', 'tomorrow'] as TemporalDay[]).map((day) => (
                <section className="calendar-day" key={day}>
                  <header>
                    <span>{temporalSymbol(day)}</span>
                    <strong>{temporalLabel(day)}</strong>
                    <small>{getCalendarDate(day)}</small>
                  </header>
                  <div className="calendar-events">
                    {temporalEvents.filter((event) => event.day === day).map((event) => (
                      <button
                        type="button"
                        className={temporalEventQuestionId === event.id ? 'calendar-event active' : 'calendar-event'}
                        key={event.id}
                        onClick={() => setTemporalEventQuestionId(event.id)}
                      >
                        <span>{event.symbol}</span>
                        <strong>{event.label}</strong>
                      </button>
                    ))}
                    {temporalEvents.every((event) => event.day !== day) && (
                      <div className="calendar-empty">SEM EVENTO</div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="calendar-create">
              <label>
                <span>EVENTO</span>
                <input
                  value={newTemporalEventLabel}
                  onChange={(event) => setNewTemporalEventLabel(event.target.value)}
                  placeholder="EX.: IGREJA"
                />
              </label>
              <label>
                <span>QUANDO</span>
                <select value={newTemporalEventDay} onChange={(event) => setNewTemporalEventDay(event.target.value as TemporalDay)}>
                  <option value="yesterday">ONTEM</option>
                  <option value="today">HOJE</option>
                  <option value="tomorrow">AMANHÃ</option>
                </select>
              </label>
              <button type="button" onClick={addTemporalEvent}>＋ ADICIONAR</button>
            </div>

            {temporalEventQuestionId && (
              <div className="calendar-question">
                <strong>QUANDO É/FOI {temporalEvents.find((event) => event.id === temporalEventQuestionId)?.label}?</strong>
                <div>
                  {(['yesterday', 'today', 'tomorrow'] as TemporalDay[]).map((day) => (
                    <button type="button" key={day} onClick={() => answerTemporalEvent(day)}>
                      <span>{temporalSymbol(day)}</span>
                      {temporalLabel(day)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="temporal-builder">
            <div className="builder-title">
              <p className="section-kicker">TEMPO</p>
              <strong>ONTEM • HOJE • AMANHÃ</strong>
            </div>

            <div className="temporal-strip" aria-label="Linha temporal">
              {(['yesterday', 'today', 'tomorrow'] as TemporalDay[]).map((day) => (
                <button
                  type="button"
                  key={day}
                  className={currentScene.temporalDay === day ? 'temporal-card active' : 'temporal-card'}
                  onClick={() => {
                    setSceneTemporalDay(day);
                    validateTemporalTask(day);
                  }}
                >
                  <span className="temporal-symbol">{temporalSymbol(day)}</span>
                  <strong>{temporalLabel(day)}</strong>
                </button>
              ))}
            </div>

            <div className="sequence-time">
              <button type="button" onClick={() => setCompareMode('before')} className={compareMode === 'before' ? 'active' : ''}>
                <span>←</span>
                <strong>ANTES</strong>
              </button>
              <button type="button" onClick={() => setCompareMode('now')} className={compareMode === 'now' ? 'active' : ''}>
                <span>●</span>
                <strong>AGORA</strong>
              </button>
              <button type="button" onClick={() => setCompareMode('after')} className={compareMode === 'after' ? 'active' : ''}>
                <span>→</span>
                <strong>DEPOIS</strong>
              </button>
            </div>

            <div className="temporal-task">
              <label>
                <span>ATIVIDADE DIRIGIDA</span>
                <select
                  value={expectedTemporalDay}
                  onChange={(event) => setExpectedTemporalDay(event.target.value as TemporalDay)}
                >
                  <option value="yesterday">ONTEM</option>
                  <option value="today">HOJE</option>
                  <option value="tomorrow">AMANHÃ</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setTemporalTaskActive(true);
                  setFeedback(null);
                }}
              >
                {temporalTaskActive ? `ESCOLHA: ${temporalLabel(expectedTemporalDay)}` : 'INICIAR ATIVIDADE'}
              </button>
            </div>

            <div className="temporal-current">
              <span>CENA ATUAL</span>
              <strong>{temporalLabel(currentScene.temporalDay)}</strong>
            </div>
          </section>

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
              setFeedback('NÃO ENTENDI - MOSTRE NOVAMENTE');
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
                  setDraft({ verbId: '' });
                  setSelectedEntityId(null);
                  setDraggingEntityId(null);
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
