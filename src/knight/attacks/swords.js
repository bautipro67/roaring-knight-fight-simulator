// "Tracking swords" (obj_dbulletcontroller type 151; myattackchoice 11, 14, 15, 16, 17) and
// "Sword vortex" (type 154; myattackchoice 15).
// Objects: obj_tracking_swords_manager (spawns the swords and draws the slash lines inside the box),
// obj_tracking_sword1 (a sword that circles the SOUL, turns red, flashes and cuts through it),
// obj_tracking_sword_slash (the one-frame cut line), obj_tracking_sword_slash_extra_graze (an
// invisible wider strip that gives extra TP), obj_tracking_sword2 (variant 1 debris, unused by the
// fight), obj_sword_vortex_manager and obj_sword_vortex (swords that orbit a wandering centre).
// All of them are children of obj_regularbullet except the extra graze strip, and none calls
// event_inherited, so obj_regularbullet's Create/Step never run for them.
import {
  global, defineObject, instance_create, instance_destroy, choose, irandom, lerp, clamp, merge_color,
  lengthdir_x, lengthdir_y, place_meeting, instancesOf, Instance,
  draw_self, draw_sprite_ext, draw_set_blend_mode, d3d_set_fog, draw_clear_alpha, draw_surface,
  surface_create, surface_exists, surface_free, surface_set_target, surface_reset_target,
} from '../../runtime/gm.js?v=20261031150323';
import {
  first, i_ex, heartRef, boardRef, cameray, gt_minx, gt_miny, eq, scr_bullet_init, scr_afterimage_grow, snd_play_x,
  callOr,
} from '../common.js?v=20261031150323';
import { RegularBullet } from '../bullets.js?v=20261031150323';

const scr_armorcheck_equipped_party = callOr('scr_armorcheck_equipped_party', () => 0);
const scr_tensionheal = callOr('scr_tensionheal', n => {
  global.tension = Math.min((global.tension ?? 0) + n, global.maxtension ?? 250);
});
const c_red = 0xff0000; // GML 255 (BGR)

// ---------------------------------------------------------------- obj_tracking_swords_manager

