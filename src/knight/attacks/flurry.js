// "Flurry" (obj_knight_enemy myattackchoice 2, obj_dbulletcontroller type 99): the Knight slashes
// the box in two again and again; each cut splits the box apart, pushes the SOUL with one half and
// fires teeth out of the cut.
// Objects: obj_roaringknight_boxsplitter_attack, obj_roaringknight_splitslash,
// obj_knight_split_growtangle, obj_knight_split_growtangle_effect, obj_roaringknight_split_bullet.
// (The quickslash / fountain objects belong to other attacks and are not used by this one.)
import {
  G, global, defineObject, instance_create, instance_destroy, instancesOf, choose, random, random_range, irandom,
  irandom_range, round, merge_color, lerp, lengthdir_x, lengthdir_y, point_direction, angle_difference, clamp,
  draw_self, draw_sprite_ext, draw_sprite, draw_sprite_part_ext, draw_set_blend_mode, draw_set_color, draw_triangle,
  draw_line, draw_surface, draw_surface_ext, draw_surface_part_ext, draw_clear_alpha, surface_create, surface_exists,
  surface_free, surface_set_target, surface_reset_target, sprite_create_from_surface, draw_rectangle,
  sprite_get_xoffset, sprite_get_yoffset, getSprite, draw_sprite_tiled_ext, S,
} from '../../runtime/gm.js?v=20261114041601';
import { snd_play, snd_stop } from '../../runtime/audio.js?v=20261114041601';
import {
  first, enemyRef, camerax, cameray, screenx, screeny, gt_minx, gt_miny, clamp01, remap, scr_ease_in, scr_ease_out,
  scr_movetowards, scr_approach, scr_bullet_init, scr_bullet_inherit, scr_precise_hit, scr_dark_marker,
  scr_afterimage, scr_bulletparent_count, scr_lerp_var_instance, snd_play_x, snd_play_pitch,
} from '../common.js?v=20261114041601';
import { BulletParent, CollideBullet, RegularBullet } from '../bullets.js?v=20261114041601';

const remap_clamped = (a, b, c, d, v) => clamp(remap(a, b, c, d, v), Math.min(c, d), Math.max(c, d));
const inverselerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
const randomsign = () => irandom(1) * 2 - 1;
const heart = () => first('obj_heart');
const splitBox = () => first('obj_knight_split_growtangle');
const splitter = () => first('obj_roaringknight_boxsplitter_attack');

// draw_sprite_part_ext_rot with no rotation (the only use here).
function draw_sprite_part_ext_rot(spr, sub, left, top, w, h, x, y, xs, ys, rot, col, alpha) {
  if (left < 0) left = 0;
  if (top < 0) top = 0;
  const s = getSprite(spr);
  if (!s) return;
  const xx = x + (left - sprite_get_xoffset(spr)) * xs, yy = y + (top - sprite_get_yoffset(spr)) * ys;
  let pw = w / xs - left, ph = h / ys - top;
  pw = Math.min(pw, s.w - left);
  ph = Math.min(ph, s.h - top);
  if (pw <= 0 || ph <= 0) return;
  draw_sprite_part_ext(spr, sub, left, top, pw, ph, xx, yy, xs, ys, col, alpha);
}

// ---------------------------------------------------------------- obj_roaringknight_boxsplitter_attack

