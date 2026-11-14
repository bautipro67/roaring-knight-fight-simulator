// obj_dbulletcontroller (Chapter 3), only the Roaring Knight's attack types (98-109, 151-154),
// and scr_bulletspawner. The generic init/btimer frame is kept as in the GML.
import {
  global, defineObject, defineScript, instance_create, instance_create_depth, instance_exists, instance_destroy,
  instancesOf, choose, random, random_range, angle_difference, point_direction, lerp, S, snd_volume,
} from './rt.js?v=20261114002512';
import { first, camerax, cameray, scr_bullet_inherit, scr_childbullet, scr_loop_ext, snd_play_pitch, callOr } from './common.js?v=20261114002512';
import { BulletGenParent } from './bullets.js?v=20261114002512';

const monsterpop = callOr('scr_monsterpop', () => (global.monster ? global.monster[0] + global.monster[1] + global.monster[2] : 1));

// Warns once when an attack object has not been ported (the turn then just times out).
const missing = new Set();
function create(x, y, name) {
  const i = instance_create(x, y, name);
  if (i.constructor.name === '' && !missing.has(name)) missing.add(name);
  return i;
}

export class DBulletController extends BulletGenParent {
  constructor() {
    super();
    this.sprite_index = 'spr_grazemask';
    this.visible = false;
  }
  create() {
    this.type = 1;
    this.btimer = 99;
    this.timermax = 12;
    this.damage = -1;
    this.grazepoints = -1;
    this.timepoints = -1;
    this.inv = -1;
    this.grazed = -1;
    this.grazetimer = -1;
    this.element = 'none';
    this.target = -1;
    this.ratio = 1;
    if (monsterpop() === 2) this.ratio = 1.6;
    if (monsterpop() === 3) this.ratio = 2.3;
    this.side = 1;
    this.difficulty = 0;
    this.made = 0;
    this.special = 0;
    this.init = 0;
    this.creator = 0;
    this.creatorid = null;
    this.delay = 0;
    this.subdelay = 0;
  }
  draw() {}
  step() {
    if (this.init === 0) {
      const g = first('obj_growtangle');
      if (g) {
        this.miny = g.y - g.sprite_height / 2;
        this.maxy = g.y + g.sprite_height / 2;
        this.minx = g.x - g.sprite_width / 2;
        this.maxx = g.x + g.sprite_width / 2;
      }
      this.init = 1;
    }
    this.btimer += 1;
    const fn = this['type' + this.type];
    if (fn) fn.call(this);
  }
  hideCreator() {
    if (this.creatorid && this.creatorid.alive) this.creatorid.image_alpha = 0;
  }
  creatorPos() {
    const c = this.creatorid && this.creatorid.alive ? this.creatorid : this;
    return [c.x, c.y];
  }
  // Stars
  type98() {
    const h = first('obj_heart');
    if (this.init === 1) {
      this.init = 2;
      if (h) instance_create(h.x, h.y, 'obj_heart_follower');
      this.bulletmaker = instance_create(this.x, this.y, 'obj_knight_pointing_cone');
      this.btimer = 0;
      this.bulletmaker.difficulty = this.difficulty;
      this.endtimer = 120;
      if (this.difficulty >= 2) {
        this.endtimer += 30;
        global.turntimer += 60;
        this.endtimer += 60;
      }
      this.bulletmaker.endtimer = this.endtimer;
      this.delay = 0;
      this.subdelay = 0;
      global.turntimer += 30;
      if (this.difficulty === 0) this.side = choose(-1, 1);
    } else if (this.init >= 3) return;
    if (global.turntimer <= this.endtimer + 1) this.init = 3;
    else if ((this.made !== 0 && this.btimer >= 4) || this.btimer >= 45) {
      const bm = this.bulletmaker;
      if (this.difficulty === 2) this.side = choose(0, 66, -66);
      const d = scr_childbullet(this, bm.x + 22, bm.y + 56, 'obj_knight_pointing_star');
      d.difficulty = this.difficulty;
      d.side = this.side;
      const star = snd_play_pitch('snd_stardrop', 0.5);
      if (star) snd_volume(star, 0.5, 0);
      if (this.made === 0) {
        this.size = random_range(0.5, 1);
        this.special = random_range(-0.5, 0.5);
      } else {
        this.special += 0.5;
        this.special += 0.5 + Math.sin(random(1)) * 0.3;
        this.special %= 1;
        this.special -= 0.5;
        this.size += 0.5 + Math.sin(this.made) * 0.5;
        this.size %= 1;
      }
      let dir = 180 + this.special * bm.angle;
      if (this.size <= 0.1 && h) {
        const hd = point_direction(bm.x + 22, bm.y + 56, h.x + 10, h.y + 10);
        if (Math.abs(angle_difference(hd, dir)) < 20) {
          if (dir < hd) dir = hd - 20 + angle_difference(hd, dir);
          else dir = hd + 20 + angle_difference(hd, dir);
          dir = scr_loop_ext(dir, 180 - bm.angle, 180 + bm.angle);
        }
      }
      d.direction = dir;
      d.speed = lerp(10, 5, this.size);
      d.grow_Speed = lerp(0.1, 0.25, this.size);
      this.made += 1;
      this.btimer = 0;
    }
  }
  // Flurry
  type99() {
    if (this.made) return;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_roaringknight_boxsplitter_attack');
    scr_bullet_inherit(this, s);
    s.difficulty = this.difficulty;
    s.turn_type = 'full';
    if (s.user0) s.user0();
    this.made = true;
  }
  type100() {
    if (this.made) return;
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    scr_bullet_inherit(this, create(cx, cy, 'obj_knight_slasher'));
  }
  type101() {
    if (this.made) return;
    this.made = true;
    const g = first('obj_growtangle'), h = first('obj_heart');
    if (g) { g.x -= 70; g.image_xscale = 2.5; }
    if (h) h.x -= 70;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    scr_bullet_inherit(this, create(cx, cy, 'obj_knight_tunnel_slasher'));
  }
  type102() {
    if (this.made) return;
    global.turntimer = 999999;
    this.made = true;
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_knight_tunnel_slasher_2_revised');
    scr_bullet_inherit(this, s);
    if (s.user0) s.user0();
    this.hideCreator();
  }
  type103() {
    if (this.made) return;
    const g = first('obj_growtangle');
    if (g) { g.image_xscale = 3.5; g.image_yscale = 3.5; }
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    scr_bullet_inherit(this, create(cx, cy, 'obj_knight_stream'));
  }
  // Rotating slash
  type104() {
    if (this.made) return;
    global.turntimer = 999999;
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_knight_rotating_slash');
    s.difficulty = this.difficulty;
    if (s.user0) s.user0();
    scr_bullet_inherit(this, s);
  }
  type105() {
    if (this.made) return;
    this.hideCreator();
    global.turntimer = 999999;
    const s = create(0, 0, 'obj_knight_combinations');
    scr_bullet_inherit(this, s);
    if (s.user0) s.user0();
    this.made = true;
  }
  type106() {
    if (this.made) return;
    for (const e of instancesOf('obj_knight_enemy')) {
      const w = instance_create_depth(e.x, e.y, e.depth, 'obj_knight_warp');
      w.master = e;
      if (w.user1) w.user1();
    }
    const g = first('obj_growtangle');
    if (g) { g.image_xscale = 2; g.image_yscale = 2; }
    global.turntimer = 999999;
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_knight_weird_bottom_manager');
    scr_bullet_inherit(this, s);
    if (s.user0) s.user0();
  }
  // Roaring
  type107() {
    if (this.made) return;
    global.turntimer = 999999;
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_knight_roaring2');
    s.target = 3;
    scr_bullet_inherit(this, s);
  }
  // Swords falling
  type108() {
    if (this.made) return;
    global.turntimer = 999999;
    this.made = true;
    this.hideCreator();
    const [cx, cy] = this.creatorPos();
    const s = create(cx, cy, 'obj_knight_swordfall');
    s.target = 3;
    s.difficulty = this.difficulty;
    scr_bullet_inherit(this, s);
    s.turn_type = 'full';
    s.turn_segment = -1;
    s.next_up = -999;
    s.turn_segment = 0;
    if (s.user0) s.user0();
  }
  // Crescents
  type109() {
    if (this.made) return;
    if (this.creatorid && this.creatorid.alive) {
      const c = this.creatorid;
      const w = instance_create_depth(c.x, c.y, c.depth, 'obj_knight_warp');
      w.master = c;
      if (w.user1) w.user1();
    }
    this.made = true;
    const d = create(camerax() + 480, cameray() + 160, 'obj_bullet_knight_crescentGenerator');
    if (this.difficulty === 1) d.type = 3;
  }
  // Tracking swords
  type151() {
    if (this.made) return;
    const g = first('obj_growtangle');
    const m = create(g ? g.x : camerax() + 320, cameray(), 'obj_tracking_swords_manager');
    scr_bullet_inherit(this, m);
    m.variant = this.difficulty;
    m.damage = this.damage;
    if (m.user0) m.user0();
    this.made = true;
  }
  type152() {
    if (this.made) return;
    const g = first('obj_growtangle');
    const m = create(g ? g.x : camerax() + 320, cameray(), 'obj_diagonal_bullet_manager');
    scr_bullet_inherit(this, m);
    m.difficulty = this.difficulty;
    this.made = true;
  }
  // Sword tunnel
  type153() {
    if (this.made) return;
    const g = first('obj_growtangle');
    const m = create(g ? g.x : camerax() + 320, cameray(), 'obj_sword_tunnel_manager');
    scr_bullet_inherit(this, m);
    m.difficulty = this.difficulty;
    m.damage = this.damage;
    if (m.user0) m.user0();
    this.made = true;
  }
  // Sword vortex
  type154() {
    if (this.made) return;
    const g = first('obj_growtangle');
    const m = create(g ? g.x : camerax() + 320, cameray(), 'obj_sword_vortex_manager');
    scr_bullet_inherit(this, m);
    m.variant = this.difficulty;
    m.damage = this.damage;
    this.made = true;
  }
}
defineObject('obj_dbulletcontroller', DBulletController);

// scr_bulletspawner(x, y, obj) (monster scope)
export function scr_bulletspawner(self, x, y, obj) {
  const dc = instance_create(x, y, obj);
  dc.creator = self.myself;
  dc.creatorid = self;
  dc.target = self.mytarget;
  dc.damage = (global.monsterat?.[self.myself] ?? 40) * 5;
  return dc;
}
defineScript('scr_bulletspawner', scr_bulletspawner);