class TrackingSwordsManager extends RegularBullet {
  create() {
    this.timer = 0;
    this.con = 0;
    this.variant = 0;
    this.firstsword = false;
    this.multiswordmax = 0;
    this.multiswordframes = 0;
    this.multiswordcon = 0;
    this.multiswordcount = 0;
    this.setcount = 0;
    this.setdirection = [];
    for (this.i = 0; this.i < 50; this.i++) this.setdirection[this.i] = -1;
    this.creatorid = -1;
    this.creator = -1;
    this.hell_surface = -4;
    scr_bullet_init(this);
    this.swordcount = 0;
    this.directionprev = [];
    for (this.i = 0; this.i < 8; this.i++) this.directionprev[this.i] = -1;
    this.user0();
  }
  cleanUp() {
    if (surface_exists(this.hell_surface)) surface_free(this.hell_surface);
  }
  // Other_10: the spawn rate for each variant.
  user0() {
    if (this.variant === 0) {
      this.rate = 32;
      this.ratedecay = 4;
      this.rateminimum = 16;
      this.maxswords = 99;
      this.multiswordmax = 0;
    }
    if (this.variant === 1) {
      this.rate = 50;
      this.ratedecay = 10;
      this.rateminimum = 6;
      this.maxswords = 5;
      this.multiswordmax = 0;
      this.rate = 24;
      this.ratedecay = 0;
      this.rateminimum = 24;
      this.maxswords = 99;
      this.multiswordmax = 0;
    }
    if (this.variant === 2) {
      this.rate = 24;
      this.ratedecay = 0;
      this.rateminimum = 24;
      this.maxswords = 99;
      this.multiswordmax = 2;
      this.multiswordframes = 4;
      const sd = this.setdirection;
      sd[1] = 0; sd[2] = 45; sd[3] = 90; sd[4] = 135; sd[5] = 180;
      sd[6] = 225; sd[7] = 270; sd[8] = 315; sd[9] = 0; sd[10] = 45;
    }
    if (this.variant === 3) {
      this.rate = 20;
      this.ratedecay = 4;
      this.rateminimum = 13;
      this.maxswords = 99;
      this.multiswordmax = 0;
    }
    for (const dc of instancesOf('obj_dbulletcontroller')) {
      if (dc.type === 104) {
        for (const m of instancesOf('obj_tracking_swords_manager')) {
          m.rate = 55;
          m.ratedecay = 0;
          m.rateminimum = 24;
          m.maxswords = 99;
          m.multiswordmax = 0;
          m.multiswordframes = 0;
        }
      }
      if (dc.type === 154) {
        for (const m of instancesOf('obj_tracking_swords_manager')) {
          m.rate = 24;
          m.ratedecay = 4;
          m.rateminimum = 16;
          m.maxswords = 99;
          m.multiswordmax = 0;
        }
      }
    }
    this.timer = this.rate - 5;
  }
  step() {
    if (global.turntimer < 70) return;
    this.timer += 1;
    if ((this.timer === this.rate && this.swordcount <= this.maxswords) || (this.timer === this.multiswordframes && this.multiswordcon === 1)) {
      const inst = instance_create(this.x, this.y, 'obj_tracking_sword1');
      inst.direction = choose(0, 45, 90, 135, 180, 225, 270, 315);
      inst.variant = this.variant;
      inst.damage = this.damage;
      for (let r = 0; r < 8; r++) {
        for (this.i = 0; this.i < 8; this.i++) {
          if (inst.direction === this.directionprev[this.i]) inst.direction = inst.direction + 45;
        }
      }
      inst.image_angle = inst.direction + 180;
      this.directionprev[this.swordcount] = inst.direction;
      for (this.i = 1; this.i < 4; this.i++) {
        let _a = this.i + this.swordcount;
        if (_a > 7) _a -= 7;
        this.directionprev[_a] = -1;
      }
      this.swordcount += 1;
      if (this.swordcount > this.maxswords && this.variant === 0) global.turntimer = 70;
      if (this.swordcount > this.maxswords && this.variant === 1) global.turntimer = 120;
      if (this.swordcount > 7 && this.swordcount < this.maxswords) this.swordcount = 0;
      this.setcount += 1;
      // (GML would error past index 49; the turn never gets that far.)
      if ((this.setdirection[this.setcount] ?? -1) !== -1) inst.direction = this.setdirection[this.setcount];
      if (this.multiswordmax > 0) this.multiswordcount += 1;
      if (this.multiswordcon === 0 && this.multiswordmax > 0) this.multiswordcon = 1;
      if (this.multiswordcon === 1 && this.multiswordcount === this.multiswordmax) {
        this.multiswordcon = 0;
        this.multiswordcount = 0;
      }
      if (inst.alive) {
        const h = heartRef();
        inst.x = h.x + 10 + lengthdir_x(inst.len, inst.direction);
        inst.y = h.y + 10 + lengthdir_y(inst.len, inst.direction);
        inst.ystart = inst.y;
        inst.image_angle = inst.direction + 180;
      }
      this.rate -= this.ratedecay;
      if (this.rate < this.rateminimum) this.rate = this.rateminimum;
      this.timer = 0;
    }
  }
  // The cut lines, additively, clipped to a 150x150 surface at the box's top-left corner.
  draw() {
    if (!surface_exists(this.hell_surface)) this.hell_surface = surface_create(150, 150);
    const mx = gt_minx(), my = gt_miny();
    surface_set_target(this.hell_surface);
    draw_clear_alpha(0, 0);
    draw_set_blend_mode(1);
    for (const s of instancesOf('obj_tracking_sword_slash')) {
      draw_sprite_ext(s.sprite_index, s.image_index, s.x - mx, s.y - my, s.image_xscale, s.image_yscale, s.image_angle, 0xffffff, s.image_alpha);
    }
    draw_set_blend_mode(0);
    surface_reset_target();
    draw_surface(this.hell_surface, mx, my);
  }
}
defineObject('obj_tracking_swords_manager', TrackingSwordsManager);

