// "Combination" (obj_dbulletcontroller type 105, myattackchoice 7): obj_knight_combinations chains
// three of the Knight's patterns in one turn (obj_knight_enemy.first/second/third_attack) through
// turn_type / turn_segment / next_up / next_next_up. Pattern ids:
//   1 obj_roaringknight_quickslash_attack (quick slashes across the box, then one big slash),
//   2 obj_knight_rotating_slash (rotating.js), 3 obj_knight_tunnel_slasher_2_revised (walls of
//   swords with a drifting gap), 4 obj_knight_swordfall (swordfall.js),
//   5 obj_knight_weird_bottom_manager (circles under the box that shoot upwards).
// Also obj_roaringknight_quickslash / obj_roaringknight_quickslash_big (the slashes),
// obj_knight_weird_circle and obj_knight_weird_circle_bullet.
import {
  G, global, S, defineObject, objectExists, instance_create, instance_create_depth, instance_destroy, instancesOf,
  irandom, irandom_range, random, random_range, choose, clamp, lerp, merge_color, make_color_rgb, lengthdir_x,
  lengthdir_y, point_direction, angle_difference, draw_sprite, draw_sprite_ext, draw_sprite_part_ext, draw_self,
  draw_set_blend_mode, surface_create, surface_exists, surface_free, surface_set_target, surface_reset_target,
  draw_clear_alpha, draw_surface, snd_play, snd_loop, snd_stop, c_red,
} from '../rt.js?v=20261107152018';
import {
  first, i_ex, enemyRef, heartRef, boardRef, camerax, cameray, view_x, view_y, setAll, scr_get_box, gt_minx, gt_miny,
  scr_lerpvar, scr_script_delayed, scr_script_repeat, scr_var, scr_approach, scr_movetowards, scr_pingpong_ext,
  scr_orbitaroundpoint, scr_inverselerp, scr_ease_out, scr_afterimage, scr_afterimage_grow, scr_bullet_init,
  scr_bullet_inherit, scr_darksize, scr_bulletparent_count, scr_fire_bullet, snd_play_x,
} from '../common.js?v=20261107152018';
import { BulletParent, BulletGenParent, CollideBullet } from '../bullets.js?v=20261107152018';

// GML truthiness: a real is true when > 0.5 (alarms read -1 when off).
const on = v => v > 0.5;
const gtime = () => global.time ?? G.frame;
const mean = (a, b) => (a + b) / 2;
const remap_clamped = (a, b, c, d, v) => lerp(c, d, clamp(scr_inverselerp(a, b, v), 0, 1));
const register = (name, cls) => { if (!objectExists(name)) defineObject(name, cls); };

const QUICKSLASH = 'obj_roaringknight_quickslash_attack';
const ROTATING = 'obj_knight_rotating_slash';
const TUNNEL = 'obj_knight_tunnel_slasher_2_revised';
const SWORDFALL = 'obj_knight_swordfall';
const WEIRD = 'obj_knight_weird_bottom_manager';
const SWORD = 'obj_knight_diamondswordbullet_ext';

function ds_list_shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = irandom(i);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

// with (instance_create_depth(x, y, depth, obj_knight_warp)) { master = other.id; event_user(n); }
function warp(master, n) {
  const w = instance_create_depth(master.x, master.y, master.depth, 'obj_knight_warp');
  w.master = master;
  if (n === 0 && w.user0) w.user0();
  if (n === 1 && w.user1) w.user1();
  return w;
}

// new_knight = instance_create(x, y, obj); scr_bullet_inherit(new_knight); creatorid / creator.
function spawnChained(prev, x, y, obj) {
  const nk = instance_create(x, y, obj);
  scr_bullet_inherit(prev, nk);
  nk.creatorid = prev.creatorid;
  nk.creator = prev.creator;
  return nk;
}

// The turn_type / turn_segment part every hand-off shares (inside with (new_knight)).
function chainSegment(prev, nk) {
  nk.turn_type = 'end';
  if (prev.turn_segment === 0) {
    nk.turn_type = 'short mid';
    nk.turn_segment = 1;
    nk.next_up = prev.next_next_up;
  }
  if (prev.turn_segment === 1) {
    nk.turn_type = 'short end';
    nk.turn_segment = 2;
  }
}

// scr_afterimage_grow_attached(target, blend[, in_front])
function scr_afterimage_grow_attached(self, target, blend, front) {
  const a = scr_afterimage_grow(self);
  a.target = target;
  a.image_blend = blend;
  if (front == 1) a.depth = self.depth - 1;
  return a;
}

// ---------------------------------------------------------------- obj_knight_combinations

class KnightCombinations extends BulletParent {
  create() {
    scr_bullet_init(this);
    this.composition = 0;
    for (const e of instancesOf('obj_knight_enemy')) this.composition = e.combo_power;
    this.main_list = [];
  }
  onDestroy() { this.main_list = []; }
  user0() {
    this.main_list = [2, 3, 4, 5];
    ds_list_shuffle(this.main_list);
    this.first_attack = this.main_list[0];
    if (this.first_attack === 1 && this.main_list[1] === 3) this.main_list.splice(1, 1);
    this.second_attack = this.main_list[1];
    if (this.second_attack === 1 && this.main_list[2] === 3) this.main_list.splice(2, 1);
    this.third_attack = this.main_list[2];
    // The shuffled picks are then replaced by obj_knight_enemy's own.
    const e = enemyRef();
    this.first_attack = e.first_attack ?? this.first_attack;
    this.second_attack = e.second_attack ?? this.second_attack;
    this.third_attack = e.third_attack ?? this.third_attack;
    const c = this.creatorid && this.creatorid.alive ? this.creatorid : e;
    const obj = { 1: QUICKSLASH, 2: ROTATING, 3: TUNNEL, 4: SWORDFALL, 5: WEIRD }[this.first_attack];
    const knight = obj ? instance_create(c.x, c.y, obj) : null;
    if (knight) {
      knight.turn_type = 'start';
      if (this.composition == 1) knight.turn_type = 'short start';
      knight.turn_segment = -1;
      if (on(this.composition)) knight.turn_segment = 0;
      knight.next_up = this.second_attack;
      knight.next_next_up = this.third_attack;
      if (knight.user0) knight.user0();
      scr_bullet_inherit(this, knight);
      knight.creatorid = this.creatorid;
      knight.creator = this.creator;
    }
    instance_destroy(this);
  }
}
register('obj_knight_combinations', KnightCombinations);