class BoxsplitterAttack extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    scr_bullet_init(this);
    this.hell_surface = null;
    this.spawn_speed = 40;
    this.spawn_range = 4;
    this.timer = 200;
    this.slash_count = 0;
    this.image_alpha = 1;
    this.image_xscale = 2;
    this.image_yscale = 2;
    const h = heart();
    this.depth = (h ? h.depth : 0) + 1;
    this.image_speed = 0;
    this.image_index = 1;
    this.animtimer = 5;
    this.aetimer = 0;
    this.turn_segment = -1;
    this.turn_type = 'full'; // set by obj_dbulletcontroller
    this.local_turntimer = 330;
    this.auto = true;
    this.knight = first('obj_knight_enemy');
    this.done = false;
    this.vertical = false;
    this.difficulty = 2;
    this.growtangle = first('obj_growtangle');
    this.init = false;
    this.force_swap = -1;
    this.diagonal = false;
    this.force_oneside = irandom(1);
  }
  user0() {} // turn_type setup (no Other_10 for this object)
  cleanUp() {
    if (surface_exists(this.hell_surface)) surface_free(this.hell_surface);
    const t = this.turn_type;
    if (t !== 'start' && t !== 'short start' && t !== 'short mid' && scr_bulletparent_count() < 2) {
      const k = this.knight && this.knight.alive ? this.knight : first('obj_knight_enemy');
      if (k) k.image_alpha = 1;
      global.turntimer = -1;
    }
  }
  step() {
    this.local_turntimer -= 1;
    if (!this.init) {
      if (this.difficulty === 0) this.spawn_speed = 50;
      else if (this.difficulty === 1) {
        this.spawn_speed = 46;
        this.force_swap = irandom(2) + 1;
      } else if (this.difficulty === 2) this.spawn_speed = 31;
      this.init = true;
      this.vertical = irandom(1);
    }
    if (!this.auto) return;
    if (!this.knight || !this.knight.alive) this.knight = enemyRef();
    if (!this.growtangle || !this.growtangle.alive) this.growtangle = splitBox() || first('obj_growtangle');
    if (this.local_turntimer <= 30) {
      if (this.local_turntimer <= 10 && this.sprite_index !== 'spr_roaringknight_idle') {
        if (this.image_xscale < 0) this.x -= 220;
        this.image_xscale = Math.abs(this.image_xscale);
        this.sprite_index = 'spr_roaringknight_idle';
        this.image_index = 0;
      } else if (this.local_turntimer < 22 && this.image_xscale < 0) this.image_index = 4;
      if (this.x < enemyRef().x) this.x += 1;
      const lt = Math.max(0, this.local_turntimer);
      this.y = lerp(this.y, this.knight.y, (50 - lt) / 50);
      const sb = splitBox();
      if (this.local_turntimer < 0 && !(sb && sb.split)) {
        global.turntimer = 0;
        instance_destroy(this);
      }
      return;
    }
    this.timer += 1;
    if (this.timer >= this.spawn_speed) {
      this.timer = 0;
      this.vertical = irandom(1);
      if (this.difficulty === 0) this.vertical = this.force_oneside;
      const gt = this.growtangle;
      const slash = instance_create(gt ? gt.x : camerax() + 320, gt ? gt.y : cameray() + 170, 'obj_roaringknight_splitslash');
      slash.vertical = this.vertical;
      if (this.difficulty === 3) {
        slash.diagonal = this.diagonal;
        if (this.diagonal) {
          this.timer = -4;
          this.diagonal = false;
        } else this.diagonal = irandom(1);
      }
      this.slash_count += 1;
      if (this.difficulty <= 2 && this.spawn_speed > 40) this.spawn_speed = scr_movetowards(this.spawn_speed, 40, 3);
      this.spawn_range = scr_approach(this.spawn_range, 60, 3);
    }
  }
  draw() {
    const gtObj = first('obj_growtangle');
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
        const gx = gtObj ? gtObj.x : 0;
        fade.hspeed = 2 * Math.sign(this.x - gx);
        fade.depth = this.x < gx ? this.depth + 50 : this.depth + 100;
      }
    }
    if (!gtObj) return;
    // The dark backing line of each slash still charging, clipped to the box (hell_surface).
    if (!surface_exists(this.hell_surface)) this.hell_surface = surface_create(142, 142);
    draw_set_blend_mode(0);
    surface_set_target(this.hell_surface);
    draw_clear_alpha(0, 0);
    for (const s of instancesOf('obj_roaringknight_splitslash')) {
      if (s.slash) continue;
      const ease = scr_ease_out(clamp01(s.timer / 30), 3);
      const spin = (ease * 15 - 15) * s.flip;
      const backing = merge_color(0, s.image_blend, 0.5);
      const size = lerp(4, 0, ease);
      const length = clamp01(s.timer / 30) * 90;
      draw_sprite_ext('spr_pxwhite10_center', 0, 71 + s.xoffset, 71 + s.yoffset, length, size, spin + s.image_angle + s.angleoffset, backing, 1);
      // gpu_set_blendmode_ext(bm_dest_alpha, bm_dest_alpha): the scrolling texture only where the line
      // is. Canvas has no such factor pair; source-atop is the closest (over the line, not added to it).
      draw_set_blend_mode('source-atop');
      draw_sprite_tiled_ext('spr_knight_bullet_flow', 2, s.timer, s.timer, 0.25, 0.25, s.image_blend, 1);
      draw_sprite_tiled_ext('spr_knight_bullet_flow', 2, -s.timer + 40, -s.timer + 40, 0.25, 0.25, s.image_blend, 1);
      draw_set_blend_mode(0);
    }
    surface_reset_target();
    draw_set_blend_mode(1);
    draw_surface(this.hell_surface, gtObj.x - 71, gtObj.y - 71);
    draw_set_blend_mode(0);
  }
}
defineObject('obj_roaringknight_boxsplitter_attack', BoxsplitterAttack);

// ---------------------------------------------------------------- obj_roaringknight_splitslash

