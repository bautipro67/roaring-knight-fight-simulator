// Attack sandbox: ?sandbox&attack=N (N = index in ATTACKS; optional &seed=, &music, &god).
// Sets up just enough of the battle for the bullet phase, launches the attack the way
// obj_knight_enemy does (box, SOUL, obj_dbulletcontroller at rtimer 12) and restarts it when the turn ends.
// Keys: [ ] previous/next attack, 0-9 (Shift: 10-19) attack, R restart, I invincibility, M music,
// (F2 hitboxes, F3 pause, F4 frame step from main.js).
import {
  G, global, Instance, defineObject, defineScript, objectExists, instance_create, instance_destroy, instance_exists,
  instancesOf, event_user, choose, keyboard_check, keyboard_check_pressed, random_set_seed, round, S,
  draw_set_font, draw_set_halign, draw_set_color, draw_set_alpha, draw_rectangle, draw_text, draw_sprite_ext,
  fa_left, fa_center, merge_color, button1_p, vk, draw_self,
} from '../runtime/gm.js?v=20261114054926';
import { snd_play, snd_init, mus_loop_ext, mus_stop, snd_stop } from '../runtime/audio.js?v=20261114054926';
import { audioReady, assets } from '../runtime/assets.js?v=20261114054926';
import { gotoRoom } from '../screens/common.js?v=20261114054926';
import { getBest, saveBest } from '../settings.js?v=20261114054926';
import { drawSoulHat } from '../hats.js?v=20261114054926';
import { tagParent } from '../knight/common.js?v=20261114054926';

// The Knight's turns in fight order: [myattackchoice, difficulty, name, object the attack needs].
// Only the attacks whose objects are ported are listed (ATTACKS).
const FIGHT_ORDER = [
  [1, 0, 'Stars', 'obj_knight_pointing_cone'],
  [11, 0, 'Tracking swords', 'obj_tracking_swords_manager'],
  [2, 0, 'Flurry', 'obj_roaringknight_boxsplitter_attack'],
  [13, 0, 'Sword tunnel', 'obj_sword_tunnel_manager'],
  [5, 0, 'Rotating slash', 'obj_knight_rotating_slash'],
  [1, 1, 'Golden stars', 'obj_knight_pointing_cone'],
  [2, 1, 'Flurry II', 'obj_roaringknight_boxsplitter_attack'],
  [13, 3, 'Sword tunnel II', 'obj_sword_tunnel_manager'],
  [15, 0, 'Sword vortex', 'obj_sword_vortex_manager'],
  [5, 1, 'Rotating slash II', 'obj_knight_rotating_slash'],
  [1, 2, 'Stars III', 'obj_knight_pointing_cone'],
  [2, 3, 'Flurry III', 'obj_roaringknight_boxsplitter_attack'],
  [14, 0, 'Tracking swords III', 'obj_tracking_swords_manager'],
  [13, 4, 'Sword tunnel III', 'obj_sword_tunnel_manager'],
  [5, 2, 'Rotating slash III', 'obj_knight_rotating_slash'],
  [9, 0, 'The Roaring', 'obj_knight_roaring2'],
  // Not used in the fight (the Knight's code still has them).
  [10, 0, 'Swords falling (unused)', 'obj_knight_swordfall'],
  [0, 0, 'Crescent slashes (unused)', 'obj_bullet_knight_crescentGenerator'],
  // Phase 1 turns 6-9: phase 1 always ends on turn 5, so the fight never reaches them.
  [12, 0, 'Diagonal bullets (unused)', 'obj_diagonal_bullet_manager'],
  [7, 0, 'Combination (unused)', 'obj_knight_combinations'],
];
const UNUSED_FROM = 16;
export const ATTACKS = FIGHT_ORDER.filter(a => objectExists(a[3]));
const KEY_LBRACKET = 219, KEY_RBRACKET = 221, KEY_SHIFT = 16;

const arr = (n, v = 0) => new Array(n).fill(v);

// ---------------------------------------------------------------- globals

