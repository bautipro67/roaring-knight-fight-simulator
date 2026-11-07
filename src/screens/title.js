// Title screen: the Knight fight background, the Roaring Knight hovering, and a SOUL menu.
// URL params: ?battle starts the fight at once, ?nointro also skips the encounter transition,
// ?practice[&attack=N][&hp=N] starts practice mode.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, objectExists,
  draw_sprite_ext, draw_set_color, draw_set_font, draw_set_alpha, draw_rectangle, draw_text, controls,
  draw_set_halign, draw_text_transformed, fa_center, fa_left,
} from '../runtime/gm.js?v=20261107001915';
import { snd_init, snd_play, mus_loop_ext, mus_volume, mus_stop } from '../runtime/audio.js?v=20261107001915';
import { startBattle } from '../battle/setup.js?v=20261107001915';
import * as SB from '../debug/sandbox.js?v=20261107001915';
import { gotoRoom, fadeOut, centerText } from './common.js?v=20261107001915';
import { saveSettings, applyVolume, getBest } from '../settings.js?v=20261107001915';
import { HATS, currentHat, drawHat } from '../hats.js?v=20261107001915';
import { openEquipment } from './equipment.js?v=20261107001915';
import { openControls, keyName } from './controls.js?v=20261107001915';
import './gameover.js?v=20261107001915';
import './ending.js?v=20261107001915';

// Dark panel over the title art, behind the OPTIONS and CONTROLS lists.
class Panel extends Instance {
  create() {
    this.depth = -10;
    this.title = '';
    this.alpha = 0;
  }
  step() { this.alpha = Math.min(0.9, this.alpha + 0.15); }
  draw() {
    draw_set_alpha(this.alpha);
    draw_set_color(0);
    draw_rectangle(0, 0, 639, 479, false);
    draw_set_alpha(1);
    draw_set_font('fnt_mainbig');
    draw_set_color(0xffffff);
    centerText(320, 34, this.title);
    // The SOUL wearing the chosen hat, next to the SOUL HAT option.
    if (this.hatPreview) {
      draw_sprite_ext('spr_dodgeheart', 0, 520, 170, 3, 3, 0, 0xffffff, this.alpha / 0.9);
      drawHat(550, 170, 3);
    }
  }
}
defineObject('obj_sim_panel', Panel);

const PRACTICE_HP = SB.PRACTICE_HP || [90, 45, 1];
const practiceCount = () => SB.PRACTICE_COUNT || SB.ATTACKS?.length || 1;

class Title extends Instance {
  create() {
    this.depth = 0;
    this.t = 0;
    this.sprite_index = 'spr_roaringknight_idle';
    this.image_speed = 1 / 6;
  }
  step() { this.t += 1; }
  draw() {
    const t = this.t;
    const a = Math.min(1, t / 30);
    draw_set_font('fnt_mainbig');
    draw_set_color(0xffffff);
    draw_set_alpha(a);
    draw_set_halign(fa_center);
    draw_text_transformed(320, 24, 'ROARING KNIGHT', 2, 2, 0);
    draw_text_transformed(320, 92, 'FIGHT SIMULATOR', 1, 1, 0);
    draw_set_halign(fa_left);
    draw_set_alpha(1);
    // The Knight hovers (y = ystart + cos(siner / 8) * 8) and leaves afterimages drifting right.
    const kx = 242, ky = 156, ks = 1.5;
    for (let k = 4; k >= 1; k--) {
      draw_sprite_ext('spr_roaringknight_idle', 0, kx + k * 8, ky + Math.cos((t - k * 4) / 8) * 8, ks, ks, 0, 0xffffff, a * 0.5 * (1 - k / 5));
    }
    draw_sprite_ext('spr_roaringknight_idle', 0, kx, ky + Math.cos(t / 8) * 8, ks, ks, 0, 0xffffff, a);
    draw_set_alpha(1);
    draw_set_font('fnt_main');
    draw_set_color(0x808080);
    const c = controls;
    const moves = [c.up, c.down, c.left, c.right].map(a => keyName(a.keys[0]));
    const move = moves.join('') === 'UPDOWNLEFTRIGHT' ? 'ARROWS' : moves.join('/');
    centerText(320, 440, `${keyName(c.confirm.keys[0])}: CONFIRM    ${keyName(c.cancel.keys[0])}: CANCEL    ${move}: MOVE`);
    centerText(320, 458, 'DELTARUNE (C) TOBY FOX.  UNOFFICIAL FAN SIMULATOR.');
  }
}
defineObject('obj_sim_title', Title);

export function startTitle() {
  // Direct links (?battle, ?practice) only apply when the page opens, not when returning here.
  const p = new URLSearchParams(G.titleShown ? '' : location.search);
  G.titleShown = true;
  if (p.has('practice')) {
    SB.startPractice({ start: (Number(p.get('attack')) || 1) - 1, hp: Number(p.get('hp')) || 90 });
    return;
  }
  if (p.has('battle') || p.has('nointro')) {
    if (p.has('nointro')) G.settings.intro = false;
    startBattle({ intro: G.settings.intro });
    return;
  }
  gotoRoom();
  global.flag[8] = G.settings.simplify ? 1 : 0;
  if (objectExists('obj_bgfountaintest') && !G.settings.simplify) instance_create(0, 0, 'obj_bgfountaintest');
  instance_create(0, 0, 'obj_sim_title');
  const music = snd_init('knight_appears.ogg');
  mus_loop_ext(music, 0.8, 1);
  mainMenu(music);
}

