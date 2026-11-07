// "Swords falling" (obj_dbulletcontroller type 108): obj_knight_swordfall (the Knight throws its
// sword up, swords rain into the box, then one or two big final swords) and obj_fallingsword.
// Also obj_knight_diamondswordbullet_ext (sword bullet used by other patterns).
import {
  G, global, S, defineObject, instance_create, instance_destroy, random, irandom, clamp, point_direction,
  angle_difference, make_color_rgb, irandom_range, draw_sprite_ext, draw_self, instancesOf,
} from '../../runtime/gm.js?v=20261107001915';
import { snd_play, snd_stop, snd_volume } from '../../runtime/audio.js?v=20261107001915';
import {
  first, enemyRef, boardRef, heartRef, camerax, scr_get_box, scr_lerpvar, scr_script_delayed, scr_var, scr_approach,
  scr_afterimage, scr_afterimagefast, scr_afterimage_grow, scr_bullet_init, scr_darksize, scr_bulletparent_count,
  scr_bullet_inherit, scr_at_player, snd_play_x,
} from '../common.js?v=20261107001915';
import { BulletParent, RegularBullet } from '../bullets.js?v=20261107001915';

// GML truthiness: a real is true when > 0.5 (alarms read -1 when off).
const on = v => v > 0.5;
const gtime = () => global.time ?? G.frame;