function setupGlobals() {
  if ('init_battle_globals' in S) {
    try { S.init_battle_globals(); } catch (e) { console.warn('init_battle_globals failed', e); }
  }
  const g = global;
  g.flag ??= arr(10000);
  g.tempflag ??= arr(100);
  g.char ??= [1, 2, 3];
  g.charname ??= [' ', 'Kris', 'Susie', 'Ralsei'];
  g.maxhp ??= [0, 90, 110, 70];
  g.hp ??= g.maxhp.slice();
  g.inv = -1;
  g.invc ??= 1;
  g.maxtension ??= 250;
  g.tension = 0;
  g.sp = 4;
  g.heartx ??= 310;
  g.hearty ??= 160;
  // obj_battlecontroller Create
  g.darkzone = 1;
  g.fighting = 1;
  g.fc = 0;
  g.fe = 0;
  g.typer = 4;
  g.battletyper = 4;
  g.myfight = 0;
  g.mnfight = 0;
  g.bmenuno = 0;
  g.attacking = 0;
  g.spelldelay = 10;
  g.turntimer = 0;
  g.msg ??= [];
  g.battlemsg ??= [];
  for (const k of ['charmove', 'charcantarget']) g[k] = [1, 1, 1];
  for (const k of ['chardead', 'charcond', 'automiss', 'charaction', 'charspecial', 'chartarget', 'faceaction', 'acting', 'targeted'])
    g[k] = arr(3);
  g.battleat = [];
  g.battledf = [];
  g.battlemag = [];
  for (let i = 0; i < 3; i++) {
    const c = g.char[i];
    const sum = (base, item, def) => (g[base] && g[item] ? g[base][c] + g[item][c][0] + g[item][c][1] + g[item][c][2] : def);
    g.battleat[i] = sum('at', 'itemat', 10);
    g.battledf[i] = sum('df', 'itemdf', 2);
    g.battlemag[i] = sum('mag', 'itemmag', 0);
  }
  g.charinstance = arr(3, null);
  // Monster slots; the Knight in slot 0 (scr_monstersetup type 104).
  g.monster = [1, 0, 0];
  g.monstertype = [104, 0, 0];
  g.monsterinstancetype = ['obj_knight_enemy', 0, 0];
  g.monstername = ['Knight', ' ', ' '];
  g.monstermaxhp = [7300, 0, 0];
  g.monsterhp = [7300, 0, 0];
  g.monsterat = [40, 0, 0];
  g.monsterdf = [0, 0, 0];
  g.monsterattackname = ['', '', ''];
  g.monsterx = arr(3);
  g.monstery = arr(3);
  g.monsterinstance = arr(3, null);
  g.monsterstatus = arr(3);
  g.monstercomment = [' ', ' ', ' '];
  g.mercymod = arr(3);
  g.mercymax = [100, 0, 0];
  g.sparepoint = arr(3);
  g.monstergold = arr(4);
  g.monsterexp = arr(4);
  g.hittarget = arr(3);
  const table = v => Array.from({ length: 3 }, () => arr(6, v));
  for (const k of ['canact', 'actcost', 'act', 'acttype', 'actspell', 'actsimul', 'canactsus', 'actsimulsus', 'actactorsus', 'actcostsus', 'canactral', 'actsimulral', 'actactorral', 'actcostral', 'canactnoe', 'actsimulnoe']) g[k] = table(0);
  for (const k of ['actname', 'actdesc', 'actnamesus', 'actdescsus', 'actnameral', 'actdescral', 'actnamenoe']) g[k] = table(' ');
  g.actactor = table(1);
}

