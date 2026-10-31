// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261031172539';
import './text.js?v=20261031172539';
import './setup.js?v=20261031172539';
import './controller.js?v=20261031172539';
import './heroes.js?v=20261031172539';
import './fight.js?v=20261031172539';
import './damage.js?v=20261031172539';
import './spells.js?v=20261031172539';
import './endbattle.js?v=20261031172539';

export { startBattle } from './setup.js?v=20261031172539';
export { MonsterParent } from './misc.js?v=20261031172539';
