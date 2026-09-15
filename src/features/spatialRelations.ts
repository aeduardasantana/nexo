// @signature edufertanapo
import type { EntityState, SpatialRelation, SpatialRelationResult } from '../types/domain';

const LABELS: Record<SpatialRelation, string> = {
  near: 'PERTO',
  far: 'LONGE',
  above: 'EM CIMA',
  below: 'EMBAIXO',
  inside: 'DENTRO',
  outside: 'FORA',
};

function distance(a: EntityState, b: EntityState) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isContainer(entity: EntityState) {
  return ['CASA', 'QUARTO', 'COZINHA', 'SALA', 'BANHEIRO', 'MERCADO', 'IGREJA'].includes(entity.label);
}

function isInsideContainer(subject: EntityState, reference: EntityState) {
  if (!isContainer(reference)) return false;
  const halfWidth = reference.id === 'home' ? 16 : 13;
  const halfHeight = reference.id === 'home' ? 15 : 12;
  return Math.abs(subject.x - reference.x) <= halfWidth && Math.abs(subject.y - reference.y) <= halfHeight;
}

export function evaluateRelation(
  subject: EntityState,
  reference: EntityState,
  type: SpatialRelation,
): SpatialRelationResult {
  const d = distance(subject, reference);
  let matched = false;

  switch (type) {
    case 'near':
      matched = d <= 22;
      break;
    case 'far':
      matched = d >= 45;
      break;
    case 'above':
      matched = subject.y <= reference.y - 10;
      break;
    case 'below':
      matched = subject.y >= reference.y + 10;
      break;
    case 'inside':
      matched = isInsideContainer(subject, reference);
      break;
    case 'outside':
      matched = isContainer(reference) && !isInsideContainer(subject, reference);
      break;
  }

  return {
    type,
    label: LABELS[type],
    subjectId: subject.instanceId,
    referenceId: reference.instanceId,
    matched,
  };
}

export function detectRelations(subject: EntityState, reference: EntityState) {
  return (['near', 'far', 'above', 'below', 'inside', 'outside'] as SpatialRelation[])
    .map((type) => evaluateRelation(subject, reference, type))
    .filter((result) => result.matched);
}
