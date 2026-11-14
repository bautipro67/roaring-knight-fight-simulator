// The overworld side of DELTARUNE that the Roaring Knight's scenes need (Chapter 3): obj_cutscene_master
// and its c_* commands (scr_cutscene_commands, including c_wait_if, c_wait_box, c_delaycmd,
// c_animate and c_script_instance), obj_actor, the movers (obj_move_actor, obj_move_to_point), the
// camera (obj_panner), obj_dialoguer, obj_animator, obj_cutscene_delaycmd and Kris (obj_mainchara).
// Ported from the Spamton NEO simulator's copy (Chapter 2) and checked against Chapter 3.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists, instancesOf,
  draw_sprite_ext, draw_set_color, draw_rectangle, lerp, point_distance, point_direction, lengthdir_x, lengthdir_y,
  clamp, left_h, right_h, up_h, down_h, button2_h, sprite_get_width, sprite_get_height, sprite_get_xoffset,
  sprite_get_yoffset,
} from '../runtime/gm.js?v=20261114054926';
import {
  snd_play, snd_pitch, snd_volume, snd_init, snd_loop, snd_stop, snd_free_all, mus_loop_ext, mus_volume, mus_stop,
  mus_pause, mus_resume,
} from '../runtime/audio.js?v=20261114054926';
import { scr_darkbox } from './common.js?v=20261114054926';
import { scr_lerpvar_instance, scr_shakeobj, scr_script_repeat } from '../knight/common.js?v=20261114054926';

// ---------------------------------------------------------------- helpers

// scr_depth: depth = 100000 - (y * 10 + sprite_height * 10)
export const scr_depth = inst => { inst.depth = 100000 - (inst.y * 10 + inst.sprite_height * 10); };
const first = name => instancesOf(name)[0] ?? null;

// scr_flip("x" / "y"): mirrors the instance around its sprite's middle.
export function scr_flip(inst, axis) {
  const s = inst.sprite_index;
  if (axis === 'h' || axis === 'x') {
    inst.x += (sprite_get_width(s) - sprite_get_xoffset(s) * 2) * inst.image_xscale;
    inst.image_xscale = -inst.image_xscale;
  } else {
    inst.y += (sprite_get_height(s) - sprite_get_yoffset(s) * 2) * inst.image_yscale;
    inst.image_yscale = -inst.image_yscale;
  }
}

// ---------------------------------------------------------------- facing sprites

// scr_set_facing_sprites (dark world, Chapter 3: the same sets as Chapter 2).
const FACING = {
  kris: ['spr_krisu_dark', 'spr_krisr_dark', 'spr_krisd_dark', 'spr_krisl_dark'],
  susie: ['spr_susie_walk_up_dw', 'spr_susie_walk_right_dw', 'spr_susie_walk_down_dw', 'spr_susie_walk_left_dw'], // "susiedarkeyes"
  susieunhappy: ['spr_susie_walk_up_dw', 'spr_susie_walk_right_dw_unhappy', 'spr_susie_walk_down_dw_unhappy', 'spr_susie_walk_left_dw_unhappy'],
  ralsei: ['spr_ralsei_walk_up', 'spr_ralsei_walk_right', 'spr_ralsei_walk_down', 'spr_ralsei_walk_left'],
  ralseiunhappy: ['spr_ralsei_walk_up', 'spr_ralsei_walk_right_unhappy', 'spr_ralsei_walk_down_unhappy', 'spr_ralsei_walk_left_unhappy'],
};
const NAME_OF = { susieunhappy: 'susie', ralseiunhappy: 'ralsei' };
export function setFacingSprites(a, name) {
  const s = FACING[name];
  if (!s) return;
  a.name = NAME_OF[name] ?? name;
  [a.usprite, a.rsprite, a.dsprite, a.lsprite] = s;
}
function actorFacing(a, f) {
  a.facing = f;
  a.sprite_index = { d: a.dsprite, r: a.rsprite, l: a.lsprite, u: a.usprite }[f] ?? a.sprite_index;
}

// ---------------------------------------------------------------- obj_actor

