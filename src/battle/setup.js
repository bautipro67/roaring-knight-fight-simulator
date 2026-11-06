// Fresh-fight globals (scr_gamestart for Chapter 3 + the party as it is when the Roaring Knight
// is fought), encounter/monster setup (encounter 115, monster type 104), spell/item tables,
// scr_spellmenu_setup and startBattle().
import {
  global, G, Instance, defineObject, defineScript, S, instance_create, room_reset, objectExists,
  font_add_sprite_ext,
} from '../runtime/gm.js?v=20261106200046';
import { snd_free_all, snd_init } from '../runtime/audio.js?v=20261106200046';
import { WEAPONS, ARMORS, BASE_STATS, getLoadout } from './equipment.js?v=20261106200046';
import { arr, arr2, view_x, view_y, splitCaller } from './common.js?v=20261106200046';
import { registerBackground } from './misc.js?v=20261106200046';

function scr_gamestart() {
  global.chapter = 3;
  global.lang = 'en';
  global.darkzone = 0;
  global.plot = 0;
  global.time = 0;
  global.fighting = 0;
  global.char = [1, 0, 0];
  global.gold = 0;
  global.xp = 0;
  global.lv = 1;
  global.inv = 0;
  global.invc = 1;
  global.charselect = -1;
  global.encounterno = 1;
  global.specialbattle = 0;
  global.ambush = 0;
  global.tension = 0;
  global.maxtension = 250;
  global.heromakex = arr(3, 100);
  global.heromakey = arr(3, 200);
  global.charauto = arr(20);
  global.charmove = arr(4);
  global.charcantarget = arr(4);
  global.chardead = arr(4);
  global.invincible = arr(4, 1);
  global.charaction = arr(4);
  global.faceaction = arr(4);
  global.charcond = arr(4);
  global.item = arr(13);
  global.keyitem = arr(13);
  global.hp = arr(20, 200);
  global.maxhp = arr(20, 250);
  global.at = arr(20, 10);
  global.df = arr(20, 2);
  global.mag = arr(20, 0);
  global.guts = arr(20, 0);
  global.charweapon = arr(20, 1);
  global.chararmor1 = arr(20, 0);
  global.chararmor2 = arr(20, 0);
  for (const n of ['itemat', 'itemdf', 'itemmag', 'itembolts', 'itemgrazeamt', 'itemgrazesize', 'itemboltspeed',
    'itemspecial', 'itemelement', 'itemelementamount']) global[n] = arr2(20, 4);
  global.spell = arr2(20, 12);
  global.boltspeed = 100;
  global.grazeamt = 100;
  global.grazesize = 100;
  global.charname = [' ', 'Kris', 'Susie', 'Ralsei', 'Noelle', ' '];
  global.flag = arr(10000);
  global.charweapon[0] = 0;
  global.chararmor1[0] = 0;
  global.chararmor2[0] = 0;
  global.hp[0] = 0;
  global.maxhp[0] = 0;
  global.maxhp[1] = 160; global.hp[1] = 160; global.at[1] = 14;
  global.charweapon[1] = 16; global.chararmor1[1] = 1; global.chararmor2[1] = 10;
  global.maxhp[2] = 190; global.hp[2] = 190; global.at[2] = 18; global.mag[2] = 2;
  global.charweapon[2] = 17; global.chararmor1[2] = 1; global.chararmor2[2] = 10;
  global.maxhp[3] = 140; global.hp[3] = 140; global.at[3] = 12; global.mag[3] = 11;
  global.charweapon[3] = 18; global.chararmor1[3] = 1; global.chararmor2[3] = 10;
  global.spell[1][0] = 7;
  global.spell[2][0] = 4;
  global.spell[2][1] = 11;
  global.spell[3][0] = 3;
  global.spell[3][1] = 2;
  global.spell[4][0] = 2;
  global.spell[4][1] = 8;
  global.spell[4][2] = 9;
  global.grazetotal = 0;
  global.grazeturn = 0;
  global.monstermakex = arr(3, 500);
  global.monstermakey = arr(3, 240);
  global.monsterinstancetype = arr(3, null);
  global.monster = arr(3, 1);
  global.monstertype = arr(3, 1);
  global.monsterattackname = arr(3, ' ');
  global.bmenuno = 0;
  global.bmenucoord = arr2(20, 20);
  global.myfight = 0;
  global.mnfight = 0;
  global.fc = 0;
  global.fe = 0;
  global.typer = 5;
  global.battletyper = 4;
  global.msg = arr(100, '%%');
  global.msg[0] = ' ';
  global.msgno = 0;
  global.battlemsg = [' '];
  global.writersnd = arr(10, null);
  global.currentsong = [null, null];
  global.batmusic = [null, null];
  global.choice = -1;
  global.seriousbattle = 0;
  global.interact = 0;
  global.tempflag = arr(100);
  global.flag[15] = 1;
  global.flag[16] = 0.85;
  global.flag[17] = 0.6;
  global.turntimer = 0;
  // scr_gamestart_chapter_override, chapter > 2
  global.flag[7] = 0;
  global.flag[9] = 1;
  global.flag[10] = 1;
  global.flag[20] = 0;
  global.flag[21] = 0;
  global.flag[31] = 1;
  global.flag[32] = 0;
}

