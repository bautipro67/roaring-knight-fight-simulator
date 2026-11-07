// "Sword tunnel" (obj_dbulletcontroller type 153): obj_sword_tunnel_manager (two walls of swords
// fly past the box leaving a gap that drifts up and down; difficulty 3 spins the tunnel around
// the box), obj_sword_tunnel_sword (each sword; at the end they all turn, aim at the SOUL and
// dash), obj_sword_tunnel_hitbox (the dash's one-frame line hitbox) and obj_knight_swordtunnelanim
// (the Knight pointing while the swords pass).
//
// GML variables named _speed / _gravity / _maxspeed are renamed spd / grav / maxspd here: the
// runtime keeps the built-in speed in Instance._speed.
import {
  global, Instance, defineObject, instance_create, instance_create_depth, instance_destroy, instancesOf, irandom, random,
  random_range, choose, lerp, merge_color, lengthdir_x, lengthdir_y, point_direction, max, floor, abs,
  draw_sprite_ext, draw_self, collision_line, snd_stop, snd_is_playing, c_red, c_white,
} from '../rt.js?v=20261107201438';
import {
  first, i_ex, heartRef, enemyRef, camerax, cameray, camerawidth, scr_bullet_init, scr_darksize, scr_lerpvar,
  scr_afterimage, scr_afterimage_grow, scr_anglechange, snd_play_x,
} from '../common.js?v=20261107201438';
import { RegularBullet } from '../bullets.js?v=20261107201438';

