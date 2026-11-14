// The end screen. With SCENES on it comes after the scene that follows the fight (src/knight/scenes.js)
// and only shows the result and TRY AGAIN / TITLE. With SCENES off it stands in for that scene: on a
// win, Susie's "We... we actually beat it?" lines over the wind (wind_highplace.ogg at half pitch);
// after GO FORWARD, the Knight over the fallen party.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_exists, draw_sprite_ext,
  draw_set_color, draw_set_font, draw_set_alpha, draw_rectangle,
} from '../runtime/gm.js?v=20261114002512';
import { snd_init, mus_loop_ext, mus_volume, mus_stop } from '../runtime/audio.js?v=20261114002512';
import { startBattle } from '../battle/setup.js?v=20261114002512';
import { gotoRoom, scr_darkbox, fadeOut, centerText } from './common.js?v=20261114002512';

const BS = String.fromCharCode(92);
const LINES = {
  // obj_ch3_PTB02 con 50 (the Knight defeated)
  win: {
    msg: [
      BS + 'TX ' + BS + 'F0 ' + BS + 'Ee ' + BS + 'FS ' + BS + 'TS %',
      BS + 'Ee* We..^1. we actually beat it?/',
      BS + 'EW* What^1, don\'t tell me you\'ve had ENOUGH already?/',
      BS + 'EY* C\'mon^1, we were just getting started!/%',
    ],
    title: 'THE ROARING KNIGHT WAS DEFEATED!',
    color: 0xffff00,
    knight: 'spr_roaringknight_hurt',
  },
  // GO FORWARD (MOVE ON): the story goes on without a victory.
  lose: {
    msg: ['* The Roaring Knight stood over the fallen party./', '* ... and then it was gone./%'],
    title: 'THE ROARING KNIGHT WON...',
    color: 0xffffff,
    knight: 'spr_roaringknight_idle',
  },
};

class Ending extends Instance {
  create() {
    this.depth = 2;
    this.kind = 'win';
    this.con = 0;
    this.t = 0;
    this.writer = null;
    this.cur_jewel = 0;
    this.titlealpha = 0;
    this.afterScene = false;
    this.music = snd_init('wind_highplace.ogg');
    mus_loop_ext(this.music, 0, 0.5);
    mus_volume(this.music, 1, 60);
  }
  say(lines) {
    global.fc = 0;
    global.typer = 6;
    global.msg = new Array(100).fill('%%');
    lines.forEach((s, i) => { global.msg[i] = s; });
    this.writer = instance_create(58, 340, 'obj_writer');
    this.writer.dialoguer = 1;
    this.face = instance_create(54, 344, 'obj_face');
    this.face.depth = 1;
  }
  step() {
    const d = LINES[this.kind];
    this.t += 1;
    if (this.con == 0 && this.t >= 45) {
      this.con = 1;
      if (this.afterScene) this.writer = null; // the scene already told it
      else this.say(d.msg);
    }
    if (this.con == 1 && !instance_exists(this.writer)) {
      this.con = 3;
      this.t = 0;
      global.fc = 0;
      const menu = instance_create(236, 360, 'obj_sim_heartmenu');
      menu.setup(['TRY AGAIN', 'TITLE'], (i) => {
        mus_volume(this.music, 0, 20);
        fadeOut(20, () => {
          mus_stop(this.music);
          if (i == 0) {
            if (G.settings?.scenes !== false) S.startKnightFight();
            else startBattle({ intro: G.settings?.intro !== false });
          } else S.startTitle();
        });
      }, 'fnt_mainbig', 32);
    }
  }
  draw() {
    const d = LINES[this.kind];
    const a = this.con >= 3 ? 1 : Math.min(1, this.t / 30);
    const bob = Math.cos(this.t / 8) * 8;
    if (!this.afterScene) draw_sprite_ext(d.knight, 0, 230, 70 + bob, 2, 2, 0, 0xffffff, a);
    if (this.con >= 1 && this.con <= 2) {
      draw_set_color(0);
      draw_rectangle(38, 326, 602, 464, false);
      scr_darkbox(this, 24, 312, 616, 478);
    }
    if (this.con >= 3) {
      this.titlealpha = Math.min(1, this.titlealpha + 0.05);
      draw_set_alpha(this.titlealpha);
      draw_set_font('fnt_mainbig');
      draw_set_color(d.color);
      centerText(320, 300, d.title);
      draw_set_alpha(1);
    }
  }
}
defineObject('obj_sim_ending', Ending);

defineScript('startEnding', (kind, opts = {}) => {
  gotoRoom();
  global.fighting = 0;
  const e = instance_create(0, 0, 'obj_sim_ending');
  e.kind = kind === 'lose' ? 'lose' : 'win';
  e.afterScene = !!opts.afterScene;
});