// Everything the Knight fight needs on top of scr_gamestart, as in obj_ch3_PTB02 (con 4).
defineScript('init_battle_globals', () => {
  scr_gamestart();
  global.char = [1, 2, 3];
  global.darkzone = 1;
  global.plot = 320;
  // The equipment and items chosen on the EQUIPMENT screen (src/battle/equipment.js).
  const loadout = getLoadout();
  for (const c of [1, 2, 3]) {
    const [hp, at, , mag] = BASE_STATS[c];
    global.maxhp[c] = global.hp[c] = hp;
    global.at[c] = at;
    global.mag[c] = mag;
    const [w, a1, a2] = loadout.gear[c];
    global.charweapon[c] = w;
    global.chararmor1[c] = a1;
    global.chararmor2[c] = a2;
    // scr_weaponinfo_mine / scr_armorinfo_mine
    [WEAPONS[w], ARMORS[a1], ARMORS[a2]].forEach((s, slot) => {
      global.itemat[c][slot] = s[1];
      global.itemdf[c][slot] = s[2];
      global.itemmag[c][slot] = s[3];
    });
  }
  loadout.items.filter(id => id).forEach((it, i) => { global.item[i] = it; });
  global.knight_battle_items = global.item.slice();
  S.scr_spellinfo_all();
  global.hpfont = font_add_sprite_ext('spr_numbersfontsmall', '0123456789-+', false, 2);
  global.damagefont = font_add_sprite_ext('spr_numbersfontbig', '0123456789', true, 0);
  global.damagefontgold = global.damagefont;
  global.heartx = 310;
  global.hearty = 160;
  global.tempflag[93] = 1;
  global.flag[9] = 1;
  global.batmusic[0] = snd_init('knight.ogg');
  global.encounterno = 115;
  global.flag[54] = 115;
  global.specialbattle = 0;
});

// ---------------------------------------------------------------- spells

// [spellname, spellnameb, spelldescb, spelldesc, spelltarget, cost]
const SPELLS = {
  0: [' ', ' ', 'None', ' ', 0, -1],
  1: ['Rude Sword', 'RudeSword', 'Rude#Damage#', 'Deals moderate Rude-elemental damage to#one foe. Depends on Attack & Magic.', 2, 125],
  2: ['Heal Prayer', 'Heal Prayer', 'Heal#Ally', 'Heavenly light restores a little HP to#one party member. Depends on Magic.', 1, 80],
  3: ['Pacify', 'Pacify', 'Spare#TIRED foe', 'SPARE a tired enemy by putting them to sleep.', 2, 40],
  4: ['Rude Buster', 'Rude Buster', 'Rude#Damage#', 'Deals moderate Rude-elemental damage to#one foe. Depends on Attack & Magic.', 2, 125],
  5: ['Red Buster', 'Red Buster', 'Red#Damage#', ' ', 2, 0],
  6: ['Dual Heal', 'Dual Heal', 'Heal All#30 HP', ' ', 0, 0],
  7: ['ACT', 'ACT', 'Use#action', 'Many different skills.#It has nothing to do with magic.', 0, 0],
  8: ['SleepMist', 'Sleep Mist', 'Spare#TIRED foes', 'A cold mist sweeps through,#sparing all TIRED enemies.', 0, 80],
  9: ['IceShock', 'IceShock', 'Damage#w/ ICE', 'Deals magical ICE damage to#one enemy.', 2, 40],
  10: ['SnowGrave', 'SnowGrave', 'Fatal', 'Deals the fatal damage to#all of the enemies.', 0, 500],
  11: ['UltraHeal', 'UltraHeal', 'Best#healing', 'An awesome healing spell.#... right?', 1, 225],
};

