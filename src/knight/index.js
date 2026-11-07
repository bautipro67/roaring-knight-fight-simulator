// Imports every Knight / bullet-phase module so their objects and scripts get registered.
import './common.js?v=20261107203111';
import './bullets.js?v=20261107203111';
import './board.js?v=20261107203111';
import './soul.js?v=20261107203111';
import './dbullet.js?v=20261107203111';
import './enemy.js?v=20261107203111';

// Attack modules: a missing or broken one only disables that attack.
// TODO: rotating (type 104), swords (151, 154), tunnel (153), roaring (107), crescent (109) are not ported yet.
const ATTACK_MODULES = ['stars', 'flurry', 'swordfall', 'swords', 'tunnel', 'rotating', 'roaring', 'extras', 'combination'];
await Promise.all(ATTACK_MODULES.map(m => import('./attacks/' + m + '.js' + new URL(import.meta.url).search).catch(e => {
  if (!String(e).includes('Failed to fetch')) console.warn('knight attack module failed:', m, e);
})));
// The scenes before and after the fight (obj_ch3_PTB02); they use objects from the attack modules.
await import('./scenes.js?v=20261107203111').catch(e => console.warn('knight scenes failed:', e));
