// Chapter 3 equipment and items (from scr_weaponinfo / scr_armorinfo / scr_iteminfo) and the
// player's chosen loadout, remembered in the browser. The EQUIPMENT screen edits it and
// init_battle_globals applies it to every fight and practice run.

// id -> [name, at, df, mag, who can use it (char ids: 1 Kris, 2 Susie, 3 Ralsei), ability]
// Graze effects stack per armor worn across the party (obj_grazebox Create).
export const WEAPONS = {
  1: ['Wood Blade', 0, 0, 0, [1], ''],
  3: ['Red Scarf', 0, 0, 0, [3], ''],
  5: ['Spookysword', 2, 0, 0, [1], 'Spookiness UP'],
  6: ['Brave Ax', 2, 0, 0, [2], 'Guts Up'],
  7: ['Devilsknife', 5, 0, 4, [2], 'Buster TP DOWN'],
  8: ['Trefoil', 4, 0, 0, [1], 'Money Earned UP'],
  9: ['Ragger', 2, 0, 0, [3], ''],
  10: ['DaintyScarf', 0, 0, 2, [3], 'Fluffiness UP'],
  11: ['TwistedSwd', 16, 0, 0, [1], 'Trance'],
  14: ['BounceBlade', 2, 1, 0, [1], 'Defense'],
  15: ['CheerScarf', 1, 0, 2, [3], 'Smiley'],
  16: ['MechaSaber', 4, 0, 0, [1], 'Annoying'],
  17: ['AutoAxe', 4, 0, 0, [2], 'BadIdea'],
  18: ['FiberScarf', 3, 0, 2, [3], ''],
  19: ['Ragger2', 5, 0, -1, [3], 'Prickly'],
  21: ['PuppetScarf', 10, 0, -6, [3], ''],
  23: ['Saber10', 6, 0, 0, [1], ''],
  24: ['ToxicAxe', 6, 0, 0, [2], ''],
  25: ['FlexScarf', 4, 0, 1, [3], ''],
  26: ['BlackShard', 16, 0, 0, [1], ''],
};
const ALL = [1, 2, 3], KR = [1, 3];
export const ARMORS = {
  0: ['(none)', 0, 0, 0, ALL, ''],
  1: ['Amber Card', 0, 1, 0, ALL, ''],
  2: ['Dice Brace', 0, 2, 0, ALL, ''],
  3: ['Pink Ribbon', 0, 1, 0, KR, 'Graze area +20%, graze TP and time -20%'],
  4: ['White Ribbon', 0, 2, 0, KR, 'Cuteness'],
  5: ['IronShackle', 1, 2, 0, ALL, ''],
  6: ['MouseToken', 0, 0, 2, ALL, ''],
  7: ['Jevilstail', 2, 2, 2, ALL, ''],
  8: ['Silver Card', 0, 2, 0, ALL, '$ +5%'],
  9: ['TwinRibbon', 0, 3, 0, KR, 'Graze area +25%, graze TP and time -25%'],
  10: ['GlowWrist', 0, 2, 0, ALL, ''],
  11: ['ChainMail', 0, 3, 0, ALL, ''],
  12: ['B.ShotBowtie', 0, 2, 1, ALL, ''],
  13: ['SpikeBand', 2, 1, 0, ALL, ''],
  14: ['Silver Watch', 0, 2, 0, ALL, 'Grazing shortens turns 10% more'],
  15: ['TensionBow', 0, 2, 0, ALL, 'Graze TP +10%'],
  17: ['DarkGoldBand', 0, 0, 0, [1], ''],
  18: ['SkyMantle', 0, 1, 0, ALL, 'Elec/Holy'],
  19: ['SpikeShackle', 3, 1, 0, ALL, 'Attack'],
  20: ['FrayedBowtie', 1, 1, 1, KR, ''],
  21: ['Dealmaker', 0, 5, 5, ALL, '$ +30%'],
  22: ['RoyalPin', 0, 3, 1, ALL, ''],
  // The Knight aims at whoever wears it and hits them for a third (src/battle/damage.js).
  23: ['ShadowMantle', 0, 3, 0, ALL, 'Dark/Star'],
  24: ['LodeStone', 0, 2, 0, ALL, 'Graze TP +5%'],
  25: ['GingerGuard', 0, 3, 0, ALL, ''],
  26: ['BlueRibbon', 0, 1, 1, KR, 'Heal+'],
  27: ['TennaTie', 0, 5, -2, ALL, ''],
};
// Items usable in battle (src/battle/spells.js, controller.js): id -> [name, effect]
export const ITEMS = {
  0: ['(empty)', ''],
  1: ['Dark Candy', 'Heals 40 HP'],
  2: ['ReviveMint', 'Heals a downed ally'],
  5: ['BrokenCake', 'Heals 20 HP'],
  6: ['Top Cake', 'Heals team 160 HP'],
  7: ['Spincake', 'Heals team 150 HP'],
  8: ['Darkburger', 'Heals 70 HP'],
  9: ['LancerCookie', 'Heals 50 HP'],
  10: ['GigaSalad', 'Heals 4 HP'],
  11: ['ClubsSandwich', 'Heals team 70 HP'],
  12: ['HeartsDonut', 'Healing varies'],
  13: ['ChocDiamond', 'Healing varies'],
  14: ['Favwich', 'Heals ALL HP'],
  15: ['RouxlsRoux', 'Heals 50 HP'],
  16: ['CD Bagel', 'Heals 80 HP'],
  22: ['DD-Burger', 'Heals 60 HP'],
  23: ['LightCandy', 'Heals 120 HP'],
  24: ['ButJuice', 'Heals 100 HP'],
  25: ['SpagettiCode', 'Heals team 30 HP'],
  26: ['JavaCookie', 'Healing varies'],
  27: ['TensionBit', 'Raises TP 32%'],
  28: ['TensionGem', 'Raises TP 50%'],
  29: ['TensionMax', 'Raises TP to max'],
  30: ['ReviveDust', 'Revives team 25%'],
  31: ['ReviveBrite', 'Revives team 100%'],
  34: ['TVDinner', 'Heals 100 HP'],
  36: ['FlatSoda', 'Heals 20 HP'],
  37: ['TVSlop', 'Heals 80 HP'],
  38: ['ExecBuffet', 'Heals team 100 HP'],
  39: ['DeluxeDinner', 'Heals 140 HP'],
};
export const ITEM_SLOTS = 12;
// The party owns one of each of these, so only one slot may hold it; stacking the ribbons would
// also take the graze TP down to nothing.
export const UNIQUE_ARMORS = [3, 9];
export const CHAR_NAMES = { 1: 'KRIS', 2: 'SUSIE', 3: 'RALSEI' };
// Stats after the chapter's battles (scr_levelup caps: 200 / 240 / 180 HP, +2 attack): [hp, at, df, mag]
export const BASE_STATS = { 1: [200, 16, 2, 0], 2: [240, 20, 2, 4], 3: [180, 14, 2, 13] };

