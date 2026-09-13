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
  return ['CASA', 'QUARTO', 'COZINHA', 'SALA', 'MERCADO', 'IGREJA'].includes(entity.label);
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
      matched = isContainer(reference) && d <= 14;
      break;
    case 'outside':
      matched = isContainer(reference) && d >= 24;
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