// Scripts the battle modules may not have registered yet. Only missing ones are added.
function installFallbacks() {
  const fallback = (name, fn) => { if (!(name in S)) defineScript(name, fn); };
  fallback('scr_monsterpop', () => global.monster[0] + global.monster[1] + global.monster[2]);
  fallback('scr_tensionheal', n => {
    global.tension += n;
    if (global.tension > global.maxtension) global.tension = global.maxtension;
  });
  fallback('scr_dead', i => {
    global.charmove[i] = 0;
    global.charcantarget[i] = 0;
    global.chardead[i] = 1;
    global.charaction[i] = 0;
    global.charspecial[i] = 0;
  });
  fallback('scr_revive', i => {
    global.charmove[i] = 1;
    global.charcantarget[i] = 1;
    global.chardead[i] = 0;
  });
  fallback('scr_targetall', inst => {
    for (let i = 0; i < 3; i++) if (global.charcantarget[i] == 1) global.targeted[i] = 1;
    inst.mytarget = 3;
    inst.target = 3;
  });
  fallback('scr_randomtarget', inst => {
    const able = global.charcantarget.some(v => v == 1);
    if (able) {
      do inst.mytarget = choose(0, 1, 2); while (global.charcantarget[inst.mytarget] != 1);
    } else inst.mytarget = 3;
    global.targeted[inst.mytarget] = 1;
  });
  fallback('scr_monstersetup', () => {});
  fallback('scr_damage', inst => {
    if (!(global.inv < 0) || global.chemg_god_mode) return;
    if (inst.target < 3 && global.hp[global.char[inst.target]] <= 0) {
      S.scr_randomtarget(inst);
      inst.target = inst.mytarget;
    }
    inst.chartarget = 3;
    let tdamage = inst.damage;
    if (inst.target < 3) {
      tdamage = Math.ceil(tdamage - global.battledf[inst.target] * 3);
      inst.chartarget = global.char[inst.target];
      if (global.charaction[inst.target] == 10) tdamage = Math.ceil(2 * tdamage / 3);
      if (tdamage < 1) tdamage = 1;
    }
    if (!instance_exists('obj_shake')) instance_create(0, 0, 'obj_shake');
    const ci = global.charinstance[inst.target];
    if (ci) { ci.hurt = 1; ci.hurttimer = 0; }
    for (const h of instancesOf('obj_heart')) h.dmgnoise = 1;
    if (inst.target < 3) {
      const ct = inst.chartarget;
      if (global.hp[ct] <= 0) global.hp[ct] -= round(tdamage / 4);
      else {
        global.hp[ct] -= tdamage;
        if (global.hp[ct] <= 0) {
          global.hp[ct] = round(-global.maxhp[ct] / 2);
          S.scr_dead(inst.target);
        }
      }
    }
    if (inst.target == 3) {
      for (let i = 0; i < 3; i++) {
        const ct = global.char[i];
        if (global.hp[ct] >= 0) {
          global.hp[ct] -= global.charaction[i] == 10 ? Math.ceil(tdamage / 2) : tdamage;
          if (global.hp[ct] <= 0) global.hp[ct] = round(-global.maxhp[0] / 2);
        }
      }
    }
    global.inv = global.invc * 40;
    if (![0, 1, 2].some(i => global.char[i] != 0 && global.hp[global.char[i]] > 0)) S.scr_gameover();
  });
  fallback('scr_damage_all', inst => {
    if (!(global.inv < 0)) return;
    const remdamage = inst.damage, temptarget = inst.target;
    for (let ti = 0; ti < 3; ti++) {
      global.inv = -1;
      inst.damage = remdamage;
      inst.target = ti;
      if (global.hp[global.char[ti]] > 0 && global.char[ti] != 0) S.scr_damage(inst);
    }
    global.inv = global.invc * 40;
    inst.target = temptarget;
  });
}

// ---------------------------------------------------------------- party stand-ins