class SplitSlash extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_rk_quickslash_lower';
  }
  create() {
    scr_bullet_init(this);
    this.active = false;
    this.timer = 0;
    this.image_alpha = 1;
    this.image_speed = 0;
    this.slash = false;
    this.destroyonhit = false;
    this.thickness = 10;
    this.image_blend = 0;
    this.init = false;
    this.flip = choose(-1, 1);
    this.damage = 206;
    this.element = 5;
    this.grazepoints = 10;
    this.slashmarker = null;
    this.vertical = false;
    this.memheartx = 0;
    this.memhearty = 0;
    this.playerstrike = false;
    this.xoffset = 0;
    this.yoffset = 0;
    this.angleoffset = 0;
    this.startdepth = this.depth;
    this.difficulty = 0;
    this.slice_delay = 5;
    this.hurt_delay = 15;
    this.diagonal = false;
    this.cuty = 0;
  }
  cleanUp() {
    if (this.slashmarker) instance_destroy(this.slashmarker);
  }
  user5() {
    const h = heart();
    if (this.active && h && scr_precise_hit(this, 3)) {
      this.playerstrike = 1;
      this.active = 0;
      this.memheartx = h.x;
      this.memhearty = h.y;
      h.image_alpha = 0;
      global.inv = -1;
      this.cuty = round(remap_clamped(-16, 16, 1, 14, h.y - (this.y - 8)));
      const sb = splitBox();
      if (sb) sb.split_delay = 5;
      for (const a of instancesOf('obj_roaringknight_boxsplitter_attack')) {
        a.timer -= 5;
        a.local_turntimer += 5;
      }
      this.hurt_delay = sb ? sb.split_wait : 5;
    }
  }
  animationEnd() {
    if (this.slash && this.visible) {
      if (!this.playerstrike) instance_destroy(this);
      else this.image_alpha = 0;
    }
  }
  step() {
    this.timer += 1;
    const gt = first('obj_growtangle');
    const att = splitter();
    if (!this.init) {
      this.startdepth = this.depth;
      this.depth = (gt ? gt.depth : 0) + 10;
      this.init = true;
      this.slashmarker = scr_dark_marker(this.x, this.y, 'spr_rk_quickslash_upper');
      this.slashmarker.depth = (gt ? gt.depth : 0) + 50;
      this.slashmarker.image_speed = 0;
      this.slashmarker.image_alpha = 0;
      this.angleoffset = random_range(-12, 12);
      const odd = att ? att.slash_count % 2 === 1 : false;
      if (this.diagonal) {
        this.direction = odd ? -45 : 45;
        this.vertical = odd;
        this.image_angle = this.direction;
        this.xoffset = random_range(-2, 2) * 2;
        this.yoffset = random_range(-2, 2) * 2;
      } else if (this.vertical) {
        this.direction = odd ? -90 : 90;
        this.image_angle = this.direction;
        this.xoffset = random_range(-8, 8) * 2;
      } else this.yoffset = random_range(-8, 8) * 2;
      this.slashmarker.image_angle = this.image_angle;
    }
    if (this.image_alpha < 1 && !this.slash) this.image_alpha += 0.05;
    if (!this.slash) {
      this.image_blend = merge_color(0, 0xff0000, clamp01(this.timer / 20)); // c_red (BGR 255)
      this.slashmarker.image_alpha = 0;
    } else {
      this.slashmarker.x = this.x;
      this.slashmarker.y = this.y;
      this.slashmarker.image_index = this.image_index;
      this.slashmarker.image_blend = this.image_blend;
      this.slashmarker.image_alpha = this.image_alpha;
    }
    if (this.timer <= 15) this.thickness = lerp(10, 1, scr_ease_out(this.timer / 15, 4));
    if (this.timer === 29) this.depth = this.startdepth;
    if (this.timer === 30) this.doSlash(gt, att);
    if (this.timer === 34) this.active = false;
    if (this.timer === 35 + this.hurt_delay && this.playerstrike === 1) {
      this.playerstrike = 0;
      const h = heart();
      if (h) h.image_alpha = 1;
      if (this.target !== 3) S.scr_damage_maxhp(this, 0.66, false, true);
      global.inv = global.invc * 30;
      instance_destroy(this);
    }
  }
  doSlash(gt, att) {
    this.x = this.xstart;
    this.y = this.ystart;
    if (this.image_angle === 90) this.image_yscale *= -1;
    this.image_angle += this.angleoffset;
    this.x += this.xoffset;
    this.y += this.yoffset;
    this.image_blend = 0xffffff;
    this.active = true;
    this.slash = true;
    let sp = splitBox();
    if (!sp) {
      sp = instance_create(gt ? gt.x : this.x, gt ? gt.y : this.y, 'obj_knight_split_growtangle');
      scr_bullet_inherit(this, sp);
      sp.grazepoints = 5;
      for (const a of instancesOf('obj_roaringknight_boxsplitter_attack')) {
        a.growtangle = sp;
        sp.difficulty = a.difficulty;
      }
    }
    sp.xoffset = this.xoffset;
    sp.yoffset = this.yoffset;
    sp.angle = this.angleoffset;
    for (const s of instancesOf('obj_knight_split_growtangle')) {
      s.vertical = this.vertical;
      s.diagonal = this.diagonal;
      s.con = 1;
      s.timer = 0;
    }
    this.sprite_index = 'spr_rk_quickslash';
    this.image_speed = 1;
    this.image_index = 0;
    this.image_yscale *= 2;
    for (const a of instancesOf('obj_roaringknight_boxsplitter_attack')) {
      a.image_index = a.image_index >= 4 ? 1 : 4;
      a.animtimer = 0;
    }
    snd_stop('snd_wideslash_low');
    snd_stop('snd_knight_hurtb');
    snd_play_x('snd_wideslash_low', 0.8, 0.9 + random(4) / 10);
    let ang = this.image_angle;
    if (this.image_xscale < 0) ang += 180;
    const dirx = lengthdir_x(60, ang), diry = lengthdir_y(60, ang);
    for (let i = 0; i < 16; i++) {
      const d = instance_create(this.xstart + this.xoffset, this.ystart + this.yoffset, 'obj_afterimage');
      d.speed = random_range(10, 20);
      d.direction = this.image_angle + (20 - d.speed) * randomsign() / 2 + 180;
      d.speed += random_range(-2, 2);
      if (i % 2 === 0) {
        d.direction -= 180;
        d.speed *= 0.75;
        d.x += dirx;
        d.y += diry;
      } else {
        d.x -= dirx;
        d.y -= diry;
      }
      d.image_angle = d.direction;
      d.sprite_index = 'spr_knight_slash_mark';
      d.image_alpha = 1;
      d.image_blend = 0xffffff;
      d.image_xscale = d.speed / 10;
      d.image_yscale = 0.1;
      d.friction = 0.5;
      d.fadeSpeed += random(0.02);
      scr_lerp_var_instance(d, 'image_xscale', d.image_xscale, 0.05, 5);
    }
  }
  endStep() {
    const h = heart();
    if (this.playerstrike === 1 && h) {
      if (h.x !== this.memheartx) h.x = this.memheartx + Math.sign(h.x - this.memheartx);
      if (h.y !== this.memhearty) h.y = this.memhearty + Math.sign(h.y - this.memhearty);
      this.memheartx = h.x;
      this.memhearty = h.y;
    }
  }
  draw() {
    if (this.slash) draw_self(this);
    else {
      const att = splitter();
      const gt = att && att.growtangle && att.growtangle.alive ? att.growtangle : first('obj_growtangle');
      if (gt) {
        draw_set_blend_mode(1);
        const ease = scr_ease_out(clamp01(this.timer / 30), 3);
        const spin = (ease * 15 - 15) * this.flip;
        const backing = merge_color(0, 0xff0000, 0.5);
        const size = lerp(4, 0, ease);
        const length = ease * 180;
        draw_sprite_ext('spr_pxwhite10_center', 0, gt.x + this.xoffset, gt.y + this.yoffset, length, size, spin + this.image_angle + this.angleoffset, backing, 1);
        draw_set_blend_mode(0);
      }
    }
    if (this.playerstrike === 1) {
      for (const h of instancesOf('obj_heart')) {
        const xx = irandom(2) - 1, yy = irandom(2) - 1;
        const fade = remap_clamped(45, 55, 1, 0, this.timer);
        draw_sprite_ext(h.sprite_index, h.image_index, h.x + xx, h.y + yy, 1, 1, 0, 0xffffff, 1);
        draw_sprite_ext('spr_rk_slash_heartslice', this.cuty, h.x + xx, h.y + yy, 1, 1, 0, 0xffffff, fade);
      }
    }
  }
}
defineObject('obj_roaringknight_splitslash', SplitSlash);