export class Actor extends Instance {
  create() {
    scr_depth(this);
    Object.assign(this, {
      image_speed: 0, walk: 1, auto_walk: 1, auto_facing: 1, auto_depth: 1, stopped: 0, depthbonus: 0, facing: 'd',
      name: '', fake_speed: 0, fake_direction: 0, color_blend: 0xffffff, sinerx: 0, sinery: 0,
      shakex: 0, shakey: 0, shakeamt: 0, dz: 2, image_xscale: 2, image_yscale: 2,
    });
  }
  step() {
    if (this.auto_walk === 1 && this.walk === 1) {
      let v = 0;
      if (this.fake_speed !== 0) v = this.fake_speed;
      if (this.speed !== 0) v = this.speed;
      if (v > 0) {
        const n = v / (10 * this.dz);
        this.image_speed = n <= 0.25 ? 0.25 : n >= 1 ? 0.5 : n;
        if (this.stopped === 1) { this.image_index = 1; this.stopped = 0; }
      }
      if (v === 0) { this.stopped = 1; this.image_index = 0; this.image_speed = 0; }
    }
    if (this.auto_facing === 1 && this.dsprite) {
      let vv = 0, vh = 0;
      if (this.fake_speed !== 0) { vv = lengthdir_y(this.fake_speed, this.fake_direction); vh = lengthdir_x(this.fake_speed, this.fake_direction); }
      if (this.hspeed !== 0) vh = this.hspeed;
      if (this.vspeed !== 0) vv = this.vspeed;
      if (vv > 0.05) this.sprite_index = this.dsprite;
      if (vv < -0.05) this.sprite_index = this.usprite;
      if (Math.abs(vh) > Math.abs(vv) && vh > 0.05) this.sprite_index = this.rsprite;
      if (Math.abs(vh) > Math.abs(vv) && vh < -0.05) this.sprite_index = this.lsprite;
    }
    if (this.auto_depth === 1) { scr_depth(this); this.depth += this.depthbonus; }
  }
  draw() {
    draw_sprite_ext(this.sprite_index, this.image_index, this.x + this.sinerx + this.shakex, this.y + this.sinery + this.shakey,
      this.image_xscale, this.image_yscale, this.image_angle, this.color_blend, this.image_alpha);
  }
}
defineObject('obj_actor', Actor);

// ---------------------------------------------------------------- movers

// c_walk: obj_move_actor walks the actor in one direction for `time` frames.
class MoveActor extends Instance {
  create() { this.timer = 0; this.time = 0; this.target = null; }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    this.timer += 1;
    if (this.timer >= this.time) {
      t.speed = 0;
      t.image_index = 0;
      t.image_speed = 0;
      instance_destroy(this);
    }
  }
}
defineObject('obj_move_actor', MoveActor);

class MoveToPoint extends Instance {
  create() { Object.assign(this, { target: null, moved: 0, movetimer: 0, movex: 0, movey: 0, movemax: 10 }); }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    if (this.moved === 0) {
      this.x = t.x;
      this.y = t.y;
      this.amt = point_distance(this.x, this.y, this.movex, this.movey) / this.movemax;
      this.dir = point_direction(this.x, this.y, this.movex, this.movey);
      this.moved = 1;
    }
    if (t instanceof Actor) { t.fake_speed = this.amt; t.fake_direction = this.dir; }
    this.movetimer += 1;
    t.x = lerp(this.x, this.movex, this.movetimer / this.movemax);
    t.y = lerp(this.y, this.movey, this.movetimer / this.movemax);
    if (this.movetimer >= this.movemax) {
      if (t instanceof Actor) t.fake_speed = 0;
      instance_destroy(this);
    }
  }
}
defineObject('obj_move_to_point', MoveToPoint);

// scr_move_to_point_over_time
export function moveToPoint(target, x, y, time) {
  const m = instance_create(target.x, target.y, 'obj_move_to_point');
  Object.assign(m, { target, movex: x, movey: y, movemax: time });
  return m;
}

// scr_animate (obj_animator): plays target frames initframe..endframe at fake_image_speed.
class Animator extends Instance {
  create() {
    Object.assign(this, { con: 0, initframe: -1, endframe: -1, target: null, animsprite: -1, fake_image_speed: 0.25, fake_image_index: 0, fake_image_index_max: 0, delay: 0 });
  }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    if (this.con === 0) {
      t.image_index = 0;
      t.image_speed = 0;
      if (this.animsprite !== -1) t.sprite_index = this.animsprite; // ("sprite" in the game)
      if (this.initframe >= 0) t.image_index = this.initframe;
      this.fake_image_index_max = this.endframe;
      const n = t.sprite?.n ?? 1;
      if (this.endframe === 0) this.fake_image_index_max = n - 1 - t.image_index;
      if (this.endframe === -1) this.fake_image_index_max = n - t.image_index;
      this.con = 1;
    }
    this.delay -= 1;
    if (this.con === 1 && this.delay < 1) {
      this.fake_image_index += this.fake_image_speed;
      t.image_index = this.fake_image_index;
      if (this.fake_image_index >= this.fake_image_index_max) instance_destroy(this);
    }
  }
  draw() {}
}
defineObject('obj_animator', Animator);