// The real hero objects need the battle controller; these only stand where they stand,
// so scr_moveheart / scr_damage / obj_darkener have something to point at.
const HeroParent = tagParent('obj_heroparent');
const HERO = {
  1: { tag: 'obj_herokris', idle: 'spr_krisb_idle', hurt: 'spr_krisb_hurt', down: 'spr_krisb_defeat', w: 68, h: 74 },
  2: { tag: 'obj_herosusie', idle: 'spr_susieb_idle', hurt: 'spr_susieb_hurt', down: 'spr_susieb_defeat', w: 70, h: 82 },
  3: { tag: 'obj_heroralsei', idle: 'spr_ralsei_idle', hurt: 'spr_ralsei_hurt_fixed', down: 'spr_ralsei_defeat', w: 52, h: 86 },
};
const heroClasses = {};
for (const [c, h] of Object.entries(HERO)) {
  heroClasses[c] = defineObject('obj_sandbox_' + h.tag.slice(8), class extends tagParent(h.tag, HeroParent) {
    create() {
      this.char = Number(c);
      this.image_speed = 0.15;
      this.image_xscale = 2;
      this.image_yscale = 2;
      this.darkify = 0;
      this.darkentimer = 0;
      this.hurt = 0;
      this.hurttimer = 0;
      this.mywidth = h.w;
      this.myheight = h.h;
      this.tu = 0;
      this.state = 0;
    }
    step() {
      this.siner = (this.siner || 0) + 1;
      if (this.hurt) {
        this.hurttimer += 1;
        if (this.hurttimer > 15) this.hurt = 0;
      }
      if (this.darkify && this.darkentimer < 15) this.darkentimer += 1;
      if (!this.darkify && this.darkentimer > 0) this.darkentimer -= 3;
    }
    draw() {
      const down = global.hp[this.char] <= 0;
      const spr = down ? h.down : this.hurt ? h.hurt : h.idle;
      const blend = merge_color(0xffffff, 0, Math.max(0, this.darkentimer) / 30);
      // obj_heroparent Draw: idle frames at siner / 5; the hurt pose slides back as hurttimer / 2 grows.
      const hurtindex = Math.min(2, this.hurttimer / 2);
      const index = down ? 0 : this.hurt ? hurtindex : this.siner / 5;
      const x = this.hurt && !down ? this.x - 20 + hurtindex * 10 : this.x;
      draw_sprite_ext(spr, index, x, this.y, 2, 2, 0, blend, this.image_alpha);
    }
  });
}

// ---------------------------------------------------------------- controller stand-in