// ---------------------------------------------------------------- obj_roaringknight_quickslash_attack

class QuickslashAttack extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    scr_bullet_init(this);
    this.hell_surface = null;
    this.spawn_speed = 20;
    this.spawn_range = 4;
    this.min_angle = 145;
    this.max_angle = 215;
    this.timer = 99;
    this.slash_count = 0;
    this.image_alpha = 1;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.depth = heartRef().depth + 1;
    this.image_speed = 0;
    this.image_index = 1;
    this.animtimer = 5;
    this.count = 3;
    this.aetimer = 0;
    this.recoil = 0;
    this.final_slash_anim = false;
    this.slash_anim_count = 0;
    this.flip = false;
    this.flipped = -1;
    this.forward = 0;
    this.flip_mode = true;
    this.turn_segment = -1;
    this.local_turntimer = 260;
    this.next_up = -1;
    this.next_next_up = -1;
    this.auto = true;
    this.knight = i_ex('obj_knight_enemy') ? first('obj_knight_enemy') : -4;
    this.anchor_x = this.x;
    this.anchor_y = this.y;
    this.done = false;
    this.omae_wa_con = 0;
    this.omae_wa_timer = 0;
    this.verticalcut = false;
  }
  get kn() { return this.knight === -4 || !this.knight.alive ? enemyRef() : this.knight; }
  user0() {
    const tt = this.turn_type;
    const moveIn = xo => {
      scr_lerpvar(this, 'x', this.x, camerax() + xo, 20, 2, 'out');
      scr_lerpvar(this, 'y', this.y, cameray() + 87, 20, 2, 'out');
    };
    if (tt === 'full') { this.local_turntimer = 230; moveIn(415); }
    if (tt === 'start') { this.local_turntimer = 172; this.spawn_speed = 16; moveIn(415); }
    if (tt === 'end') { this.local_turntimer = 160; this.spawn_speed = 12; moveIn(417); }
    if (tt === 'short start') { this.local_turntimer = 160; this.spawn_speed = 12; moveIn(415); }
    if (tt === 'short mid') { this.local_turntimer = 160; this.spawn_speed = 12; moveIn(415); }
    if (tt === 'short end') { this.local_turntimer = 160; this.spawn_speed = 10; }
  }
  // Knight jumps to the right of the box after a slash.
  user1() {
    const gt = boardRef();
    this.x = gt.x + Math.abs(this.x - gt.x);
    if (this.final_slash_anim) {
      this.x += 220;
      if (this.verticalcut == 1) this.y += 280;
    } else {
      this.image_xscale = Math.abs(this.image_xscale);
    }
    if (this.image_alpha === 0) {
      this.kn.image_alpha = 0;
      this.image_alpha = 1;
    }
    this.image_index = this.image_index >= 4 ? 1 : 4;
    this.animtimer = 0;
    if (this.slash_anim_count > 0) this.aetimer = -1;
    this.slash_anim_count += 1;
    if (this.final_slash_anim) this.recoil = 6;
    else this.x -= 2;
  }
  // ... and to the left of it.
  user2() {
    const gt = boardRef();
    this.x = gt.x - Math.abs(this.x - gt.x);
    this.image_xscale = Math.abs(this.image_xscale) * -1;
    if (this.image_alpha === 0) {
      this.kn.image_alpha = 0;
      this.image_alpha = 1;
    }
    this.image_index = this.image_index >= 4 ? 1 : 4;
    this.animtimer = 0;
    this.slash_anim_count += 1;
    if (this.final_slash_anim) this.recoil = 6;
    else this.x += 2;
    this.aetimer = -1;
  }
  // One quick slash aimed (loosely) at the SOUL, alternating sides.
  user3() {
    const gt = boardRef(), h = heartRef();
    const _slash = instance_create(gt.x + (this.flip ? 20 : -20), gt.y, 'obj_roaringknight_quickslash');
    let _xx = this.kn.x + 100;
    let _minAngle = this.min_angle, _maxAngle = this.max_angle;
    if (this.flip) {
      _minAngle -= 180;
      _maxAngle -= 180;
      _xx = gt.x - Math.abs(_xx - gt.x);
    }
    let _targetdir = point_direction(_xx, gt.y, h.x + 8, h.y + 8);
    this.count += 1;
    _slash.flip = this.flip;
    if (_slash.flip) _targetdir = angle_difference(_targetdir, 0);
    if (this.count === 5) this.count = 0;
    else _targetdir += random_range(-this.spawn_range, this.spawn_range);
    _targetdir = scr_pingpong_ext(_targetdir, _minAngle, _maxAngle);
    if (_slash.flip) {
      _slash.image_xscale *= -1;
      scr_orbitaroundpoint(_slash, _xx, gt.y, _targetdir);
    } else {
      _targetdir -= 180;
      scr_orbitaroundpoint(_slash, _xx, gt.y, _targetdir);
    }
    _slash.image_angle = _targetdir;
    _slash.direction = _targetdir;
    if (this.flip_mode) this.flip = !this.flip;
  }
  alarm2() {
    if (this.next_up !== -999) {
      const knight = this.next_up === 3 ? TUNNEL : null;
      if (knight) {
        const nk = spawnChained(this, this.x, this.y, knight);
        chainSegment(this, nk);
        nk.anchor_x = this.anchor_x;
        nk.anchor_y = this.anchor_y;
        if (nk.user0) nk.user0();
      }
    }
    warp(this, 1);
    instance_destroy(this);
  }
  cleanUp() {
    if (surface_exists(this.hell_surface)) surface_free(this.hell_surface);
    const tt = this.turn_type;
    if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid' && scr_bulletparent_count() < 2) {
      this.kn.image_alpha = 1;
      global.turntimer = -1;
    }
  }
  step() {
    this.local_turntimer -= 1;
    if (!this.auto) return;
    if (this.knight === -4) this.knight = first('obj_knight_enemy') ?? -4;
    const gt = boardRef();
    if (this.local_turntimer <= 50) {
      if (this.local_turntimer <= 10 && this.sprite_index !== 'spr_roaringknight_idle') {
        if (this.image_xscale < 0) this.x -= 220;
        this.image_xscale = Math.abs(this.image_xscale);
        this.sprite_index = 'spr_roaringknight_idle';
        this.image_index = 0;
      } else if (this.local_turntimer < 42 && this.image_xscale < 0) {
        this.image_index = 4;
      }
      if (this.x < enemyRef().x) this.x += 1;
      const _local_turntimer = Math.max(this.local_turntimer, 0);
      this.y = lerp(this.y, this.kn.y, (50 - _local_turntimer) / 50);
      const tt = this.turn_type;
      if ((this.local_turntimer < -60 && tt !== 'short end') || (this.local_turntimer < -110 && tt === 'short end')) {
        global.turntimer = 0;
        instance_destroy(this);
        return;
      }
    } else if (this.recoil !== 0) {
      this.x += this.recoil;
      this.recoil = scr_movetowards(this.recoil, 0.25 * Math.sign(this.recoil), 0.5);
    }
    if ((this.local_turntimer < 120 || (this.local_turntimer < 150 && this.next_up === 4))
      && this.slash_count < 999 && this.slash_count % 2 === 0 && !this.done) {
      this.slash_count = 999;
      const tt = this.turn_type;
      if (tt === 'start' || tt === 'short start' || tt === 'short mid') {
        this.done = true;
        this.local_turntimer = 99999;
        this.slash_count = 1000;
        let new_knight = null;
        switch (this.next_up) {
          case 5: new_knight = WEIRD; this.slash_count = 993; break;
          case 4: new_knight = SWORDFALL; this.slash_count = 993; break;
          case 3: new_knight = TUNNEL; this.slash_count = 999; break;
          case 2: new_knight = ROTATING; this.slash_count = 999; break;
        }
        this.next_up = -999;
        if (new_knight) {
          const e = enemyRef();
          const ks = spawnChained(this, e.x - 100, e.y - 88, new_knight);
          if (new_knight === SWORDFALL) ks.x -= 50;
          else if (new_knight === TUNNEL) ks.x += 25;
          else ks.x += 50;
          ks.y -= 44;
          ks.turn_type = 'end';
          if (new_knight !== WEIRD) warp(ks, 0);
          if (this.turn_segment === 0) {
            ks.turn_type = 'short mid';
            ks.turn_segment = 1;
            ks.next_up = this.next_next_up;
          }
          if (this.turn_segment === 1) {
            ks.turn_type = 'short end';
            ks.turn_segment = 2;
            if (ks.next_up === 4) ks.slash_count -= 4;
          }
          ks.anchor_x = this.anchor_x;
          ks.anchor_y = this.anchor_y;
          if (ks.user0) ks.user0();
          if (new_knight === ROTATING) ks.timer = 4;
          if (new_knight === WEIRD) {
            for (const m of instancesOf(WEIRD)) {
              m.alarm[0] = 1;
              m.init_start = 3;
              m.init = 4;
            }
          }
        }
        return;
      }
      this.slash_anim_count = 999;
      this.timer = -2;
    }
    if (this.slash_count > 999) return;
    if (this.slash_count === 999 && this.done) return;
    this.timer += 1;
    if (this.timer >= this.spawn_speed) {
      if (this.spawn_speed > 2) this.spawn_speed -= 2;
      this.slash_count += 1;
      this.timer = 0;
      if (this.slash_count === 1000) {
        instance_create(gt.x + 33, gt.y, 'obj_roaringknight_quickslash_big');
      } else {
        this.user3();
        if (this.slash_count === 999) this.spawn_speed = 10;
      }
      this.spawn_range = scr_approach(this.spawn_range, 60, 3);
    }
  }
  draw() {
    const gt = boardRef();
    if (this.image_alpha === 1) {
      if (this.animtimer < 4) this.animtimer += 1;
      else if (this.image_index === 1 || this.image_index === 4) this.image_index += 1;
      draw_self(this);
      this.aetimer += 1;
      if (this.aetimer % 4 === 0 && this.image_alpha !== 0) {
        const fade = scr_afterimage(this);
        fade.sprite_index = this.sprite_index;
        fade.image_alpha = 0.6;
        fade.fadeSpeed = 0.02;
        fade.hspeed = 2 * Math.sign(this.x - gt.x);
        fade.depth = this.depth + (this.x < gt.x ? 50 : 100);
      }
    }
    // The slash markers, added together inside the box.
    if (!surface_exists(this.hell_surface)) this.hell_surface = surface_create(142, 142);
    surface_set_target(this.hell_surface);
    draw_clear_alpha(0, 0);
    draw_set_blend_mode(1);
    const _gtx = gt_minx() + 5, _gty = gt_miny() + 5;
    for (const s of instancesOf('obj_roaringknight_quickslash')) {
      if (!s.slash) {
        draw_sprite_ext('spr_rk_quickslash_marker_gradient', s.image_index, s.x - _gtx + s.xdraw, s.y - _gty + s.ydraw,
          s.image_xscale, s.thickness, s.image_angle, s.image_blend, s.image_alpha);
      }
    }
    draw_set_blend_mode(0);
    surface_reset_target();
    draw_surface(this.hell_surface, _gtx, _gty);
  }
}
register(QUICKSLASH, QuickslashAttack);