class SwordTunnelManager extends RegularBullet {
  create() {
    this.timer = -40 + irandom(10);
    this.finishtimer = 0;
    this.finishtimermax = 230;
    if (enemyRef().difficulty === 3) this.finishtimermax = 250;
    this.con = 0;
    this.swordx = camerax() + camerawidth() + 20;
    this.swordy = first('obj_growtangle')?.y ?? cameray() + 170;
    this.swordxrel = 340;
    this.swordyrel = 0;
    this.sworddirection = 180;
    this.swordcount = 0;
    this.setcount = choose(2, 3, 4);
    this.waitsetcount = choose(1, 2, 3);
    this.movedirection = choose('up', 'down');
    this.tobymode = 0;
    this.difficulty = 0;
    this.tobyvolleymode = 0;
    this.tobyvolleycount = 0;
    this.tobyvolleyamount = 10 + irandom(6);
    this.tobyvolleymodeinitspeed = 1;
    this.stopsfxtimer = 0;
    this.user0();
    const k = enemyRef();
    instance_create(k.x, k.y, 'obj_knight_swordtunnelanim');
  }
  cleanUp() {
    snd_stop('snd_object_passing');
    snd_stop('snd_heavy_passing');
  }
  user0() {
    this.rate = 6;
    this.gapsize = 50;
    this.verticalchange = 15;
    this.tobymode = 0;
    this.maxswords = 999;
    const d = this.difficulty;
    if (d === 0) { this.rate = 4; this.gapsize = 45; this.verticalchange = 10; this.tobymode = 0; this.maxswords = 999; }
    if (d === 1) { this.rate = 4; this.gapsize = 45; this.verticalchange = 10; this.tobymode = 1; this.tobytimer = 0; this.maxswords = 999; }
    if (d === 2) { this.rate = 4; this.gapsize = 45; this.verticalchange = 7; this.tobymode = 2; this.tobytimer = 0; this.maxswords = 999; }
    if (d === 3) { this.rate = 4; this.gapsize = 45; this.verticalchange = 7; this.tobymode = 3; this.tobytimer = 0; this.maxswords = 999; }
    if (d === 4) { this.rate = 4; this.gapsize = 40; this.verticalchange = 10; this.tobymode = 0; this.maxswords = 999; }
  }
  sword(x, y, angle) {
    const s = instance_create(x, y, 'obj_sword_tunnel_sword');
    s.image_angle = angle;
    s.damage = this.damage;
    return s;
  }
  step() {
    this.timer += 1;
    this.finishtimer += 1;
    let _xx = camerax() + 320, _yy = cameray() + 180;
    const g = first('obj_growtangle');
    if (g) {
      _xx = g.x;
      _yy = g.y;
    }
    const gy = g ? g.y : _yy;
    if (this.finishtimer === this.finishtimermax) {
      this.con = 1;
      for (const s of instancesOf('obj_sword_tunnel_sword')) s.con = 1;
    }
    if (this.timer >= this.rate && this.con === 0) {
      let sword;
      if (this.tobymode === 0) {
        this.sword(this.swordx, this.swordy - 50 - this.gapsize / 2, 270);
        this.sword(this.swordx, this.swordy + 50 + this.gapsize / 2, 90);
      } else if (this.tobymode === 1) {
        this.tobytimer += 1;
        sword = this.sword(this.swordx, this.swordy - 50 - this.gapsize / 2, 270);
        sword.spd += Math.sin(this.tobytimer / 6) * 16 + random(1);
        sword = this.sword(this.swordx, this.swordy + 50 + this.gapsize / 2, 90);
        sword.spd += Math.sin(this.tobytimer / 6) * 16 + random(1);
        this.timer = max(0, Math.sin(this.tobytimer / 6) * 2);
      } else if (this.tobymode === 2 || this.tobymode === 3) {
        const mode3 = this.tobymode === 3;
        if (mode3) {
          this.tobytimer += 1;
          if (!this.tobyvolleymode) {
            this.verticalchange = abs(Math.sin(this.tobytimer / 8)) * 5;
            this.gapsize = 34 + this.verticalchange * 1.4;
          }
        }
        const dir = this.sworddirection;
        const sx = lengthdir_x(this.swordxrel, dir + 180);
        const sy = lengthdir_y(this.swordxrel, dir + 180);
        const syaddy = lengthdir_y(this.swordy - gy, dir + 270);
        const syaddx = lengthdir_x(this.swordy - gy, dir + 270);
        const sgapy = lengthdir_y(this.gapsize, dir + 270) * 2;
        const sgapx = lengthdir_x(this.gapsize, dir + 270) * 2;
        this.tobytimer += 1;
        const speedproportion = lerp(1, 0.8, abs(lengthdir_y(1, dir + 180)));
        const grav = mode3 ? (2 * speedproportion - this.verticalchange / 15) * this.tobyvolleymodeinitspeed : 2 * speedproportion;
        sword = this.sword(_xx + sx - sgapx + syaddx, _yy + sy - sgapy + syaddy, dir + 270);
        sword.mydirection = dir;
        sword.spd = -8 * speedproportion;
        sword.grav = grav;
        sword = this.sword(_xx + sx + sgapx + syaddx, _yy + sy + sgapy + syaddy, dir + 90);
        sword.mydirection = dir;
        sword.spd = -8 * speedproportion;
        sword.grav = grav;
        this.sworddirection += mode3 ? 8 : 4;
      }
      if (this.movedirection === 'up') this.swordy -= this.verticalchange;
      if (this.movedirection === 'down') this.swordy += this.verticalchange;
      this.swordcount += 1;
      const moving = this.movedirection === 'down' || this.movedirection === 'up';
      if ((this.setcount === this.swordcount && moving) || (this.waitsetcount === this.swordcount && this.movedirection === 'none')) {
        this.swordcount = 0;
        this.setcount = choose(2, 3, 4);
        this.waitsetcount = choose(1, 2, 3);
        if (this.tobymode === 2) {
          this.setcount = choose(4, 6, 8);
          this.waitsetcount = choose(2, 4, 6);
          if (this.tobyvolleymode) {
            this.setcount = choose(6, 10, 12);
            this.waitsetcount = choose(6, 8, 12);
          }
        }
        if (this.movedirection === 'none') this.movedirection = choose('up', 'down');
        else this.movedirection = 'none';
        if (this.movedirection === 'up' && this.swordy < gy - 20) this.movedirection = 'down';
        if (this.movedirection === 'down' && this.swordy > gy + 20) this.movedirection = 'up';
      }
    }
    if (this.timer >= this.rate && this.stopsfxtimer < 3) {
      if (this.con === 1) this.stopsfxtimer += 1;
      snd_play_x('snd_heavy_passing', 0.3, 1.2);
      this.timer = 0;
    }
    if (this.swordcount >= this.maxswords) instance_destroy(this);
  }
  draw() {}
}
defineObject('obj_sword_tunnel_manager', SwordTunnelManager);