// ---------------------------------------------------------------- obj_tracking_sword1

class TrackingSword1 extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_sword_ol';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.afterimagecon = 0;
    this.targetx = 0;
    this.targety = 0;
    this.variant = 0;
    this.image_alpha = 0;
    scr_bullet_init(this);
    this.element = 5;
    this.fadetohalftime = 5;
    this.waittime = 10;
    this.fadetofulltime = 20;
    this.flashtime = 4;
    this.len = 120;
    this.lenstart = this.len;
  }
  step() {
    const h = heartRef();
    if (this.con < 2) {
      this.x = h.x + 10 + lengthdir_x(this.len, this.direction);
      this.y = clamp(h.y + 10 + lengthdir_y(this.len, this.direction), cameray() + 40, cameray() + 320);
    }
    if (this.con === 0) {
      this.timer += 1;
      if (this.timer === 1) snd_play_x('snd_knight_jump_quick', 1, 1.3);
      this.image_alpha = lerp(0, 0.5, this.timer / this.fadetohalftime);
      if (eq(this.image_alpha, 0.5)) {
        this.con = 1;
        this.timer = 0;
      }
    }
    if (this.con === 1) {
      this.timer += 1;
      if (this.timer >= this.waittime) {
        this.image_alpha = lerp(0.8, 1, (this.timer - this.waittime) / this.fadetofulltime);
        this.len = lerp(this.len, this.lenstart + 10, (this.timer - this.waittime) / this.fadetofulltime);
        this.image_blend = merge_color(0xffffff, c_red, this.timer / 30);
      }
      if (eq(this.image_alpha, 1)) {
        this.con = 2;
        this.timer = 0;
        this.afterimage = scr_afterimage_grow(this);
        this.afterimage.xrate = 0.2;
        this.afterimage.yrate = 0.2;
        this.afterimage.fade = 0.3;
      }
    }
    if (this.con === 2) {
      this.timer += 1;
      if (this.timer === this.flashtime + 1) {
        this.con = 3;
        this.timer = 0;
      }
    }
    if (this.con === 3) {
      this.timer += 1;
      if (this.timer === 1) {
        this.afterimagecon = 1;
        this.targetx = this.x + lengthdir_x(900, this.direction + 180);
        this.targety = this.y + lengthdir_y(900, this.direction + 180);
        snd_play_x('snd_knight_cut2', 1, 1.3);
      }
      if (this.timer === 2) {
        this.slash = instance_create(this.x, this.y, 'obj_tracking_sword_slash');
        this.slash.image_angle = this.image_angle;
        this.slash.direction = this.direction;
        this.slash.damage = this.damage;
        this.slash2 = instance_create(this.x, this.y, 'obj_tracking_sword_slash_extra_graze');
        this.slash2.image_angle = this.image_angle;
        this.slash2.direction = this.direction;
        const a = 200;
        let b = 18, c = 1;
        b = 27;
        if (this.variant === 1) {
          const g = boardRef();
          for (this.i = 0; this.i < b; this.i++) {
            const t = this.i / b;
            c = lerp(1, 5, t);
            const lx = lerp(this.x, this.targetx, t), ly = lerp(this.y, this.targety, t);
            if (lx < g.x + a && lx > g.x - a && ly > g.y - a && ly < g.y + a) {
              const inst = instance_create(lerp(this.x, this.targetx, t * c), lerp(this.y, this.targety, t * c), 'obj_tracking_sword2');
              inst.damage = this.damage;
              inst.target = this.target;
            }
          }
        }
      }
      if (this.timer === 5) instance_destroy(this);
    }
  }
  draw() {
    if (this.afterimagecon === 0) {
      draw_self(this);
      if (this.con === 2) {
        d3d_set_fog(true, 0xffffff);
        draw_self(this);
        d3d_set_fog(false);
      }
    }
    if (this.afterimagecon === 1 || this.afterimagecon === 2) {
      const k = this.afterimagecon === 1 ? 1 : 0.5;
      draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, 0.0025);
      for (this.i = 0; this.i < 40; this.i++) {
        const t = this.i / 40;
        draw_sprite_ext(this.sprite_index, this.image_index, lerp(this.x, this.targetx, t), lerp(this.y, this.targety, t),
          this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, (0.2 + this.i / 80) * k);
      }
      this.afterimagecon += 1;
    }
  }
}
defineObject('obj_tracking_sword1', TrackingSword1);