// ---------------------------------------------------------------- obj_roaringknight_quickslash

class Quickslash extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_rk_quickslash';
  }
  create() {
    scr_bullet_init(this);
    this.active = false;
    this.timer = 0;
    this.image_alpha = 0.1;
    this.image_speed = 0;
    this.slash = false;
    this.destroyonhit = false;
    this.thickness = 10;
    this.image_blend = 0x808080;
    this.trailthickness = 10;
    this.xdir = 0;
    this.ydir = 0;
    this.xdraw = 250;
    this.ydraw = 250;
    this.init = false;
    this.flip = false;
    this.damage = 206;
    this.element = 5;
    this.grazepoints = 5;
  }
  step() {
    this.timer += 1;
    if (!this.init) {
      this.image_alpha = 1;
      this.xdir = lengthdir_x(250, this.image_angle);
      this.ydir = lengthdir_y(250, this.image_angle);
      this.init = true;
    }
    if (!this.slash) {
      if (this.timer <= 6) {
        this.xdraw = this.xdir * (1 - this.timer / 6);
        this.ydraw = this.ydir * (1 - this.timer / 6);
        if (this.flip) {
          this.xdraw *= -1;
          this.ydraw *= -1;
        }
      }
      this.thickness = lerp(3, 1, scr_ease_out(scr_inverselerp(0, 30, this.timer), 6));
      this.trailthickness = this.thickness + 2;
      if (this.timer > 10) this.image_blend = merge_color(0x808080, c_red, (this.timer - 10) / 20);
    }
    if (this.timer === 30) {
      this.image_blend = 0xffffff;
      this.active = true;
      this.slash = true;
      this.sprite_index = 'spr_rk_quickslash';
      this.image_speed = 1;
      this.image_index = 0;
      snd_stop('snd_wideslash_low');
      snd_stop('snd_knight_hurtb');
      snd_play_x('snd_wideslash_low', 0.8, 0.9 + random(4) / 10);
      snd_play_x('snd_knight_hurtb', 0.7, 0.9 + random(4) / 10);
      for (const a of instancesOf(QUICKSLASH)) {
        if (a.omae_wa_timer < 40) {
          if (this.flip) a.user2();
          else a.user1();
        }
      }
    }
    if (this.timer === 32) this.active = false;
  }
  draw() {
    if (this.slash) draw_self(this);
  }
  animationEnd() {
    if (this.slash) instance_destroy(this);
  }
}
register('obj_roaringknight_quickslash', Quickslash);

