const ADJECTIVES = [
  'Purple', 'Golden', 'Silver', 'Cosmic', 'Crimson', 'Electric',
  'Midnight', 'Neon', 'Shadow', 'Radiant', 'Blazing', 'Frosted',
  'Stellar', 'Vivid', 'Turbo', 'Phantom', 'Crystal', 'Solar',
];

const ANIMALS = [
  'Fox', 'Tiger', 'Panda', 'Wolf', 'Eagle', 'Falcon',
  'Jaguar', 'Panther', 'Lynx', 'Otter', 'Hawk', 'Raven',
  'Serpent', 'Dolphin', 'Penguin', 'Cobra', 'Koala', 'Cheetah',
];

export function generateRandomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

const PEER_COLORS = [
  '#e74c3c', '#e67e22', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff5722', '#f39c12',
];
let _colorIdx = 0;
export function getNextPeerColor() {
  return PEER_COLORS[(_colorIdx++) % PEER_COLORS.length];
}

export function generateRoomId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
