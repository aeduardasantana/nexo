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

function changeLocation(actor: EntityState, destination: EntityState, offsetX = -12) {
  if (actor.locationId !== destination.instanceId) {
    actor.previousLocationId = actor.locationId;
  }
  actor.locationId = destination.instanceId;
  moveNear(actor, destination, offsetX, 2);
}

function syncOwnedObjects(entities: EntityState[]) {
  for (const object of entities.filter((entity) => entity.ownerId && !entity.consumed)) {
    const owner = entities.find((entity) => entity.instanceId === object.ownerId);
    if (!owner) continue;
    object.locationId = undefined;
    object.x = Math.min(95, owner.x + 7);
    object.y = Math.max(8, owner.y - 2);
  }
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
  if (rule.requires.includes('seat') && !draft.seatId) {
    return { message: rule.id === 'sleep' ? 'FALTA ONDE DORMIR' : rule.id === 'lie' ? 'FALTA ONDE DEITAR' : 'FALTA ONDE SENTAR', kind: 'incomplete', role: 'seat' };
  }

  const object = scene.entities.find((entity) => entity.instanceId === draft.objectId);
  const destination = scene.entities.find((entity) => entity.instanceId === draft.destinationId);
  const seat = scene.entities.find((entity) => entity.instanceId === draft.seatId);

  if (rule.requires.includes('targetPerson') && draft.targetPersonId === actor.instanceId) {
    return { message: 'ESCOLHA OUTRA PESSOA', kind: 'impossible', role: 'targetPerson' };
  }

  switch (rule.id) {
    case 'stand':
      if (!['sitting', 'lying', 'sleeping'].includes(actor.posture ?? 'standing')) return { message: 'A PESSOA JÁ ESTÁ EM PÉ', kind: 'impossible', role: 'actor' };
      break;
    case 'take':
      if (!object || object.consumed) return { message: 'OBJETO INDISPONÍVEL', kind: 'impossible', role: 'object' };
      if (object.ownerId) return { message: 'OBJETO JÁ ESTÁ COM ALGUÉM', kind: 'impossible', role: 'object' };
      break;
    case 'give':
      if (!object || object.ownerId !== actor.instanceId) return { message: 'A PESSOA NÃO ESTÁ COM O OBJETO', kind: 'impossible', role: 'object' };
      break;
    case 'put':
      if (!object || object.ownerId !== actor.instanceId) return { message: 'A PESSOA NÃO ESTÁ COM O OBJETO', kind: 'impossible', role: 'object' };
      break;
    case 'eat':
      if (!object || object.label !== 'COMIDA' || object.consumed) return { message: 'ESCOLHA COMIDA', kind: 'impossible', role: 'object' };
      break;
    case 'drink':
      if (!object || object.label !== 'ÁGUA' || object.consumed) return { message: 'ESCOLHA ÁGUA', kind: 'impossible', role: 'object' };
      break;
    case 'look':
      if (!object || object.consumed) return { message: 'OBJETO INDISPONÍVEL', kind: 'impossible', role: 'object' };
      break;
    case 'show':
      if (!object || object.consumed) return { message: 'OBJETO INDISPONÍVEL', kind: 'impossible', role: 'object' };
      if (object.ownerId && object.ownerId !== actor.instanceId) return { message: 'O OBJETO ESTÁ COM OUTRA PESSOA', kind: 'impossible', role: 'object' };
      break;
    case 'lie':
    case 'sleep':
      if (!seat || !['CAMA', 'SOFÁ'].includes(seat.label)) return { message: 'ESCOLHA CAMA OU SOFÁ', kind: 'impossible', role: 'seat' };
      break;
    case 'open':
      if (!object || object.id !== 'door') return { message: 'ESCOLHA A PORTA', kind: 'impossible', role: 'object' };
      if ((object.openState ?? 'closed') === 'open') return { message: 'A PORTA JÁ ESTÁ ABERTA', kind: 'impossible', role: 'object' };
      break;
    case 'close':
      if (!object || object.id !== 'door') return { message: 'ESCOLHA A PORTA', kind: 'impossible', role: 'object' };
      if ((object.openState ?? 'closed') === 'closed') return { message: 'A PORTA JÁ ESTÁ FECHADA', kind: 'impossible', role: 'object' };
      break;
    case 'carry':
      if (!object || object.consumed) return { message: 'OBJETO INDISPONÍVEL', kind: 'impossible', role: 'object' };
      break;
    case 'leave':
      if (!actor.locationId) return { message: 'A PESSOA AINDA NÃO ESTÁ EM UM LOCAL PARA SAIR', kind: 'impossible', role: 'actor' };
      if (destination?.instanceId === actor.locationId) return { message: 'ESCOLHA OUTRO DESTINO', kind: 'impossible', role: 'destination' };
      break;
    case 'return':
      if (!actor.previousLocationId || destination?.instanceId !== actor.previousLocationId) {
        return { message: 'ESCOLHA O LOCAL ANTERIOR DA PESSOA', kind: 'impossible', role: 'destination' };
      }
      break;
    case 'answer':
      if (!scene.pendingQuestion || scene.pendingQuestion.respondentId !== actor.instanceId || scene.pendingQuestion.askerId !== draft.targetPersonId) {
        return { message: 'NÃO HÁ PERGUNTA DESTA PESSOA PARA RESPONDER', kind: 'impossible', role: 'targetPerson' };
      }
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
        changeLocation(actor, destination);
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
    case 'lie':
      actor.posture = 'lying';
      actor.activity = 'lying';
      if (seat) {
        actor.x = seat.x;
        actor.y = seat.y;
        actor.locationId = seat.instanceId;
      }
      break;
    case 'sleep':
      actor.posture = 'sleeping';
      actor.activity = 'sleeping';
      if (seat) {
        actor.x = seat.x;
        actor.y = seat.y;
        actor.locationId = seat.instanceId;
      }
      break;
    case 'look':
      actor.activity = 'looking';
      break;
    case 'show':
      if (object && targetPerson) {
        moveNear(actor, targetPerson, -18, 0);
        object.ownerId = actor.instanceId;
        object.x = actor.x + 8;
        object.y = actor.y - 4;
      }
      actor.activity = 'showing';
      break;
    case 'ask':
      if (targetPerson) moveNear(actor, targetPerson, -18, 0);
      actor.activity = 'asking';
      break;
    case 'answer':
      if (targetPerson) moveNear(actor, targetPerson, -18, 0);
      actor.activity = 'answering';
      break;
    case 'tell':
      if (targetPerson) moveNear(actor, targetPerson, -18, 0);
      actor.activity = 'telling';
      break;
    case 'open':
      if (object) {
        moveNear(actor, object, -14, 0);
        object.openState = 'open';
        object.activity = 'open';
      }
      actor.activity = 'opening';
      break;
    case 'close':
      if (object) {
        moveNear(actor, object, -14, 0);
        object.openState = 'closed';
        object.activity = 'closed';
      }
      actor.activity = 'closing';
      break;
    case 'carry':
      if (object && destination) {
        changeLocation(actor, destination);
        object.ownerId = actor.instanceId;
        object.locationId = undefined;
        object.x = actor.x + 7;
        object.y = actor.y - 2;
      }
      actor.activity = 'carrying';
      break;
    case 'leave':
      if (destination) {
        changeLocation(actor, destination, -14);
      }
      actor.activity = 'leaving';
      break;
    case 'return':
      if (destination) {
        const formerLocation = actor.locationId;
        moveNear(actor, destination, -10, 2);
        actor.locationId = destination.instanceId;
        actor.previousLocationId = formerLocation;
      }
      actor.activity = 'returning';
      break;
    default:
      return { ok: false, error: 'AÇÃO NÃO IMPLEMENTADA', errorKind: 'impossible' };
  }

  syncOwnedObjects(entities);

  const pendingQuestion = rule.id === 'ask' && targetPerson
    ? { askerId: actor.instanceId, respondentId: targetPerson.instanceId }
    : rule.id === 'answer'
      ? undefined
      : scene.pendingQuestion;

  return {
    ok: true,
    scene: {
      id: crypto.randomUUID(),
      entities,
      actionLabel: rule.label,
      temporalDay: scene.temporalDay,
      pendingQuestion,
    },
  };
}