// ---------------------------------------------------------------- obj_roaringknight_quickslash_big

// The final horizontal slash: it splits the box (obj_knight_split_growtangle) and, when it catches
// the SOUL, holds it sliced for a moment and then takes 1.25x max HP.
class QuickslashBig extends Quickslash {
  constructor() {
    super();
    this.sprite_index = 'spr_rk_quickslash_marker';
  }
  create() {
    super.create();
    this.element = 5;
    this.image_index = 1;
    this.thickness = 1;
    this.trailthickness = 1;
    this.destroyonhit = 0;
    this.playerstrike = 0;
    this.memheartx = 0;
    this.memhearty = 0;
    this.xdraw = 0;
    this.ydraw = 0;
    this.cuty = 8;
    this.grazepoints = 5;
    const qa = first(QUICKSLASH);
    if (qa && qa.verticalcut == 1) this.x = boardRef().xstart;
  }
  step() {
    this.timer += 1;
    if (this.image_alpha < 1 && !this.slash) this.image_alpha += 0.05;
    if (!this.slash && this.timer > 20) this.image_blend = merge_color(0xffffff, c_red, (this.timer - 20) / 19);
    if (!this.slash) {
      if (this.image_angle === 90) {
        this.y -= 20;
        if (this.y < this.ystart - 66) this.y += 66;
        this.x = this.xstart;
      } else {
        this.x -= 20;
        if (this.x < this.xstart - 66) this.x += 66;
      }
    }
    if (this.timer === 38) setAll(QUICKSLASH, 'final_slash_anim', true);
    if (this.timer === 40) {
      this.x = this.xstart;
      this.image_blend = 0xffffff;
      this.active = true;
      this.slash = true;
      const gt = boardRef();
      const _splitter = instance_create(gt.x, gt.y, 'obj_knight_split_growtangle');
      scr_bullet_inherit(this, _splitter);
      this.sprite_index = 'spr_rk_quickslash';
      this.image_speed = 1;
      this.image_index = 0;
      this.image_yscale *= 2;
      snd_stop('snd_wideslash_low');
      snd_stop('snd_knight_hurtb');
      snd_play_x('snd_wideslash_low', 0.8, 0.9 + random(4) / 10);
      for (const a of instancesOf(QUICKSLASH)) a.user1();
    }
    if (this.timer === 34) this.active = false;
    if (this.timer === 60 && this.playerstrike === 1) {
      this.playerstrike = 0;
      setAll('obj_heart', 'image_alpha', 1);
      if (this.target !== 3) S.scr_damage_maxhp(this, 1.25);
      instance_destroy(this);
    }
    if (this.image_angle === 90) this.x = boardRef().xstart;
  }
  endStep() {
    if (this.playerstrike === 1) {
      const h = first('obj_heart');
      if (!h) return;
      if (h.x !== this.memheartx) h.x = this.memheartx + Math.sign(h.x - this.memheartx);
      if (h.y !== this.memhearty) h.y = this.memhearty + Math.sign(h.y - this.memhearty);
      this.memheartx = h.x;
      this.memhearty = h.y;
    }
  }
  user5() {
    if (this.active == 1) {
      const h = heartRef();
      this.playerstrike = 1;
      this.active = 0;
      this.memheartx = h.x;
      this.memhearty = h.y;
      setAll('obj_heart', 'image_alpha', 0);
      global.inv = -1;
      this.cuty = Math.round(remap_clamped(-16, 16, 1, 14, h.y - (this.y - 8)));
    }
  }
  animationEnd() {
    if (this.slash && this.visible) {
      if (!this.playerstrike) instance_destroy(this);
      else this.image_alpha = 0;
    }
  }
  draw() {
    if (this.slash) draw_self(this);
    if (this.playerstrike === 1) {
      for (const h of instancesOf('obj_heart')) {
        const _xx = irandom(2) - 1, _yy = irandom(2) - 1;
        const _fade = remap_clamped(45, 55, 1, 0, this.timer);
        draw_sprite(h.sprite_index, h.image_index, h.x + _xx, h.y + _yy);
        draw_sprite_ext('spr_rk_slash_heartslice', this.cuty, h.x + _xx, h.y + _yy, 1, 1, 0, 0xffffff, _fade);
      }
    }
  }
  cleanUp() { setAll('obj_heart', 'image_alpha', 1); }
}
register('obj_roaringknight_quickslash_big', QuickslashBig);

// ---------------------------------------------------------------- obj_knight_tunnel_slasher_2_revised

