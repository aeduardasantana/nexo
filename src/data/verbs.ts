import type { VerbRule } from '../types/domain';

export const verbRules: VerbRule[] = [
  { id: 'walk', label: 'ANDAR', symbol: '🚶', requires: ['actor'], description: 'Personagem desloca-se no cenário.' },
  { id: 'go', label: 'IR', symbol: '➡️', requires: ['actor', 'destination'], description: 'Personagem desloca-se até um destino.' },
  { id: 'sit', label: 'SENTAR', symbol: '🪑', requires: ['actor', 'seat'], description: 'Personagem passa de em pé para sentado.' },
  { id: 'stand', label: 'LEVANTAR', symbol: '🧍', requires: ['actor'], description: 'Personagem passa de sentado para em pé.' },
  { id: 'take', label: 'PEGAR', symbol: '🤲', requires: ['actor', 'object'], description: 'Objeto passa a pertencer/estar com o personagem.' },
  { id: 'give', label: 'DAR', symbol: '🤝', requires: ['actor', 'object', 'targetPerson'], description: 'Objeto é transferido entre personagens.' },
  { id: 'put', label: 'COLOCAR', symbol: '📥', requires: ['actor', 'object', 'destination'], description: 'Objeto passa para um novo local.' },
  { id: 'eat', label: 'COMER', symbol: '🍽️', requires: ['actor', 'object'], description: 'Personagem consome alimento.' },
  { id: 'drink', label: 'BEBER', symbol: '🥤', requires: ['actor', 'object'], description: 'Personagem bebe líquido.' },
  { id: 'sleep', label: 'DORMIR', symbol: '😴', requires: ['actor'], description: 'Personagem passa ao estado de dormir.' },
];
