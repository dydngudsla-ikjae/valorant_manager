import images from './player-images.json';

export const playerImage=player=>images[String(player?.playerId||'')]||null;