// ---------------------------------------------------------------- obj_knight_split_growtangle

class SplitGrowtangle extends BulletParent {
  create() {
    const gt = first('obj_growtangle');
    this.image_blend = gt ? gt.image_blend : 0x00c000;
    this.image_xscale = gt ? gt.image_xscale : 2;
    this.image_yscale = gt ? gt.image_yscale : 2;
    this.depth = (gt ? gt.depth : 0) + 100;
    this.con = 0;
    this.timer = 0;
    this.distance = 0;
    this.old_distance = 0;
    if (gt) gt.visible = false;
    this.heart_y = 0;
    this.heart_x = 0;
    this.sprite_index = gt ? gt.sprite_index : 'spr_battlebg_0';
    this.child_bullet = [];
    this.count = 0;
    this.flame_index = 0;
    this.marker = [];
    for (let i = 0; i < 2; i++) {
      const m = instance_create(this.x + (i ? 0 : 2), this.y + (i ? 2 : -1), 'obj_marker');
      m.sprite_index = 'spr_rk_split_flame_big';
      m.image_speed = 0.5;
      m.image_xscale = 2;
      m.image_yscale = 2;
      m.image_angle = i ? 0 : 180;
      m.image_blend = 0x808080;
      m.depth = this.depth + 10;
      this.marker[i] = m;
    }
    this.split = false;
    this.vertical = false;
    this.diagonal = false;
    this.boxgone = false;
    this.max_distance = 70;
    this.split_delay = 0;
    this.vshift = 0;
    this.hshift = 0;
    this.xoffset = 0;
    this.yoffset = 0;
    this.angle = 0;
    this.h_change = 0;
    this.v_change = 0;
    this.update_box = false;
    this.source_surf = null;
    this.half_box_a = null;
    this.half_box_b = null;
    this.difficulty = 0;
    this.split_wait = 5;
    this.split_hold = 30;
    this.init = false;
    this.split_bullet = 'obj_roaringknight_split_bullet';
    this.bullet_count = 13;
    this.bullet_range = 144;
    this.disable_on_close = true;
  }
  user0() {
    this.timer = 0;
    this.con += 1;
  }
  // Puts obj_growtangle back where it was, drawn from the box surface while it shrinks away.
  user1() {
    this.boxgone = true;
    const gt = first('obj_growtangle');
    if (!gt || gt.customBox) return;
    gt.visible = true;
    gt.x = gt.xstart;
    gt.y = gt.ystart;
    if (!surface_exists(this.source_surf)) return;
    surface_set_target(this.source_surf);
    draw_set_color(0);
    draw_rectangle(0, 169, 1, 170, false);
    draw_set_color(0xffffff);
    surface_reset_target();
    gt.customBox = true;
    gt.spr_custom_box = sprite_create_from_surface(this.source_surf, 0, 0, 170, 170, true, false, 85, 85);
    gt.growscale = 1;
  }
  cleanUp() {
    this.user1();
    for (const m of this.marker) instance_destroy(m);
    for (const s of [this.source_surf, this.half_box_a, this.half_box_b]) if (surface_exists(s)) surface_free(s);
  }
  step() {
    if (!this.init) {
      if (this.difficulty === 2) {
        this.split_wait = 4;
        this.split_hold = 26;
      }
      this.init = true;
    }
    const h = heart();
    this.timer += 1;
    this.old_distance = this.distance;
    if (this.con === 1) {
      if (this.timer <= 1) {
        const e = instance_create(this.x, this.y, 'obj_knight_split_growtangle_effect');
        e.angle = this.angle;
        e.diagonal = this.diagonal;
        e.xoffset = this.xoffset;
        e.yoffset = this.yoffset;
        e.depth = this.depth - 100;
        e.vertical = this.vertical;
      }
      if (this.timer >= this.split_wait + this.split_delay) this.doSplit(h);
    }
    const hold = this.diagonal ? this.split_hold + 2 : this.split_hold;
    if (this.con === 2) {
      this.split = true;
      if (this.timer === 7) {
        for (const b of this.child_bullet) {
          if (b && b.alive) {
            b.depth = this.depth - 10;
            b.active = true;
            b.grazed = 0;
          }
        }
      }
      if (this.timer <= hold / 2) {
        this.distance = scr_ease_out(this.timer / (this.split_hold / 2), 3) * this.max_distance;
        const dd = this.distance - this.old_distance;
        if (h) {
          if (this.diagonal) {
            h.x += dd * this.heart_x;
            h.y += dd * this.heart_y;
          } else if (this.vertical) h.x += dd * this.heart_x * 1.25;
          else h.y += dd * this.heart_y * 1.25;
        }
      } else this.user0();
    }
    if (this.con === 3) {
      this.distance = this.max_distance - scr_ease_in(this.timer / (this.split_hold / 2), 3) * this.max_distance;
      if (this.timer >= hold / 2) {
        if (this.vertical || this.diagonal) this.vshift = irandom_range(-3, 3);
        else this.hshift = irandom_range(-3, 3);
        if (this.diagonal) this.hshift = this.vshift;
        this.user0();
      }
    }
    if (this.con === 4) {
      this.distance = scr_movetowards(this.distance, 0, 12);
      if (this.distance === 0) {
        this.con = 0;
        this.split = false;
        if (this.difficulty === 3) {
          if (this.split_wait > 3) this.split_wait -= 1;
          if (this.split_hold > 26) this.split_hold -= 2;
        } else {
          if (this.split_wait > 5) this.split_wait -= 1;
          if (this.split_hold > 30) this.split_hold -= 2;
        }
        snd_play('snd_locker');
      }
    }
    const dist = round(this.distance);
    const [m0, m1] = this.marker;
    if (this.diagonal) {
      m0.image_angle = this.vertical ? -45 : 225;
      m1.image_angle = this.vertical ? 135 : 45;
      const sq = Math.sqrt(0.5) * dist;
      m0.x = this.x - sq - 1 + this.xoffset;
      m1.x = this.x + sq + 3 + this.xoffset;
      m0.y = this.y - sq - 1 + this.yoffset;
      m1.y = this.y + sq + 3 + this.yoffset;
    } else if (this.vertical) {
      m0.image_angle = -90;
      m1.image_angle = 90;
      m0.x = this.x - dist - 1 + this.xoffset;
      m1.x = this.x + dist + 3 + this.xoffset;
      m0.y = this.y - 1 + this.yoffset;
      m1.y = this.y + 3 + this.yoffset;
    } else {
      m0.image_angle = 180;
      m1.image_angle = 0;
      m0.y = this.y - dist - 1 + this.yoffset;
      m1.y = this.y + dist + 3 + this.yoffset;
      m0.x = this.x - 1 + this.xoffset;
      m1.x = this.x + 3 + this.xoffset;
    }
    // While the box is open the real walls are moved away; endStep keeps the SOUL in the halves.
    const gt = first('obj_growtangle');
    if (gt) gt.x = this.distance > 0 ? -9999 : gt.xstart;
  }
  doSplit(h) {
    if (this.disable_on_close) {
      for (const b of instancesOf(this.split_bullet)) b.active = false;
      this.child_bullet = [];
      this.count = 0;
    }
    snd_play_x('snd_knight_boxbreak', 1, 1.1);
    this.user0();
    if (h) {
      if (this.diagonal) {
        const hd = point_direction(this.x + this.xoffset, this.y + this.yoffset, h.x + 10, h.y + 10);
        const a = this.angle + (this.vertical ? 45 : -45);
        if (Math.abs(angle_difference(a, hd)) < 90) {
          this.heart_x = 1;
          this.heart_y = this.vertical ? -1 : 1;
        } else {
          this.heart_x = -1;
          this.heart_y = this.vertical ? 1 : -1;
        }
      } else {
        this.heart_x = h.x + 10 < this.x + this.xoffset ? -1 : 1;
        this.heart_y = h.y + 10 < this.y + this.yoffset ? -1 : 1;
      }
    }
    if (this.split_delay > 0) snd_play_pitch('snd_chargeshot_fire', 0.5);
    snd_play('snd_chargeshot_fire');
    this.split_delay = 0;
    const range = this.bullet_range;
    let total = this.bullet_count, odd = false;
    if (this.bullet_count % 2 === 1) {
      odd = true;
      total += 1;
    }
    let flip = choose(true, false);
    const trueangle = this.vertical ? this.angle + 90 : this.angle;
    const xrange = lengthdir_x(range, trueangle), yrange = lengthdir_y(range, trueangle);
    const xshift = xrange / (total / 2 - 1), yshift = yrange / (total / 2 - 1);
    let xstart = this.x - xrange / 2, ystart = this.y - yrange / 2;
    let weight = 0, direction = 0;
    for (let i = 0; i < this.bullet_count; i++) {
      if (!this.diagonal && i === total / 2) {
        xstart = this.x - xrange / 2;
        ystart = this.y - yrange / 2;
        if (odd) {
          xstart += xshift / 2;
          ystart += yshift / 2;
        }
        weight = 0;
        flip = !flip;
      }
      if (weight === 0) weight = choose(-2, -1, 1, 2);
      const spd = inverselerp(-1, 1, Math.sign(-weight));
      const b = this.diagonal ? instance_create(this.x, this.y, this.split_bullet) : instance_create(xstart, ystart, this.split_bullet);
      b.friction = spd === 1 ? -0.2 : -0.05;
      b.top_speed = (spd === 1 ? 4 : 2) + random_range(-0.2, 0.2);
      b.image_speed = 0.5;
      b.depth = this.depth + 1;
      b.image_xscale = 2;
      b.image_yscale = 2;
      b.active = false;
      b.speed = 0;
      if (this.diagonal) direction += 360 / this.bullet_count;
      else if (this.vertical) direction = flip ? 180 : 0;
      else direction = flip ? 90 : -90;
      b.direction = direction;
      b.image_angle = direction;
      scr_bullet_inherit(this, b);
      b.grazed = -1;
      this.child_bullet[this.count++] = b;
      if (Math.abs(weight) === 1) weight = choose(1, 2) * Math.sign(-weight);
      else weight = scr_movetowards(weight, 0, 1);
      xstart += xshift;
      ystart += yshift;
    }
  }
  endStep() {
    const h = heart(), gt = first('obj_growtangle');
    if (!h || !gt) return;
    let dist = round(this.distance);
    if (this.con === 0) dist = 0;
    let sw = this.vertical ? dist : 0, sh = this.vertical ? 0 : dist;
    if (this.diagonal) sw = sh = Math.sqrt(0.5) * dist;
    const tl = { x: gt.xstart - 70 - sw, y: gt.ystart - 70 - sh };
    const br = { x: gt.xstart + 52 + sw, y: gt.ystart + 52 + sh };
    const dchange = Math.sqrt(0.5) * (dist - round(this.old_distance));
    const hs = { x: h.x, y: h.y };
    if (h.x < tl.x) h.x = tl.x;
    if (h.x > br.x) h.x = br.x;
    if (h.y < tl.y) h.y = tl.y;
    if (h.y > br.y) h.y = br.y;
    if (this.diagonal && dchange !== 0) {
      const cx = clamp(h.x - hs.x, -Math.abs(dchange), Math.abs(dchange));
      const cy = clamp(h.y - hs.y, -Math.abs(dchange), Math.abs(dchange));
      if (cx !== 0) h.y += this.vertical ? -cx : cx;
      if (cy !== 0) h.x += this.vertical ? -cy : cy;
    }
    h.x = round(h.x);
    h.y = round(h.y);
  }
  draw() {
    let splid = this.vertical ? round(this.distance) : 0;
    let dist = this.vertical ? 0 : round(this.distance);
    let ang = this.angle + (this.vertical ? 90 : 0);
    if (this.diagonal) {
      splid = Math.sqrt(0.5) * this.distance;
      dist = splid;
      ang += 45;
    }
    const open = this.distance > 0;
    const xx = open ? irandom_range(-1, 1) : 0, yy = open ? irandom_range(-1, 1) : 0;
    const xx2 = open ? irandom_range(-1, 1) : 0, yy2 = open ? irandom_range(-1, 1) : 0;
    if (!surface_exists(this.source_surf)) {
      this.source_surf = surface_create(170, 170);
      surface_set_target(this.source_surf);
      draw_clear_alpha(0, 0);
      draw_sprite_ext(this.sprite_index, 1, 85, 85, 2, 2, 0, 0xffffff, 1);
      draw_sprite_ext(this.sprite_index, 0, 85, 85, 2, 2, 0, 0xffffff, 1);
      surface_reset_target();
      this.half_box_a = surface_create(170, 170);
      this.half_box_b = surface_create(170, 170);
    }
    if (this.distance === 0) {
      draw_surface_ext(this.source_surf, this.x - 85, this.y - 85, 1, 1, 0, this.image_blend, 1);
      this.update_box = true;
    }
    if (this.distance !== 0 && this.update_box) {
      // Cuts the box picture in two along the slash.
      const xm = lengthdir_x(1, ang), ym = lengthdir_y(1, ang);
      const xc = xm * 400, yc = ym * 400;
      const xe = this.vertical ? 400 : 0, ye = this.vertical ? 0 : 400;
      const cx = 85 + this.xoffset, cy = 85 + this.yoffset;
      surface_set_target(this.half_box_a);
      draw_clear_alpha(0, 0);
      draw_surface(this.source_surf, 0, 0);
      draw_set_blend_mode(3);
      const xn = this.vertical ? 1 : 0, yn = this.vertical ? 0 : 1;
      draw_triangle(cx - xc, cy - yc, cx + xc, cy + yc, cx + xe, cy + ye, false);
      draw_set_blend_mode(0);
      surface_reset_target();
      surface_set_target(this.half_box_b);
      draw_clear_alpha(0, 0);
      draw_surface(this.source_surf, 0, 0);
      draw_set_blend_mode(3);
      draw_triangle(cx - xc - xn, cy - yc - yn, cx + xc - xn, cy + yc - yn, cx - xe, cy - ye, false);
      draw_set_blend_mode(0);
      surface_reset_target();
      const change = choose(-2, -1, 1, 2);
      let dev;
      if (this.vertical) {
        dev = change - this.v_change;
        this.v_change = change;
      } else {
        dev = change - this.h_change;
        this.h_change = change;
      }
      surface_set_target(this.source_surf);
      draw_clear_alpha(0, 0);
      draw_surface(this.half_box_a, -xm * dev, -ym * dev);
      draw_surface(this.half_box_b, xm * dev, ym * dev);
      draw_set_color(merge_color(0, 0xffffff, 0.25));
      const ad = 85 + Math.abs(dev);
      draw_set_blend_mode('source-atop'); // gpu_set_blendmode_ext(bm_dest_alpha, bm_zero)
      draw_line(cx - xm * ad, cy - ym * ad, cx + xm * ad, cy + ym * ad);
      draw_set_blend_mode(0);
      surface_reset_target();
      this.update_box = false;
    }
    if (open) {
      if (this.diagonal && this.vertical) {
        draw_surface_ext(this.half_box_a, this.x - splid - 85 + xx, this.y + dist - 85 + yy, 1, 1, 0, this.image_blend, 1);
        draw_surface_ext(this.half_box_b, this.x + splid - 85 + xx2, this.y - dist - 85 + yy2, 1, 1, 0, this.image_blend, 1);
      } else {
        draw_surface_ext(this.half_box_a, this.x - splid - 85 + xx, this.y - dist - 85 + yy, 1, 1, 0, this.image_blend, 1);
        draw_surface_ext(this.half_box_b, this.x + splid - 85 + xx2, this.y + dist - 85 + yy2, 1, 1, 0, this.image_blend, 1);
      }
    }
    draw_set_color(0xffffff);
    if (this.con > 0) {
      if (round(this.distance) === 0) {
        if (this.vertical) draw_sprite_ext('spr_whitepixel', 0, this.x + this.xoffset, this.y - 74, dist * 2, splid * 2, this.angle, 0xffffff, 1);
        else draw_sprite_ext('spr_whitepixel', 0, this.x - 74, this.y + this.yoffset, splid * 2, dist * 2, this.angle, 0xffffff, 1);
      } else if (this.vertical) {
        draw_sprite_ext('spr_rk_split_flame_edge', this.flame_index, this.x - dist - 1, this.y + 2, 2, 2, ang, 0x808080, 1);
        draw_sprite_ext('spr_rk_split_flame_edge', this.flame_index, this.x + dist + 2, this.y, 2, 2, ang, 0x808080, 1);
      } else {
        draw_sprite_ext('spr_rk_split_flame_edge', this.flame_index, this.x + 2, this.y - dist - 1, 2, 2, ang + 185, 0x808080, 1);
        draw_sprite_ext('spr_rk_split_flame_edge', this.flame_index, this.x, this.y + dist + 2, 2, 2, ang, 0x808080, 1);
      }
    }
    this.flame_index += 0.5;
  }
}
defineObject('obj_knight_split_growtangle', SplitGrowtangle);

