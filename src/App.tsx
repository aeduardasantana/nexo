Warning: truncated output (original token count: 57381)
Total output lines: 5794

// @signature edufertanapo
import { useEffect, useMemo, useRef, useState } from 'react';
import AssetCard from './components/AssetCard';
import MissionsReference from './components/MissionsReference';
import { AssetVisual, ResponseVisual, VerbVisual } from './components/Visuals';
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
  DayPeriod,
  RelativeWeek,
  TemporalEvent,
  Weekday,
  WeeklyEvent,
  WeekTask,
  NarrativeTask,
  CausalTask,
  AutobiographicalRecord,
  SocialInteraction,
  SocialRole,
  SharedAction,
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
    openState: asset.id === 'door' ? 'closed' : undefined,
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

function takeOptionsWithExpected<T>(
  expected: T,
  pool: T[],
  count: number,
): T[] {
  const others = shuffledCopy(pool.filter((item) => item !== expected));
  return shuffledCopy([expected, ...others.slice(0, Math.max(0, count - 1))]);
}

const LOCAL_SESSION_KEY = 'nexo.session.v1';
const LOCAL_HISTORY_KEY = 'nexo.longitudinal.v1';

type LocalSessionEnvelope = {
  schemaVersion: 1;
  savedAt: string;
  report: SessionReport;
};

type LongitudinalSession = {
  id: string;
  archivedAt: string;
  report: SessionReport;
};

type LongitudinalAxis = 'ACTION' | 'TIME' | 'NARRATIVE' | 'RELATION';
type NexoModule = 'scenario' | 'time' | 'narrative' | 'perspective' | 'missions' | 'report';

const HELP_MODULES: Record<NexoModule | 'general' | 'storage' | 'accessibility', {
  title: string;
  purpose: string;
  howTo: string[];
  observe: string[];
}> = {
  general: {
    title: 'VISÃO GERAL',
    purpose: 'Organizar ações, tempo, relações, perspectivas e narrativas por mediação visual.',
    howTo: [
      'IDENTIFIQUE PARTICIPANTE, MEDIADOR E OBJETIVO DA SESSÃO.',
      'ESCOLHA UM MÓDULO CONFORME O OBJETIVO PEDAGÓGICO.',
      'REGISTRE RESPOSTAS E NÍVEL DE MEDIAÇÃO 0 - 3.',
      'USE O RELATÓRIO PARA DESCREVER O QUE FOI OBSERVADO.'
    ],
    observe: [
      'INICIATIVA E AUTONOMIA NA ESCOLHA.',
      'NECESSIDADE DE MODELAGEM OU PISTA.',
      'CAPACIDADE DE ORGANIZAR RELAÇÕES E SEQUÊNCIAS.'
    ]
  },
  scenario: {
    title: 'CENÁRIO',
    purpose: 'Construir ações concretas e relações espaciais por transformação visível da cena.',
    howTo: [
      'ADICIONE PESSOAS, OBJETOS, LUGARES OU ANIMAIS.',
      'ESCOLHA UM VERBO E COMPLETE OS ELEMENTOS EXIGIDOS.',
      'EXECUTE A AÇÃO E COMPARE ANTES - AGORA - DEPOIS.',
      'USE AS ATIVIDADES ESPACIAIS PARA POSIÇÃO E RELAÇÃO.'
    ],
    observe: [
      'COMPREENSÃO DA ESTRUTURA DA AÇÃO.',
      'RELAÇÕES ENTRE AGENTE, OBJETO E DESTINO.',
      'ORGANIZAÇÃO ESPACIAL.'
    ]
  },
  time: {
    title: 'TEMPO',
    purpose: 'Trabalhar referências temporais concretas e progressivamente mais amplas.',
    howTo: [
      'COMECE POR ONTEM - HOJE - AMANHÃ.',
      'TRABALHE MANHÃ - TARDE - NOITE E HORAS.',
      'USE SEMANA PASSADA - ESTA SEMANA - PRÓXIMA SEMANA.',
      'RELACIONE EVENTOS REAIS AO CALENDÁRIO.'
    ],
    observe: [
      'LOCALIZAÇÃO TEMPORAL.',
      'ORDEM ENTRE EVENTOS.',
      'USO DE REFERÊNCIAS REAIS PARA ORGANIZAR O TEMPO.'
    ]
  },
  narrative: {
    title: 'NARRATIVA',
    purpose: 'Organizar cenas em sequência, causalidade e relato autobiográfico.',
    howTo: [
      'CONSTRUA PRIMEIRO CENAS SIGNIFICATIVAS.',
      'TRABALHE PRIMEIRO - DEPOIS - COMO TERMINOU.',
      'AVANCE PARA PROBLEMA - AÇÃO - RESULTADO.',
      'USE O RELATO PESSOAL QUANDO HOUVER BASE VISUAL SUFICIENTE.'
    ],
    observe: [
      'ORDEM DE ACONTECIMENTOS.',
      'CAUSA E CONSEQUÊNCIA.',
      'ORGANIZAÇÃO DO PRÓPRIO RELATO.'
    ]
  },
  perspective: {
    title: 'PERSPECTIVA',
    purpose: 'Trabalhar eu, outro, nós, acesso à informação e diferentes pontos de vista.',
    howTo: [
      'REGISTRE ESTADOS DECLARADOS SEM INFERIR O QUE A PESSOA PENSA.',
      'TRABALHE RELAÇÕES SOCIAIS EU + OUTRO = NÓS.',
      'USE QUEM VIU / QUEM NÃO VIU PARA ACESSO À INFORMAÇÃO.',
      'TRABALHE MUDANÇA DE LOCAL E O QUE CADA PESSOA PODE SABER.'
    ],
    observe: [
      'DISTINÇÃO ENTRE PRÓPRIA PERSPECTIVA E PERSPECTIVA DO OUTRO.',
      'RELAÇÃO ENTRE VER E SABER.',
      'REPRESENTAÇÃO DE VÍNCULOS SOCIAIS.'
    ]
  },
  missions: {
    title: 'MISSÕES',
    purpose: 'Consultar a matriz de referência pedagógica e técnica para futuras missões do NEXO.',
    howTo: [
      'CONSULTE O CÓDIGO E O TEXTO OFICIAL DA BNCC.',
      'LEIA O OBJETIVO FUNCIONAL NEXO SEM LIMITE ETÁRIO.',
      'VERIFIQUE SE OS RECURSOS ATUAIS JÁ PERMITEM CRIAR MISSÕES.',
      'USE LACUNAS, EVIDÊNCIAS E PROGRESSÃO COMO REFERÊNCIA PARA DESENVOLVIMENTO FUTURO.'
    ],
    observe: [
      'A PÁGINA É CONSULTIVA E NÃO EXECUTA MISSÕES.',
      'COBERTURA TÉCNICA NÃO SIGNIFICA CERTIFICAÇÃO CURRICULAR.',
      'MEDIAÇÃO, COMPLEXIDADE E GENERALIZAÇÃO DEVEM SER ANALISADAS SEPARADAMENTE.'
    ]
  },
  report: {
    title: 'RELATÓRIO',
    purpose: 'Reunir registros observacionais da sessão e acompanhar mudanças ao longo do tempo.',
    howTo: [
      'CONFIRA IDENTIFICAÇÃO, EVENTOS E NÍVEIS DE MEDIAÇÃO.',
      'REGISTRE A SESSÃO NO HISTÓRICO LONGITUDINAL.',
      'COMPARE EIXOS APENAS QUANDO HOUVER REGISTROS.',
      'EXPORTE OU IMPRIMA QUANDO PRECISAR PRESERVAR O REGISTRO.'
    ],
    observe: [
      'DISTRIBUIÇÃO DOS NÍVEIS 0 - 3.',
      'MUDANÇAS ENTRE SESSÕES.',
      'CONTEXTO DO MEDIADOR, OBJETIVO E DIFICULDADE.'
    ]
  },
  storage: {
    title: 'SALVAMENTO E HISTÓRICO',
    purpose: 'Preservar a sessão no navegador e permitir continuidade sem banco de dados online.',
    howTo: [
      'O AUTOSAVE GUARDA A SESSÃO ATUAL NESTE NAVEGADOR.',
      'USE SALVAR AGORA QUANDO QUISER FORÇAR O REGISTRO.',
      'REGISTRE SESSÕES CONCLUÍDAS NO HISTÓRICO LONGITUDINAL.',
      'EXPORTE JSON COMO BACKUP E PARA PORTABILIDADE.'
    ],
    observe: [
      'CTRL + F5 NÃO APAGA O SALVAMENTO LOCAL.',
      'LIMPAR DADOS DO SITE PODE APAGAR O HISTÓRICO LOCAL.',
      'OUTRO NAVEGADOR OU DISPOSITIVO NÃO COMPARTILHA O MESMO HISTÓRICO.'
    ]
  },
  accessibility: {
    title: 'ACESSIBILIDADE',
    purpose: 'Oferecer apoio visual, teclado, foco e Libras sem tornar o texto ou o VLibras requisito.',
    howTo: [
      'USE O VLibras COMO APOIO COMPLEMENTAR.',
      'A NAVEGAÇÃO PRINCIPAL TAMBÉM FUNCIONA POR TECLADO.',
      'OS ELEMENTOS DA CENA PODEM SER SELECIONADOS COM ENTER OU ESPAÇO.',
      'O SISTEMA RESPEITA A PREFERÊNCIA DE REDUÇÃO DE MOVIMENTO.'
    ],
    observe: [
      'O VLibras É TRADUÇÃO AUTOMÁTICA E NÃO SUBSTITUI MEDIAÇÃO EM LIBRAS.',
      'A INFORMAÇÃO ESSENCIAL DEVE CONTINUAR VISUAL.'
    ]
  }
};