// scr_spellinfo(spell): writes cost, spelltarget, spellname(b), spelldesc(b), spellusable on `t`.
defineScript('scr_spellinfo', (t, id) => {
  t.cost = -1;
  t.spelltarget = 1;
  t.spellname = ' ';
  t.spellnameb = ' ';
  t.spelldescb = ' ';
  t.spelldesc = ' ';
  t.spellanim = 0;
  t.spellusable = 0;
  t.spelltext = ' ';
  const s = SPELLS[id];
  if (!s) return;
  [t.spellname, t.spellnameb, t.spelldescb, t.spelldesc, t.spelltarget, t.cost] = s;
  if (id == 4 && global.charweapon[2] == 7) t.cost = 100;
  if (id == 9 && global.charweapon[4] == 13) t.cost *= 0.5;
  if (id == 10) t.cost = global.maxtension * 2 * (global.charweapon[4] == 13 ? 0.5 : 1);
  if (id == 11) t.cost = 225 - Math.round(global.flag[1045] * 2.5);
});

defineScript('scr_spellinfo_all', () => {
  const t = {};
  for (const n of ['spellname', 'spellnameb', 'spelldescb', 'spelldesc', 'spellcost', 'spellusable', 'spelltarget'])
    global[n] = arr2(6, 12);
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 12; i++) {
      S.scr_spellinfo(t, global.spell[j]?.[i] ?? 0);
      global.spellname[j][i] = t.spellname;
      global.spellnameb[j][i] = t.spellnameb;
      global.spelldescb[j][i] = t.spelldescb;
      global.spelldesc[j][i] = t.spelldesc;
      global.spellcost[j][i] = t.cost;
      global.spellusable[j][i] = t.spellusable;
      global.spelltarget[j][i] = t.spelltarget;
    }
  }
});

// scr_spellmenu_setup(): MAGIC menus of Chapter 2+ (ACTs of the first enemy, then spells).
defineScript('scr_spellmenu_setup', () => {
  const g = global;
  let actnamecheck = 0;
  const mt = g.monstertype[0];
  for (let i = 1; i < 3; i++) if (g.monster[i] == 1 && g.monstertype[i] != mt) actnamecheck = 1;
  for (let i = 0; i < 3; i++) {
    for (let fj = 0; fj < 6; fj++) {
      g.battlespell[i][fj] = 0;
      const set = (can, cost, name, desc, target, special, generic) => {
        if (can[0][fj] != 1) return;
        g.battlespell[i][fj] = -1;
        if (g.battleactcount[i] < fj + 1) g.battleactcount[i] = fj + 1;
        g.battlespellcost[i][fj] = cost[0][fj];
        g.battlespellname[i][fj] = name[0][fj];
        if (generic && actnamecheck) g.battlespellname[i][fj] = generic;
        g.battlespelldesc[i][fj] = desc[0][fj];
        g.battlespelltarget[i][fj] = target;
        g.battlespellspecial[i][fj] = special;
      };
      if (g.char[i] == 1) set(g.canact, g.actcost, g.actname, g.actdesc, 0, 1, null);
      if (g.char[i] == 2) set(g.canactsus, g.actcostsus, g.actnamesus, g.actdescsus, 2, 2, 'S-Action');
      if (g.char[i] == 3) set(g.canactral, g.actcostral, g.actnameral, g.actdescral, 2, 3, 'R-Action');
      if (g.char[i] == 4) set(g.canactnoe, g.actcostnoe, g.actnamenoe, g.actdescnoe, 2, 4, 'N-Action');
    }
  }
  S.scr_spellinfo_all();
  for (let i = 0; i < 3; i++) {
    const c = g.char[i];
    for (let fj = 0; fj < 12; fj++) {
      const ib = g.battleactcount[i] + fj;
      g.battlespell[i][ib] = g.spell[c][fj];
      g.battlespellcost[i][ib] = g.spellcost[c][fj];
      g.battlespellname[i][ib] = g.spellnameb[c][fj];
      g.battlespelldesc[i][ib] = g.spelldescb[c][fj];
      g.battlespelltarget[i][ib] = g.spelltarget[c][fj];
    }
  }
});