export class KnightSwordfall extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    scr_bullet_init(this);
    scr_darksize(this);
    this.image_speed = 0;
    this.swordcount = 1;
    this.countdowner = 29;
    this.countdown = 45;
    this.turn_type = 'full';
    this.turn_segment = -1;
    this.next_up = -1;
    this.next_next_up = -1;
    this.turn_time = 160;
    this.local_turntimer = 0;
    this.anchor_x = this.x;
    this.anchor_y = this.y;
    this.dip = 2;
    this.difficulty = 0;
    this.forcexfix = false;
    this._siner = 0;
  }
  // Other_10: set up the turn segment.
  user0() {
    const tt = this.turn_type;
    if (tt === 'full') {
      this.local_turntimer = 324;
      this.alarm[5] = 4;
    }
    if (tt === 'start' || tt === 'short start' || tt === 'short mid') {
      this.local_turntimer = tt === 'start' ? 120 : tt === 'short start' ? 70 : 80;
      this.countdowner = tt === 'short start' ? 10 : 20;
      this.countdown = 2;
      this.turn_time = 40;
      this.sprite_index = 'spr_roaringknight_point_ol';
      scr_lerpvar(this, 'image_index', 0, 4, 8);
      scr_lerpvar(this, 'x', this.x, scr_get_box(0) + 60, 20, 1, 'out');
      scr_lerpvar(this, 'y', this.y, (scr_get_box(1) + scr_get_box(3)) / 2 - 110, 20, 1, 'out');
    }
    if (tt === 'end') {
      const e = enemyRef();
      for (const w of instancesOf('obj_knight_warp')) {
        w.x = camerax() + 444;
        w.y = e.ystart;
      }
      this.x = camerax() + 444;
      this.y = e.ystart;
      this.local_turntimer = 244;
      this.countdowner = 16;
      this.countdown = 20;
      this.alarm[5] = 4;
    }
    if (tt === 'short end') {
      this.local_turntimer = 214;
      this.countdowner = 10;
      this.countdown = 20;
      this.alarm[5] = 4;
    }
  }
  // The Knight's sword leaves upward (the sword is thrown).
  alarm0() {
    const s = instance_create(this.x + this.sprite_width * 0.5, this.y + this.sprite_height * 0.5 - 30, 'obj_fallingsword');
    s.alarm[0] = 1;
    s.image_angle = -90;
    s.direction = -s.image_angle;
    s.speed = -4;
    s.old_angle = [s.image_angle, s.image_angle, s.image_angle];
    s.image_xscale = 1.5;
    s.image_alpha = 1;
    s.nosfx = true;
    scr_lerpvar(s, 'image_xscale', 1.5, 2, 49, 1, 'out');
    scr_lerpvar(s, 'image_yscale', 0, -3, 4, 1, 'out');
    scr_script_delayed(s, scr_lerpvar, 4, 'image_yscale', -3, 0, 5, 1, 'in');
    scr_script_delayed(s, scr_lerpvar, 9, 'image_yscale', 0, 2.5, 6, 1, 'out');
    scr_script_delayed(s, scr_lerpvar, 15, 'image_yscale', 2.5, 0, 7, 1, 'in');
    scr_script_delayed(s, scr_lerpvar, 22, 'image_yscale', 0, -2.25, 8, 1, 'out');
    scr_script_delayed(s, scr_lerpvar, 30, 'image_yscale', -2.25, 0, 9, 1, 'in');
    scr_script_delayed(s, scr_lerpvar, 39, 'image_yscale', 0, 2, 10, 1, 'out');
  }
  // The final big sword(s).
  alarm1() {
    const b = boardRef();
    const big = (x, y) => {
      const s = instance_create(x, y, 'obj_fallingsword');
      s.image_angle = point_direction(s.x, s.y, scr_get_box(4), scr_get_box(5));
      s.direction = s.image_angle;
      s.speed = -6;
      s.speed_gain = 0.3;
      s.image_xscale = 2;
      scr_lerpvar(s, 'image_yscale', 0, -2, 8);
      scr_script_delayed(s, scr_lerpvar, 8, 'image_yscale', -2, 2, 8);
      scr_lerpvar(s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1, 'out');
      scr_lerpvar(s, 'image_alpha', 0, 1, 16, 1, 'out');
      s.finalsword = true;
      s.grazepoints = 30;
    };
    if (this.difficulty === 0) big(b.x - 55 + random(110), b.y - 110 + random(30));
    if (this.difficulty === 1) {
      big(b.x + 55 - random(40), b.y - 110 + random(30));
      big(b.x - 55 + random(40), b.y - 110 + random(30));
    }
  }
  // The Knight comes back down with its sword.
  alarm2() {
    const e = enemyRef();
    scr_lerpvar(this, 'y', e.y + 120, e.y - 20, 30, 1, 'out');
    scr_script_delayed(this, scr_lerpvar, 30, 'y', e.y - 20, e.y + 10, 20, 2, 'inout');
    scr_script_delayed(this, scr_lerpvar, 50, 'y', e.y + 10, e.y, 10, 2, 'inout');
    this.dip = 0;
    this.x = e.x + 10;
    this.image_xscale = 2;
    this.sprite_index = 'spr_roaringknight_sword_ol';
    this.image_angle = -90;
    scr_lerpvar(this, 'image_yscale', 0, -2, 4, 1, 'in');
    scr_script_delayed(this, scr_lerpvar, 4, 'image_yscale', -2, 0, 5, 1, 'in');
    scr_script_delayed(this, scr_var, 9, 'sprite_index', 'spr_roaringknight_attack_ol_center');
    scr_script_delayed(this, scr_var, 9, 'image_angle', 0);
    scr_script_delayed(this, scr_var, 9, 'image_xscale', 0);
    scr_script_delayed(this, scr_var, 9, 'image_yscale', 2);
    scr_script_delayed(this, scr_lerpvar, 9, 'image_xscale', 0, 2, 6, 1, 'out');
    this.forcexfix = true;
    this.alarm[4] = 26;
  }
  // Hand-off to the next pattern of a combination (obj_knight_combinations).
  alarm3() {
    if (this.next_up !== -999) {
      const map = { 1: 'obj_roaringknight_quickslash_attack', 2: 'obj_knight_rotating_slash', 3: 'obj_knight_tunnel_slasher_2_revised', 5: 'obj_knight_weird_bottom_manager' };
      const knight = map[this.next_up];
      if (knight) {
        const nk = instance_create(this.x, this.y, knight);
        scr_bullet_inherit(this, nk);
        nk.creatorid = this.creatorid;
        nk.creator = this.creator;
        nk.turn_type = 'end';
        if (this.turn_segment === 0) {
          nk.turn_type = 'short mid';
          nk.turn_segment = 1;
          nk.next_up = this.next_next_up;
        }
        if (this.turn_segment === 1) {
          nk.turn_type = 'short end';
          nk.turn_segment = 2;
        }
        nk.anchor_x = this.anchor_x;
        nk.anchor_y = this.anchor_y;
        if (nk.user0) nk.user0();
        if (knight === 'obj_knight_tunnel_slasher_2_revised') {
          nk.timer = -8;
          nk.fake_timer = -8;
        }
        if (knight === 'obj_knight_weird_bottom_manager') {
          const w = instance_create(nk.x, nk.y, 'obj_knight_warp');
          w.depth = nk.depth;
          w.master = nk;
          w.user1();
          nk.alarm[0] = 1;
        }
      }
    }
    instance_destroy(this);
  }
  alarm4() {
    instance_destroy(this);
    const e = first('obj_knight_enemy');
    if (e) e.siner2 = this._siner;
  }
  alarm5() {
    scr_lerpvar(this, 'image_xscale', this.image_xscale, 0, 8, 1, 'out');
    scr_lerpvar(this, 'x', this.x, this.x + 110, 8, 1, 'out');
    this.alarm[0] = 8;
  }
  onDestroy() {
    const tt = this.turn_type;
    if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid' && scr_bulletparent_count() < 2) {
      const e = first('obj_knight_enemy');
      if (e) e.image_alpha = 1;
      global.turntimer = -1;
    }
  }
  step() {
    this.local_turntimer -= 1;
    const e = first('obj_knight_enemy');
    if (e) {
      e.siner2 = 0;
      this.anchor_x = e.x;
      this.anchor_y = e.y;
    }
    if (gtime() % 4 === 0 && this.sprite_index !== 'spr_roaringknight_sword_ol' && this.image_alpha !== 0 && !on(this.alarm[5]) && !on(this.alarm[2])) {
      const fade = scr_afterimage(this);
      if (this.sprite_index === 'spr_roaringknight_attack_ol_center') {
        fade.x = camerax() + 544;
        fade.y = enemyRef().ystart + Math.cos(this._siner / 8) * 8;
      }
      fade.depth = (this.creatorid?.depth ?? this.depth) + 1;
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.hspeed = 4;
    }
    if (on(this.alarm[0])) return;
    this.countdown -= 1;
    if (this.countdown === 0) {
      const ex = this.difficulty === 1 ? 30 : 0;
      const tt = this.turn_type;
      if (this.local_turntimer < this.turn_time - ex) {
        this.countdown = 99999;
        this.local_turntimer = 99999;
        if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid') {
          this.alarm[1] = 8;
          this.alarm[2] = 60;
        } else {
          scr_lerpvar(this, 'image_index', 4, 0, 8);
          this.alarm[3] = 4;
        }
        return;
      }
      const b = boardRef();
      const s = instance_create(b.x - 110 + random(220), b.y - 110 + random(30), 'obj_fallingsword');
      s.image_angle = point_direction(s.x, s.y, clamp(b.x + 95 - random(190), s.x - 40, s.x + 40), b.y + 110);
      s.direction = s.image_angle;
      s.speed = -4;
      scr_lerpvar(s, 'image_yscale', 0, -1, 8);
      scr_script_delayed(s, scr_lerpvar, 8, 'image_yscale', -1, 1, 8);
      scr_lerpvar(s, 'image_angle', s.image_angle, s.image_angle + 360, 16, 1, 'out');
      scr_lerpvar(s, 'image_alpha', 0, 1, 16, 1, 'out');
      if (this.difficulty === 0) {
        this.countdowner = scr_approach(this.countdowner, 5, 5);
        this.countdown = this.countdowner - irandom(1);
      }
      if (this.difficulty === 1) {
        this.countdowner = scr_approach(this.countdowner, 4, 5);
        this.countdown = this.countdowner;
      }
    }
  }
  draw() {
    if (this.forcexfix && this.sprite_index === 'spr_roaringknight_attack_ol_center') {
      this._siner += 1;
      draw_sprite_ext(this.sprite_index, this.image_index, camerax() + 544, enemyRef().ystart + Math.cos(this._siner / 8) * 8,
        this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    } else if (this.sprite_index === 'spr_roaringknight_sword_ol') {
      draw_sprite_ext(this.sprite_index, this.image_index, camerax() + 544, this.y + Math.sin(gtime() * 0.1) * this.dip + 30,
        this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    } else {
      draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y + Math.sin(gtime() * 0.1) * this.dip,
        this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    }
  }
}
defineObject('obj_knight_swordfall', KnightSwordfall);

export class FallingSword extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_sword_ol';
  }
  create() {
    super.create();
    this.slowing = 30;
    this.owner = null;
    this.damage = 206;
    this.element = 5;
    this.grazepoints = 12;
    this.image_yscale = 0;
    this.alarm[0] = 1;
    this.destroyonhit = 0;
    this.image_alpha = 0;
    this.timer = 0;
    this._snd = null;
    this.nosfx = false;
    this.max_old = 3;
    this.old_x = [this.x, this.x, this.x];
    this.old_y = [this.y, this.y, this.y];
    this.old_angle = [this.image_angle, this.image_angle, this.image_angle];
    this.speed_gain = 0.4;
    this.finalsword = false;
  }
  alarm0() {
    this.alarm[2] = 16;
    if (this.finalsword) this.alarm[3] = 10;
  }
  step() {
    super.step();
    this.timer += 1;
    if (!this.nosfx) {
      if (this.timer === 3) {
        snd_stop('snd_knight_fallingsword');
        snd_play_x('snd_knight_fallingsword', 1, 1);
      }
      if (this.timer === 31 && this.finalsword) snd_play_x('snd_knight_fallingsword_big', 1, 1);
    } else if (this.timer === 1) {
      this._snd = snd_play('snd_heavy_passing');
      snd_volume('snd_heavy_passing', 1, 0);
    }
    for (let i = this.max_old - 1; i > 0; i--) {
      this.old_x[i] = this.old_x[i - 1];
      this.old_y[i] = this.old_y[i - 1];
      this.old_angle[i] = this.old_angle[i - 1];
    }
    this.old_x[0] = this.x;
    this.old_y[0] = this.y;
    this.old_angle[0] = this.image_angle;
    if (this.alarm[0] === -1) this.speed = scr_approach(this.speed, 18, 0.6 + this.speed_gain * Math.sign(this.speed));
    if (on(this.speed) && this.finalsword) this.speed = this.speed + 2.4;
  }
  draw() {
    for (let i = this.max_old - 1; i > 0; i--) {
      draw_sprite_ext(this.sprite_index, 0, this.old_x[i], this.old_y[i], this.image_xscale, this.image_yscale - 0.2 * i,
        this.old_angle[i], 0xffffff, this.image_alpha - 0.3 * i);
    }
    draw_self(this);
  }
}
defineObject('obj_fallingsword', FallingSword);