// Answers to obj_battlecontroller (grazenoise, instance_exists checks) and runs the parts of
// its Step the bullet phase needs: the turn timer and the end-of-phase cleanup.
class SandboxController extends tagParent('obj_battlecontroller') {
  constructor() {
    super();
    this.depth = -100000;
  }
  create() {
    this.grazenoise = 0;
    this.reset = 0;
    this.timeron = 1;
    this.noreturn = 0;
    this.skipvictory = 0;
    this.hpcolor = [0x00ffff, 0xff00ff, 0x00ff00];
    this.attackIndex = 0;
    this.phase = 'wait';
    this.wait = 10;
    this.hits = 0;
    this.prevInv = -1;
    this.god = false;
    this.runs = 0;
    this.music = null;
  }
  select(i) {
    this.attackIndex = (i + ATTACKS.length) % ATTACKS.length;
    this.restart();
  }
  // End the running turn early (the next one picks up the new attack).
  restart() {
    if (this.phase === 'bullets' && this.reset === 0) {
      global.turntimer = 0;
    } else if (this.phase === 'wait') this.wait = 1;
  }
  begin() {
    const [choice, difficulty] = ATTACKS[this.attackIndex] || [1, 0];
    global.targeted = arr(3);
    global.myfight = -1;
    if (!instance_exists('obj_darkener')) instance_create(0, 0, 'obj_darkener');
    // obj_knight_enemy's talk phase ends (mnfight 1.5): it makes the box, sends the SOUL in and
    // at rtimer 12 creates the obj_dbulletcontroller for its chosen attack.
    for (const k of instancesOf('obj_knight_enemy')) {
      k.user0 = () => {}; // the attack is the sandbox's to choose
      k.myattackchoice = choice;
      k.difficulty = difficulty;
      if (choice === 9) { k.phase = 3; k.phase4turn = 3; }
      S.scr_randomtarget(k);
      k.talked = 1;
      k.attacked = 0;
      k.rtimer = 0;
      k.image_alpha = 1;
      k.visible = true;
      k.chargeupcon = 0;
      k.chargeuptimer = 0;
    }
    global.mnfight = 1.5;
    global.turntimer = 120;
    this.phase = 'bullets';
    this.runs += 1;
  }
  step() {
    this.input();
    if (this.phase === 'wait' && --this.wait <= 0) this.begin();
    if (this.god) {
      global.chemg_god_mode = 1;
      for (let c = 1; c <= 3; c++) global.hp[c] = global.maxhp[c];
    } else global.chemg_god_mode = 0;
    if (global.inv > this.prevInv + 1) this.hits += 1;
    this.prevInv = global.inv;
    if (this.grazenoise === 1) {
      snd_play('snd_graze');
      this.grazenoise = 0;
    }
    if (global.mnfight == 2 && this.timeron === 1) {
      global.turntimer -= 1;
      if (global.turntimer <= 0 && this.reset === 0) {
        for (const b of instancesOf('obj_bulletparent')) instance_destroy(b);
        for (const b of instancesOf('obj_bulletgenparent')) instance_destroy(b);
        for (const d of instancesOf('obj_darkener')) d.darken = 0;
        for (const h of instancesOf('obj_heart')) {
          instance_create(h.x, h.y, 'obj_returnheart');
          instance_destroy(h);
        }
        this.reset = 1;
        if (this.noreturn === 0) this.alarm[2] = 15;
      }
    }
  }
  // scr_mnendturn, minus the menu: straight back into the next attack.
  alarm2() {
    this.reset = 0;
    global.mnfight = 0;
    global.myfight = 0;
    global.targeted = arr(3);
    for (const m of instancesOf('obj_monsterparent')) {
      m.attacked = 0;
      m.talked = 0;
      m.acting = 0;
      m.rtimer = 0;
      m.image_alpha = 1;
      m.visible = true;
    }
    // Attacks cut short leave their helpers behind.
    for (const o of instancesOf(['obj_lerpvar', 'obj_script_delayed', 'obj_dbulletcontroller'])) instance_destroy(o);
    for (const g of instancesOf('obj_growtangle')) instance_destroy(g);
    global.invc = 1;
    this.phase = 'wait';
    this.wait = 20;
  }
  input() {
    const shift = keyboard_check(KEY_SHIFT);
    if (keyboard_check_pressed(KEY_LBRACKET)) this.select(this.attackIndex - 1);
    if (keyboard_check_pressed(KEY_RBRACKET)) this.select(this.attackIndex + 1);
    for (let d = 0; d <= 9; d++) {
      if (keyboard_check_pressed(String(d))) {
        const i = shift ? 10 + d : d;
        if (i < ATTACKS.length) this.select(i);
      }
    }
    if (keyboard_check_pressed('R')) this.restart();
    if (keyboard_check_pressed('I')) this.god = !this.god;
    if (keyboard_check_pressed('M')) this.toggleMusic();
  }
  toggleMusic() {
    if (this.music) {
      mus_stop(this.music);
      this.music = null;
    } else {
      this.music = snd_init('knight.ogg');
      mus_loop_ext(this.music, 0.7, 1);
    }
  }
  drawEnd() {
    const [ja, type, name] = ATTACKS[this.attackIndex] || [0, 0, '(no attack ported)'];
    const hp = c => `${global.charname?.[c] ?? c} ${global.hp[c]}/${global.maxhp[c]}`;
    const lines = [
      `attack ${this.attackIndex} (choice ${ja}, difficulty ${type}): ${name}   [${this.attackIndex + 1}/${ATTACKS.length}, run ${this.runs}]`,
      `turntimer ${Math.ceil(global.turntimer)}  inv ${Math.round(global.inv)}  hits ${this.hits}${this.god ? '  INVINCIBLE' : ''}`,
      `${hp(1)}  ${hp(2)}  ${hp(3)}   TP ${Math.floor(global.tension / global.maxtension * 100)}%`,
      '[ ] / 0-9 / Shift+0-9: attack   R: restart   I: invincible   M: music',
    ];
    const x = G.camX + 4, y = G.camY + 330;
    draw_set_alpha(0.6);
    draw_set_color(0);
    draw_rectangle(x - 4, y - 2, x + 636, y + lines.length * 16 + 2, false);
    draw_set_alpha(1);
    draw_set_font('fnt_main');
    draw_set_halign(fa_left);
    draw_set_color(0xffffff);
    lines.forEach((s, i) => draw_text(x, y + i * 16, s));
  }
}
defineObject('obj_sandboxcontroller', SandboxController);