// ---------------------------------------------------------------- camera

// c_panspeed (type 0: move the view by panx/pany each frame) / c_pan (type 1: lerp to x, y).
class Panner extends Instance {
  create() {
    Object.assign(this, { panx: 0, pany: 0, startx: G.camX, starty: G.camY, finalx: this.x, finaly: this.y, panmax: 1, pantimer: 0, type: 0 });
  }
  step() {
    if (this.type === 0) { G.camX += this.panx; G.camY += this.pany; }
    this.pantimer += 1;
    if (this.type === 1) {
      G.camX = lerp(this.startx, this.finalx, this.pantimer / this.panmax);
      G.camY = lerp(this.starty, this.finaly, this.pantimer / this.panmax);
    }
    if (this.pantimer >= this.panmax) instance_destroy(this);
  }
}
defineObject('obj_panner', Panner);

// ---------------------------------------------------------------- obj_dialoguer

// The dark-world text box at the bottom (side 1) or top (side 0), with its writer and face. With
// zurasu on (c_msgzurasu(1)) the writer and the face keep their place on the screen while the
// camera moves.
class Dialoguer extends Instance {
  create() {
    this.depth = -500;
    this.active = 0;
    this.side = 1;
    this.writer = null;
    this.face = null;
    this.cur_jewel = 0;
    this.zurasu = 0;
    this.remx = G.camX;
    this.remy = G.camY;
    const k = first('obj_mainchara');
    if (k && k.y > G.camY + 250) this.side = 0;
    this.alarm[0] = 1;
  }
  alarm0() {
    this.active = 1;
    const xx = Math.round(38 + G.camX), yy = Math.round(40 + G.camY);
    const w = instance_create(xx + 20, this.side === 0 ? yy - 10 : yy + 300, 'obj_writer');
    w.depth = this.depth - 1;
    w.dialoguer = 1;
    w.facer = 1;
    const face = instance_create(w.x + 16, w.y + 10, 'obj_face');
    face.depth = this.depth - 2;
    if (global.fc !== 0 && w.originalcharline === 33) w.charline = 26;
    this.writer = w;
    this.face = face;
    this.remx = G.camX;
    this.remy = G.camY;
  }
  draw() {
    if (this.active !== 1) return;
    if (this.zurasu === 1 && this.writer && this.writer.alive) {
      const dx = G.camX - this.remx, dy = G.camY - this.remy;
      if (dx || dy) {
        for (const o of [this.writer, this.face]) {
          if (!o || !o.alive) continue;
          o.x += dx;
          o.y += dy;
          if (o.writingx !== undefined) { o.writingx += dx; o.writingy += dy; }
        }
      }
    }
    this.remx = G.camX;
    this.remy = G.camY;
    const x = G.camX, y = G.camY;
    draw_set_color(0);
    if (this.side === 0) {
      draw_rectangle(x + 38, y + 16, x + 602, y + 154, false);
      scr_darkbox(this, x + 24, y + 2, x + 616, y + 168);
    } else {
      draw_rectangle(x + 38, y + 326, x + 602, y + 464, false);
      scr_darkbox(this, x + 24, y + 312, x + 616, y + 478);
    }
    if (!this.writer || !this.writer.alive) instance_destroy(this);
  }
}
defineObject('obj_dialoguer', Dialoguer);
export const d_ex = () => instance_exists('obj_dialoguer');

// ---------------------------------------------------------------- obj_mainchara