class SwordTunnelSword extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_diamondbullet_l';
  }
  create() {
    scr_bullet_init(this);
    this.grazepoints = 0.8;
    this.destroyonhit = 0;
    this.timer = 0;
    this.con = 0;
    this.spd = 10;
    this.grav = 2;
    this.maxspd = 30;
    this.active = 0;
    this.create_2nd_hitbox = false;
    this.image_index = 2;
    this.image_speed = 0;
    this.mydirection = 180;
    this.spd = 6;
    this.grav = 1;
    this.image_yscale = 0;
    this.randx = -20 + irandom(40);
    this.randy = -20 + irandom(40);
    this.targetangle = 0;
    this.anglespeed = 8;
    this.telegraph = 0;
    this.telegraphalpha = 0;
    this.prevx = this.x;
    this.prevy = this.y;
  }
  // GameMaker sets xprevious / yprevious before Begin Step; this sword moves itself in Step.
  beginStep() {
    this.prevx = this.x;
    this.prevy = this.y;
  }
  step() {
    const h = heartRef();
    this.spd += this.grav;
    if (this.spd > this.maxspd) this.spd = this.maxspd;
    let _xadd = lengthdir_x(1, this.mydirection);
    let _yadd = lengthdir_y(1, this.mydirection);
    if (this.con === 1) {
      this.timer += 1;
      const c = 10;
      if (this.timer === 1) {
        this.grav = 0;
        this.telegraph = 1;
      }
      if (this.timer < 10 + c / 2) {
        this.anglespeed = lerp(8, 0, this.timer / (10 + c / 2));
        this.image_angle += scr_anglechange(this.image_angle, point_direction(this.x, this.y, h.x + 10 + this.randx, h.y + 10 + this.randy), this.anglespeed);
        this.targetangle += this.anglespeed;
      }
      this.direction = this.image_angle;
      if (this.timer < 10 + c) this.spd = lerp(this.spd, 0, this.timer / 10);
      if (this.timer >= 11 + c && this.timer < 15 + c) {
        if (!snd_is_playing('snd_knight_jump')) snd_play_x('snd_knight_jump', 1, 0.8);
        this.spd = 2;
        _xadd = lengthdir_x(2, this.image_angle + 180);
        _yadd = lengthdir_y(2, this.image_angle + 180);
      }
      if (this.timer >= 15 + c && this.timer < 20 + c) {
        _xadd = 0;
        _yadd = 0;
      }
      if (this.timer === 20 + c) {
        const inst = scr_afterimage_grow(this);
        inst.xrate = 0.4;
        inst.yrate = 0.4;
        inst.fade = 0.2;
      }
      if (this.timer >= 20 + c) {
        if (!snd_is_playing('snd_knight_cut')) snd_play_x('snd_knight_cut', 1, 0.8);
        this.telegraph = 0;
        this.damage = 160;
        this.spd = 80;
        _xadd = lengthdir_x(1, this.image_angle);
        _yadd = lengthdir_y(1, this.image_angle);
      }
    }
    this.image_blend = c_white;
    if (this.x > h.x - 80 && this.x < h.x + 80 && this.y < h.y + 80 && this.y > h.y - 80) {
      this.image_blend = c_red;
      const remx = this.x, remy = this.y;
      const n = max(floor(this.spd / 8), 1);
      for (let i = 0; i < n && this.alive; i++) {
        this.x += _xadd * 8;
        this.y += _yadd * 8;
        this.active = 1;
        if (this.con === 1 && this.spd === 80 && !this.create_2nd_hitbox) {
          const hitbox = instance_create_depth(this.x, this.y, this.depth - 1, 'obj_sword_tunnel_hitbox');
          hitbox.image_angle = this.image_angle;
          hitbox.image_yscale = 0.4;
          hitbox.image_xscale = 999;
          for (const hh of instancesOf('obj_heart')) hh.mask_index = 'spr_dodgeheart_smallmask';
          this.create_2nd_hitbox = true;
        } else if (!this.create_2nd_hitbox && collision_line(this.x, this.y, this.x + lengthdir_x(37, this.image_angle), this.y + lengthdir_y(37, this.image_angle), 'obj_heart', 0, null)) {
          this.user5();
        }
        this.active = 0;
      }
      this.x = remx;
      this.y = remy;
    }
    this.x += _xadd * this.spd;
    this.y += _yadd * this.spd;
    const afterimage = scr_afterimage(this);
    afterimage.image_alpha = 0.4;
    afterimage.x = (this.x + this.prevx) / 2;
    afterimage.y = (this.y + this.prevy) / 2;
    if (this.con > 0) afterimage.image_blend = c_white;
    if (this.x <= camerax() - 100) instance_destroy(this);
    if (this.x >= camerax() + 740) instance_destroy(this);
    if (this.y >= cameray() + 600) instance_destroy(this);
    if (this.y <= cameray() - 250) instance_destroy(this);
    if (this.con === 0) this.image_yscale = lerp(this.image_yscale, this.spd / 20, 0.1);
  }
  draw() {
    if (this.telegraph === 0 && this.telegraphalpha > 0) this.telegraphalpha -= 0.1;
    if (this.telegraph === 1 && this.telegraphalpha < 0.5) this.telegraphalpha += 0.05;
    if (this.telegraphalpha > 0) draw_sprite_ext('spr_lasergun_laser_telegraph', 0, this.x, this.y, 999, 0.4, this.image_angle, c_red, this.telegraphalpha);
    if (this.con > 0) {
      let _timer = this.timer;
      if (_timer > 10) _timer = 10;
      if (this.image_blend === c_red) this.image_blend = merge_color(c_red, c_white, _timer / 10);
    }
    for (let i = 0; i < 10; i++) {
      draw_sprite_ext(this.sprite_index, this.image_index, lerp(this.prevx, this.x, i / 10), lerp(this.prevy, this.y, i / 10), this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, i / 10);
    }
    draw_self(this);
  }
}
defineObject('obj_sword_tunnel_sword', SwordTunnelSword);