// What the party carries when they meet the Knight: Saber10 / ToxicAxe / FlexScarf, Amber Card,
// GlowWrist; and DeluxeDinner, ExecBuffet, ReviveMint, ReviveDust, TensionGem, TensionBit,
// TVDinner, TVSlop, LightCandy, ButJuice.
export const DEFAULT_LOADOUT = {
  gear: { 1: [23, 1, 10], 2: [24, 1, 10], 3: [25, 1, 10] },
  items: [39, 38, 2, 30, 28, 27, 34, 37, 23, 24, 0, 0],
};

const KEY = 'knight-sim-loadout';
const clone = l => ({ gear: { 1: [...l.gear[1]], 2: [...l.gear[2]], 3: [...l.gear[3]] }, items: [...l.items] });
let loadout = null;

const usable = (table, id, c) => table[id] && table[id][4].includes(c);

export function getLoadout() {
  if (!loadout) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* storage unavailable */ }
    loadout = clone(DEFAULT_LOADOUT);
    if (saved?.gear) {
      for (const c of [1, 2, 3]) {
        const [w, a1, a2] = saved.gear[c] || [];
        if (usable(WEAPONS, w, c)) loadout.gear[c][0] = w;
        if (usable(ARMORS, a1, c)) loadout.gear[c][1] = a1;
        if (usable(ARMORS, a2, c)) loadout.gear[c][2] = a2;
      }
    }
    // Older saves could repeat a one-of-a-kind armor: keep the first, empty the others.
    const worn = new Set();
    for (const c of [1, 2, 3]) {
      for (const slot of [1, 2]) {
        const id = loadout.gear[c][slot];
        if (!UNIQUE_ARMORS.includes(id)) continue;
        if (worn.has(id)) loadout.gear[c][slot] = 0;
        worn.add(id);
      }
    }
    if (Array.isArray(saved?.items)) {
      loadout.items = Array.from({ length: ITEM_SLOTS }, (_, i) => (ITEMS[saved.items[i]] ? saved.items[i] : 0));
    }
  }
  return loadout;
}

export function saveLoadout() {
  try { localStorage.setItem(KEY, JSON.stringify(loadout)); } catch (e) { /* not saved */ }
}

export function resetLoadout() {
  loadout = clone(DEFAULT_LOADOUT);
  saveLoadout();
}

// Options for a slot: the weapons or armors that character can use, or the items.
export const weaponChoices = c => Object.keys(WEAPONS).map(Number).filter(id => usable(WEAPONS, id, c));
export function armorChoices(c, slot) {
  const lo = getLoadout();
  const elsewhere = id => [1, 2, 3].some(o => [1, 2].some(s => (o !== c || s !== slot) && lo.gear[o][s] === id));
  return Object.keys(ARMORS).map(Number).filter(id => usable(ARMORS, id, c) && !(UNIQUE_ARMORS.includes(id) && elsewhere(id)));
}
export const itemChoices = () => Object.keys(ITEMS).map(Number);

// Total stats of a character with the current loadout: [hp, at, df, mag]
export function charStats(c) {
  const [hp, at, df, mag] = BASE_STATS[c];
  const [w, a1, a2] = getLoadout().gear[c];
  const parts = [WEAPONS[w], ARMORS[a1], ARMORS[a2]];
  return [hp, at + parts.reduce((s, p) => s + p[1], 0), df + parts.reduce((s, p) => s + p[2], 0), mag + parts.reduce((s, p) => s + p[3], 0)];
}