class TunnelSlasher2Revised extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    this.vertical_pos = 0;
    this.old_pos = 0;
    this.hole_size = 60;
    scr_bullet_init(this);
    scr_darksize(this);
    this.damage = 206;
    this.knightafterimagerange = 1;
    this.image_speed = 0;
    this.timer = 0;
    this.introtimer = 0;
    this.fake_timer = 0;
    this.siner = 0;
    this.con = 0;
    this.fakefire = 0;
    this.first_strike = 1;
    this.anchor_x = this.x;
    this.anchor_y = this.y;
    this.state = 'nothin much tbh';
    this.turn_type = 'full';
    this.turn_segment = -1;
    this.next_up = -1;
    this.next_next_up = -1;
    this.local_turntimer = 280;
    this.armpoint = 0;
    this.armpoint_index = 0;
    this.turntimer_limit = 90;
  }
  // The Knight lifts its arm and points at the box.
  pointPose() {
    this.sprite_index = 'spr_roaringknight_point_ol';
    this.image_index = 0;
    this.image_speed = 0;
    scr_lerpvar(this, 'image_index', 0, 4, 15, 2, 'out');
    scr_lerpvar(this, 'x', this.x, this.x + 40, 15, 2, 'out');
    scr_lerpvar(this, 'y', this.y, scr_get_box(5) - 100, 15, 2, 'out');
  }
  // Coming in mid-turn: already pointing, firing straight away.
  pointNow() {
    this.pointPose();
    scr_lerpvar(this, 'knightafterimagerange', this.knightafterimagerange, 4, 30);
    this.con = 1;
    this.timer = 7;
    this.fake_timer = 7;
  }
  user0() {
    const tt = this.turn_type;
    if (tt === 'full') this.local_turntimer = 240;
    if (tt === 'start') this.local_turntimer = 140;
    if (tt === 'end') {
      this.local_turntimer = 140;
      this.pointNow();
    }
    if (tt === 'short start') {
      this.local_turntimer = 120;
      if (this.next_up === 4) this.turntimer_limit = 60;
    }
    if (tt === 'short mid') {
      this.local_turntimer = 100;
      this.pointNow();
      if (this.next_up === 4) this.turntimer_limit = 70;
    }
    if (tt === 'short end') {
      this.local_turntimer = 90;
      this.pointNow();
    }
  }
  alarm2() {
    if (this.next_up !== -999) {
      const knight = { 1: QUICKSLASH, 2: ROTATING, 4: SWORDFALL, 5: WEIRD }[this.next_up];
      if (knight) {
        const nk = spawnChained(this, this.x, this.y, knight);
        chainSegment(this, nk);
        if (knight === QUICKSLASH) {
          nk.local_turntimer -= nk.spawn_speed - nk.timer;
          nk.timer = nk.spawn_speed;
        }
        nk.anchor_x = this.anchor_x;
        nk.anchor_y = this.anchor_y;
        if (nk.user0) nk.user0();
      }
    }
    if (this.next_up === -999) warp(this, 1);
    instance_destroy(this);
  }
  cleanUp() {
    const tt = this.turn_type;
    if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid' && scr_bulletparent_count() < 2) {
      setAll('obj_knight_enemy', 'image_alpha', 1);
      global.turntimer = -1;
    }
    snd_stop('snd_shinka_ambience');
  }
  step() {
    const e = enemyRef();
    e.siner2 = 0;
    this.anchor_x = e.x;
    this.anchor_y = e.y;
    this.local_turntimer -= 1;
    if (this.local_turntimer < this.turntimer_limit && this.next_up === 4) {
      const ks = spawnChained(this, e.x - 100, e.y - 88, SWORDFALL);
      ks.x -= 20;
      ks.y -= 66;
      warp(ks, 0);
      chainSegment(this, ks);
      ks.anchor_x = this.anchor_x;
      ks.anchor_y = this.anchor_y;
      if (ks.user0) ks.user0();
      this.next_up = -999;
    }
    if (this.local_turntimer < this.turntimer_limit && this.next_up === 5) {
      const ks = spawnChained(this, e.x - 100, e.y - 88, WEIRD);
      chainSegment(this, ks);
      ks.anchor_x = this.anchor_x;
      ks.anchor_y = this.anchor_y;
      if (ks.user0) ks.user0();
      ks.init_start = 3;
      ks.init = 6;
      this.next_up = -999;
    }
    const tt = this.turn_type;
    if (this.local_turntimer < 60 && (tt === 'full' || this.next_up === -1)) {
      this.timer = 0;
      this.fake_timer = -99999;
      this.local_turntimer = 99999;
      this.state = 'final';
      return;
    }
    if (this.state === 'final') {
      this.stepFinal();
      return;
    }
    if (this.local_turntimer < 40) {
      this.timer = -99999;
      this.fake_timer = -99999;
      this.local_turntimer = 99999;
      if (tt === 'end' || tt === 'short end') {
        scr_lerpvar(this, 'image_index', this.image_index, 0, 8);
        scr_script_delayed(this, scr_lerpvar, 16, 'x', this.x, this.anchor_x, 24, 2, 'out');
        scr_script_delayed(this, scr_lerpvar, 16, 'y', this.y, this.anchor_y, 24, 2, 'out');
        scr_script_delayed(this, instance_destroy, 40);
      } else {
        this.alarm[2] = 1;
      }
      return;
    }
    if (this.con === 0) {
      this.con = -1;
      this.con = 0.1;
    }
    if (this.con === 0.1 || this.con === 0.2) {
      this.introtimer += 1;
      if (this.introtimer === 5) {
        this.con = 0.2;
        this.pointPose();
        if (e.myattackchoice === 3) snd_loop('snd_shinka_ambience');
      }
      if (this.introtimer === 20) scr_lerpvar(this, 'knightafterimagerange', this.knightafterimagerange, 4, 30);
      if (this.introtimer === 25) {
        this.con = 1;
        this.introtimer = 0;
      }
    }
    if ((this.con >= 0.2 && (tt === 'full' || tt === 'start' || tt === 'short start')) || on(this.con)) {
      this.timer += 1;
      this.fake_timer += 1;
      if (this.timer >= 8) {
        this.fireWalls();
        this.timer = 0;
      }
    }
    if (this.fake_timer > 8 && (this.fake_timer + 8) % 4 === 0) this.fireFake();
  }
  // Two walls of swords (above and below the gap) fly in from the right of the box.
  fireWalls() {
    let newpos = this.old_pos + 15 + irandom(90);
    if (newpos > 60) newpos -= 120;
    this.old_pos = this.vertical_pos;
    this.vertical_pos = newpos;
    this.vertical_pos = clamp(this.vertical_pos, this.old_pos - 50, this.old_pos + 50);
    const hole_diff = Math.abs(this.old_pos - this.vertical_pos);
    if (hole_diff < 20) this.hole_size = 36;
    else if (hole_diff < 30) this.hole_size = 44;
    else if (hole_diff < 40) this.hole_size = 52;
    else this.hole_size = 60;
    if (this.first_strike > 0) {
      this.vertical_pos = irandom_range(-15, 15);
      this.old_pos = this.vertical_pos;
      this.hole_size = 100;
      if (this.first_strike === 0.75) this.hole_size = 90;
      if (this.first_strike === 0.5) this.hole_size = 75;
      if (this.first_strike === 0.25) this.hole_size = 60;
      this.first_strike = scr_approach(this.first_strike, 0, 0.25);
    }
    const mbox = mean(scr_get_box(1), scr_get_box(3));
    const dorifto = 0.15 + random(0.6) * choose(1, -1);
    const tt = this.turn_type;
    // Coming in mid-turn, the first wall is harmless (grey).
    const harmless = this.first_strike >= 0.75 && (tt === 'end' || tt === 'mid' || tt === 'short end');
    if (this.vertical_pos > -20) {
      const y1 = mbox + this.vertical_pos - this.hole_size * 0.5;
      const y2 = scr_get_box(1) - 40;
      const y3 = Math.max((y1 - y2) * (0.5 + random(0.5)), 50);
      const y4 = y1 - y3;
      this.wallSword(mean(y1, y4), 270, y3, dorifto, harmless);
    }
    if (this.vertical_pos < 20) {
      const y1 = mbox + this.vertical_pos + this.hole_size * 0.5;
      const y2 = scr_get_box(3) + 40;
      const y3 = Math.max((y2 - y1) * (0.5 + random(0.5)), 60);
      const y4 = y1 + y3;
      this.wallSword(mean(y1, y4), 90, y3, dorifto, harmless);
    }
  }
  wallSword(y, angle, y3, dorifto, harmless) {
    const b = scr_fire_bullet(this, scr_get_box(0) + 40, y, SWORD, 180, 0.5);
    b.damage = 206;
    b.grazepoints = 4;
    b.element = 5;
    b.image_angle = angle;
    b.image_yscale = 1;
    b.image_alpha = 0;
    b.image_index = 1;
    if (y3 > 48) b.sprite_index = 'spr_knight_diamondbullet_m';
    if (y3 > 80) b.sprite_index = 'spr_knight_diamondbullet_l';
    const endscale = y3 / b.sprite_width;
    b.image_xscale = 15;
    scr_lerpvar(b, 'image_xscale', 0, endscale, 14, -1, 'out');
    scr_lerpvar(b, 'image_alpha', 0, 1, 10, 2, 'out');
    if (harmless) {
      b.active = false;
      b.fake = true;
      b.r = 34;
      b.g = 34;
      b.b = 34;
    }
    b.gravity_direction = 180;
    b.gravity = 0.4;
    b.vspeed = dorifto;
  }
  // A grey background sword (no damage) every 4 frames.
  fireFake() {
    const vertical_pos2 = irandom_range(-70, 70);
    const mbox = mean(scr_get_box(1), scr_get_box(3));
    const dorifto = 0.25 + random(0.6) * choose(1, -1);
    const y1 = mbox + vertical_pos2 - this.hole_size * 0.5;
    const y2 = choose(scr_get_box(1) - 40, scr_get_box(3) + 40);
    const y3 = Math.max((y1 - y2) * (0.5 + random(0.5)), 50);
    const gt = boardRef();
    const b = scr_fire_bullet(this, scr_get_box(0) + 40, gt.y + random_range(20, 70) * choose(-1, 1), SWORD, 180, 0.35);
    b.active = false;
    b.fake = true;
    b.damage = 206;
    b.grazepoints = 4;
    b.element = 5;
    b.image_angle = 90;
    b.image_yscale = 1;
    b.image_alpha = 0;
    b.image_index = 1;
    if (y3 * 0.75 > 48) b.sprite_index = 'spr_knight_diamondbullet_m';
    if (y3 * 0.75 > 80) b.sprite_index = 'spr_knight_diamondbullet_l';
    const endscale = y3 / b.sprite_width * 0.75;
    b.image_xscale = 0;
    scr_lerpvar(b, 'image_xscale', 0, endscale, 14, -1, 'out');
    scr_lerpvar(b, 'image_alpha', 0, 1, 10, 2, 'out');
    b.r = 34;
    b.g = 34;
    b.b = 34;
    b.depth = gt.depth - 1;
    b.gravity_direction = 180;
    b.gravity = 0.4;
    b.vspeed = dorifto * 2;
  }
  // End of a full turn: the swords still in the box turn red, aim at the SOUL and dash.
  stepFinal() {
    this.timer += 1;
    const swords = () => instancesOf(SWORD);
    if (this.timer === 1) {
      this.sprite_index = 'spr_roaringknight_noarm';
      scr_lerpvar(this, 'armpoint', 0, -75, 12, 2, 'out');
      for (const s of swords()) if (s.x < scr_get_box(2)) s.active = false;
      for (const s of swords()) {
        if (!on(s.active)) {
          scr_lerpvar(s, 'image_alpha', s.image_alpha, 0, 8);
          scr_script_delayed(s, instance_destroy, 8);
        } else {
          s.shakeme = true;
        }
      }
    }
    if (this.timer === 12) {
      if (i_ex(SWORD)) snd_play('snd_jump');
      snd_stop('snd_shinka_ambience');
      // GML: with (swords) with (swords) event_user(0), so each sword runs Other_10 once per sword
      // alive; nothing moves between those calls, so they all set up the same lerps: once is kept.
      for (const s of swords()) if (s.user0) s.user0();
    }
    if (this.timer === 33) {
      if (i_ex(SWORD)) snd_play('snd_knight_cut');
      this.armpoint_index = 1;
    }
    if (this.timer < 12) {
      for (const s of swords()) {
        if (on(s.active)) {
          s.gravity = 0;
          s.hspeed *= 0.9;
          s.vspeed *= 0.9;
        }
      }
    }
    if (this.timer === 52) {
      scr_lerpvar(this, 'image_index', this.image_index, 0, 8);
      scr_script_delayed(this, scr_lerpvar, 16, 'x', this.x, this.anchor_x, 24, 2, 'out');
      scr_script_delayed(this, scr_lerpvar, 16, 'y', this.y, this.anchor_y, 24, 2, 'out');
    }
    if (this.timer === 92) {
      instance_destroy(this);
      setAll('obj_knight_enemy', 'image_alpha', 1);
      global.turntimer = -1;
    }
  }
  draw() {
    this.siner += 1;
    const ymod = Math.sin(this.siner / 30) * 8;
    if (this.sprite_index === 'spr_roaringknight_noarm') {
      draw_sprite_ext('spr_roaringknight_armpoint', this.armpoint_index, this.x + 116, this.y + 62 + ymod,
        this.image_xscale, this.image_yscale, this.armpoint, this.image_blend, this.image_alpha);
    }
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y + ymod, this.image_xscale, this.image_yscale,
      this.image_angle, this.image_blend, this.image_alpha);
    if (this.siner % 4 === 0 && this.image_alpha !== 0) {
      const fade = scr_afterimage(this);
      fade.image_alpha = 0.6;
      fade.depth = enemyRef().depth + 1;
      fade.fadeSpeed = 0.04;
      fade.hspeed = 4;
      fade.vspeed = random_range(-this.knightafterimagerange, this.knightafterimagerange);
    }
  }
}
register(TUNNEL, TunnelSlasher2Revised);