class SwordTunnelHitbox extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_lasergun_laser_telegraph_mask';
    this.visible = false;
  }
  create() {
    scr_bullet_init(this);
    this.grazepoints = 0.8;
    this.destroyonhit = 0;
    this.timer = 0;
    this.con = 0;
    this.damage = 160;
    this.active = 0;
    this.visible = false;
  }
  onDestroy() {}
  step() {
    this.timer += 1;
    if (this.timer === 2) this.active = 1;
    if (this.timer === 3) instance_destroy(this);
  }
}
defineObject('obj_sword_tunnel_hitbox', SwordTunnelHitbox);

class KnightSwordTunnelAnim extends Instance {
  create() {
    this.con = 0;
    this.timer = 0;
    this.siner = 0;
    this.animindex = 0;
    scr_darksize(this);
    this.sprite_index = 'spr_roaringknight_point_ol';
    this.image_speed = 0;
    const g = first('obj_growtangle');
    if (g) this.depth = g.depth - 1;
    this.drawtrail = true;
    this.shadowtimer = 0;
    this.dir = 4;
    this.fadeaudio = 0;
    this.fadeaudio2 = 0;
    this.shinkafade = 0;
    this.leafpitch = 1;
    this.endtimer = 0;
  }
  step() {
    const snd = 'snd_leaf_dodge';
    if (this.con === 0) {
      if (this.timer < 60 && this.timer % 3 === 0) {
        snd_play_x(snd, 0.8 * this.fadeaudio, 1 + random(0.2));
        snd_play_x(snd, 0.8 * this.fadeaudio, 1 + random(0.2));
      }
      this.timer += 1;
      if (this.timer === 1) {
        scr_lerpvar(this, 'image_index', 0, 4, 10);
        scr_lerpvar(this, 'dir', 4, -18, 40, 2, 'in');
      }
      if (this.timer === 15) scr_lerpvar(this, 'fadeaudio', 0, 1, 5);
      if (this.timer === 20) {
        scr_lerpvar(this, 'fadeaudio', this.fadeaudio, 0, 20);
        scr_lerpvar(this, 'image_alpha', 1, 0, 10);
        this.hspeed = -4;
      }
      if (this.timer === 26) this.drawtrail = 0;
      if (this.timer === 60) {
        this.timer = 0;
        this.con = 1;
      }
    }
    if (this.con === 1) {
      this.timer += 1;
      if (this.timer === 1) {
        scr_lerpvar(this, 'shinkafade', 0, 1, 20);
        scr_lerpvar(this, 'leafpitch', 0.4, 1, 120);
      }
      if (this.timer % 3 === 0) {
        snd_play_x(snd, 0.4 * this.shinkafade + this.leafpitch / 10, this.leafpitch + random_range(0, 0.2));
        snd_play_x(snd, 0.4 * this.shinkafade + this.leafpitch / 10, this.leafpitch + random_range(0, 0.2));
      }
      if (this.timer % 11 === 0) snd_play_x('snd_shinka_ambience', 1 * this.shinkafade, 1);
      if (this.timer === 120) scr_lerpvar(this, 'shinkafade', 1, 0, 5);
    }
    if (global.turntimer < 10) {
      this.endtimer += 1;
      this.image_alpha = 1;
      this.x = enemyRef().x;
      if (this.endtimer === 1) {
        this.sprite_index = 'spr_roaringknight_ball_transition_sword';
        this.image_index = 5;
        this.image_speed = 0.5;
      }
      if (this.endtimer === 8) instance_destroy(this);
    }
    this.siner += 1;
    this.y = this.ystart + Math.sin(this.siner / 16) * 8;
    if (this.drawtrail) {
      this.shadowtimer += 1;
      if (this.shadowtimer % 2 === 0) {
        const a = scr_afterimage(this);
        a.image_alpha = 1;
        a.hspeed = this.dir;
        const g = first('obj_growtangle');
        if (g) a.depth = g.depth - 1000;
        a.depth += this.shadowtimer;
      }
    }
  }
  draw() { draw_self(this); }
}
defineObject('obj_knight_swordtunnelanim', KnightSwordTunnelAnim);