// Kris in the room. In these scenes Kris is always in a cutscene (global.interact = 1), so the
// walking code never runs; the camera follows only when cutscene is 0.
const KRIS = ['spr_krisd_dark', 'spr_krisr_dark', 'spr_krisu_dark', 'spr_krisl_dark'];
class MainChara extends Instance {
  create() {
    Object.assign(this, {
      image_xscale: 2, image_yscale: 2, image_speed: 0, fun: 0, cutscene: 1, runtimer: 0, walktimer: 0, walkbuffer: 0,
      bwspeed: 4, bounds: [0, 0, 99999, 99999],
    });
    global.facing ??= 0;
    this.sprite_index = KRIS[global.facing];
  }
  step() {
    if (this.fun !== 0) return;
    const nowx = this.x, nowy = this.y;
    let px = 0, py = 0, runmove = 0;
    if (global.interact === 0) {
      const run = button2_h() ? 1 : 0;
      let wspeed = this.bwspeed;
      if (run) wspeed = this.bwspeed + (this.runtimer > 60 ? 5 : this.runtimer > 10 ? 4 : 2);
      if (right_h()) px = wspeed;
      if (left_h()) px = -wspeed;
      if (down_h()) py = wspeed;
      if (up_h()) py = -wspeed;
      if (left_h() && !right_h()) global.facing = 3;
      else if (right_h() && !left_h()) global.facing = 1;
      else if (up_h() && !down_h() && px === 0) global.facing = 2;
      else if (down_h() && !up_h() && px === 0) global.facing = 0;
      const [x1, y1, x2, y2] = this.bounds;
      this.x = clamp(this.x + px, x1, x2);
      this.y = clamp(this.y + py, y1, y2);
      if (run && (this.x !== nowx || this.y !== nowy)) { runmove = 1; this.runtimer += 1; } else this.runtimer = 0;
    }
    if (this.x !== nowx || this.y !== nowy) this.walkbuffer = 6;
    if (this.walkbuffer > 3) {
      this.walktimer += 1.5 + (runmove ? 1.5 : 0);
      if (this.walktimer >= 40) this.walktimer -= 40;
      this.image_index = Math.floor(this.walktimer / 10);
    }
    if (this.walkbuffer <= 0) {
      this.walktimer = Math.floor(this.walktimer / 10) * 10 + 9.5;
      this.image_index = 0;
    }
    this.walkbuffer -= 0.75;
    this.sprite_index = KRIS[global.facing];
    scr_depth(this);
  }
  endStep() {
    if (this.cutscene === 0 && !instance_exists('obj_shake')) {
      G.camX = clamp(this.x - (320 - 19), 0, (G.roomW ?? 640) - 640);
      G.camY = 0;
    }
  }
}
defineObject('obj_mainchara', MainChara);

// ---------------------------------------------------------------- obj_cutscene_master

const COMPARE = {
  '=': (a, b) => a == b, '!=': (a, b) => a != b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b,
  '>': (a, b) => a > b, '<': (a, b) => a < b,
};

