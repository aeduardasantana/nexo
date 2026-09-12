import type { VerbRule } from '../types/domain';

export const verbRules: VerbRule[] = [
  { id: 'walk', label: 'ANDAR', requires: ['actor'], description: 'Personagem desloca-se no cenário.' },
  { id: 'go', label: 'IR', requires: ['actor', 'destination'], description: 'Personagem desloca-se até um destino.' },
  { id: 'sit', label: 'SENTAR', requires: ['actor', 'seat'], description: 'Personagem passa de em pé para sentado.' },
  { id: 'stand', label: 'LEVANTAR', requires: ['actor'], description: 'Personagem passa de sentado para em pé.' },
  { id: 'take', label: 'PEGAR', requires: ['actor', 'object'], description: 'Objeto passa a pertencer/estar com o personagem.' },
  { id: 'give', label: 'DAR', requires: ['actor', 'object', 'targetPerson'], description: 'Objeto é transferido entre personagens.' },
  { id: 'put', label: 'COLOCAR', requires: ['actor', 'object', 'destination'], description: 'Objeto passa para um novo local.' },
  { id: 'eat', label: 'COMER', requires: ['actor', 'object'], description: 'Personagem consome alimento.' },
  { id: 'drink', label: 'BEBER', requires: ['actor', 'object'], description: 'Personagem bebe líquido.' },
  { id: 'sleep', label: 'DORMIR', requires: ['actor'], description: 'Personagem passa ao estado de dormir.' },
];