// ---------------------------------------------------------------- obj_knight_split_growtangle_effect

class SplitEffect extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_battlebg_0';
  }
  create() {
    const gt = first('obj_growtangle');
    this.timer = 0;
    this.image_blend = gt ? gt.image_blend : 0x00c000;
    this.image_xscale = gt ? gt.image_xscale : 2;
    this.image_yscale = gt ? gt.image_yscale : 2;
    this.surf = null;
    this.vertical = false;
    this.angle = 0;
    this.xmul = 1;
    this.ymul = 1;
    this.diagonal = false;
    this.xoffset = 0;
    this.yoffset = 0;
  }
  cleanUp() {
    if (surface_exists(this.surf)) surface_free(this.surf);
  }
  draw() {
    if (!surface_exists(this.surf)) {
      // surface_copy(surf, 0, 0, application_surface): the frame drawn so far.
      this.surf = surface_create(640, 480);
      const main = G.ctx.canvas;
      if (main) this.surf.ctx.drawImage(main, 0, 0, 640, 480, 0, 0, 640, 480);
      this.xmul = lengthdir_x(1, this.angle);
      this.ymul = lengthdir_y(1, this.angle);
    }
    this.timer += 1;
    const fade = (10 - this.timer) / 10;
    const ht = (this.vertical ? 0 : this.timer) * this.xmul, vt = (this.vertical ? this.timer : 0) * this.ymul;
    let sw = this.sprite_width, sh = this.sprite_height, sl = 0, st = 0;
    if (this.vertical) {
      sl = this.sprite_width / 2;
      sw /= 2;
    } else {
      st = this.sprite_height / 2;
      sh /= 2;
    }
    const xs = this.image_xscale, ys = this.image_yscale, c = this.image_blend;
    for (const k of [8, 6, 4]) {
      draw_sprite_part_ext_rot(this.sprite_index, 0, 0, 0, sw, sh, this.x - ht * k, this.y - vt * k, xs, ys, 0, c, clamp01(fade));
    }
    for (const k of [8, 6, 4]) {
      draw_sprite_part_ext_rot(this.sprite_index, 0, sl, st, sw, sh, this.x + ht * k, this.y + vt * k, xs, ys, 0, c, clamp01(fade));
    }
    const sx = screenx(this.x), sy = screeny(this.y);
    if (this.vertical) {
      draw_surface_part_ext(this.surf, 0, 0, sx, 480, camerax(), cameray() - this.timer * 8, 1, 1, 0xffffff, fade / 2);
      draw_surface_part_ext(this.surf, sx, 0, 640 - sx, 480, this.x, cameray() + this.timer * 8, 1, 1, 0xffffff, fade / 2);
    } else {
      draw_surface_part_ext(this.surf, 0, 0, 640, sy, camerax() - this.timer * 8, cameray(), 1, 1, 0xffffff, fade / 2);
      draw_surface_part_ext(this.surf, 0, sy, 640, 480 - sy, camerax() + this.timer * 8, this.y, 1, 1, 0xffffff, fade / 2);
    }
    let a = this.angle;
    if (this.vertical) a += 90;
    if (this.diagonal) a += 45;
    draw_sprite_ext('spr_pxwhite10_center', 0, this.x + this.xoffset, this.y + this.yoffset, 50, fade, a, 0xffffff, 1);
    draw_sprite_ext('spr_pxwhite10_center', 0, this.x + this.xoffset, this.y + this.yoffset, 50, fade * 1.4, a, 0xffffff, 0.5);
    if (this.timer === 10) instance_destroy(this);
  }
}
// Its parent is none in the game; registered as a plain object (BulletParent only for the class shape).
Object.defineProperty(SplitEffect, 'objName', { value: 'obj_knight_split_growtangle_effect', writable: true, configurable: true });
defineObject('obj_knight_split_growtangle_effect', SplitEffect);

// ---------------------------------------------------------------- obj_roaringknight_split_bullet

class SplitBullet extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_tooth';
  }
  create() {
    super.create();
    this.element = 5;
    this.speed_mult = 0;
    this.top_speed = 0;
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.active = false;
    this.destroy_on_hit = false;
    this.grazepoints = 0;
    this.grazed = 1;
    this.distance = 0;
    this.anim_timer = 0;
    this.image_speed = 0;
  }
  step() {
    super.step();
    if (!this.alive) return;
    this.grazepoints = 3;
    if (this.speed_mult < 1) {
      this.speed_mult += 0.2;
      if (!this.active && this.speed_mult >= 0.1) this.active = true;
      this.speed = this.speed_mult * this.top_speed;
    }
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.distance += this.speed;
  }
  draw() {
    this.image_index = Math.floor(scr_ease_in(this.anim_timer, 2) * this.image_number);
    if (this.anim_timer < 1 - 1e-5) this.anim_timer += 0.1;
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, this.image_xscale + random_range(-0.1, 0.1),
      this.image_yscale + random_range(-0.1, 0.1), this.image_angle, this.image_blend, this.image_alpha);
  }
}
defineObject('obj_roaringknight_split_bullet', SplitBullet);