const MENU_X = 236, MENU_Y = 318;

function leave(music, then) {
  mus_volume(music, 0, 20);
  fadeOut(20, () => {
    mus_stop(music);
    then();
  });
}

function mainMenu(music, cur = 0) {
  const menu = instance_create(MENU_X, MENU_Y, 'obj_sim_heartmenu');
  menu.setup(['BEGIN', 'PRACTICE', 'EQUIPMENT', 'OPTIONS'], (i, m) => {
    if (i == 0) return leave(music, () => startBattle({ intro: G.settings.intro }));
    instance_destroy(m);
    if (i == 1) practiceMenu(music);
    if (i == 2) equipmentMenu(music);
    if (i == 3) optionsMenu(music);
  }, 'fnt_mainbig', 28);
  menu.cur = cur;
}

// Practice: dodge the fight's attacks in order; see startPractice in src/debug/sandbox.js.
G.practice = G.practice || { start: 0, hp: 0 };
function practiceMenu(music) {
  const P = G.practice;
  const menu = instance_create(MENU_X, MENU_Y, 'obj_sim_heartmenu');
  const back = m => { instance_destroy(m); mainMenu(music, 1); };
  menu.setup([
    () => {
      const best = getBest(PRACTICE_HP[P.hp]);
      return 'START' + (P.start == 0 && best ? '   (BEST ' + best + ')' : '');
    },
    () => 'FROM ATTACK: ' + (P.start + 1) + ' / ' + practiceCount(),
    () => 'HP: ' + PRACTICE_HP[P.hp] + (PRACTICE_HP[P.hp] == 1 ? ' (NO HIT)' : ''),
    'BACK',
  ], (i, m) => {
    if (i == 0) return leave(music, () => SB.startPractice({ start: P.start, hp: PRACTICE_HP[P.hp] }));
    if (i == 3) return back(m);
    if (i == 1) P.start = (P.start + 1) % practiceCount();
    if (i == 2) P.hp = (P.hp + 1) % PRACTICE_HP.length;
    m.done = false;
    m.buffer = 1;
  }, 'fnt_mainbig', 28);
  menu.onBack = back;
}

// Volume in 10% steps; Z cycles, left / right adjust.
function setVolume(v) {
  G.settings.volume = Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
  applyVolume();
  saveSettings();
  snd_play('snd_select');
}

function setHat(dir) {
  const i = HATS.indexOf(currentHat());
  G.settings.hat = HATS[(i + dir + HATS.length) % HATS.length].name;
  saveSettings();
  snd_play('snd_select');
}

// EQUIPMENT: weapons, armors and items for the fight (src/screens/equipment.js).
function equipmentMenu(music) {
  const panel = instance_create(0, 0, 'obj_sim_panel');
  panel.title = 'EQUIPMENT';
  openEquipment(() => {
    instance_destroy(panel);
    mainMenu(music, 2);
  });
}

function optionsMenu(music, cur = 0, panel = null) {
  panel = panel || instance_create(0, 0, 'obj_sim_panel');
  panel.title = 'OPTIONS';
  const menu = instance_create(150, 100, 'obj_sim_heartmenu');
  menu.depth = -20;
  const back = m => {
    saveSettings();
    instance_destroy(m);
    instance_destroy(panel);
    mainMenu(music, 3);
  };
  panel.hatPreview = true;
  menu.setup([
    () => 'VOLUME: < ' + Math.round(G.settings.volume * 100) + '% >',
    () => 'SOUL HAT: < ' + currentHat().name + ' >',
    () => 'EASY MODE: ' + (G.settings.easy ? 'ON' : 'OFF'),
    () => 'INTRO: ' + (G.settings.intro ? 'ON' : 'OFF'),
    () => 'SIMPLIFY VFX: ' + (G.settings.simplify ? 'ON' : 'OFF'),
    'CONTROLS',
    'BACK',
  ], (i, m) => {
    if (i == 6) return back(m);
    if (i == 5) {
      instance_destroy(m);
      panel.title = 'CONTROLS';
      panel.hatPreview = false;
      openControls(() => optionsMenu(music, 5, panel));
      return;
    }
    m.done = false;
    m.buffer = 1;
    if (i == 0) setVolume(G.settings.volume >= 1 ? 0 : G.settings.volume + 0.1);
    if (i == 1) setHat(1);
    if (i == 2) G.settings.easy = !G.settings.easy;
    if (i == 3) G.settings.intro = !G.settings.intro;
    if (i == 4) {
      G.settings.simplify = !G.settings.simplify;
      global.flag[8] = G.settings.simplify ? 1 : 0;
    }
    saveSettings();
  }, 'fnt_mainbig', 36);
  menu.cur = cur;
  menu.onBack = back;
  menu.onAdjust = (i, dir) => {
    if (i == 0) setVolume(G.settings.volume + dir * 0.1);
    if (i == 1) setHat(dir);
  };
}
defineScript('startTitle', startTitle);

void draw_rectangle;