// ---------------------------------------------------------------- obj_tracking_sword2 (variant 1 only)

class TrackingSword2 extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_triangle_bullet';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.variant = 0;
    scr_bullet_init(this);
    this.damage = 1;
    this.destroyonhit = 0;
    this.grazepoints = 1;
    this.active = 0;
    this.image_speed = 0;
    this.image_index = 1;
    this.image_angle = irandom(360);
    this.direction = this.image_angle;
    this.gravity_direction = this.image_angle;
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.image_alpha = 0.5;
    this.sprite_index = 'spr_ball_small_pixel_hitbox';
  }
  step() {
    this.timer += 1;
    if (this.timer === 30) {
      this.gravity = 0.01;
      this.active = 1;
      this.image_alpha = 1;
    }
    const a = 200, g = boardRef();
    if (this.x < g.x - a || this.x > g.x + a || this.y < g.y - a || this.y > g.y + a) {
      this.image_alpha -= 0.1;
      if (this.image_alpha < 0.1) instance_destroy(this);
    }
  }
}
defineObject('obj_tracking_sword2', TrackingSword2);

// ---------------------------------------------------------------- obj_tracking_sword_slash

// The cut: a 900px line along the sword's angle. Its own Draw only counts frames (the manager
// draws it), so it lives for the steps of two frames.
class TrackingSwordSlash extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_pxwhite2';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.image_xscale = 900;
    this.image_yscale = 1;
    scr_bullet_init(this);
    this.active = 1;
    this.destroyonhit = 0;
    this.damage = 1;
    this.grazepoints = 4;
    if (i_ex('obj_sword_vortex_manager')) this.grazepoints = 2;
    if (i_ex('obj_tracking_swords_manager') && first('obj_tracking_swords_manager').variant === 1) this.grazepoints = 2;
    this.timepoints = 11;
  }
  step() {}
  draw() {
    this.timer += 1;
    if (this.timer === 3) instance_destroy(this);
  }
}
defineObject('obj_tracking_sword_slash', TrackingSwordSlash);

// ---------------------------------------------------------------- obj_tracking_sword_slash_extra_graze

// Not a bullet. Create sets visible = false, so (as in GameMaker) its Draw never runs and the
// strip stays until the SOUL touches it while not invincible.
class TrackingSwordSlashExtraGraze extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pxwhite2';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.image_xscale = 900;
    this.image_yscale = 7;
    this.image_blend = c_red;
    this.visible = false;
    this.grazetpfactor = 1;
    this.grazetimefactor = 1;
    this.grazesizefactor = 1;
    this.grazecount = 0;
    this.grazetpfactor += scr_armorcheck_equipped_party(15) * 0.1;
    this.grazetpfactor += scr_armorcheck_equipped_party(24) * 0.05;
    this.grazetimefactor += scr_armorcheck_equipped_party(14) * 0.1;
    if (this.grazetimefactor > 3) this.grazetimefactor = 3;
    if (this.grazetpfactor > 3) this.grazetpfactor = 3;
  }
  step() {
    if (global.inv < 0) {
      if (place_meeting(this, this.x, this.y, 'obj_heart')) {
        const _grazetpfactor = this.grazetpfactor, _grazetimefactor = this.grazetimefactor;
        if (i_ex('obj_tracking_swords_manager') && first('obj_tracking_swords_manager').variant === 1) scr_tensionheal(4 * _grazetpfactor);
        else if (i_ex('obj_sword_vortex_manager')) scr_tensionheal(4 * _grazetpfactor);
        else scr_tensionheal(7 * _grazetpfactor);
        if (global.turntimer >= 10) global.turntimer -= 0.03333333333333333 * _grazetimefactor;
        instance_destroy(this);
      }
    }
  }
  draw() {
    draw_self(this);
    this.timer += 1;
    if (this.timer === 3) instance_destroy(this);
  }
}
defineObject('obj_tracking_sword_slash_extra_graze', TrackingSwordSlashExtraGraze);