const TOUR_STEPS: Array<{
  title: string;
  text: string;
  target: string;
  module?: NexoModule;
  openMediator?: boolean;
}> = [
  {
    title: '1/8 - MODO MEDIADOR',
    text: 'ABRA ESTE PAINEL PARA CONFIGURAR A SESSÃO, IDENTIFICAR PARTICIPANTE E MEDIADOR E REGISTRAR MEDIAÇÃO.',
    target: '.teacher-panel',
    openMediator: true
  },
  {
    title: '2/8 - IDENTIFICAÇÃO DA SESSÃO',
    text: 'PREENCHA PARTICIPANTE, MEDIADOR, DATA, OBJETIVO E OBSERVAÇÕES.',
    target: '.session-panel',
    openMediator: true
  },
  {
    title: '3/8 - CENÁRIO',
    text: 'MONTE CENAS, ESCOLHA VERBOS, EXECUTE AÇÕES E COMPARE ESTADOS.',
    target: '.workspace',
    module: 'scenario'
  },
  {
    title: '4/8 - TEMPO',
    text: 'TRABALHE ONTEM - HOJE - AMANHÃ, PERÍODOS DO DIA, SEMANAS, HORAS E CALENDÁRIO.',
    target: '.expanded-time-builder',
    module: 'time'
  },
  {
    title: '5/8 - NARRATIVA',
    text: 'ORGANIZE SEQUÊNCIAS, CAUSALIDADE E RELATOS AUTOBIOGRÁFICOS.',
    target: '.autobiographical-builder',
    module: 'narrative'
  },
  {
    title: '6/8 - PERSPECTIVA',
    text: 'TRABALHE EU, OUTRO, NÓS, ACESSO À INFORMAÇÃO E DIFERENTES PONTOS DE VISTA.',
    target: '.social-builder',
    module: 'perspective'
  },
  {
    title: '7/8 - MEDIAÇÃO E SALVAMENTO',
    text: 'REGISTRE O NÍVEL 0 - 3 E CONFIRA O AUTOSAVE LOCAL OU SALVE MANUALMENTE.',
    target: '.teacher-support',
    openMediator: true
  },
  {
    title: '8/8 - RELATÓRIO',
    text: 'REVISE A SESSÃO, REGISTRE NO HISTÓRICO LONGITUDINAL E EXPORTE OU IMPRIMA QUANDO NECESSÁRIO.',
    target: '.session-report-view',
    module: 'report'
  }
];

