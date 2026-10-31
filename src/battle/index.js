// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261031165601';
import './text.js?v=20261031165601';
import './setup.js?v=20261031165601';
import './controller.js?v=20261031165601';
import './heroes.js?v=20261031165601';
import './fight.js?v=20261031165601';
import './damage.js?v=20261031165601';
import './spells.js?v=20261031165601';
import './endbattle.js?v=20261031165601';

export { startBattle } from './setup.js?v=20261031165601';
export { MonsterParent } from './misc.js?v=20261031165601';
