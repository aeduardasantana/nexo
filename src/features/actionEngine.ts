// @signature edufertanapo
import type {
  ActionDraft,
  ActionExecution,
  ActionErrorKind,
  EntityState,
  SceneState,
  VerbRule,
} from '../types/domain';

function cloneEntities(entities: EntityState[]): EntityState[] {
  return entities.map((entity) => ({ ...entity }));
}

function moveNear(source: EntityState, target: EntityState, offsetX = -10, offsetY = 0) {
  source.x = Math.max(4, Math.min(92, target.x + offsetX));
  source.y = Math.max(8, Math.min(88, target.y + offsetY));
}

export function validateAction(
  scene: SceneState,
  draft: ActionDraft,
  rule: VerbRule,
): { message: string; kind: ActionErrorKind; role?: 'actor' | 'object' | 'targetPerson' | 'destination' | 'seat' } | null {
  const actor = scene.entities.find((entity) => entity.instanceId === draft.actorId);
  if (!actor) return { message: 'FALTA QUEM', kind: 'incomplete', role: 'actor' };

  if (rule.requires.includes('object') && !draft.objectId) return { message: 'FALTA OBJETO', kind: 'incomplete', role: 'object' };
  if (rule.requires.includes('targetPerson') && !draft.targetPersonId) return { message: 'FALTA OUTRA PESSOA', kind: 'incomplete', role: 'targetPerson' };
  if (rule.requires.includes('destination') && !draft.destinationId) return { message: 'FALTA DESTINO', kind: 'incomplete', role: 'destination' };
  if (rule.requires.includes('seat') && !draft.seatId) return { message: 'FALTA ONDE SENTAR', kind: 'incomplete', role: 'seat' };

  const object = scene.entities.find((entity) => entity.instanceId === draft.objectId);

  switch (rule.id) {
    case 'stand':
      if (actor.posture !== 'sitting') return { message: 'A PESSOA NÃO ESTÁ SENTADA', kind: 'impossible', role: 'actor' };
      break;
    case 'take':
      if (!object || object.consumed) return { message: 'OBJETO INDISPONÍVEL', kind: 'impossible', role: 'object' };
      if (object.ownerId) return { message: 'OBJETO JÁ ESTÁ COM ALGUÉM', kind: 'impossible', role: 'object' };
      break;
    case 'give':
      if (!object || object.ownerId !== actor.instanceId) return { message: 'A PESSOA NÃO ESTÁ COM O OBJETO', kind: 'impossible', role: 'object' };
      if (draft.targetPersonId === actor.instanceId) return { message: 'ESCOLHA OUTRA PESSOA', kind: 'impossible', role: 'targetPerson' };
      break;
    case 'put':
      if (!object || object.ownerId !== actor.instanceId) return { message: 'A PESSOA NÃO ESTÁ COM O OBJETO', kind: 'impossible', role: 'object' };
      break;
    case 'eat':
      if (!object || object.label !== 'COMIDA' || object.consumed) return { message: 'ESCOLHA COMIDA', kind: 'impossible', role: 'object' };
      break;
    case 'drink':
      if (!object || !['ÁGUA', 'COPO'].includes(object.label) || object.consumed) return { message: 'ESCOLHA ÁGUA OU COPO', kind: 'impossible', role: 'object' };
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
  const validation = validateAction(scene, draft, rule);
  if (validation) {
    return {
      ok: false,
      error: validation.message,
      errorKind: validation.kind,
      role: validation.role,
    };
  }

  const entities = cloneEntities(scene.entities);
  const actor = entities.find((entity) => entity.instanceId === draft.actorId)!;
  const object = entities.find((entity) => entity.instanceId === draft.objectId);
  const targetPerson = entities.find((entity) => entity.instanceId === draft.targetPersonId);
  const destination = entities.find((entity) => entity.instanceId === draft.destinationId);
  const seat = entities.find((entity) => entity.instanceId === draft.seatId);

  for (const entity of entities) entity.activity = undefined;

  switch (rule.id) {
    case 'walk':
      actor.x = Math.min(88, actor.x + 18);
      actor.activity = 'walking';
      break;
    case 'go':
      if (destination) {
        moveNear(actor, destination, -12, 2);
        actor.locationId = destination.instanceId;
      }
      actor.activity = 'going';
      break;
    case 'sit':
      if (seat) {
        actor.x = seat.x;
        actor.y = Math.max(8, seat.y - 5);
        actor.posture = 'sitting';
        actor.locationId = seat.instanceId;
      }
      break;
    case 'stand':
      actor.posture = 'standing';
      actor.locationId = undefined;
      actor.y = Math.max(8, actor.y - 8);
      break;
    case 'take':
      if (object) {
        moveNear(actor, object, -10, 0);
        object.ownerId = actor.instanceId;
        object.locationId = undefined;
        object.x = actor.x + 7;
        object.y = actor.y - 2;
      }
      actor.activity = 'taking';
      break;
    case 'give':
      if (object && targetPerson) {
        object.ownerId = targetPerson.instanceId;
        object.x = targetPerson.x + 7;
        object.y = targetPerson.y - 2;
        moveNear(actor, targetPerson, -18, 0);
      }
      actor.activity = 'giving';
      break;
    case 'put':
      if (object && destination) {
        object.ownerId = undefined;
        object.locationId = destination.instanceId;
        object.x = destination.x;
        object.y = Math.max(8, destination.y - 8);
      }
      actor.activity = 'putting';
      break;
    case 'eat':
      if (object) {
        moveNear(actor, object, -8, 0);
        object.consumed = true;
      }
      actor.activity = 'eating';
      break;
    case 'drink':
      if (object) {
        moveNear(actor, object, -8, 0);
        object.consumed = true;
      }
      actor.activity = 'drinking';
      break;
    case 'sleep':
      actor.posture = 'sleeping';
      actor.activity = 'sleeping';
      if (seat && seat.label === 'CAMA') {
        actor.x = seat.x;
        actor.y = seat.y;
      }
      break;
    default:
      return { ok: false, error: 'AÇÃO NÃO IMPLEMENTADA', errorKind: 'impossible' };
  }

  return {
    ok: true,
    scene: {
      id: crypto.randomUUID(),
      entities,
      actionLabel: rule.label,
      temporalDay: scene.temporalDay,
    },
  };
}