// obj_knight_diamondswordbullet_ext: a sword bullet that can turn red, re-aim (user0) and dash.
export class DiamondSwordBulletExt extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_diamondswordbullet';
  }
  create() {
    super.create();
    this.element = 5;
    this.con = 0;
    this.timer = 0;
    this.topindex = irandom(12);
    this.botindex = irandom(12);
    this.shakeme = false;
    this.play_passing_sfx = true;
    this.image_speed = 0;
    this.fake = false;
    this.do_afterimage = false;
    this.r = 255;
    this.g = 255;
    this.b = 255;
  }
  user0() {
    this.shakeme = false;
    this.play_passing_sfx = false;
    const aim = scr_at_player(this) + 180;
    this.speed = 0;
    const nx = this.x + 40 * Math.cos(aim * Math.PI / 180), ny = this.y - 40 * Math.sin(aim * Math.PI / 180);
    scr_lerpvar(this, 'x', this.x, nx, 12);
    scr_lerpvar(this, 'y', this.y, ny, 12);
    const diff = angle_difference(this.image_angle, scr_at_player(this));
    const sgn = Math.sign(diff);
    let thing = this.image_angle;
    if (sgn === 1) thing = this.image_angle > 180 ? this.image_angle - diff + 360 : this.image_angle - diff - 360;
    if (sgn === -1) thing = this.image_angle > 180 ? this.image_angle - diff - 360 : this.image_angle - diff + 360;
    scr_lerpvar(this, 'image_angle', this.image_angle, thing, 12, 2, 'out');
    scr_lerpvar(this, 'direction', this.direction, thing, 12, 2, 'out');
    scr_script_delayed(this, scr_lerpvar, 13, 'speed', -4, 0, 8, 2, 'out');
    scr_script_delayed(this, scr_lerpvar, 21, 'speed', 0, 24, 12);
    scr_script_delayed(this, scr_var, 21, 'do_afterimage', 1);
  }
  user5() {
    if (this.active == 1) {
      if (!this.shakeme && this.g === 255 && global.inv < 0) {
        if (this.image_angle === 90) scr_lerpvar(this, 'image_angle', this.image_angle, this.image_angle - 10, 6, 1, 'out');
        else if (this.image_angle === 270) scr_lerpvar(this, 'image_angle', this.image_angle, this.image_angle + 10, 6, 1, 'out');
        this.speed *= 0.5;
      }
      // Damage without the parent's destroy-on-hit (Other_15 does not call event_inherited).
      if (this.target !== 3) S.scr_damage(this);
      if (this.target === 3) S.scr_damage_all(this);
    }
  }
  animationEnd() { this.image_index = 1; }
  step() {
    super.step();
    if (this.shakeme && !this.fake) {
      this.g = scr_approach(this.g, 0, 21.25);
      this.b = scr_approach(this.b, 0, 21.25);
    }
    if (this.do_afterimage === 1) {
      this.do_afterimage = 2;
      scr_afterimage_grow(this).image_blend = 0xff0000;
    }
    if (this.do_afterimage === 2) {
      const a = scr_afterimagefast(this);
      a.fadeSpeed = 0.33;
      a.image_blend = 0xff0000;
    }
    const h = heartRef();
    if (this.play_passing_sfx && this.x < h.x + 30 && this.y > h.y) {
      this.play_passing_sfx = false;
      snd_play_x('snd_object_passing', 1, 1);
    }
  }
  draw() {
    const color = make_color_rgb(this.r, this.g, this.b);
    const s = this.shakeme ? 1 : 0;
    draw_sprite_ext(this.sprite_index, this.image_index, this.x + irandom_range(-s, s), this.y + irandom_range(-s, s),
      this.image_xscale, this.image_yscale, this.image_angle, color, this.image_alpha);
  }
}
defineObject('obj_knight_diamondswordbullet_ext', DiamondSwordBulletExt);
