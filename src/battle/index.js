// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261107001915';
import './text.js?v=20261107001915';
import './setup.js?v=20261107001915';
import './controller.js?v=20261107001915';
import './heroes.js?v=20261107001915';
import './fight.js?v=20261107001915';
import './damage.js?v=20261107001915';
import './spells.js?v=20261107001915';
import './endbattle.js?v=20261107001915';

export { startBattle } from './setup.js?v=20261107001915';
export { MonsterParent } from './misc.js?v=20261107001915';