class CutsceneMaster extends Instance {
  create() {
    Object.assign(this, {
      cmd: [], current: 0, waiting: 0, wait_timer: 0, wait_amount: 0, wait_dialogue: 0, wait_custom: 0,
      wait_box: -1, wait_if: null, actor_id: [], actor_name: [], actor_selected_id: null, msgside: -1, zurasu: 0,
      mydialoguer: null, master_object: null, terminate: 0, kill_actors: 0, breakme: 0, mysound: null,
    });
    this.visible = false;
  }
  step() {
    if (this.waiting === 0) {
      // Runs commands until one waits; commands queued later (after a c_waitcustom_end) carry on
      // from where the list ended.
      let i = this.current, broke = false;
      for (; i < this.cmd.length; i++) {
        const c = this.cmd[i];
        c.actor = this.actor_selected_id;
        this.run(c);
        if (this.breakme) { this.breakme = 0; broke = true; break; }
      }
      this.current = broke ? i + 1 : this.cmd.length;
    }
    if (this.waiting === 1) {
      if (this.wait_amount > 0) {
        this.wait_timer += 1;
        if (this.wait_timer >= this.wait_amount) { this.wait_amount = 0; this.wait_timer = 0; this.waiting = 0; }
      }
      const dl = this.mydialoguer && this.mydialoguer.alive ? this.mydialoguer : null;
      if (this.wait_dialogue === 1 && !dl) { this.wait_dialogue = 0; this.waiting = 0; }
      if (this.wait_box >= 0) {
        const w = dl?.writer;
        if (!dl) { this.wait_box = -1; this.waiting = 0; }
        else if (w && w.alive && w.msgno >= this.wait_box) { this.wait_box = -1; this.waiting = 0; }
      }
      if (this.wait_if) {
        const { obj, name, op, value } = this.wait_if;
        if (!obj || !obj.alive || COMPARE[op]?.(obj[name], value)) { this.wait_if = null; this.waiting = 0; }
      }
    }
    if (this.terminate === 1) {
      if (this.kill_actors === 1) for (const a of this.actor_id) if (a) instance_destroy(a);
      instance_destroy(this);
    }
  }
  run(c) {
    const [a1, a2, a3, a4, a5, a6] = c.args;
    const actor = c.actor;
    switch (c.name) {
      case 'delaycmd': {
        const d = instance_create(0, 0, 'obj_cutscene_delaycmd');
        d.alarm[0] = a1;
        d.c = { name: a2, args: [a3, a4, a5, a6], actor };
        break;
      }
      case 'walk': {
        const m = instance_create(0, 0, 'obj_move_actor');
        m.target = actor;
        m.time = a3;
        actor.speed = a2;
        actor.direction = { l: 180, d: 270, r: 0, u: 90 }[a1] ?? 0;
        break;
      }
      case 'walkdirect': {
        const m = instance_create(0, 0, 'obj_move_to_point');
        Object.assign(m, { target: actor, movex: a1 === 0 ? actor.x : a1, movey: a2 === 0 ? actor.y : a2, movemax: a3 });
        break;
      }
      case 'msgset': S.msgset(a1, a2); break;
      case 'msgnext': S.msgnext(a1); break;
      case 'talk':
        this.mydialoguer = instance_create(0, 0, 'obj_dialoguer');
        if (this.msgside >= 0) this.mydialoguer.side = this.msgside;
        this.mydialoguer.zurasu = this.zurasu;
        break;
      case 'msgside':
        if (a1 === 'any') this.msgside = -1;
        if (a1 === 'top') this.msgside = 0;
        if (a1 === 'bottom') this.msgside = 1;
        if (a1 === 'zurasuon') this.zurasu = 1;
        if (a1 === 'zurasuoff') this.zurasu = 0;
        break;
      case 'speaker': S.scr_speaker(a1); break;
      case 'varto':
      case 'var': {
        const target = a1 === 0 ? actor : a1;
        if (!target) break;
        let from = a3;
        // c_var_lerp_to_instance / c_var_lerp_to: the lerp starts from the value it has now.
        if (c.name === 'varto') from = target[a2];
        if (a5 === 0) target[a2] = from;
        else if (a6 === 0) scr_lerpvar_instance(target, a2, from, a4, a5);
        // a numeric easetype eases "in"; a string like "2out" / "-1in" carries its own direction
        else if (typeof a6 !== 'string') scr_lerpvar_instance(target, a2, from, a4, a5, a6, 'in');
        else {
          const m = /^(-?)(\d+)(.*)$/.exec(String(a6));
          scr_lerpvar_instance(target, a2, from, a4, a5, m ? Number(m[1] + m[2]) : 0, m ? m[3] : 'out');
        }
        break;
      }
      case 'autowalk': actor.auto_facing = actor.auto_walk = a1; break;
      case 'autodepth': actor.auto_depth = a1; break;
      case 'depth': actor.depth = a1; break;
      case 'flip': scr_flip(actor, a1); break;
      case 'halt': actor.image_index = 0; actor.image_speed = 0; actor.speed = 0; break;
      case 'animate': {
        const an = instance_create(actor.x, actor.y, 'obj_animator');
        Object.assign(an, { target: actor, initframe: a1, endframe: a2, fake_image_speed: a3 });
        break;
      }
      case 'facing':
        if ('ldru'.includes(a1) && a1.length === 1) actorFacing(actor, a1);
        else setFacingSprites(actor, a1);
        break;
      case 'sprite': actor.sprite_index = a1; break;
      case 'visible': actor.visible = !!a1; break;
      case 'imagespeed': actor.image_speed = a1; break;
      case 'imageindex': actor.image_index = a1; break;
      case 'soundplay': {
        const v = snd_play(a1);
        if (a2 !== 0) { snd_volume(v, a2, 0); snd_pitch(v, a3); }
        break;
      }
      case 'mus': this.music(a1, a2, a3); break;
      case 'panspeed': Object.assign(instance_create(0, 0, 'obj_panner'), { panx: a1, pany: a2, panmax: a3 }); break;
      case 'pan': {
        const p = instance_create(a1, a2, 'obj_panner');
        Object.assign(p, { finalx: a1, finaly: a2, panmax: a3, type: 1 });
        break;
      }
      case 'pannable': for (const k of instancesOf('obj_mainchara')) k.cutscene = a1; break;
      case 'shakeobj': scr_shakeobj(actor); break;
      case 'addxy': actor.x += a1; actor.y += a2; break;
      case 'setxy': actor.x = a1; actor.y = a2; break;
      case 'actortokris': {
        const k = first('obj_mainchara'), kr = this.actor_id[this.actor_name.indexOf('kris')];
        if (k && kr && kr.alive) {
          k.x = kr.x;
          k.y = kr.y;
          k.visible = true;
          kr.visible = false;
          global.facing = { d: 0, r: 1, u: 2, l: 3 }[kr.facing] ?? global.facing;
          k.sprite_index = KRIS[global.facing];
        }
        break;
      }
      case 'actortocaterpillar': break; // the followers' places are not used afterwards
      case 'select': this.actor_selected_id = typeof a1 === 'number' ? this.actor_id[a1] : a1; break;
      // c_script_instance(target, script, rate, arg): runs script(arg) every `rate` frames
      // (scr_script_repeat); rate -10 stops it again (c_script_instance_stop).
      case 'script':
        if (a3 === -10) {
          for (const d of instancesOf('obj_script_delayed')) if (d.script === a2 && d.target === a1) instance_destroy(d);
        } else if (a3 === 0) a2(a1, ...(a4 === undefined ? [] : [a4]));
        else scr_script_repeat(a1, a2, -1, a3, ...(a4 === undefined ? [] : [a4]));
        break;
      case 'call': a1(...(a2 ?? [])); break; // the simulator's own hook (no GML command)
      case 'waitcustom':
        if (this.master_object) this.master_object.customcon = 1;
        this.wait_custom = 1;
        this.waiting = 1;
        this.breakme = 1;
        break;
      case 'waitdialoguer': this.waiting = 1; this.wait_dialogue = 1; this.breakme = 1; break;
      case 'waitbox': this.waiting = 1; this.wait_box = a1; this.breakme = 1; break;
      case 'waitif': this.waiting = 1; this.wait_if = { obj: a1, name: a2, op: a3, value: a4 }; this.breakme = 1; break;
      case 'wait': this.wait_amount = a1; this.wait_timer = 0; this.waiting = 1; this.breakme = 1; break;
      case 'terminate': this.terminate = 1; this.breakme = 1; break;
      case 'terminatekillactors': this.kill_actors = 1; this.terminate = 1; this.breakme = 1; break;
      default: console.warn('cutscene command not ported:', c.name);
    }
  }
  // c_mus / c_mus2: global.currentsong[0] is the stream, [1] the playing voice.
  music(kind, a, b) {
    const cs = global.currentsong ??= [null, null];
    if (kind === 'free_all') snd_free_all();
    if (kind === 'free') mus_stop(cs[0]);
    if (kind === 'stop') mus_stop(cs[1]);
    if (kind === 'pause') mus_pause(cs[1]);
    if (kind === 'resume') mus_resume(cs[1]);
    if (kind === 'init') cs[0] = snd_init(a);
    if (kind === 'initloop' || kind === 'initplay') {
      cs[0] = snd_init(a);
      cs[1] = mus_loop_ext(cs[0], 1, 1);
    }
    if (kind === 'volume') mus_volume(cs[1], a, b);
    if (kind === 'pitch') snd_pitch(cs[1], a);
    if (kind === 'loopsfx') this.mysound = snd_loop(a);
    if (kind === 'loopsfxstop') snd_stop(this.mysound);
  }
}
defineObject('obj_cutscene_master', CutsceneMaster);