// ---------------------------------------------------------------- items

// scr_iteminfo (Chapter 3): id -> [itemnameb, itemdescb, itemtarget, value, usable].
const ITEMS = {
  1: ['Dark Candy', 'Heals#40HP', 1, 25, 1],
  2: ['ReviveMint', 'Heal#Downed#Ally', 1, 400, 1],
  3: ['Glowshard', 'Sell#at#shops', 0, 200, 0],
  4: ['Manual', 'Read#out of#battle', 2, 1, 0],
  5: ['BrokenCake', 'Heals#20HP', 1, 5, 1],
  6: ['Top Cake', 'Heals#team#160HP', 2, 150, 1],
  7: ['Spincake', 'Heals#team#150HP', 2, 5, 1],
  8: ['Darkburger', 'Heals#70HP', 1, 70, 1],
  9: ['LancerCookie', 'Heals#50HP', 1, 10, 1],
  10: ['GigaSalad', 'Heals#4HP', 1, 10, 1],
  11: ['ClubsSandwich', 'Heals#team#70HP', 2, 70, 1],
  12: ['HeartsDonut', 'Healing#varies', 1, 40, 1],
  13: ['ChocDiamond', 'Healing#varies', 1, 40, 1],
  14: ['Favwich', 'Heals#ALL HP', 1, 10, 1],
  15: ['RouxlsRoux', 'Heals#50 HP', 1, 50, 1],
  16: ['CD Bagel', 'Heals#80 HP', 1, 100, 1],
  17: ['Mannequin', 'Useless', 0, 300, 0],
  22: ['DD-Burger', 'Heals#60HP 2x', 1, 110, 1],
  23: ['LightCandy', 'Heals#120HP', 1, 200, 1],
  24: ['ButJuice', 'Heals#100HP', 1, 200, 1],
  25: ['SpagettiCode', 'Heals#team#30HP', 2, 180, 1],
  26: ['JavaCookie', 'Healing#varies', 1, 160, 1],
  27: ['TensionBit', 'Raises#TP#32%', 2, 100, 1],
  28: ['TensionGem', 'Raises#TP#50%', 2, 300, 1],
  29: ['TensionMax', 'Raises#TP#Max', 2, 1000, 1],
  30: ['ReviveDust', 'Revives#team#25%', 2, 100, 1],
  31: ['ReviveBrite', 'Revives#team#100%', 2, 4000, 1],
  32: ['S.POISON', 'Hurts#party#member', 1, 110, 1],
  34: ['TVDinner', 'Heals#100HP', 1, 200, 1],
  35: ['Pipis', 'Does#nothing', 1, 0, 1],
  36: ['FlatSoda', 'Heals#20HP', 1, 2, 1],
  37: ['TVSlop', 'Heals#80HP', 1, 180, 1],
  38: ['ExecBuffet', 'Heals#team#100HP', 2, 600, 1],
  39: ['DeluxeDinner', 'Heals#140HP', 1, 600, 1],
};
// scr_iteminfo(item): writes itemnameb, itemdescb, itemtarget, value, usable on `t`.
defineScript('scr_iteminfo', (t, id) => {
  t.usable = 0;
  t.replaceable = 0;
  t.value = 0;
  t.itemtarget = 0;
  t.itemnameb = ' ';
  t.itemdescb = ' ';
  if (id == 0) { t.itemnameb = ' '; t.itemdescb = '---'; return; }
  const e = ITEMS[id];
  if (!e) return;
  [t.itemnameb, t.itemdescb, t.itemtarget, t.value, t.usable] = e;
});