// ---------------------------------------------------------------- obj_knight_weird_bottom_manager

// Five shadow circles spin in an ellipse under the box; in turn each one flashes and shoots a
// big shape straight up plus a fan of small diamonds.
class WeirdBottomManager extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_warp';
  }
  create() {
    scr_bullet_init(this);
    scr_darksize(this);
    this.image_index = 8;
    this.image_speed = 0;
    this.timer = 0;
    this.spin = 2;
    this.angle = 0;
    this.amount = 1;
    this.init_start = 4;
    this.init = 8;
    this.circle_val = 0;
    this.circle_goal = 5;
    this.circle_distance = 120;
    this.circle_list = [];
    this.endme = false;
    this.alarm[0] = 16;
    this.center_x = scr_get_box(4);
    this.center_y = scr_get_box(3) + 43;
    this.anchor_x = this.x;
    this.anchor_y = this.y;
    this.difficulty = 0;
    this.turn_type = 'full';
    this.turn_segment = -1;
    this.next_up = -999;
    this.next_next_up = -1;
    this.local_turntimer = 340;
  }
  user0() {
    const tt = this.turn_type;
    if (tt === 'full') {
      this.local_turntimer = 340;
      this.x += 200;
      scr_script_delayed(this, scr_lerpvar, 8, 'image_index', 8, 5, 8);
      scr_script_delayed(this, scr_var, 16, 'image_alpha', 0);
    }
    if (tt === 'start' || tt === 'short start') {
      this.local_turntimer = tt === 'start' ? 200 : 170;
      scr_lerpvar(this, 'x', this.x, this.x + 96, 16, 1, 'out');
      scr_script_delayed(this, scr_var, 16, 'image_alpha', 0);
    }
    if (tt === 'end' || tt === 'short mid' || tt === 'short end') {
      this.init_start = 2;
      this.init = 1;
      snd_play('snd_knight_teleport');
      this.local_turntimer = tt === 'end' ? 200 : 170;
      this.image_alpha = 0;
      this.image_index = 5;
    }
  }
  alarm0() {
    const short = this.turn_type === 'short start' || this.turn_type === 'short mid';
    // repeat (6): the first call makes all five circles, a later one (re)starts alarm 1.
    for (let i = 0; i < 6; i++) {
      if (this.circle_val < 5) {
        this.circle_val += 1;
        const c = instance_create(this.x, this.y, 'obj_knight_weird_circle');
        c.angle = 360 / this.circle_goal * this.circle_list.length;
        c.distance = this.circle_distance;
        c.spin = this.spin;
        c.master = this;
        c.alarm[0] = 6;
        this.circle_list.push(c);
        if (short) c.hellzone = true;
        this.alarm[0] = this.init_start;
        continue;
      }
      this.alarm[1] = this.init;
      if (short) this.alarm[1] = 1;
    }
  }
  alarm1() {
    if (this.local_turntimer < 80) {
      for (const c of instancesOf('obj_knight_weird_circle')) {
        scr_lerpvar(c, 'image_alpha', c.image_alpha, 0, 32);
        scr_script_delayed(c, instance_destroy, 32);
      }
      this.x = this.anchor_x;
      this.y = this.anchor_y;
      const tt = this.turn_type;
      if (tt === 'full') {
        this.alarm[2] = 40;
        scr_script_delayed(this, scr_lerpvar, 20, 'image_index', 5, 8, 8);
        scr_script_delayed(this, scr_var, 20, 'image_alpha', 1);
      } else {
        this.alarm[2] = 32;
        if (tt === 'short start' || tt === 'short mid' || tt === 'start') {
          switch (this.next_up) {
            case 1: this.alarm[2] = 1; break;
            case 2: this.alarm[2] = 12; break;
            case 3: this.alarm[2] = 18; break;
            case 4: this.alarm[2] = 1; break;
          }
        }
        if (tt === 'end' || tt === 'short end') {
          scr_lerpvar(this, 'image_index', this.image_index, 8, 8);
          this.image_alpha = 1;
        }
      }
      return;
    }
    const shoot = c => {
      if (c && c.alive) {
        c.alarm[1] = 18 * this.amount - 4 * Math.max(this.amount - 1, 0);
        c.rgb_rate = c.alarm[1];
      }
    };
    shoot(this.circle_list[0]);
    if (this.amount > 1) shoot(this.circle_list[1]);
    if (this.amount > 2) shoot(this.circle_list[2]);
    if (this.circle_list.length) this.circle_list.push(this.circle_list.shift());
    this.alarm[1] = 18 * this.amount - 4 * Math.max(this.amount - 1, 0) + 2 * irandom(3);
    const newspin = choose(-12, 12);
    scr_lerpvar(this, 'spin', this.spin, newspin, this.alarm[1] / 2 - 2, 2, 'inout');
    scr_script_delayed(this, scr_lerpvar, this.alarm[1] / 2 - 2, 'spin', newspin, 1 * Math.sign(newspin), this.alarm[1] / 2 - 2, 2, 'inout');
  }
  alarm2() {
    if (this.next_up !== -999) {
      const knight = { 1: QUICKSLASH, 2: ROTATING, 3: TUNNEL, 4: SWORDFALL }[this.next_up];
      if (knight) {
        const nk = spawnChained(this, this.x, this.y, knight);
        chainSegment(this, nk);
        if (knight === QUICKSLASH) nk.timer = nk.spawn_speed;
        nk.anchor_x = this.anchor_x;
        nk.anchor_y = this.anchor_y;
        if (nk.user0) nk.user0();
        if (knight === SWORDFALL) nk.countdowner = 10;
        warp(nk, 0);
      }
    }
    instance_destroy(this);
  }
  onDestroy() {
    const tt = this.turn_type;
    if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid' && scr_bulletparent_count() < 2) {
      setAll('obj_knight_enemy', 'image_alpha', 1);
      global.turntimer = -1;
    }
  }
  cleanUp() { this.circle_list = []; }
  step() {
    const e = enemyRef();
    e.siner2 = 0;
    this.anchor_x = e.x;
    this.anchor_y = e.y;
    this.local_turntimer -= 1;
    this.timer += 1;
    this.angle += this.spin;
    this.center_x = scr_get_box(4);
    this.center_y = scr_get_box(3) + 43;
    if (this.local_turntimer < 112 && this.next_up === 4 && this.turn_segment === -1) {
      const ks = spawnChained(this, e.x, e.y, SWORDFALL);
      warp(ks, 0);
      chainSegment(this, ks);
      ks.anchor_x = this.anchor_x;
      ks.anchor_y = this.anchor_y;
      if (ks.user0) ks.user0();
      this.next_up = -999;
    }
    for (const c of instancesOf('obj_knight_weird_circle')) {
      c.x = this.center_x + lengthdir_x(c.distance, c.angle + this.angle);
      c.y = this.center_y + lengthdir_y(c.distance * 0.25, c.angle + this.angle);
    }
    if (gtime() % 4 === 0 && this.image_alpha !== 0) {
      const fade = scr_afterimage(this);
      fade.depth = (this.creatorid && this.creatorid.alive ? this.creatorid : e).depth + 1;
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.hspeed = 4;
    }
  }
  draw() {
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y + Math.sin(gtime() * 0.1) * 2,
      this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
  }
}
register(WEIRD, WeirdBottomManager);