// obj_cutscene_delaycmd: one command, run on its own after a delay (c_delaycmd, c_delayfacing).
class DelayCmd extends Instance {
  create() { this.c = null; this.visible = false; this.actor_id = []; this.actor_name = []; }
  alarm0() {
    if (this.c && (!this.c.actor || this.c.actor.alive)) CutsceneMaster.prototype.run.call(this, this.c);
    instance_destroy(this);
  }
}
defineObject('obj_cutscene_delaycmd', DelayCmd);

// scr_cutscene_make + the c_* commands (they queue on the newest cutscene master).
let master = null;
export function scr_cutscene_make(owner) {
  master = instance_create(0, 0, 'obj_cutscene_master');
  master.master_object = owner;
  return master;
}
const cmd = (name, ...args) => { if (master && master.alive) master.cmd.push({ name, args, actor: null }); };

// scr_actor_setup(number, instance, name)
export function scr_actor_setup(n, inst, name) {
  master.actor_id[n] = inst;
  master.actor_name[n] = name;
  setFacingSprites(inst, name);
  return inst;
}

export const c = {
  sel: n => cmd('select', n),
  setxy: (x, y) => cmd('setxy', x, y),
  addxy: (x, y) => cmd('addxy', x, y),
  visible: v => cmd('visible', v),
  facing: f => cmd('facing', f),
  delayfacing: (t, f) => cmd('delaycmd', t, 'facing', f, 0, 0, 0),
  sprite: s => cmd('sprite', s),
  imageindex: i => cmd('imageindex', i),
  imagespeed: s => cmd('imagespeed', s),
  autowalk: v => cmd('autowalk', v),
  autodepth: v => cmd('autodepth', v),
  depth: v => cmd('depth', v),
  flip: a => cmd('flip', a),
  halt: () => cmd('halt'),
  animate: (a, b, sp) => cmd('animate', a, b, sp),
  walk: (d, sp, t) => cmd('walk', d, sp, t),
  walkwait: (d, sp, t) => { cmd('walk', d, sp, t); cmd('wait', t); },
  walkdirect: (x, y, t) => cmd('walkdirect', x, y, t),
  walkdirect_wait: (x, y, t) => { cmd('walkdirect', x, y, t); cmd('wait', t); },
  wait: t => cmd('wait', t),
  wait_if: (inst, v, op, val) => cmd('waitif', inst, v, op, val),
  wait_box: n => cmd('waitbox', n),
  wait_talk: () => cmd('waitdialoguer'),
  waitcustom: () => cmd('waitcustom'),
  delaycmd: (t, name, a, b = 0, d = 0) => cmd('delaycmd', t, name, a, b, d, 0),
  var_instance: (inst, v, val) => cmd('var', inst, v, val, 0, 0, 0),
  var_lerp_instance: (inst, v, a, b, t, ease, inout) => cmd('var', inst, v, a, b, t, ease === undefined ? 0 : inout === undefined ? ease : String(ease) + inout),
  var_lerp_to_instance: (inst, v, b, t, ease, inout) => cmd('varto', inst, v, 0, b, t, ease === undefined ? 0 : inout === undefined ? ease : String(ease) + inout),
  var_lerp_to: (v, b, t, ease, inout) => cmd('varto', 0, v, 0, b, t, ease === undefined ? 0 : inout === undefined ? ease : String(ease) + inout),
  soundplay: s => cmd('soundplay', s, 0, 0),
  soundplay_x: (s, vol, pitch) => cmd('soundplay', s, vol, pitch),
  mus: k => cmd('mus', k),
  mus2: (k, a, b) => cmd('mus', k, a, b),
  pannable: v => cmd('pannable', v),
  panspeed: (x, y, t) => cmd('panspeed', x, y, t),
  pan: (x, y, t) => cmd('pan', x, y, t),
  pan_wait: (x, y, t) => { cmd('pan', x, y, t); cmd('wait', t); },
  shakeobj: () => cmd('shakeobj'),
  speaker: s => cmd('speaker', s),
  msgside: s => cmd('msgside', s),
  msgzurasu: on => cmd('msgside', on ? 'zurasuon' : 'zurasuoff'),
  msgsetloc: (n, s) => cmd('msgset', n, s),
  msgnextloc: s => cmd('msgnext', s),
  talk: () => cmd('talk'),
  talk_wait: () => { cmd('talk'); cmd('waitdialoguer'); },
  script_instance: (inst, fn, rate, arg) => cmd('script', inst, fn, rate, arg),
  script_instance_stop: (inst, fn) => cmd('script', inst, fn, -10),
  actortokris: () => cmd('actortokris'),
  actortocaterpillar: () => cmd('actortocaterpillar'),
  terminatekillactors: () => cmd('terminatekillactors'),
  call: (fn, ...args) => cmd('call', fn, args),
};
// The c_* sound commands are all c_soundplay.
c.sound_play = c.snd_play = c.soundplay;
c.sound_play_x = c.snd_play_x = c.soundplay_x;
c.lerp_var_instance = c.var_lerp_instance;

// c_waitcustom_end: lets the commands after a c_waitcustom run.
export function c_waitcustom_end() {
  for (const m of instancesOf('obj_cutscene_master')) { m.wait_custom = 0; m.waiting = 0; }
}

defineScript('scr_cutscene_make', scr_cutscene_make);