// ---------------------------------------------------------------- encounter and monster

defineScript('scr_encountersetup', (...a) => {
  const [, [enc]] = splitCaller(a);
  const g = global;
  const xx = view_x(), yy = view_y();
  for (let i = 0; i < 3; i++) {
    g.heromakex[i] = xx + 80;
    g.heromakey[i] = yy + 50 + 80 * i;
    g.monsterinstancetype[i] = 'obj_monsterparent';
    g.monstertype[i] = 1;
    g.monstermakex[i] = xx + 500 + 20 * i;
    g.monstermakey[i] = yy + 40 + 90 * i;
  }
  g.monstertype[1] = 0;
  g.monstertype[2] = 0;
  if (g.char[0] != 0 && g.char[1] == 0 && g.char[2] == 0) g.heromakey[0] = yy + 140;
  if (g.char[0] != 0 && g.char[1] != 0 && g.char[2] == 0) {
    g.heromakey[0] = yy + 100;
    g.heromakey[1] = yy + 180;
  }
  g.battlemsg[0] = '* It is known.';
  if (enc == 115) {
    g.heromakex[0] = xx + 126;
    g.heromakey[0] = yy + 104;
    g.heromakex[1] = xx + 80;
    g.heromakey[1] = yy + 142;
    g.heromakex[2] = xx + 58;
    g.heromakey[2] = yy + 190;
    g.monsterinstancetype[0] = G.knightEnemyObject || 'obj_knight_enemy';
    g.monstertype[0] = 104;
    g.monstermakex[0] = xx + 425;
    g.monstermakey[0] = yy + 78;
    g.monstertype[1] = 0;
    g.monstertype[2] = 0;
    g.battlemsg[0] = '* The Roaring Knight appeared.';
  }
});

// scr_monster_actreset(slot)
defineScript('scr_monster_actreset', (m) => {
  const g = global;
  for (let fj = 0; fj < 6; fj++) {
    g.canact[m][fj] = 0;
    g.actname[m][fj] = ' ';
    g.actactor[m][fj] = 1;
    g.actdesc[m][fj] = ' ';
    g.actcost[m][fj] = 0;
    g.actsimul[m][fj] = 0;
    for (const s of ['sus', 'ral', 'noe']) {
      g['canact' + s][m][fj] = 0;
      g['actname' + s][m][fj] = ' ';
      g['actdesc' + s][m][fj] = ' ';
      g['actcost' + s][m][fj] = 0;
      g['actsimul' + s][m][fj] = 0;
      g['actactor' + s][m][fj] = 0;
    }
  }
});

// scr_monster_statreset(slot)
defineScript('scr_monster_statreset', (m) => {
  const g = global;
  g.monster[m] = 0;
  g.monsterx[m] = 0;
  g.monstery[m] = 0;
  g.monstername[m] = ' ';
  g.monsterat[m] = 0;
  g.monsterdf[m] = 0;
  g.monsterhp[m] = 0;
  g.monstermaxhp[m] = 0;
  g.monsterinstance[m] = null;
  g.monstergold[m] = 0;
  g.monsterexp[m] = 0;
  g.sparepoint[m] = 0;
  g.hittarget[m] = 0;
  g.mercymod[m] = 0;
  g.mercymax[m] = 0;
  g.monstercomment[m] = ' ';
  g.monsterattackname[m] = ' ';
  g.monsterstatus[m] = 0;
  S.scr_monster_actreset(m);
});