// ---------------------------------------------------------------- obj_knight_weird_circle

class WeirdCircle extends BulletGenParent {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_weird_shadow';
  }
  create() {
    this.angle = 0;
    this.distance = 0;
    this.spin = 0;
    this.master = this;
    this.timer = 0;
    this.r = 64;
    this.g = 64;
    this.b = 64;
    this.rgb_rate = 24;
    this.hellzone = false;
  }
  alarm0() {} // only times the blink in Draw
  // Fire: one big shape straight up and a fan of diamonds.
  alarm1() {
    this.r = 64;
    this.g = 64;
    this.b = 64;
    snd_play('snd_drake_dodge');
    const s = scr_fire_bullet(this, this.x, this.y, 'obj_knight_weird_circle_bullet', 90, 6, 'spr_knight_weird_shape');
    s.destroyonhit = false;
    s.damage = 206;
    s.element = 5;
    s.grazepoints = 12;
    scr_script_repeat(s, scr_afterimage_grow, 600, 4, 0.08, 0, -0.08);
    s.gravity_direction = s.direction;
    s.gravity = 0.2;
    s.image_speed *= 0.5;
    s.image_yscale = 3;
    s.image_xscale = 0;
    scr_lerpvar(s, 'image_yscale', 3, 2, 12);
    scr_lerpvar(s, 'image_xscale', 0, 2, 12);
    s.image_angle = s.direction;
    for (let a = 0; a < 5; a++) {
      const d = scr_fire_bullet(this, this.x, this.y, 'obj_regularbullet', 27.5 + 31.25 * a, 4, 'spr_diamondbullet_form');
      d.grazepoints = 3;
      d.damage = 206;
      d.element = 5;
      d.image_angle = d.direction;
    }
    for (let a = 0; a < 4; a++) {
      if (a === 1 || a === 2) continue;
      const d = scr_fire_bullet(this, this.x, this.y, 'obj_regularbullet', 40 + 33.333333333333336 * a, 6, 'spr_diamondbullet_form');
      d.grazepoints = 3;
      d.damage = 206;
      d.element = 5;
      d.image_angle = d.direction;
    }
  }
  step() {
    if (this.hellzone && this.alarm[1] > 13) this.alarm[1] = 13;
    this.timer += 1;
    if (on(this.alarm[1])) {
      this.r += 191 / this.rgb_rate;
      this.g += 191 / this.rgb_rate;
      this.b += 191 / this.rgb_rate;
      if (this.alarm[1] < 16 && this.alarm[1] % 4 === 0) scr_afterimage_grow_attached(this, this, this.image_blend, false);
    }
  }
  draw() {
    if (on(this.alarm[0]) && this.alarm[0] % 2 < 1) return;
    this.image_blend = make_color_rgb(Math.min(255, Math.round(this.r)), Math.min(255, Math.round(this.g)), Math.min(255, Math.round(this.b)));
    const h = this.sprite_height, w = this.sprite_width;
    for (let a = 0; a < h; a++) {
      draw_sprite_part_ext(this.sprite_index, this.image_index, 0, a, w, 1, this.x - 24 + Math.sin((a + this.timer) * 0.5) * 2,
        this.y - 6 + a, 1, 1, this.image_blend, this.image_alpha);
    }
    if (this.alarm[1] < 6 && this.alarm[1] > -1) {
      draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, 1 - this.alarm[1] * 0.165, 1 - this.alarm[1] * 0.165,
        this.image_angle, 0x000000, this.image_alpha);
    }
  }
}
register('obj_knight_weird_circle', WeirdCircle);

// ---------------------------------------------------------------- obj_knight_weird_circle_bullet

class WeirdCircleBullet extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_weird_shape';
  }
  create() {
    scr_bullet_init(this);
    this.spin = 0;
    this.spinspeed = 0;
    this.image_alpha = 1;
    if (!i_ex('obj_heart')) instance_destroy(this);
    this.wall_destroy = 1;
    this.bottomfade = 0;
    this.timer = 0;
  }
  // Other_15 is obj_collidebullet's (inherited user5).
  step() {
    this.timer += 1;
    if (this.timer % 3 === 0) this.grazed = 0;
    if (this.wall_destroy === 1) {
      if (this.x < view_x() - 80) instance_destroy(this);
      if (this.x > view_x() + 760) instance_destroy(this);
      if (this.y < view_y() - 80) instance_destroy(this);
      if (this.y > view_y() + 580) instance_destroy(this);
    }
    if (this.updateimageangle === 1) this.image_angle = this.direction;
    if (this.spin === 1) this.image_angle += this.spinspeed;
    if (this.bottomfade !== 0 && this.y > cameray() + this.bottomfade) this.image_alpha *= 0.8;
  }
}
register('obj_knight_weird_circle_bullet', WeirdCircleBullet);