// ---------------------------------------------------------------- obj_sword_vortex_manager

class SwordVortexManager extends RegularBullet {
  create() {
    const g = boardRef();
    this.timer = 0;
    this.siner = 0;
    this.con = 0;
    this.variant = 3;
    this.firstsword = false;
    this.swordcount = 0;
    this.sinpower = 65;
    this.sinspeed = 24;
    this.startinglen = 70;
    this.shrinkrate = 0;
    this.multiswordmax = 0;
    this.multiswordframes = 0;
    this.multiswordcon = 0;
    this.multiswordcount = 0;
    this.centermoves = 0;
    this.centermovescon = 0;
    this.centermovestimer = 0;
    this.movespeed = 60;
    this.swordcirclecenterx = g.x;
    this.swordcirclecentery = g.y;
    this.startx = this.swordcirclecenterx;
    this.starty = this.swordcirclecentery;
    this.targetx = 0;
    this.targety = 0;
    this.setcount = 0;
    this.setdirection = [];
    for (this.i = 0; this.i < 50; this.i++) this.setdirection[this.i] = -1;
    this.creatorid = -1;
    this.creator = -1;
    scr_bullet_init(this);
    const sd = this.setdirection;
    // (variant is still 3 here: the dbulletcontroller's difficulty is only copied after Create.)
    if (this.variant === 0) {
      this.rate = 1;
      this.ratedecay = 0;
      this.rateminimum = 1;
      this.maxswords = 2;
      sd[1] = 0; sd[2] = 180;
      this.multiswordmax = 0;
      this.sinpower = 65;
      this.sinspeed = 24;
      this.startinglen = 70;
    }
    if (this.variant === 1) {
      this.rate = 10;
      this.ratedecay = 0;
      this.rateminimum = 1;
      this.maxswords = 6;
      this.multiswordmax = 2;
      this.multiswordframes = 1;
      this.sinpower = 20;
      this.sinspeed = 18;
      this.startinglen = 90;
      this.shrinkrate = 0.15;
      sd[1] = 0; sd[2] = 180; sd[3] = 0; sd[4] = 180; sd[5] = 0; sd[6] = 180;
    }
    if (this.variant === 2) {
      this.rate = 4;
      this.ratedecay = 0;
      this.rateminimum = 1;
      this.maxswords = 6;
      this.multiswordmax = 2;
      this.multiswordframes = 1;
      this.sinpower = 20;
      this.sinspeed = 26;
      this.startinglen = 70;
      sd[1] = 0; sd[2] = 180; sd[3] = 0; sd[4] = 180; sd[5] = 0; sd[6] = 180;
    }
    if (this.variant === 3) {
      this.rate = 11;
      this.ratedecay = 0;
      this.rateminimum = 1;
      this.maxswords = 6;
      this.multiswordmax = 2;
      this.multiswordframes = 1;
      this.sinpower = 17;
      this.sinspeed = 22;
      this.startinglen = 80;
      sd[1] = 0; sd[2] = 180; sd[3] = 0; sd[4] = 180; sd[5] = 0; sd[6] = 180;
      this.centermoves = 1;
      this.movespeed = 60;
    }
    this.timer = this.rate - 5;
  }
  step() {
    this.timer += 1;
    this.siner += 1;
    if ((this.timer === this.rate && this.swordcount < this.maxswords) || (this.timer === this.multiswordframes && this.multiswordcon === 1)) {
      const g = boardRef();
      const inst = instance_create(g.x, g.y, 'obj_sword_vortex');
      inst.dir = choose(0, 45, 90, 135, 180, 225, 270, 315);
      inst.variant = this.variant;
      inst.sinpower = this.sinpower;
      inst.sinspeed = this.sinspeed;
      inst.len = this.startinglen;
      inst.lenstart = inst.len;
      inst.shrinkrate = this.shrinkrate;
      inst.damage = this.damage;
      inst.target = this.target;
      this.swordcount += 1;
      this.setcount += 1;
      if ((this.setdirection[this.setcount] ?? -1) !== -1) inst.dir = this.setdirection[this.setcount];
      if (this.multiswordmax > 0) this.multiswordcount += 1;
      if (this.multiswordcon === 0 && this.multiswordmax > 0) this.multiswordcon = 1;
      if (this.multiswordcon === 1 && this.multiswordcount === this.multiswordmax) {
        this.multiswordcon = 0;
        this.multiswordcount = 0;
      }
      inst.x = inst.xstart + lengthdir_x(inst.len, inst.dir);
      inst.y = inst.ystart + lengthdir_y(inst.len, inst.dir);
      inst.image_angle = inst.dir - 90;
      this.rate -= this.ratedecay;
      if (this.rate < this.rateminimum) this.rate = this.rateminimum;
      this.timer = 0;
    }
    if (this.centermoves === 1) {
      if (this.centermovescon === 0) {
        const g = boardRef();
        this.startx = this.swordcirclecenterx;
        this.starty = this.swordcirclecentery;
        this.targetx = g.x - 60 + irandom(120);
        this.targety = g.y - 60 + irandom(120);
        this.centermovescon = 1;
      }
      if (this.centermovescon === 1) {
        this.centermovestimer += 1;
        this.swordcirclecenterx = lerp(this.startx, this.targetx, this.centermovestimer / this.movespeed);
        this.swordcirclecentery = lerp(this.starty, this.targety, this.centermovestimer / this.movespeed);
        if (this.centermovestimer === this.movespeed) {
          this.centermovestimer = 0;
          this.centermovescon = 0;
        }
      }
    }
  }
  draw() {}
}
defineObject('obj_sword_vortex_manager', SwordVortexManager);

