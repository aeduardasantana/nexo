import type {
  ActionDraft,
  ActionExecution,
  EntityState,
  SceneState,
  VerbRule,
} from '../types/domain';

function cloneEntities(entities: EntityState[]): EntityState[] {
  return entities.map((entity) => ({ ...entity }));
}

export function validateAction(
  scene: SceneState,
  draft: ActionDraft,
  rule: VerbRule,
): string | null {
  const actor = scene.entities.find((entity) => entity.instanceId === draft.actorId);
  if (!actor) return 'FALTA QUEM';

  if (rule.requires.includes('object') && !draft.objectId) return 'FALTA OBJETO';
  if (rule.requires.includes('targetPerson') && !draft.targetPersonId) return 'FALTA OUTRA PESSOA';
  if (rule.requires.includes('destination') && !draft.destinationId) return 'FALTA DESTINO';
  if (rule.requires.includes('seat') && !draft.seatId) return 'FALTA ONDE SENTAR';

  const object = scene.entities.find((entity) => entity.instanceId === draft.objectId);

  switch (rule.id) {
    case 'stand':
      if (actor.posture !== 'sitting') return 'A PESSOA NÃO ESTÁ SENTADA';
      break;
    case 'take':
      if (!object || object.consumed) return 'OBJETO INDISPONÍVEL';
      if (object.ownerId) return 'OBJETO JÁ ESTÁ COM ALGUÉM';
      break;
    case 'give':
      if (!object || object.ownerId !== actor.instanceId) return 'A PESSOA NÃO ESTÁ COM O OBJETO';
      if (draft.targetPersonId === actor.instanceId) return 'ESCOLHA OUTRA PESSOA';
      break;
    case 'put':
      if (!object || object.ownerId !== actor.instanceId) return 'A PESSOA NÃO ESTÁ COM O OBJETO';
      break;
    case 'eat':
      if (!object || object.label !== 'COMIDA' || object.consumed) return 'ESCOLHA COMIDA';
      break;
    case 'drink':
      if (!object || !['ÁGUA', 'COPO'].includes(object.label) || object.consumed) return 'ESCOLHA ÁGUA OU COPO';
      break;
    default:
      break;
  }

  return null;
}

export function executeAction(
  scene: SceneState,
  draft: ActionDraft,
  rule: VerbRule,
): ActionExecution {
  const error = validateAction(scene, draft, rule);
  if (error) return { ok: false, error };

  const entities = cloneEntities(scene.entities);
  const actor = entities.find((entity) => entity.instanceId === draft.actorId)!;
  const object = entities.find((entity) => entity.instanceId === draft.objectId);

  actor.activity = undefined;

  switch (rule.id) {
    case 'walk':
      actor.activity = 'walking';
      break;
    case 'go':
      actor.locationId = draft.destinationId;
      actor.activity = 'going';
      break;
    case 'sit':
      actor.posture = 'sitting';
      actor.locationId = draft.seatId;
      break;
    case 'stand':
      actor.posture = 'standing';
      actor.locationId = undefined;
      break;
    case 'take':
      if (object) {
        object.ownerId = actor.instanceId;
        object.locationId = undefined;
      }
      actor.activity = 'taking';
      break;
    case 'give':
      if (object) object.ownerId = draft.targetPersonId;
      actor.activity = 'giving';
      break;
    case 'put':
      if (object) {
        object.ownerId = undefined;
        object.locationId = draft.destinationId;
      }
      actor.activity = 'putting';
      break;
    case 'eat':
      if (object) object.consumed = true;
      actor.activity = 'eating';
      break;
    case 'drink':
      if (object) object.consumed = true;
      actor.activity = 'drinking';
      break;
    case 'sleep':
      actor.posture = 'sleeping';
      actor.activity = 'sleeping';
      break;
    default:
      return { ok: false, error: 'AÇÃO NÃO IMPLEMENTADA' };
  }

  return {
    ok: true,
    scene: {
      id: crypto.randomUUID(),
      entities,
      actionLabel: rule.label,
    },
  };
}