export default function App() {
  const [category, setCategory] = useState<AssetCategory>('person');
  const [history, setHistory] = useState<SceneState[]>([initialScene]);
  const [storyArchive, setStoryArchive] = useState<SceneState[][]>([]);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draft, setDraft] = useState<ActionDraft>({ verbId: '' });
  const [actionIssueRole, setActionIssueRole] = useState<'actor' | 'object' | 'targetPerson' | 'destination' | 'seat' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'before' | 'now' | 'after' | 'compare'>('now');
  const [isReplaying, setIsReplaying] = useState(false);
  const [interfaceMode, setInterfaceMode] = useState<'participant' | 'mediator'>('participant');
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [lastAddedAssetId, setLastAddedAssetId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<NexoModule | 'general' | 'storage' | 'accessibility'>('general');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [activityMode, setActivityMode] = useState<ActivityMode>('free');
  const [directedIssueField, setDirectedIssueField] = useState<'instruction' | 'expected' | null>(null);
  const [directedActivity, setDirectedActivity] = useState<DirectedActivity>({
    instruction: 'ESCOLHA A AÇÃO',
    allowUnknown: true,
    allowNotUnderstood: true,
  });
  const [mediationEvents, setMediationEvents] = useState<MediationEvent[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null);
  const [sceneEditUndo, setSceneEditUndo] = useState<SceneState[]>([]);
  const [sceneEditRedo, setSceneEditRedo] = useState<SceneState[]>([]);
  const [relationReferenceId, setRelationReferenceId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<SpatialRelation>('near');
  const [spatialTask, setSpatialTask] = useState<SpatialTask>({
    kind: 'place',
    relation: 'near',
    instruction: 'COLOQUE O ELEMENTO NO LUGAR CERTO',
  });
  const [spatialTaskActive, setSpatialTaskActive] = useState(false);
  const [spatialIssueField, setSpatialIssueField] = useState<'subject' | 'reference' | null>(null);
  const [temporalTaskActive, setTemporalTaskActive] = useState(false);
  const [temporalOptionDays, setTemporalOptionDays] = useState<TemporalDay[]>([]);
  const [expectedTemporalDay, setExpectedTemporalDay] = useState<TemporalDay>('today');
  const [dayPeriod, setDayPeriod] = useState<DayPeriod>('morning');
  const [clockHour, setClockHour] = useState(8);
  const [relativeWeek, setRelativeWeek] = useState<RelativeWeek>('current');
  const [monthOffset, setMonthOffset] = useState(0);
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
  const [weekOptionDays, setWeekOptionDays] = useState<Weekday[]>([]);
  const [narrativeTask, setNarrativeTask] = useState<NarrativeTask>({ kind: 'first', sceneIds: [] });
  const [narrativeTaskActive, setNarrativeTaskActive] = useState(false);
  const [narrativeAnswer, setNarrativeAnswer] = useState<string[]>([]);
  const [narrativeOptionIds, setNarrativeOptionIds] = useState<string[]>([]);
  const [causalTask, setCausalTask] = useState<CausalTask>({ kind: 'what_after' });
  const [causalTaskActive, setCausalTaskActive] = useState(false);
  const [causalAnswer, setCausalAnswer] = useState<string[]>([]);
  const [causalOptionIds, setCausalOptionIds] = useState<string[]>([]);
  const [autobiographicalDraft, setAutobiographicalDraft] = useState<Partial<AutobiographicalRecord>>({
    when: 'today',
  });
  const [autobiographicalRecords, setAutobiographicalRecords] = useState<AutobiographicalRecord[]>([]);
  const [socialDraft, setSocialDraft] = useState<Partial<SocialInteraction>>({
    role: 'AMIGO',
    action: 'CONVERSAR',
  });
  const [socialInteractions, setSocialInteractions] = useState<SocialInteraction[]>([]);
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
  const [relocationLocationOptions, setRelocationLocationOptions] = useState<string[]>([]);
  const [sequenceCurrentLocationOptions, setSequenceCurrentLocationOptions] = useState<string[]>([]);
  const [sequenceSearchLocationOptions, setSequenceSearchLocationOptions] = useState<string[]>([]);
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
  const [newSessionConfirmOpen, setNewSessionConfirmOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<NexoModule>('scenario');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [localStorageReady, setLocalStorageReady] = useState(false);
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);
  const [localStorageStatus, setLocalStorageStatus] = useState<'loading' | 'saved' | 'empty' | 'error'>('loading');
  const [longitudinalSessions, setLongitudinalSessions] = useState<LongitudinalSession[]>([]);
  const [pendingImportReport, setPendingImportReport] = useState<SessionReport | null>(null);
  const [pendingImportName, setPendingImportName] = useState('');
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata>({
    participant: '',
    facilitator: '',
    date: new Date().toISOString().slice(0, 10),
    objective: '',
    notes: '',
  });
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const dragStartSceneRef = useRef<SceneState | null>(null);
  const replayTimer = useRef<number | null>(null);

  function cloneScene(scene: SceneState): SceneState {
    return { ...scene, entities: scene.entities.map((entity) => ({ ...entity })) };
  }

  const currentScene = history[historyIndex];
  const allSessionScenes = [
    ...storyArchive.flat(),
    ...history.slice(1),
  ];
  const beforeScene = history[Math.max(0, historyIndex - 1)];
  const afterScene = history[Math.min(history.length - 1, historyIndex + 1)];
  const displayedScene =
    compareMode === 'before' ? beforeScene :
    compareMode === 'after' ? afterScene :
    currentScene;

  useEffect(() => {
    try {
      const historyStored = window.localStorage.getItem(LOCAL_HISTORY_KEY);
      if (historyStored) {
        const parsedHistory = JSON.parse(historyStored) as unknown;
        if (Array.isArray(parsedHistory)) {
          setLongitudinalSessions(
            parsedHistory.filter((item): item is LongitudinalSession =>
              Boolean(
                item &&
                typeof item === 'object' &&
                typeof (item as LongitudinalSession).id === 'string' &&
                typeof (item as LongitudinalSession).archivedAt === 'string' &&
                isSessionReport((item as LongitudinalSession).report)
              )
            )
          );
        }
      }

      const stored = window.localStorage.getItem(LOCAL_SESSION_KEY);
      if (!stored) {
        setLocalStorageStatus('empty');
        setLocalStorageReady(true);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<LocalSessionEnvelope>;
      if (
        parsed.schemaVersion !== 1 ||
        typeof parsed.savedAt !== 'string' ||
        !isSessionReport(parsed.report)
      ) {
        window.localStorage.removeItem(LOCAL_SESSION_KEY);
        setLocalStorageStatus('empty');
        setLocalStorageReady(true);
        return;
      }

      restoreSessionReport(parsed.report, 'SESSÃO LOCAL RESTAURADA');
      setLocalSavedAt(parsed.savedAt);
      setLocalStorageStatus('saved');
    } catch {
      setLocalStorageStatus('error');
    } finally {
      setLocalStorageReady(true);
    }

    return () => {
      if (replayTimer.current !== null) window.clearInterval(replayTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!localStorageReady) return;

    const timer = window.setTimeout(() => {
      try {
        const envelope: LocalSessionEnvelope = {
          schemaVersion: 1,
          savedAt: new Date().toISOString(),
          report: buildSessionReport(),
        };
        window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(envelope));
        setLocalSavedAt(envelope.savedAt);
        setLocalStorageStatus('saved');
      } catch {
        setLocalStorageStatus('error');
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    localStorageReady,
    sessionMetadata,
    history,
    storyArchive,
    personNames,
    autobiographicalRecords,
    socialInteractions,
    mediationEvents,
    mediationAssessments,
    mentalStates,
    informationAccess,
    temporalEvents,
    weeklyEvents,
    dayPeriod,
    clockHour,
    relativeWeek,
    monthOffset,
    supportConfig,
    activityMode,
    directedActivity,
  ]);

  useEffect(() => {
    setTeacherOpen(interfaceMode === 'mediator');
  }, [interfaceMode]);

  useEffect(() => {
    document.querySelectorAll('.tour-highlight').forEach((element) => {
      element.classList.remove('tour-highlight');
    });

    if (tourStep === null) return;

    const step = TOUR_STEPS[tourStep];
    if (step.openMediator) setTeacherOpen(true);
    if (step.module) {
      setActiveModule(step.module);
      setReportOpen(step.module === 'report');
    }

    const timer = window.setTimeout(() => {
      const target = document.querySelector(step.target);
      if (target instanceof HTMLElement) {
        target.classList.add('tour-highlight');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [tourStep]);

  function closeTour() {
    setTourStep(null);
    document.querySelectorAll('.tour-highlight').forEach((element) => {
      element.classList.remove('tour-highlight');
    });
  }

  function startTour() {
    setHelpOpen(false);
    setInterfaceMode('mediator');
    setTeacherOpen(true);
    setTourStep(0);
  }

  function openHelpFor(topic: NexoModule | 'general' | 'storage' | 'accessibility') {
    setHelpTopic(topic);
    setHelpOpen(true);
  }

  const visibleAssets = useMemo(
    () => assets
      .filter((item) => item.category === category)
      .map((item) =>
        item.category === 'person' && personNames[item.id]
          ? { ...item, label: personNames[item.id] }
          : item,
      ),
    [category, personNames],
  );

  const people = currentScene.entities.filter((entity) => entity.category === 'person');
  const storyEntities = history.flatMap((scene) => scene.entities);
  const autobiographicalPeople = Array.from(
    new Map(
      storyEntities
        .filter((entity) => entity.category === 'person')
        .map((entity) => [entity.instanceId, entity]),
    ).values(),
  );
  const autobiographicalPlaces = Array.from(
    new Map(
      storyEntities
        .filter((entity) => entity.category === 'place')
        .map((entity) => [entity.instanceId, entity]),
    ).values(),
  );
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

  function renamePersonAsset(assetId: string, rawName: string) {
    const fallback = assets.find((asset) => asset.id === assetId)?.label ?? 'PESSOA';
    const nextName = rawName.trim().toUpperCase() || fallback;

    setPersonNames((current) => ({
      ...current,
      [assetId]: nextName,
    }));

    const renameScene = (scene: SceneState): SceneState => ({
      ...scene,
      entities: scene.entities.map((entity) =>
        entity.category === 'person' && entity.id === assetId
          ? { ...entity, label: nextName }
          : entity,
      ),
    });

    setHistory((current) => current.map(renameScene));
    setStoryArchive((stories) =>
      stories.map((story) => story.map(renameScene)),
    );
    setFeedback(`NOME ATUALIZADO - ${nextName}`);
  }

  function resetPersonNames() {
    const defaults = Object.fromEntries(
      assets
        .filter((asset) => asset.category === 'person')
        .map((asset) => [asset.id, asset.label]),
    );
    setPersonNames({});
    const renameScene = (scene: SceneState): SceneState => ({
      ...scene,
      entities: scene.entities.map((entity) =>
        entity.category === 'person'
          ? { ...entity, label: defaults[entity.id] ?? entity.label }
          : entity,
      ),
    });
    setHistory((current) => current.map(renameScene));
    setStoryArchive((stories) => stories.map((story) => story.map(renameScene)));
    setFeedback('NOMES DAS PESSOAS RESTAURADOS');
  }

  function saveAutobiographicalRecord() {
    const {
      personId,
      placeId,
      when,
      firstSceneId,
      nextSceneId,
      endingSceneId,
    } = autobiographicalDraft;

    if (!personId || !placeId || !when || !firstSceneId || !nextSceneId || !endingSceneId) {
      setFeedback('⚠ COMPLETE QUEM - ONDE - QUANDO - PRIMEIRO - DEPOIS - COMO TERMINOU');
      return;
    }

    if (new Set([firstSceneId, nextSceneId, endingSceneId]).size !== 3) {
      setFeedback('⚠ USE TRÊS CENAS DIFERENTES PARA PRIMEIRO - DEPOIS - COMO TERMINOU');
      return;
    }

    const record: AutobiographicalRecord = {
      id: crypto.randomUUID(),
      personId,
      placeId,
      when,
      firstSceneId,
      nextSceneId,
      endingSceneId,
      createdAt: new Date().toISOString(),
    };

    setAutobiographicalRecords((records) => [...records, record]);
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: 'correct',
      label: 'NARRATIVA AUTOBIOGRÁFICA - RELATO ORGANIZADO',
      createdAt: new Date().toISOString(),
    }]);
    setAutobiographicalDraft({ when: 'today' });
    setFeedback('✓ RELATO AUTOBIOGRÁFICO SALVO');
  }

  function autobiographicalSceneLabel(sceneId?: string) {
    if (!sceneId) return ' - ';
    const scene = history.find((item) => item.id === sceneId)
      ?? storyArchive.flat().find((item) => item.id === sceneId);
    return scene?.actionLabel ?? 'CENA';
  }

  function autobiographicalEntityLabel(instanceId?: string) {
    if (!instanceId) return ' - ';
    const scene = [currentScene, ...history, ...storyArchive.flat()]
      .find((item) => item.entities.some((entity) => entity.instanceId === instanceId));
    return scene?.entities.find((entity) => entity.instanceId === instanceId)?.label ?? ' - ';
  }

  function saveSocialInteraction() {
    const { selfPersonId, otherPersonId, role, action } = socialDraft;
    if (!selfPersonId || !otherPersonId || !role || !action) {
      setFeedback('⚠ COMPLETE EU - OUTRO - VÍNCULO - AÇÃO');
      return;
    }
    if (selfPersonId === otherPersonId) {
      setFeedback('⚠ ESCOLHA DUAS PESSOAS DIFERENTES');
      return;
    }

    const interaction: SocialInteraction = {
      id: crypto.randomUUID(),
      selfPersonId,
      otherPersonId,
      role,
      action,
      createdAt: new Date().toISOString(),
    };

    setSocialInteractions((items) => [...items, interaction]);
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: 'correct',
      label: `RELAÇÃO SOCIAL - ${role} - ${action}`,
      createdAt: new Date().toISOString(),
    }]);
    setSocialDraft({
      role: 'AMIGO',
      action: 'CONVERSAR',
    });
    setFeedback('✓ RELAÇÃO SOCIAL REGISTRADA');
  }

  function longitudinalAxisLabel(axis: LongitudinalAxis) {
    if (axis === 'TIME') return 'TEMPO';
    if (axis === 'NARRATIVE') return 'NARRATIVA';
    if (axis === 'RELATION') return 'PERSPECTIVA / RELAÇÕES';
    return 'AÇÃO / CENÁRIO';
  }

  function eventAxis(label: string): LongitudinalAxis {
    const normalized = label.toUpperCase();
    if (
      normalized.includes('TEMPO') ||
      normalized.includes('SEMANA') ||
      normalized.includes('EVENTO ') ||
      normalized.includes('ONTEM') ||
      normalized.includes('HOJE') ||
      normalized.includes('AMANHÃ')
    ) return 'TIME';

    if (
      normalized.includes('NARRATIVA') ||
      normalized.includes('CAUSA') ||
      normalized.includes('RELATO AUTOBIOGRÁFICO')
    ) return 'NARRATIVE';

    if (
      normalized.includes('PERSPECTIVA') ||
      normalized.includes('RELAÇÃO SOCIAL') ||
      normalized.includes('ACESSO') ||
      normalized.includes('VIU') ||
      normalized.includes('NÃO VIU') ||
      normalized.includes('INFORMAÇÃO') ||
      normalized.includes('REALOC')
    ) return 'RELATION';

    return 'ACTION';
  }

  function assessmentAxis(report: SessionReport, assessment: MediationAssessment): LongitudinalAxis {
    const event = report.mediationEvents.find((item) => item.id === assessment.sourceEventId);
    return event ? eventAxis(event.label) : 'ACTION';
  }

  function longitudinalAxisStats(report: SessionReport, axis: LongitudinalAxis) {
    const items = report.mediationAssessments.filter((assessment) =>
      assessmentAxis(report, assessment) === axis
    );
    const counts = ([0, 1, 2, 3] as MediationLevel[]).map((level) =>
      items.filter((item) => item.level === level).length
    );
    const average = items.length
      ? items.reduce((sum, item) => sum + item.level, 0) / items.length
      : null;

    return { count: items.length, counts, average };
  }

  function saveLongitudinalSessions(items: LongitudinalSession[]) {
    setLongitudinalSessions(items);
    try {
      window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
    } catch {
      setFeedback('❌ NÃO FOI POSSÍVEL SALVAR O HISTÓRICO LONGITUDINAL');
    }
  }

  function archiveSessionForLongitudinal(report = buildSessionReport(), showFeedback = true) {
    if (
      report.scenes.length <= 1 &&
      report.mediationEvents.length === 0 &&
      report.mediationAssessments.length === 0
    ) {
      if (showFeedback) setFeedback('NÃO HÁ DADOS SUFICIENTES PARA ARQUIVAR ESTA SESSÃO');
      return;
    }

    const existingIndex = longitudinalSessions.findIndex((item) =>
      item.report.metadata.participant === report.metadata.participant &&
      item.report.metadata.date === report.metadata.date
    );

    const snapshot: LongitudinalSession = {
      id: existingIndex >= 0 ? longitudinalSessions[existingIndex].id : crypto.randomUUID(),
      archivedAt: new Date().toISOString(),
      report: { ...report, generatedAt: new Date().toISOString() },
    };

    const next = existingIndex >= 0
      ? longitudinalSessions.map((item, index) => index === existingIndex ? snapshot : item)
      : [...longitudinalSessions, snapshot];

    next.sort((a, b) =>
      (a.report.metadata.date || a.archivedAt).localeCompare(b.report.metadata.date || b.archivedAt)
    );

    saveLongitudinalSessions(next);
    if (showFeedback) {
      setFeedback(existingIndex >= 0
        ? '✓ SESSÃO ATUALIZADA NO HISTÓRICO LONGITUDINAL'
        : '✓ SESSÃO ADICIONADA AO HISTÓRICO LONGITUDINAL');
    }
  }

  function removeLongitudinalSession(id: string) {
    saveLongitudinalSessions(longitudinalSessions.filter((item) => item.id !== id));
    setFeedback('SESSÃO REMOVIDA DO HISTÓRICO LONGITUDINAL');
  }

  function clearLongitudinalHistory() {
    if (longitudinalSessions.length === 0) return;
    const confirmed = window.confirm(
      'APAGAR TODO O HISTÓRICO LONGITUDINAL DESTE NAVEGADOR? ESTA AÇÃO NÃO PODE SER DESFEITA.'
    );
    if (!confirmed) return;
    saveLongitudinalSessions([]);
    setFeedback('HISTÓRICO LONGITUDINAL APAGADO');
  }

  function buildSessionReport(): SessionReport {
    return {
      metadata: sessionMetadata,
      scenes: history,
      storyArchive,
      personNames,
      autobiographicalRecords,
      socialInteractions,
      mediationEvents,
      mediationAssessments,
      mentalStates,
      informationAccess,
      temporalEvents,
      weeklyEvents,
      dayPeriod,
      clockHour,
      relativeWeek,
      monthOffset,
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

  function restoreSessionReport(report: SessionReport, message = 'SESSÃO RESTAURADA') {
    const scenes = report.scenes.length > 0 ? report.scenes : [initialScene];
    setSessionMetadata({
      ...report.metadata,
      facilitator: report.metadata.facilitator ?? '',
    });
    setHistory(scenes);
    setSceneEditUndo([]);
    setSceneEditRedo([]);
    setStoryArchive(report.storyArchive ?? []);
    setPersonNames(report.personNames ?? {});
    setAutobiographicalRecords(report.autobiographicalRecords ?? []);
    setSocialInteractions(report.socialInteractions ?? []);
    setHistoryIndex(Math.max(0, scenes.length - 1));
    setMediationEvents(report.mediationEvents);
    setMediationAssessments(report.mediationAssessments);
    setMentalStates(report.mentalStates);
    setInformationAccess(report.informationAccess);
    setTemporalEvents(report.temporalEvents ?? []);
    setWeeklyEvents(report.weeklyEvents ?? []);
    setDayPeriod(report.dayPeriod ?? 'morning');
    setClockHour(report.clockHour ?? 8);
    setRelativeWeek(report.relativeWeek ?? 'current');
    setMonthOffset(report.monthOffset ?? 0);
    setSupportConfig(report.supportConfig);
    setActivityMode(report.activityMode ?? 'free');
    setDirectedActivity(report.directedActivity ?? {
      instruction: 'ESCOLHA A AÇÃO',
      expectedUnknown: false,
      allowUnknown: true,
      allowNotUnderstood: true,
    });
    setDraft({ verbId: '' });
    setFeedback(message);
    setCompareMode('now');
    setReportOpen(false);
    setActiveModule('scenario');
    setSelectedEntityId(null);
    setDraggingEntityId(null);
    setRelationReferenceId(null);
    setSpatialTaskActive(false);
    setSpatialIssueField(null);
    setTemporalTaskActive(false);
    setWeekTaskActive(false);
    setWeekOptionDays([]);
    setNarrativeTaskActive(false);
    setCausalTaskActive(false);
    setMentalTaskActive(false);
    setPerspectiveTaskActive(false);
    setAccessTaskActive(false);
    setAccessAnswerPersonIds([]);
    setHiddenInfoTaskActive(false);
    setHiddenInfoAnswerPersonIds([]);
    setRelocationTaskActive(false);
    setRelocationLocationOptions([]);
    setSequenceCurrentLocationOptions([]);
    setSequenceSearchLocationOptions([]);
    setRelocationSequenceActive(false);
  }

  function hasMeaningfulSessionData() {
    return Boolean(
      history.length > 1 ||
      storyArchive.length > 0 ||
      mediationEvents.length > 0 ||
      mediationAssessments.length > 0 ||
      mentalStates.length > 0 ||
      informationAccess.length > 0 ||
      temporalEvents.length > 0 ||
      weeklyEvents.length > 0 ||
      autobiographicalRecords.length > 0 ||
      socialInteractions.length > 0 ||
      sessionMetadata.participant.trim() ||
      sessionMetadata.facilitator.trim() ||
      sessionMetadata.objective.trim() ||
      sessionMetadata.notes.trim()
    );
  }

  function confirmPendingImport() {
    if (!pendingImportReport) return;
    restoreSessionReport(pendingImportReport, 'SESSÃO IMPORTADA E RESTAURADA');
    setPendingImportReport(null);
    setPendingImportName('');
  }

  function cancelPendingImport() {
    setPendingImportReport(null);
    setPendingImportName('');
    setFeedback('IMPORTAÇÃO CANCELADA - SESSÃO ATUAL PRESERVADA');
  }

  function saveLocalSessionNow() {
    try {
      const envelope: LocalSessionEnvelope = {
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        report: buildSessionReport(),
      };
      window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(envelope));
      setLocalSavedAt(envelope.savedAt);
      setLocalStorageStatus('saved');
      setFeedback('✓ SESSÃO SALVA NESTE NAVEGADOR');
    } catch {
      setLocalStorageStatus('error');
      setFeedback('❌ NÃO FOI POSSÍVEL SALVAR NESTE NAVEGADOR');
    }
  }

  async function importSessionJson(file: File) {
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isSessionReport(parsed)) {
        setFeedback('ARQUIVO INVÁLIDO - NÃO É UMA SESSÃO NEXO COMPATÍVEL');
        return;
      }
      if (hasMeaningfulSessionData()) {
        setPendingImportReport(parsed);
        setPendingImportName(file.name);
        setFeedback('CONFIRME ANTES DE SUBSTITUIR A SESSÃO ATUAL');
        return;
      }
      restoreSessionReport(parsed, 'SESSÃO IMPORTADA E RESTAURADA');
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

  function dayPeriodLabel(period: DayPeriod) {
    if (period === 'morning') return 'MANHÃ';
    if (period === 'afternoon') return 'TARDE';
    return 'NOITE';
  }

  function dayPeriodSymbol(period: DayPeriod) {
    if (period === 'morning') return '☀';
    if (period === 'afternoon') return '◐';
    return '☾';
  }

  function relativeWeekLabel(value: RelativeWeek) {
    if (value === 'previous') return 'SEMANA PASSADA';
    if (value === 'next') return 'PRÓXIMA SEMANA';
    return 'ESTA SEMANA';
  }

  function getRelativeWeekRange(value: RelativeWeek) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + (value === 'previous' ? -7 : value === 'next' ? 7 : 0));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const format = (date: Date) =>
      `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${format(start)} - ${format(end)}`;
  }

  function getMonthCalendar(offset = 0) {
    const base = new Date();
    const year = base.getFullYear();
    const month = base.getMonth() + offset;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leading = first.getDay();
    const days: Array<{ day?: number; isToday?: boolean }> = [];

    for (let index = 0; index < leading; index += 1) days.push({});
    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      days.push({
        day,
        isToday: date.toDateString() === base.toDateString(),
      });
    }

    return {
      label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
        .format(first)
        .toUpperCase(),
      days,
    };
  }

  function registerExpandedTime(label: string) {
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: 'correct',
      label: `TEMPO AMPLIADO - ${label}`,
      createdAt: new Date().toISOString(),
    }]);
    setFeedback(`✓ ${label}`);
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
    const targetCount =
      supportConfig.difficulty === 1 ? 2 :
      supportConfig.difficulty === 2 ? 3 :
      4;
    const availableScenes = availableNarrativeScenes();
    const scenes = availableScenes.slice(0, targetCount);
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

    if (narrativeTask.kind === 'order') {
      setNarrativeOptionIds(shuffledCopy(orderedSceneIds));
    } else {
      const expectedId = narrativeTask.kind === 'first' ? orderedSceneIds[0] : orderedSceneIds[1];
      const baseOptions = takeOptionsWithExpected(
        expectedId,
        orderedSceneIds,
        Math.min(supportConfig.optionCount, orderedSceneIds.length),
      );

      if (supportConfig.useDistractors) {
        const distractorIds = availableScenes
          .slice(targetCount)
          .map((scene) => scene.id)
          .filter((id) => !baseOptions.includes(id));
        const withDistractors = [
          ...baseOptions,
          ...shuffledCopy(distractorIds).slice(0, Math.max(0, supportConfig.optionCount - baseOptions.length)),
        ];
        setNarrativeOptionIds(shuffledCopy(withDistractors.slice(0, supportConfig.optionCount)));
      } else {
        setNarrativeOptionIds(baseOptions);
      }
    }

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

  function getLimitedPeopleOptions(requiredPersonIds: string[] = []) {
    const required = people.filter((person) => requiredPersonIds.includes(person.instanceId));
    const others = people.filter((person) => !requiredPersonIds.includes(person.instanceId));
    const limit = Math.max(required.length, Math.min(supportConfig.optionCount, people.length));
    return shuffledCopy([
      ...required,
      ...shuffledCopy(others).slice(0, Math.max(0, limit - required.length)),
    ]);
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

  function buildLocationOptions(
    expectedLocationId: string | null,
    includeUnknown: boolean,
  ) {
    const UNKNOWN = '__unknown__';
    const basePool = [
      relocationTask.initialLocationId,
      relocationTask.currentLocationId,
    ].filter((id): id is string => Boolean(id));

    const extraPlaces =
      supportConfig.useDistractors && supportConfig.difficulty >= 2
        ? placesAndSeats
            .map((place) => place.instanceId)
            .filter((id) => !basePool.includes(id))
        : [];

    const unknownOption = includeUnknown ? [UNKNOWN] : [];
    const pool = [...new Set([...basePool, ...unknownOption, ...extraPlaces])];
    const expectedKey = expectedLocationId ?? UNKNOWN;

    const minimumCount =
      supportConfig.difficulty === 1 ? 2 :
      supportConfig.difficulty === 2 ? Math.min(3, supportConfig.optionCount) :
      supportConfig.optionCount;

    const count = Math.max(
      2,
      Math.min(
        pool.length,
        Math.max(minimumCount, Math.min(supportConfig.optionCount, pool.length)),
      ),
    );

    return takeOptionsWithExpected(expectedKey, pool, count);
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
    const expected = expectedSearchLocationForPerson(relocationTask.referencePersonId);
    setRelocationLocationOptions(buildLocationOptions(expected, true));
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
    const isValidUnknown = correct && expected === null && locationId === null;
    setFeedback(
      correct
        ? (isValidUnknown ? '✓ NÃO SEI - INFORMAÇÃO INSUFICIENTE' : '✓ CORRETO')
        : '❌ ERRADO',
    );
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: isValidUnknown ? 'unknown' : (correct ? 'correct' : 'error'),
      label: isValidUnknown
        ? 'MUDANÇA DE LOCAL - NÃO SEI - INFORMAÇÃO INSUFICIENTE'
        : 'MUDANÇA DE LOCAL - ONDE TEM BASE PARA PROCURAR',
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
    setSequenceCurrentLocationOptions(
      buildLocationOptions(relocationTask.currentLocationId ?? null, false),
    );
    setSequenceSearchLocationOptions([]);
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
      if (relocationTask.referencePersonId) {
        setSequenceSearchLocationOptions(
          buildLocationOptions(
            expectedSearchLocationForPerson(relocationTask.referencePersonId),
            true,
          ),
        );
      }
    }
  }

  function answerSequenceSearchLocation(locationId: string | null) {
    if (!relocationSequenceActive || relocationSequence.step !== 'person_search' || !relocationTask.referencePersonId) return;
    const expected = expectedSearchLocationForPerson(relocationTask.referencePersonId);
    const correct = locationId === expected;
    const isValidUnknown = correct && expected === null && locationId === null;
    setFeedback(
      correct
        ? (isValidUnknown ? '✓ NÃO SEI - SEQUÊNCIA CONCLUÍDA' : '✓ CORRETO - SEQUÊNCIA CONCLUÍDA')
        : '❌ ERRADO',
    );
    setMediationEvents((events) => [...events, {
      id: crypto.randomUUID(),
      type: isValidUnknown ? 'unknown' : (correct ? 'correct' : 'error'),
      label: isValidUnknown
        ? 'SEQUÊNCIA PERSPECTIVA - NÃO SEI - INFORMAÇÃO INSUFICIENTE'
        : 'SEQUÊNCIA PERSPECTIVA - LOCAL DE PROCURA',
      createdAt: new Date().toISOString(),
    }]);

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

  function addToScene(asset: SceneAsset, position?: { x: number; y: number }) {
    if (activeModule !== 'scenario') {
      setActiveModule('scenario');
      setReportOpen(false);
    }
    if (historyIndex !== history.length - 1) {
      setFeedback('⚠ NÃO FOI POSSÍVEL ADICIONAR - VOLTE PARA A CENA MAIS ATUAL');
      return;
    }
    setSceneEditUndo((items) => [...items, cloneScene(currentScene)]);
    setSceneEditRedo([]);
    const entity = {
      ...toEntity(asset, currentScene.entities.length),
      ...(position ? { x: position.x, y: position.y } : {}),
    };
    const editedScene: SceneState = {
      ...currentScene,
      entities: [...currentScene.entities, entity],
    };
    setHistory((current) =>
      current.map((scene, index) => index === historyIndex ? editedScene : scene),
    );
    setCompareMode('now');
    setSelectedEntityId(entity.instanceId);
    setLastAddedAssetId(asset.id);
    setFeedback(`✓ ${asset.label} ADICIONADO À CENA`);
    window.setTimeout(() => setLastAddedAssetId((id) => id === asset.id ? null : id), 1200);
  }

  function handleAssetDragStart(asset: SceneAsset) {
    setFeedback(`SOLTE ${asset.label} NO CENÁRIO`);
  }

  function handleAssetDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const assetId = event.dataTransfer.getData('application/x-nexo-asset');
    const asset = assets.find((item) => item.id === assetId);
    const point = pointerToPercent(event.clientX, event.clientY);
    if (!asset || !point) return;
    addToScene(asset, point);
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

  function handleScenePointerUp(clientX?: number, clientY?: number) {
    const beforeDrag = dragStartSceneRef.current;
    if (beforeDrag && draggingEntityId) {
      const beforeEntity = beforeDrag.entities.find((entity) => entity.instanceId === draggingEntityId);
      let afterEntity = currentScene.entities.find((entity) => entity.instanceId === draggingEntityId);
      const dropPoint = clientX === undefined || clientY === undefined ? null : pointerToPercent(clientX, clientY);

      if (afterEntity?.category === 'person' && dropPoint) {
        const restingPlace = currentScene.entities.find((entity) =>
          ['CAMA', 'SOFÁ'].includes(entity.label)
          && Math.abs(entity.x - dropPoint.x) <= 16
          && Math.abs(entity.y - dropPoint.y) <= 18,
        );

        setHistory((current) => current.map((scene, index) => {
          if (index !== historyIndex) return scene;
          return {
            ...scene,
            actionLabel: restingPlace ? 'DEITAR' : scene.actionLabel,
            entities: scene.entities.map((entity) => entity.instanceId === draggingEntityId
              ? restingPlace
                ? {
                    ...entity,
                    x: restingPlace.x,
                    y: restingPlace.y,
                    posture: 'lying',
                    activity: 'lying',
                    locationId: restingPlace.instanceId,
                  }
                : {
                    ...entity,
                    x: Math.max(5, Math.min(95, dropPoint.x)),
                    y: Math.max(8, Math.min(88, dropPoint.y)),
                    posture: 'standing',
                    activity: undefined,
                    locationId: undefined,
                  }
              : entity),
          };
        }));

        afterEntity = restingPlace
          ? { ...afterEntity, x: restingPlace.x, y: restingPlace.y, posture: 'lying' }
          : { ...afterEntity, x: dropPoint.x, y: dropPoint.y, posture: 'standing' };
        if (restingPlace) setFeedback(`✓ ${afterEntity.label} DEITOU EM ${restingPlace.label}`);
      }

      if (beforeEntity && afterEntity && (
        beforeEntity.x !== afterEntity.x
        || beforeEntity.y !== afterEntity.y
        || beforeEntity.posture !== afterEntity.posture
        || beforeEntity.locationId !== afterEntity.locationId
      )) {
        setSceneEditUndo((items) => [...items, beforeDrag]);
        setSceneEditRedo([]);
      }
    }
    dragStartSceneRef.current = null;
    setDraggingEntityId(null);
  }

  function handleSceneBackgroundPointerDown(event: React.PointerEvent<HTML…17381 tokens truncated…NTO INTERNO ALÉM DISSO.
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

          <section className="social-builder">
            <div className="builder-title">
              <p className="section-kicker">NÓS</p>
              <strong>RELAÇÃO E AÇÃO COMPARTILHADA</strong>
            </div>

            <div className="social-grid">
              <label>
                <span>EU</span>
                <select
                  value={socialDraft.selfPersonId ?? ''}
                  onChange={(event) => setSocialDraft((current) => ({
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
                  value={socialDraft.otherPersonId ?? ''}
                  onChange={(event) => setSocialDraft((current) => ({
                    ...current,
                    otherPersonId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {people
                    .filter((person) => person.instanceId !== socialDraft.selfPersonId)
                    .map((person) => (
                      <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                    ))}
                </select>
              </label>

              <label>
                <span>QUEM É?</span>
                <select
                  value={socialDraft.role ?? 'AMIGO'}
                  onChange={(event) => setSocialDraft((current) => ({
                    ...current,
                    role: event.target.value as SocialRole,
                  }))}
                >
                  {(['MÃE','PAI','IRMÃO','IRMÃ','SOBRINHO','SOBRINHA','PROFESSORA','AMIGO','AMIGA'] as SocialRole[]).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>O QUE FAZEM JUNTOS?</span>
                <select
                  value={socialDraft.action ?? 'CONVERSAR'}
                  onChange={(event) => setSocialDraft((current) => ({
                    ...current,
                    action: event.target.value as SharedAction,
                  }))}
                >
                  {(['AJUDAR','CONVERSAR','BRINCAR','TRABALHAR','REZAR','COZINHAR','IR JUNTO'] as SharedAction[]).map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="social-preview">
              <div>
                <span>EU</span>
                <strong>{autobiographicalEntityLabel(socialDraft.selfPersonId)}</strong>
              </div>
              <div className="social-link">+</div>
              <div>
                <span>{socialDraft.role ?? 'VÍNCULO'}</span>
                <strong>{autobiographicalEntityLabel(socialDraft.otherPersonId)}</strong>
              </div>
              <div className="social-link">→</div>
              <div>
                <span>NÓS</span>
                <strong>{socialDraft.action ?? 'AÇÃO'}</strong>
              </div>
            </div>

            <button className="social-save" type="button" onClick={saveSocialInteraction}>
              REGISTRAR NÓS
            </button>

            {socialInteractions.length > 0 && (
              <div className="social-records">
                {socialInteractions.map((interaction, index) => (
                  <article key={interaction.id}>
                    <span>NÓS {index + 1}</span>
                    <strong>
                      {autobiographicalEntityLabel(interaction.selfPersonId)} + {autobiographicalEntityLabel(interaction.otherPersonId)}
                    </strong>
                    <small>{interaction.role} - {interaction.action}</small>
                  </article>
                ))}
              </div>
            )}
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

          <section className="autobiographical-builder">
            <div className="builder-title">
              <p className="section-kicker">NARRATIVA PESSOAL</p>
              <strong>O QUE ACONTECEU COM VOCÊ?</strong>
            </div>

            <p className="autobiographical-intro">
              USE AS CENAS DA HISTÓRIA ATUAL PARA ORGANIZAR UMA EXPERIÊNCIA REAL.
            </p>

            <div className="autobiographical-grid">
              <label>
                <span>QUEM</span>
                <select
                  value={autobiographicalDraft.personId ?? ''}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    personId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {autobiographicalPeople.map((person) => (
                    <option key={person.instanceId} value={person.instanceId}>{person.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>ONDE</span>
                <select
                  value={autobiographicalDraft.placeId ?? ''}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    placeId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {autobiographicalPlaces.map((place) => (
                    <option key={place.instanceId} value={place.instanceId}>{place.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>QUANDO</span>
                <select
                  value={autobiographicalDraft.when ?? 'today'}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    when: event.target.value as TemporalDay,
                  }))}
                >
                  <option value="yesterday">ONTEM</option>
                  <option value="today">HOJE</option>
                  <option value="tomorrow">AMANHÃ</option>
                </select>
              </label>

              <label>
                <span>PRIMEIRO</span>
                <select
                  value={autobiographicalDraft.firstSceneId ?? ''}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    firstSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>
                      CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>DEPOIS</span>
                <select
                  value={autobiographicalDraft.nextSceneId ?? ''}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    nextSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>
                      CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>COMO TERMINOU</span>
                <select
                  value={autobiographicalDraft.endingSceneId ?? ''}
                  onChange={(event) => setAutobiographicalDraft((current) => ({
                    ...current,
                    endingSceneId: event.target.value || undefined,
                  }))}
                >
                  <option value="">?</option>
                  {history.slice(1).map((scene, index) => (
                    <option key={scene.id} value={scene.id}>
                      CENA {index + 1} - {scene.actionLabel ?? 'AÇÃO'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="autobiographical-sequence">
              <div>
                <span>QUEM</span>
                <strong>{autobiographicalEntityLabel(autobiographicalDraft.personId)}</strong>
              </div>
              <div>
                <span>ONDE</span>
                <strong>{autobiographicalEntityLabel(autobiographicalDraft.placeId)}</strong>
              </div>
              <div>
                <span>QUANDO</span>
                <strong>{temporalLabel(autobiographicalDraft.when)}</strong>
              </div>
              <div>
                <span>1</span>
                <strong>{autobiographicalSceneLabel(autobiographicalDraft.firstSceneId)}</strong>
              </div>
              <div>
                <span>2</span>
                <strong>{autobiographicalSceneLabel(autobiographicalDraft.nextSceneId)}</strong>
              </div>
              <div>
                <span>3</span>
                <strong>{autobiographicalSceneLabel(autobiographicalDraft.endingSceneId)}</strong>
              </div>
            </div>

            <button
              className="autobiographical-save"
              type="button"
              onClick={saveAutobiographicalRecord}
              disabled={history.length < 4}
            >
              SALVAR RELATO
            </button>

            {history.length < 4 && (
              <p className="autobiographical-note">
                CRIE PELO MENOS TRÊS CENAS PARA ORGANIZAR PRIMEIRO - DEPOIS - COMO TERMINOU.
              </p>
            )}

            {autobiographicalRecords.length > 0 && (
              <div className="autobiographical-records">
                {autobiographicalRecords.map((record, index) => (
                  <article key={record.id}>
                    <span>RELATO {index + 1}</span>
                    <strong>
                      {autobiographicalEntityLabel(record.personId)} - {autobiographicalEntityLabel(record.placeId)} - {temporalLabel(record.when)}
                    </strong>
                    <small>
                      {autobiographicalSceneLabel(record.firstSceneId)} - {autobiographicalSceneLabel(record.nextSceneId)} - {autobiographicalSceneLabel(record.endingSceneId)}
                    </small>
                  </article>
                ))}
              </div>
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

          <section className="expanded-time-builder">
            <div className="builder-title">
              <p className="section-kicker">TEMPO AMPLIADO</p>
              <strong>PERÍODO DO DIA - HORA - SEMANA - MÊS</strong>
            </div>

            <div className="day-period-grid">
              {(['morning', 'afternoon', 'night'] as DayPeriod[]).map((period) => (
                <button
                  type="button"
                  key={period}
                  className={dayPeriod === period ? 'active' : ''}
                  onClick={() => {
                    setDayPeriod(period);
                    registerExpandedTime(dayPeriodLabel(period));
                  }}
                >
                  <span>{dayPeriodSymbol(period)}</span>
                  <strong>{dayPeriodLabel(period)}</strong>
                </button>
              ))}
            </div>

            <div className="clock-builder">
              <div className="clock-face" aria-label={`${clockHour} horas`}>
                <span className="clock-number n12">12</span>
                <span className="clock-number n3">3</span>
                <span className="clock-number n6">6</span>
                <span className="clock-number n9">9</span>
                <span
                  className="clock-hand hour"
                  style={{ transform: `translateX(-50%) rotate(${(clockHour % 12) * 30}deg)` }}
                />
                <span className="clock-center" />
              </div>
              <div className="clock-controls">
                <label>
                  <span>HORA</span>
                  <select
                    value={clockHour}
                    onChange={(event) => setClockHour(Number(event.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => registerExpandedTime(`${String(clockHour).padStart(2, '0')}:00`)}>
                  REGISTRAR HORA
                </button>
              </div>
            </div>

            <div className="relative-week-grid">
              {(['previous', 'current', 'next'] as RelativeWeek[]).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={relativeWeek === value ? 'active' : ''}
                  onClick={() => {
                    setRelativeWeek(value);
                    registerExpandedTime(relativeWeekLabel(value));
                  }}
                >
                  <strong>{relativeWeekLabel(value)}</strong>
                  <small>{getRelativeWeekRange(value)}</small>
                </button>
              ))}
            </div>

            <div className="month-calendar">
              <header>
                <button type="button" onClick={() => setMonthOffset((value) => value - 1)}>←</button>
                <strong>{getMonthCalendar(monthOffset).label}</strong>
                <button type="button" onClick={() => setMonthOffset((value) => value + 1)}>→</button>
              </header>
              <div className="month-weekdays">
                {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="month-days">
                {getMonthCalendar(monthOffset).days.map((item, index) => (
                  <div key={index} className={item.isToday ? 'today' : ''}>
                    {item.day ?? ''}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="month-current"
                onClick={() => setMonthOffset(0)}
              >
                VOLTAR AO MÊS ATUAL
              </button>
            </div>
          </section>

          <section className="week-builder">
            <div className="builder-title">
              <p className="section-kicker">SEMANA VISUAL</p>
              <strong>DOMINGO → SÁBADO</strong>
            </div>

            <div className="week-grid">
              {getWeekDays()
                .filter(({ weekday }) => !weekTaskActive || weekOptionDays.includes(weekday))
                .map(({ weekday, date, isToday }) => (
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
                    const expected = expectedWeekdayForTask();
                    if (expected === null) {
                      setFeedback('ATIVIDADE INCOMPLETA');
                      return;
                    }
                    const allDays = [0,1,2,3,4,5,6] as Weekday[];
                    setWeekOptionDays(
                      takeOptionsWithExpected(
                        expected,
                        allDays,
                        Math.min(supportConfig.optionCount, allDays.length),
                      ),
                    );
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
              <strong>ONTEM - HOJE - AMANHÃ</strong>
            </div>

            <div className="temporal-strip" aria-label="Linha temporal">
              {(['yesterday', 'today', 'tomorrow'] as TemporalDay[])
                .filter((day) => !temporalTaskActive || temporalOptionDays.includes(day))
                .map((day) => (
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
                  const allDays: TemporalDay[] = ['yesterday', 'today', 'tomorrow'];
                  setTemporalOptionDays(
                    takeOptionsWithExpected(
                      expectedTemporalDay,
                      allDays,
                      Math.min(supportConfig.optionCount, allDays.length),
                    ),
                  );
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

          <section className={`spatial-task-builder ${spatialTaskActive ? 'is-active' : ''}`}>
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

              <label className={spatialIssueField === 'subject' ? 'task-field issue' : 'task-field'}>
                <span>{spatialTask.kind === 'place' ? 'MOVER' : 'RESPOSTA-ALVO'}</span>
                <select
                  value={spatialTask.subjectId ?? ''}
                  onChange={(event) => {
                    setSpatialTask((current) => ({
                      ...current,
                      subjectId: event.target.value || undefined,
                    }));
                    setSpatialIssueField(null);
                    setFeedback(null);
                  }}
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

              <label className={spatialIssueField === 'reference' ? 'task-field issue' : 'task-field'}>
                <span>REFERÊNCIA</span>
                <select
                  value={spatialTask.referenceId ?? ''}
                  onChange={(event) => {
                    setSpatialTask((current) => ({
                      ...current,
                      referenceId: event.target.value || undefined,
                    }));
                    setSpatialIssueField(null);
                    setFeedback(null);
                  }}
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
              {spatialTaskSubject && spatialTaskReference && (
                <div className={`spatial-instruction-visual relation-${spatialTask.relation}`} aria-hidden="true">
                  <div className="instruction-subject">
                    <AssetVisual asset={spatialTaskSubject} size={72} />
                  </div>
                  <div className="instruction-relation-mark">
                    {spatialTask.relation === 'near' ? '↔' :
                      spatialTask.relation === 'far' ? '⟷' :
                      spatialTask.relation === 'above' ? '↑' :
                      spatialTask.relation === 'below' ? '↓' :
                      spatialTask.relation === 'inside' ? '◎' : '↗'}
                  </div>
                  <div className="instruction-reference">
                    <AssetVisual asset={spatialTaskReference} size={72} />
                  </div>
                </div>
              )}
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
              <button type="button" className="mediator-only" onClick={startSpatialTask}>
                {spatialTaskActive ? 'REINICIAR ATIVIDADE' : 'INICIAR ATIVIDADE'}
              </button>
              {spatialTask.kind === 'place' && (
                <button type="button" disabled={!spatialTaskActive} onClick={validateSpatialTask}>
                  VERIFICAR
                </button>
              )}
            </div>

            {spatialTaskActive && spatialTask.kind === 'identify' && (
              <div className={spatialIssueField === 'subject' ? 'identify-options issue' : 'identify-options'}>
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
                  <div className={actionIssueRole === 'actor' ? 'sentence-slot issue' : 'sentence-slot'}>
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
                      <div className={actionIssueRole === 'object' ? 'sentence-slot issue' : 'sentence-slot'}>
                        <span className="slot-label">OBJETO</span>
                        <strong>{findLabel(currentScene, draft.objectId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('targetPerson') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className={actionIssueRole === 'targetPerson' ? 'sentence-slot issue' : 'sentence-slot'}>
                        <span className="slot-label">PARA QUEM</span>
                        <strong>{findLabel(currentScene, draft.targetPersonId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('destination') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className={actionIssueRole === 'destination' ? 'sentence-slot issue' : 'sentence-slot'}>
                        <span className="slot-label">PARA ONDE</span>
                        <strong>{findLabel(currentScene, draft.destinationId)}</strong>
                      </div>
                    </>
                  )}
                  {selectedRule.requires.includes('seat') && (
                    <>
                      <div className="sentence-arrow">→</div>
                      <div className={actionIssueRole === 'seat' ? 'sentence-slot issue' : 'sentence-slot'}>
                        <span className="slot-label">ONDE</span>
                        <strong>{findLabel(currentScene, draft.seatId)}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="visual-picker">
                  <section className={actionIssueRole === 'actor' ? 'picker-section issue' : 'picker-section'}>
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
                    <section className={actionIssueRole === 'object' ? 'picker-section issue' : 'picker-section'}>
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
                    <section className={actionIssueRole === 'targetPerson' ? 'picker-section issue' : 'picker-section'}>
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
                    <section className={actionIssueRole === 'destination' ? 'picker-section issue' : 'picker-section'}>
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
                    <section className={actionIssueRole === 'seat' ? 'picker-section issue' : 'picker-section'}>
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

            {feedback && (
              <div
                className={feedback.startsWith('❌') ? 'feedback error' : 'feedback success'}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {feedback}
              </div>
            )}
          </section>

          <footer className="stage-footer" aria-label="Respostas e comparação temporal">
            <button type="button" className={compareMode === 'before' ? 'active' : ''} onClick={() => setCompareMode('before')}>ANTES</button>
            <button type="button" className={compareMode === 'now' ? 'active' : ''} onClick={() => setCompareMode('now')}>AGORA</button>
            <button type="button" className={compareMode === 'after' ? 'active' : ''} onClick={() => setCompareMode('after')}>DEPOIS</button>
            <button type="button" className={compareMode === 'compare' ? 'active' : ''} onClick={() => setCompareMode('compare')}>ANTES × DEPOIS</button>
            <button type="button" onClick={() => {
              setFeedback('❌ RESPOSTA INCORRETA');
              setMediationEvents((events) => [...events, {
                id: crypto.randomUUID(),
                type: 'error',
                errorKind: 'incorrect',
                label: 'RESPOSTA INCORRETA',
                createdAt: new Date().toISOString(),
              }]);
            }} className="mediator-only">❌ ERRADO</button>
            {(activityMode !== 'directed' || directedActivity.allowUnknown) && (
              <button type="button" className="response-button" onClick={answerUnknown}>
                <ResponseVisual type="unknown" size={68} />
                <span>NÃO SEI</span>
              </button>
            )}
            {(activityMode !== 'directed' || directedActivity.allowNotUnderstood) && (
              <button type="button" className="response-button" onClick={answerNotUnderstood}>
                <ResponseVisual type="not-understood" size={68} />
                <span>NÃO ENTENDI</span>
              </button>
            )}
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
            {isReplaying ? '■ PARAR HISTÓRIA' : '▶ REPRODUZIR HISTÓRIA'}
          </button>
          <small className="replay-help">MOSTRA AS CENAS EM ORDEM, UMA APÓS A OUTRA.</small>
        </aside>
      </section>

      {helpOpen && (
        <div className="help-overlay no-print" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <section className="help-center">
            <header>
              <div>
                <p className="section-kicker">CENTRAL DE AJUDA</p>
                <h2 id="help-title">{HELP_MODULES[helpTopic].title}</h2>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar ajuda">FECHAR</button>
            </header>

            <nav className="help-menu" aria-label="Tópicos de ajuda">
              {([
                ['general', 'VISÃO GERAL'],
                ['scenario', 'CENÁRIO'],
                ['time', 'TEMPO'],
                ['narrative', 'NARRATIVA'],
                ['perspective', 'PERSPECTIVA'],
                ['missions', 'MISSÕES'],
                ['report', 'RELATÓRIO'],
                ['storage', 'SALVAMENTO'],
                ['accessibility', 'ACESSIBILIDADE'],
              ] as const).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={helpTopic === id ? 'active' : ''}
                  onClick={() => setHelpTopic(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="help-content">
              <p className="help-purpose">{HELP_MODULES[helpTopic].purpose}</p>
              <section>
                <h3>COMO USAR</h3>
                <ol>
                  {HELP_MODULES[helpTopic].howTo.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </section>
              <section>
                <h3>O QUE OBSERVAR</h3>
                <ul>
                  {HELP_MODULES[helpTopic].observe.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            </div>

            <footer>
              {['scenario', 'time', 'narrative', 'perspective', 'missions', 'report'].includes(helpTopic) && (
                <button
                  type="button"
                  onClick={() => {
                    const module = helpTopic as NexoModule;
                    setActiveModule(module);
                    setReportOpen(module === 'report');
                    setHelpOpen(false);
                  }}
                >
                  IR PARA ESTE MÓDULO
                </button>
              )}
              <button type="button" className="help-tour-button" onClick={startTour}>INICIAR TOUR COMPLETO</button>
            </footer>
          </section>
        </div>
      )}

      {tourStep !== null && (
        <div className="tour-card no-print" role="dialog" aria-live="polite" aria-label="Tour do Mediador">
          <span>TOUR DO MEDIADOR</span>
          <strong>{TOUR_STEPS[tourStep].title}</strong>
          <p>{TOUR_STEPS[tourStep].text}</p>
          <div className="tour-actions">
            <button
              type="button"
              disabled={tourStep === 0}
              onClick={() => setTourStep((step) => step === null ? null : Math.max(0, step - 1))}
            >
              ANTERIOR
            </button>
            <button type="button" onClick={closeTour}>ENCERRAR</button>
            {tourStep < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setTourStep((step) => step === null ? null : Math.min(TOUR_STEPS.length - 1, step + 1))}
              >
                PRÓXIMO
              </button>
            ) : (
              <button type="button" onClick={closeTour}>CONCLUIR</button>
            )}
          </div>
        </div>
      )}

      <section className="product-classification no-print" aria-label="Classificação do NEXO">
        <div>
          <span>CLASSIFICAÇÃO DO RECURSO</span>
          <strong>RECURSO PEDAGÓGICO ACESSÍVEL DIGITAL DE MEDIAÇÃO VISUAL E APOIO À COMUNICAÇÃO</strong>
        </div>
        <p>
          DESENVOLVIDO SOB PRINCÍPIOS DE TECNOLOGIA ASSISTIVA, ACESSIBILIDADE, AUTONOMIA E PARTICIPAÇÃO.
          CONCEBIDO INICIALMENTE PARA MEDIAÇÃO VISUAL COM PESSOA SURDA E APLICÁVEL TAMBÉM A CONTEXTOS
          COM NECESSIDADES COMPLEXAS DE COMUNICAÇÃO E OUTRAS BARREIRAS COMUNICACIONAIS.
        </p>
        <small>
          NÃO É INSTRUMENTO DIAGNÓSTICO E NÃO SUBSTITUI AVALIAÇÃO CLÍNICA, FONOAUDIOLÓGICA,
          PEDAGÓGICA OU OUTRA AVALIAÇÃO PROFISSIONAL QUANDO NECESSÁRIA.
        </small>
      </section>

      <section className="accessibility-note no-print" aria-label="Acessibilidade">
        <strong>ACESSIBILIDADE</strong>
        <span>VLibras oferece tradução automática como apoio. As atividades essenciais do NEXO continuam visuais e independem do widget.</span>
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
      <footer className="app-footer">
        <div>
          <strong>NEXO - SISTEMA VISUAL DE AÇÃO E NARRATIVA</strong>
          <span>RECURSO PEDAGÓGICO ACESSÍVEL DIGITAL DE MEDIAÇÃO VISUAL E APOIO À COMUNICAÇÃO</span>
        </div>
        <div>
          <span>DESENVOLVIDO POR COMPASS ROSE SYSTEMS</span>
          <a href="mailto:contato@compassrosesystems.com.br">CONTATO E SUPORTE: contato@compassrosesystems.com.br</a>
        </div>
        <small>
          CONCEBIDO INICIALMENTE PARA MEDIAÇÃO VISUAL COM PESSOA SURDA. PODE APOIAR OUTROS CONTEXTOS
          COM NECESSIDADES COMPLEXAS DE COMUNICAÇÃO E BARREIRAS COMUNICACIONAIS. DESENVOLVIDO SOB PRINCÍPIOS
          DE TECNOLOGIA ASSISTIVA E ACESSIBILIDADE. FERRAMENTA PEDAGÓGICA E OBSERVACIONAL, NÃO DIAGNÓSTICA.
        </small>
        <small>© 2026 COMPASS ROSE SYSTEMS - TODOS OS DIREITOS RESERVADOS.</small>
      </footer>
    </main>
  );
}