// ---------------------------------------------------------------- practice mode

// Bad Time Simulator style: dodge each attack of the real fight in order. Losing the whole
// HP bar restarts the attack; surviving it moves on to the next one, up to the Final Chaos.
// Score: 1000 per cleared attack, +500 if it was cleared without a hit, plus grazing points
// earned in the successful attempt, all multiplied by the HP difficulty; each retry costs 300.
// Practice runs the fight-order attacks (not the unused ones).
export const PRACTICE_COUNT = Math.max(1, ATTACKS.filter(a => FIGHT_ORDER.indexOf(a) < UNUSED_FROM).length);
export const PRACTICE_HP = [90, 45, 1];
const HP_MULTIPLIER = { 90: 1, 45: 1.5, 1: 2 };
const CLEAR_POINTS = 1000, PERFECT_POINTS = 500, RETRY_PENALTY = 300, GRAZE_POINTS = 4;

class PracticeController extends SandboxController {
  create() {
    super.create();
    this.poolMax = 90;
    this.pool = 90;
    this.retries = 0;
    this.failed = false;
    this.finished = false;
    this.banner = '';
    this.bannerColor = 0xffffff;
    this.bannerTimer = 0;
    this.prevHp = null;
    this.wait = 45;
    this.score = 0;
    this.attemptGraze = 0;
    this.attemptHit = false;
    this.fullRun = false;
    this.newBest = false;
    this.best = 0;
  }
  get mult() { return HP_MULTIPLIER[this.poolMax] ?? 1; }
  begin() {
    this.pool = this.poolMax;
    this.failed = false;
    this.attemptGraze = 0;
    this.attemptHit = false;
    for (let c = 1; c <= 3; c++) global.hp[c] = global.maxhp[c];
    this.prevHp = global.hp.slice();
    global.tension = 0;
    super.begin();
  }
  step() {
    if (this.finished) {
      // The results stay up a moment: a Z pressed as the last attack ends (shooting, mashing)
      // does not skip them. (alarm2 sets finished before this step runs, in the same frame.)
      this.endTimer = (this.endTimer ?? 0) + 1;
      if (this.endTimer > 20 && button1_p()) this.quit();
      return;
    }
    // A hit costs the biggest HP loss of any party member that frame (bombs hit everyone at once).
    if (this.prevHp && this.phase === 'bullets' && !this.failed) {
      let lost = 0;
      for (let c = 1; c <= 3; c++) lost = Math.max(lost, this.prevHp[c] - global.hp[c]);
      if (lost > 0) {
        this.attemptHit = true;
        this.pool = Math.max(0, this.pool - lost);
        if (this.pool <= 0) this.fail();
      }
      // Grazing raises TP; it is turned into points and TP is emptied so it never caps.
      if (global.tension > 0) {
        this.attemptGraze += global.tension * GRAZE_POINTS;
        global.tension = 0;
      }
    }
    // The party never falls, so the Knight keeps targeting the way it does in the real fight.
    for (let i = 0; i < 3; i++) {
      const c = global.char[i];
      if (global.hp[c] <= 0) S.scr_revive(i);
      global.hp[c] = global.maxhp[c];
    }
    this.prevHp = global.hp.slice();
    if (this.bannerTimer > 0) this.bannerTimer -= 1;
    super.step();
  }
  input() {}
  show(text, color, frames = 50) {
    this.banner = text;
    this.bannerColor = color;
    this.bannerTimer = frames;
  }
  fail() {
    this.failed = true;
    snd_play('snd_hurt1');
    this.show('TRY AGAIN', 0xff4040);
    this.restart();
  }
  alarm2() {
    super.alarm2();
    this.wait = 45;
    if (this.failed) {
      this.retries += 1;
      this.score = Math.max(0, this.score - RETRY_PENALTY);
      return;
    }
    const perfect = !this.attemptHit;
    const gained = Math.round((CLEAR_POINTS + (perfect ? PERFECT_POINTS : 0) + this.attemptGraze) * this.mult);
    this.score += gained;
    this.attemptGraze = 0;
    if (this.attackIndex + 1 >= PRACTICE_COUNT) {
      this.finished = true;
      this.phase = 'done';
      if (this.fullRun) this.newBest = saveBest(this.poolMax, this.score);
      this.best = Math.max(this.best, this.fullRun ? this.score : 0);
      snd_play('snd_won');
      return;
    }
    this.attackIndex += 1;
    snd_play('snd_great_shine');
    this.show(`${perfect ? 'PERFECT!' : 'CLEAR!'} +${gained}`, perfect ? 0x40ffff : 0xffff00);
  }
  rank() {
    const top = PRACTICE_COUNT * (CLEAR_POINTS + PERFECT_POINTS) * this.mult;
    const r = this.score / top;
    return r >= 0.85 ? 'S' : r >= 0.65 ? 'A' : r >= 0.45 ? 'B' : 'C';
  }
  quit() {
    if (this.realGameover) defineScript('scr_gameover', this.realGameover);
    if (this.music) mus_stop(this.music);
    S.startTitle();
  }
  drawEnd() {
    const x = G.camX, y = G.camY;
    const [, , name] = ATTACKS[this.attackIndex] || [0, 0, ''];
    // The HUD fades while the SOUL is down in its area (the Final Chaos board fills the screen).
    const hearts = instancesOf('obj_heart');
    const near = hearts.some(h => h.y > y + 330);
    this.hudAlpha = (this.hudAlpha ?? 1) + ((near ? 0.25 : 1) - (this.hudAlpha ?? 1)) * 0.25;
    draw_set_alpha(this.hudAlpha);
    draw_set_halign(fa_left);
    draw_set_font('fnt_mainbig');
    draw_set_color(0xffffff);
    draw_text(x + 40, y + 360, `ATTACK ${this.attackIndex + 1}/${PRACTICE_COUNT}`);
    draw_set_color(0xffff00);
    draw_text(x + 250, y + 360, name.toUpperCase());
    // HP bar in the Bad Time Simulator colours: yellow over red.
    draw_set_color(0xffffff);
    draw_text(x + 40, y + 400, 'HP');
    const bx = x + 90, by = y + 404, bw = 180;
    draw_set_color(0xff0000);
    draw_rectangle(bx, by, bx + bw, by + 20, false);
    draw_set_color(0xffff00);
    if (this.pool > 0) draw_rectangle(bx, by, bx + Math.max(1, Math.round(bw * this.pool / this.poolMax)), by + 20, false);
    draw_set_color(0xffffff);
    draw_text(x + 290, y + 400, `${Math.ceil(this.pool)} / ${this.poolMax}`);
    const live = this.score + Math.round(this.attemptGraze * this.mult);
    draw_text(x + 440, y + 400, `SCORE ${live}`);
    draw_set_font('fnt_main');
    draw_set_color(0x808080);
    draw_text(x + 40, y + 446, 'ESC / P: PAUSE');
    draw_text(x + 300, y + 446, `RETRIES ${this.retries}` + (this.fullRun ? `     BEST ${this.best}` : '     PARTIAL RUN (NO BEST)'));
    draw_set_alpha(1);
    // The SOUL always stays on top of the HUD.
    for (const h of hearts) if (h.visible) { draw_self(h); drawSoulHat(h); }
    draw_set_halign(fa_center);
    draw_set_font('fnt_mainbig');
    if (this.finished) {
      draw_set_alpha(0.8);
      draw_set_color(0);
      draw_rectangle(x + 110, y + 90, x + 530, y + 330, false);
      draw_set_alpha(1);
      draw_set_color(0xffff00);
      draw_text(x + 320, y + 110, 'PRACTICE COMPLETE!');
      draw_set_color(0xffffff);
      draw_text(x + 320, y + 160, `SCORE: ${this.score}   RANK ${this.rank()}`);
      draw_text(x + 320, y + 200, `RETRIES: ${this.retries}`);
      if (this.newBest) {
        draw_set_color(0x40ffff);
        draw_text(x + 320, y + 240, 'NEW BEST!');
      } else if (this.fullRun) draw_text(x + 320, y + 240, `BEST: ${this.best}`);
      draw_set_color(0xffffff);
      draw_text(x + 320, y + 285, 'PRESS Z');
    } else if (this.bannerTimer > 0) {
      draw_set_alpha(Math.min(1, this.bannerTimer / 15));
      draw_set_color(this.bannerColor);
      draw_text(x + 320, y + 290, this.banner);
      draw_set_alpha(1);
    }
    draw_set_halign(fa_left);
  }
}
defineObject('obj_practicecontroller', PracticeController);

