// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261101031110';
import './text.js?v=20261101031110';
import './setup.js?v=20261101031110';
import './controller.js?v=20261101031110';
import './heroes.js?v=20261101031110';
import './fight.js?v=20261101031110';
import './damage.js?v=20261101031110';
import './spells.js?v=20261101031110';
import './endbattle.js?v=20261101031110';

export { startBattle } from './setup.js?v=20261101031110';
export { MonsterParent } from './misc.js?v=20261101031110';