// scr_monster_makeinstance(slot): creates the enemy, then its event_user(12) (monster setup)
// and event_user(15) (recruit info, unused here).
defineScript('scr_monster_makeinstance', (m) => {
  const g = global;
  g.monster[m] = 1;
  const old = g.monsterinstance[m];
  if (old && old.alive) old.alive = false;
  const inst = instance_create(g.monstermakex[m], g.monstermakey[m], g.monsterinstancetype[m]);
  g.monsterinstance[m] = inst;
  inst.myself = m;
  if (inst.user12) inst.user12();
  else S.scr_monster_setup_default(inst);
  if (inst.user15) inst.user15();
  return inst;
});

// The default obj_monsterparent Other_22: monster position + scr_monstersetup.
defineScript('scr_monster_setup_default', (inst) => {
  global.monsterx[inst.myself] = inst.x + inst.sprite_width / 2;
  global.monstery[inst.myself] = inst.y + inst.sprite_height / 2;
  S.scr_monstersetup(inst);
});

// scr_monstersetup(): monster scope (myself). Only type 104 (the Roaring Knight) is used here.
defineScript('scr_monstersetup', (inst) => {
  const g = global;
  const m = inst.myself;
  S.scr_monster_actreset(m);
  if (g.monstertype[m] == 104) {
    g.monstername[m] = '';
    g.monstermaxhp[m] = 7300;
    g.monsterhp[m] = 7300;
    g.monsterat[m] = 40;
    g.monsterdf[m] = 0;
    g.monsterexp[m] = 0;
    g.monstergold[m] = 0;
    g.sparepoint[m] = 0;
    g.mercymod[m] = 0;
    g.mercymax[m] = 100;
    g.canact[m][0] = 1;
    g.actname[m][0] = 'Check';
    g.actdesc[m][0] = 'Useless#analysis';
    g.canact[m][1] = 1;
    g.actname[m][1] = 'HoldBreath';
    g.canactsus[m][0] = 1;
    g.actnamesus[m][0] = 'S-Action';
    g.actsimulsus[m][0] = 0;
    g.canactral[m][0] = 1;
    g.actnameral[m][0] = 'R-Action';
    g.actsimulral[m][0] = 0;
  }
});

// scr_get_knight_total_attempts(): the game counts earlier attempts in the save files; in the
// simulator every attempt counts, so losing always leads to the game over screen.
defineScript('scr_get_knight_total_attempts', () => 1);

// ---------------------------------------------------------------- obj_time, start

class ObjTime extends Instance {
  create() { this.depth = -9999; this.visible = false; this.persistent = true; }
  beginStep() {
    if (G.pendingGameover) {
      const p = G.pendingGameover;
      G.pendingGameover = null;
      S.startGameover(p);
      return;
    }
    global.time = (global.time || 0) + 1;
  }
}
defineObject('obj_time', ObjTime);

// Overworld spots the party stands on when the battle starts (they jump into battle positions).
const INTRO_START = [[150, 130], [112, 168], [92, 214]];

// Starts a fresh Knight fight: opts.intro = false skips the encounter transition.
export function startBattle(opts = {}) {
  const tempflag = global.tempflag ? global.tempflag.slice() : null;
  snd_free_all();
  room_reset();
  G.viewScale = 1;
  G.camX = G.camY = 0;
  // A stand-in enemy is used only while the real Knight is not registered (development).
  registerBackground();
  G.knightEnemyObject = objectExists('obj_knight_enemy') ? 'obj_knight_enemy' : 'obj_knight_enemy_stub';
  S.init_battle_globals();
  if (tempflag) {
    global.tempflag = tempflag;
    global.tempflag[93] = 1;
  }
  instance_create(0, 0, 'obj_time');
  if (G.settings?.simplify) global.flag[8] = 1;
  global.introx = INTRO_START.map(p => p[0]);
  global.introy = INTRO_START.map(p => p[1]);
  if (opts.intro === false) {
    S.scr_encountersetup(global.encounterno);
    instance_create(0, 0, 'obj_battlecontroller');
  } else {
    instance_create(0, 0, 'obj_encounterbasic');
  }
  G.battleStarted = G.frame;
}
defineScript('startBattle', startBattle);