export function startPractice({ start = 0, hp = 90 } = {}) {
  G.lastPractice = { start, hp };
  gotoRoom();
  ensureMusic('knight.ogg');
  const first = Math.max(0, Math.min(PRACTICE_COUNT - 1, start));
  const ctl = setupArena('obj_practicecontroller', first);
  ctl.poolMax = ctl.pool = hp;
  ctl.fullRun = first === 0 && HP_MULTIPLIER[hp] !== undefined;
  ctl.best = getBest(hp);
  ctl.toggleMusic();
}

// ---------------------------------------------------------------- entry points

// The Knight, the party stand-ins and the background, driven by the given controller object.
function setupArena(controllerName, attackIndex) {
  setupGlobals();
  installFallbacks();
  // Neither mode ever ends in a game over: it just refills the party. The real script is
  // put back when practice returns to the title.
  const realGameover = 'scr_gameover' in S ? S.scr_gameover : null;
  defineScript('scr_gameover', () => {
    for (let c = 1; c <= 3; c++) global.hp[c] = global.maxhp[c];
    for (let i = 0; i < 3; i++) S.scr_revive(i);
  });
  // The real controller exists before the monster (it creates it), so it steps first.
  const ctl = instance_create(0, 0, controllerName);
  ctl.realGameover = realGameover;
  ctl.attackIndex = attackIndex;
  // scr_encountersetup(115) positions
  const heromake = [[126, 104], [80, 142], [58, 190]];
  for (let i = 0; i < 3; i++) {
    const c = global.char[i];
    if (!c || !HERO[c]) continue;
    const h = instance_create(heromake[i][0], heromake[i][1], 'obj_sandbox_' + HERO[c].tag.slice(8));
    h.myself = i;
    h.depth = 200 - i * 20;
    global.charinstance[i] = h;
  }
  // The ACT tables the battle controller normally allocates; scr_monstersetup fills them.
  for (const s of ['', 'sus', 'ral', 'noe']) {
    for (const n of ['canact', 'actactor', 'actcost', 'actsimul']) global[n + s] ??= Array.from({ length: 3 }, () => Array(6).fill(0));
    for (const n of ['actname', 'actdesc']) global[n + s] ??= Array.from({ length: 3 }, () => Array(6).fill(' '));
  }
  const knight = instance_create(425, 78, 'obj_knight_enemy');
  knight.myself = 0;
  global.monsterinstance[0] = knight;
  try {
    event_user(knight, 12);
  } catch (e) {
    console.warn('obj_knight_enemy Other_22 / scr_monstersetup failed; using the default stats', e);
  }
  return ctl;
}

// knight.ogg is loaded on demand when the battle modules did not list it.
function ensureMusic(file) {
  if (!audioReady.music[file]) {
    audioReady.music[file] = fetch(new URL('../../assets/music/' + file, import.meta.url)).then(r => r.arrayBuffer())
      .then(b => { assets.music[file] = b; return b; });
  }
}

export function startSandbox(params) {
  if (params.has('seed')) random_set_seed(Number(params.get('seed')) || 0);
  ensureMusic('knight.ogg');
  const want = Number(params.get('attack') ?? 0);
  const ctl = setupArena('obj_sandboxcontroller', want >= 0 && want < ATTACKS.length ? want : 0);
  if (params.has('god')) ctl.god = true;
  if (params.has('music')) ctl.toggleMusic();
  window.sandbox = ctl;
}