// ---------------------------------------------------------------- obj_sword_vortex

class SwordVortex extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_sword_ol';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.dir = 0;
    this.image_alpha = 0;
    scr_bullet_init(this);
    this.destroyonhit = 0;
    this.damage = 10;
    this.grazepoints = 2;
    this.timepoints = 1;
    this.spinspeed = 4;
    this.speedtowardscenter = 0.4;
    this.len = 70;
    this.sinpower = 65;
    this.sinspeed = 24;
    this.shrinkrate = 0;
    this.lenstart = this.len;
  }
  step() {
    this.image_alpha += 0.1;
    this.dir -= this.spinspeed * lerp(2, 1, this.len / 120);
    this.image_angle = this.dir - 90;
    const m = first('obj_sword_vortex_manager');
    if (m) {
      this.len = this.lenstart + Math.sin(m.siner / this.sinspeed) * this.sinpower;
      this.x = m.swordcirclecenterx + lengthdir_x(this.len, this.dir);
      this.y = m.swordcirclecentery + lengthdir_y(this.len, this.dir);
      this.lenstart -= this.shrinkrate;
    }
    this.timer += 1;
    if (this.timer % 4 === 0) this.grazed = 0;
  }
  draw() {
    draw_self(this);
  }
}
defineObject('obj_sword_vortex', SwordVortex);

