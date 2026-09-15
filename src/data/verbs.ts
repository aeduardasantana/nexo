// @signature edufertanapo
import type { VerbRule } from '../types/domain';

export const verbRules: VerbRule[] = [
  { id: 'walk', label: 'ANDAR', symbol: '🚶', requires: ['actor'], description: 'Personagem desloca-se no cenário.' },
  { id: 'go', label: 'IR', symbol: '➡️', requires: ['actor', 'destination'], description: 'Personagem desloca-se até um destino.' },
  { id: 'sit', label: 'SENTAR', symbol: '🪑', requires: ['actor', 'seat'], description: 'Personagem passa de em pé para sentado.' },
  { id: 'stand', label: 'LEVANTAR', symbol: '🧍', requires: ['actor'], description: 'Personagem passa de sentado para em pé.' },
  { id: 'take', label: 'PEGAR', symbol: '🤲', requires: ['actor', 'object'], description: 'Objeto passa a pertencer/estar com o personagem.' },
  { id: 'give', label: 'DAR', symbol: '🤝', requires: ['actor', 'object', 'targetPerson'], description: 'Objeto é transferido entre personagens.' },
  { id: 'put', label: 'COLOCAR', symbol: '📥', requires: ['actor', 'object', 'destination'], description: 'Objeto passa para um novo local.' },
  { id: 'eat', label: 'COMER', symbol: '🍽️', requires: ['actor', 'object'], description: 'Personagem leva a comida à boca e a consome.' },
  { id: 'drink', label: 'BEBER', symbol: '🥤', requires: ['actor', 'object'], description: 'Personagem bebe água; o recipiente permanece disponível.' },
  { id: 'lie', label: 'DEITAR', symbol: '🛏️', requires: ['actor', 'seat'], description: 'Personagem fica deitado em uma cama ou sofá.' },
  { id: 'sleep', label: 'DORMIR', symbol: '😴', requires: ['actor', 'seat'], description: 'Personagem dorme em uma cama ou sofá.' },
  { id: 'look', label: 'OLHAR', symbol: '👀', requires: ['actor', 'object'], description: 'Personagem olha para um objeto.' },
  { id: 'show', label: 'MOSTRAR', symbol: '🖐️', requires: ['actor', 'object', 'targetPerson'], description: 'Personagem mostra um objeto a outra pessoa.' },
  { id: 'ask', label: 'PERGUNTAR', symbol: '❓', requires: ['actor', 'targetPerson'], description: 'Personagem faz uma pergunta a outra pessoa.' },
  { id: 'answer', label: 'RESPONDER', symbol: '💬', requires: ['actor', 'targetPerson'], description: 'Personagem responde a outra pessoa.' },
  { id: 'tell', label: 'CONTAR', symbol: '🗣️', requires: ['actor', 'targetPerson'], description: 'Personagem conta algo a outra pessoa.' },
  { id: 'open', label: 'ABRIR', symbol: '↗️', requires: ['actor', 'object'], description: 'Personagem abre um objeto, como uma porta.' },
  { id: 'close', label: 'FECHAR', symbol: '↙️', requires: ['actor', 'object'], description: 'Personagem fecha um objeto, como uma porta.' },
  { id: 'carry', label: 'LEVAR', symbol: '➡️', requires: ['actor', 'object', 'destination'], description: 'Personagem leva um objeto a outro local.' },
  { id: 'leave', label: 'SAIR', symbol: '🚪', requires: ['actor', 'destination'], description: 'Personagem sai em direção a outro local.' },
  { id: 'return', label: 'VOLTAR', symbol: '↩️', requires: ['actor', 'destination'], description: 'Personagem volta a um local.' },
];
