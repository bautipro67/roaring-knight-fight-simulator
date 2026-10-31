// "Rotating slash" (obj_dbulletcontroller type 104): obj_knight_rotating_slash (the Knight flies
// around the box, a rotating marker locks on the SOUL and slashes cut across the box; at
// difficulty 2 a final flurry of single slashes), obj_roaringknight_slash (one slash line),
// obj_knight_circle (the red ring at the aim point). Also the generic effects the Knight's
// attacks share: obj_knight_warp (teleport puff) and obj_afterimage_screen (screen zoom echo).
import {
  G, global, Instance, defineObject, objectExists, instance_create, instance_create_depth, instance_destroy, instance_exists,
  instancesOf, irandom, random, random_range, choose, floor, lengthdir_x, lengthdir_y, make_color_rgb, S,
  draw_sprite_ext, draw_self, draw_set_alpha, draw_triangle_color, draw_line_width_color, draw_circle_color,
  gpu_set_blendmode, surface_create, surface_exists, surface_free, surface_set_target, surface_reset_target,
  draw_clear_alpha, draw_surface, draw_surface_ext, snd_play, snd_loop, snd_stop, c_red, c_black, c_white,
} from '../rt.js?v=20261031172539';
import {
  first, i_ex, enemyRef, heartRef, boardRef, camerax, cameray, scr_get_box, scr_approach, scr_lerpvar, scr_script_delayed,
  scr_var, scr_var_delayed, scr_afterimage, scr_bullet_init, scr_bullet_inherit, scr_darksize, scr_bulletparent_count,
  scr_heartclamp, snd_play_x,
} from '../common.js?v=20261031172539';
import { BulletParent, CollideBullet } from '../bullets.js?v=20261031172539';

// GML truthiness: a real is true when > 0.5 (alarms read -1 when off).
const on = v => v > 0.5;
const gtime = () => global.time ?? G.frame;
const mean = (a, b) => (a + b) / 2;
const register = (name, cls) => { if (!objectExists(name)) defineObject(name, cls); };

// surface_resize: GameMaker keeps the surface; here it is recreated when the size changes.
function surface_resize(s, w, h) {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (s.w === w && s.h === h) return s;
  s.canvas.width = w;
  s.canvas.height = h;
  s.w = w;
  s.h = h;
  s.ctx.imageSmoothingEnabled = false;
  return s;
}

function ds_list_shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = irandom(i);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

// ---------------------------------------------------------------- obj_knight_rotating_slash

export class KnightRotatingSlash extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    scr_bullet_init(this);
    scr_darksize(this);
    this.image_speed = 0;
    this.difficulty = 2;
    this.slash_number = 1;
    this.slashes_done = false;
    this.rotation = 16;
    this.rotation_base = 16;
    this.rotation_change = 1;
    this.rotation_goal = 2;
    this.timer = 0;
    this.state = 'intro';
    this.turn_type = 'full';
    this.turn_segment = -1;
    this.next_up = -1;
    this.next_next_up = -1;
    this.local_turntimer = 0;
    this.aim_direction = 0;
    this.spin = choose(-1, 1);
    this.random_offset = irandom(360);
    this.slash_array = [1, 2, 2, 3, 3, 4];
    this.slash_counter = 0;
    this.final_counter = 0;
    this.slash_base = 18;
    this.slash_offset = 6;
    this.speed_gain = 16;
    this.cooldown_time = 6;
    this.slash_timer = 8;
    this.aim_type = 0;
    this.anchor_x = this.x;
    this.anchor_y = this.y;
    this.aim_x = this.x;
    this.aim_y = this.y;
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.line_width = 4;
    this.slash_list = [];
    this.movebox_x = 40;
    this.movebox_y = 60;
    this.line2 = -1;
    this.line3 = -1;
    this.do_final = true;
    this.my_surface = null;
    this.turn_limit_4 = 270;
    this.debug = false;
  }
  user0() {
    if (this.difficulty === 1) {
      this.slash_offset = 6;
      this.slash_number = 3;
      this.slash_array = [2, 3, 4, 4, 4, 4];
    }
    if (this.difficulty === 2) {
      this.slash_offset = 0;
      this.slash_number = 3;
      this.slash_array = [3, 4, 4, 4, 4, 4];
    }
    const tt = this.turn_type;
    if (tt === 'full') this.local_turntimer = 400;
    if (tt === 'start') this.local_turntimer = 320;
    if (tt === 'end') { this.local_turntimer = 300; this.timer = 15; }
    if (tt === 'short start') { this.local_turntimer = 270; this.timer = 12; this.turn_limit_4 = 250; }
    if (tt === 'short mid') { this.local_turntimer = 260; this.timer = 15; this.turn_limit_4 = 250; }
    if (tt === 'short end') { this.local_turntimer = 260; this.timer = 15; }
  }
  alarm1() { this.line3 = 0; }
  alarm2() {
    if (this.next_up !== -999) {
      const knight = { 1: 'obj_roaringknight_quickslash_attack', 3: 'obj_knight_tunnel_slasher_2_revised', 4: 'obj_knight_swordfall', 5: 'obj_knight_weird_bottom_manager' }[this.next_up];
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
        if (knight === 'obj_roaringknight_quickslash_attack') nk.timer = nk.spawn_speed;
        nk.anchor_x = this.anchor_x;
        nk.anchor_y = this.anchor_y;
        if (nk.user0) nk.user0();
      }
    }
    instance_destroy(this);
  }
  alarm3() { instance_destroy(this); }
  cleanUp() {
    this.slash_list = [];
    if (surface_exists(this.my_surface)) surface_free(this.my_surface);
    const tt = this.turn_type;
    if (tt !== 'start' && tt !== 'short start' && tt !== 'short mid' && scr_bulletparent_count() < 2) {
      for (const e of instancesOf('obj_knight_enemy')) e.image_alpha = 1;
      global.turntimer = -1;
    }
    snd_stop('snd_knight_rotatingslash_line');
  }
  // The next attack of a combination turn, warping in next to the Knight.
  spawnNext(obj, wx, wy, after) {
    const e = enemyRef();
    const ks = instance_create(e.x, e.y, obj);
    scr_bullet_inherit(this, ks);
    ks.creatorid = this.creatorid;
    ks.creator = this.creator;
    if (wx !== null) {
      const w = instance_create_depth(ks.x, ks.y, ks.depth, 'obj_knight_warp');
      ks.x += wx;
      ks.y += wy;
      w.master = ks;
      w.user0();
    }
    ks.turn_type = 'end';
    after(ks);
    ks.anchor_x = this.anchor_x;
    ks.anchor_y = this.anchor_y;
    if (ks.user0) ks.user0();
    this.next_up = -999;
    return ks;
  }
  step() {
    const e = enemyRef();
    e.siner2 = 0;
    this.anchor_x = e.x;
    this.anchor_y = e.y;
    this.local_turntimer -= 1;
    const seg = ks => {
      if (this.turn_segment === 0) {
        ks.turn_type = 'short mid';
        ks.turn_segment = 1;
        ks.next_up = this.next_next_up;
      }
      if (this.turn_segment === 1) {
        ks.turn_type = 'short end';
        ks.turn_segment = 2;
      }
    };
    if (this.local_turntimer < 240 && this.next_up === 1) {
      const ks = this.spawnNext('obj_roaringknight_quickslash_attack', 50, -44, seg);
      ks.timer = ks.spawn_speed;
    }
    if (this.local_turntimer < 220 && this.next_up === 3) {
      const ks = this.spawnNext('obj_knight_tunnel_slasher_2_revised', 25, -44, k => {
        if (this.turn_segment === 0) {
          k.turn_type = 'short mid';
          k.turn_segment = 1;
          k.next_up = this.next_next_up;
          k.timer = -8;
        }
        if (this.turn_segment === 1) {
          k.turn_type = 'short mid';
          k.turn_segment = 2;
        }
      });
      if (ks.turn_type === 'short mid' || ks.turn_type === 'short end') {
        ks.timer = -12;
        ks.local_turntimer = (ks.local_turntimer ?? 0) + 12;
      }
    }
    if (this.local_turntimer < this.turn_limit_4 && this.next_up === 4) {
      this.spawnNext('obj_knight_swordfall', -60, -44, seg);
    }
    if (this.local_turntimer < this.turn_limit_4 && this.next_up === 5) {
      const ks = this.spawnNext('obj_knight_weird_bottom_manager', null, null, seg);
      ks.init_start = 4;
      ks.init = 8;
    }
    if (gtime() % 4 === 0 && this.image_alpha !== 0) {
      const fade = scr_afterimage(this);
      fade.depth = e.depth + 1;
      fade.image_alpha = 0.6;
      fade.fadeSpeed = 0.04;
      fade.hspeed = 4;
    }
    if (this.line2 > -1) this.line2 = (this.line2 + 1) % 8;
    if (this.line3 > -1) this.line3 = (this.line3 + 1) % 8;
    if (this.image_index >= 5 && this.aim_type !== 2) {
      this.image_index = 5;
      this.image_speed = 0;
    }
    if (this.state === 'intro') {
      this.timer += 1;
      if (this.timer > 16) {
        this.state = 'aim';
        this.timer = 0;
      }
    }
    if (this.state === 'aim') this.stepAim();
    if (this.state === 'slash') this.stepSlash();
    if (this.state === 'cooldown') this.stepCooldown();
  }
  stepAim() {
    this.timer += 1;
    if (this.timer === 1) {
      snd_stop('snd_knight_rotatingslash_line');
      snd_loop('snd_knight_rotatingslash_line');
      this.rotation = this.rotation_base;
      this.spin = choose(-1, 1);
      this.circle_size = 0;
      this.r = 128;
      this.g = 128;
      this.b = 128;
      this.movebox_x += 20 + irandom(40);
      this.movebox_y += 30 + irandom(60);
      if (this.movebox_x > 80) this.movebox_x -= 80;
      if (this.movebox_y > 120) this.movebox_y -= 120;
      if (this.aim_type !== 2) this.image_index = 1;
      else {
        this.sprite_index = 'spr_roaringknight_flurry_prepare';
        this.image_index = 0;
      }
      scr_lerpvar(this, 'x', this.x, scr_get_box(0) - 20 + this.movebox_x, this.slash_base + this.slash_offset - 8, 1, 'out');
      scr_lerpvar(this, 'y', this.y, scr_get_box(1) - 20 + this.movebox_y, this.slash_base + this.slash_offset - 8, 1, 'out');
    }
    this.aim_direction += this.rotation * this.spin;
    this.rotation = scr_approach(this.rotation, this.rotation_goal, this.rotation_change);
    if (this.timer === 1) {
      if (this.aim_type === 0) {
        const h = heartRef();
        this.aim_x = h.x + 10;
        this.aim_y = h.y + 10;
      }
      instance_create(this.aim_x, this.aim_y, 'obj_knight_circle');
    } else {
      this.r = scr_approach(this.r, 255, 9.142857142857142);
      this.g = scr_approach(this.g, 0, 9.142857142857142);
      this.b = scr_approach(this.b, 0, 9.142857142857142);
    }
    if (this.timer === floor((this.slash_base + this.slash_offset) * 0.5) && this.aim_type !== 2) this.image_index += 1;
    if (this.timer === this.slash_base + this.slash_offset) {
      if (this.aim_type !== 2) this.image_speed = 0.5;
      else {
        scr_var_delayed(this, 'sprite_index', 'spr_roaringknight_flurry', 4);
        scr_var_delayed(this, 'image_speed', 1, 4);
      }
    }
    if (this.timer === this.slash_base + 6 + this.slash_offset) {
      this.state = 'slash';
      this.timer = 0;
    }
  }
  stepSlash() {
    this.timer += 1;
    if (this.timer === 1) {
      snd_stop('snd_knight_rotatingslash_line');
      this.slash_list = [];
      for (let a = 0; a < this.slash_number; a++) this.slash_list.push(360 / (this.slash_number * 2) * a + this.random_offset + this.aim_direction);
      ds_list_shuffle(this.slash_list);
      snd_play('snd_knight_cut');
      snd_play('snd_explosion_firework');
    }
    if (this.timer - 1 < this.slash_list.length) {
      const s = instance_create(this.aim_x, this.aim_y, 'obj_roaringknight_slash');
      s.direction = this.slash_list[this.timer - 1];
      s.image_xscale = 2;
      s.image_angle = s.direction;
      s.visible = false;
      s.width *= 2;
      s.aoe = true;
      const slashid = s;
      const markscalex = 5 + random(3);
      const markscaley = 2 + random(1);
      let p = instance_create(s.x, s.y, 'obj_particle_generic');
      p.depth += 100;
      p.sprite_index = 'spr_knight_slash_mark';
      p.image_blend = c_red;
      p.image_angle = s.image_angle;
      p.image_xscale = markscalex;
      p.image_yscale = markscaley;
      scr_lerpvar(p, 'image_xscale', p.image_xscale, 0, 4);
      scr_lerpvar(p, 'image_yscale', p.image_yscale, 0, 4);
      scr_script_delayed(p, instance_destroy, 4);
      p = instance_create(s.x, s.y, 'obj_particle_generic');
      p.depth += 99;
      p.sprite_index = 'spr_knight_slash_mark';
      p.image_blend = c_black;
      p.image_angle = s.image_angle;
      p.image_xscale = markscaley * 0.85;
      p.image_yscale = markscaley * 0.85;
      scr_lerpvar(p, 'image_xscale', p.image_xscale, 0, 4);
      scr_lerpvar(p, 'image_yscale', p.image_yscale, 0, 4);
      scr_script_delayed(p, instance_destroy, 4);
      for (const back of [0, 180]) {
        const n = 4 + irandom(3);
        for (let k = 0; k < n; k++) {
          const faade = 12 + irandom(8);
          const diist = -20 + random(60);
          const q = instance_create(s.x, s.y, 'obj_particle_generic');
          q.speed = 6 + random(4);
          q.image_angle = s.image_angle + back + random_range(-10, 10);
          q.direction = q.image_angle;
          for (let i = 0; i < 50; i++) {
            q.x += lengthdir_x(5, q.direction);
            q.y += lengthdir_y(5, q.direction);
            if (q.x < scr_get_box(2) || q.x > scr_get_box(0) || q.y < scr_get_box(1) || q.y > scr_get_box(3)) break;
          }
          q.x += lengthdir_x(diist, q.direction);
          q.y += lengthdir_y(diist, q.direction);
          q.depth += 101;
          q.sprite_index = 'spr_knight_slash_mark';
          q.image_blend = c_red;
          q.image_xscale = 0.3;
          q.image_yscale = 0.15;
          scr_lerpvar(q, 'image_xscale', q.image_xscale, 0, faade);
          scr_lerpvar(q, 'image_yscale', q.image_yscale, 0, faade);
          scr_script_delayed(q, instance_destroy, faade);
        }
      }
      scr_bullet_inherit(this, slashid);
      if (slashid.user0) slashid.user0();
    }
    if (this.timer === this.slash_timer) {
      this.state = 'cooldown';
      this.timer = 0;
    }
  }
  stepCooldown() {
    this.timer += 1;
    if (!(this.timer === this.cooldown_time || this.local_turntimer < 200)) return;
    this.slash_counter += 1;
    if (this.slash_counter < this.slash_array.length) {
      this.slash_number = this.slash_array[this.slash_counter];
      this.slash_offset = scr_approach(this.slash_offset, 0, 6);
      this.slash_base = scr_approach(this.slash_base, 15, 1);
    }
    if (this.local_turntimer < 200 && !this.slashes_done) {
      this.slashes_done = true;
      this.local_turntimer = 99999;
    }
    if (this.slashes_done) {
      if (this.difficulty === 2 && this.turn_type === 'full') {
        if (this.do_final) {
          snd_play('snd_knight_puff');
          snd_play_x('snd_knight_teleport', 1, 0.5);
          this.rotation_base = 18;
          this.rotation_change = 0.5;
          this.line_width = 4;
          const a = instance_create(mean(scr_get_box(2), scr_get_box(0)), mean(scr_get_box(1), scr_get_box(3)), 'obj_afterimage_screen');
          a.faderate = 0.05;
          a.draw_end = true;
          this.slash_number = 1;
          this.slash_base = 24;
          this.cooldown_time = 2;
          this.slash_timer = 2;
          this.aim_type = scr_approach(this.aim_type, 2, 1);
          this.do_final = false;
          this.aim_x = mean(scr_get_box(2), scr_get_box(0));
          this.aim_y = mean(scr_get_box(1), scr_get_box(3));
        }
      } else {
        const tt = this.turn_type;
        if (tt === 'start' || tt === 'short start' || tt === 'short mid') {
          const w = instance_create_depth(this.x, this.y, this.depth, 'obj_knight_warp');
          w.master = this;
          w.user1();
          scr_script_delayed(this, scr_var, 2, 'image_index', 4);
          scr_script_delayed(this, scr_var, 4, 'image_index', 0);
          this.alarm[2] = 4;
          return;
        }
        this.debug = true;
        this.state = 'return';
        this.timer = 0;
        scr_script_delayed(this, scr_var, 8, 'image_index', 0);
        scr_script_delayed(this, scr_lerpvar, 8, 'x', this.x, this.anchor_x, 12, 1, 'out');
        scr_script_delayed(this, scr_lerpvar, 8, 'y', this.y, this.anchor_y, 12, 1, 'out');
        this.alarm[3] = 22;
        return;
      }
    }
    if (this.aim_type < 2) {
      this.state = 'aim';
      this.timer = 0;
      if (this.aim_type === 1) {
        this.line2 = 0;
        this.alarm[1] = 4;
        this.aim_type = scr_approach(this.aim_type, 2, 1);
        return;
      }
    }
    if (this.aim_type === 2) {
      this.state = 'slash';
      this.timer = 0;
      this.aim_direction += this.speed_gain * this.spin;
      this.speed_gain = scr_approach(this.speed_gain, 24, 1);
      this.final_counter += 1;
      if (this.final_counter === 28) {
        this.state = 'return';
        scr_var(this, 'sprite_index', 'spr_roaringknight_attack_ol');
        scr_var(this, 'image_index', 0);
        scr_var(this, 'image_speed', 0);
        for (const l of instancesOf('obj_lerpvar')) if (l.target === this) instance_destroy(l);
        scr_lerpvar(this, 'x', this.x, this.anchor_x, 12, 1, 'out');
        scr_lerpvar(this, 'y', this.y, this.anchor_y, 12, 1, 'out');
        this.alarm[3] = 22;
        this.timer = 0;
      } else {
        this.movebox_x += 20 + irandom(40);
        this.movebox_y += 30 + irandom(60);
        this.sprite_index = 'spr_roaringknight_flurry';
        this.image_speed = 1;
        if (this.movebox_x > 80) this.movebox_x -= 80;
        if (this.movebox_y > 120) this.movebox_y -= 120;
        scr_lerpvar(this, 'x', this.x, scr_get_box(0) - 20 + this.movebox_x, this.slash_base + this.slash_offset - 8, 1, 'out');
        scr_lerpvar(this, 'y', this.y, scr_get_box(1) - 20 + this.movebox_y, this.slash_base + this.slash_offset - 8, 1, 'out');
      }
    }
  }
  drawLines(ox, oy, n) {
    draw_set_alpha(1 - n / 7);
    for (let a = 0; a < this.slash_number; a++) {
      const dir = 360 / (this.slash_number * 2) * a + this.random_offset + this.aim_direction;
      const dirx = lengthdir_x(320, dir), diry = lengthdir_y(320, dir);
      const color = make_color_rgb(this.r, this.g, this.b);
      const px = lengthdir_x(n * 6, dir + 90), py = lengthdir_y(n * 6, dir + 90);
      draw_line_width_color(this.aim_x - ox + dirx + px, this.aim_y - oy + diry + py, this.aim_x - ox - dirx + px, this.aim_y - oy - diry + py, this.line_width, color, color);
      draw_line_width_color(this.aim_x - ox + dirx - px, this.aim_y - oy + diry - py, this.aim_x - ox - dirx - px, this.aim_y - oy - diry - py, this.line_width, color, color);
    }
    draw_set_alpha(1);
  }
  draw() {
    const w = scr_get_box(0) - scr_get_box(2) - 8, h = scr_get_box(3) - scr_get_box(1) - 8;
    if (!surface_exists(this.my_surface)) this.my_surface = surface_create(w, h);
    if (surface_exists(this.my_surface)) surface_resize(this.my_surface, w, h);
    surface_set_target(this.my_surface);
    draw_clear_alpha(0, 0);
    const ox = scr_get_box(2) + 5, oy = scr_get_box(1) + 5;
    if (this.state === 'aim' && on(this.timer)) {
      const k = this.slash_base + 6 + this.slash_offset;
      for (let a = 0; a < this.slash_number; a++) {
        const dir = 360 / (this.slash_number * 2) * a + this.random_offset + this.aim_direction;
        draw_sprite_ext('spr_rk_quickslash_marker_gradient', 0, this.aim_x - ox, this.aim_y - oy, this.timer * 0.2, 1 + 2 * (1 - this.timer / k), dir, make_color_rgb(this.r, this.g, this.b), 1);
      }
      for (let a = 0; a < this.slash_number; a++) {
        const dir = 360 / (this.slash_number * 2) * a + this.random_offset + this.aim_direction;
        draw_sprite_ext('spr_rk_quickslash_marker', 0, this.aim_x - ox, this.aim_y - oy, this.timer * 0.2, 1 + 2 * (1 - this.timer / k), dir, c_black, 1);
      }
      if (on(this.line2)) this.drawLines(ox, oy, this.line2);
      if (on(this.line3)) this.drawLines(ox, oy, this.line3);
    }
    for (const s of instancesOf('obj_roaringknight_slash')) {
      const hx = lengthdir_x(640, s.direction), hy = lengthdir_y(640, s.direction);
      const hxoff = lengthdir_x(s.width, s.direction + 90), hyoff = lengthdir_y(s.width, s.direction + 90);
      const color = make_color_rgb(255, (1 - s.image_alpha) * 255, (1 - s.image_alpha) * 255);
      const sx = s.x - ox, sy = s.y - oy;
      if (on(s.slashdir)) draw_triangle_color(sx - hx * s.image_alpha, sy - hy * s.image_alpha, sx + hx + hxoff, sy + hy + hyoff, sx + hx - hxoff, sy + hy - hyoff, color, color, color, false);
      else draw_triangle_color(sx + hx * s.image_alpha, sy + hy * s.image_alpha, sx - hx + hxoff, sy - hy + hyoff, sx - hx - hxoff, sy - hy - hyoff, color, color, color, false);
    }
    surface_reset_target();
    draw_surface(this.my_surface, ox, oy);
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y + Math.sin(gtime() * 0.1) * 2, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
  }
}
defineObject('obj_knight_rotating_slash', KnightRotatingSlash);

// ---------------------------------------------------------------- obj_roaringknight_slash

export class RoaringKnightSlash extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_rk_quickslash_marker';
  }
  create() {
    scr_bullet_init(this);
    this.active = true;
    this.element = 5;
    this.width = 24;
    this.grazepoints = 50;
    this.aoe = true;
    this.alarm[0] = 1;
    this.alarm[1] = 3;
    this.image_index = 2;
    this.image_speed = 0;
    this.image_yscale = 0.1;
    this.slashdir = choose(-1, 1);
    this.destroyonhit = false;
  }
  alarm0() {}
  alarm1() { this.mask_index = 'spr_nomask'; }
  user5() {
    this.damage = 206;
    if (this.aoe) {
      this.damage = 75;
      this.target = 3;
      for (const e of instancesOf('obj_knight_enemy')) e.aoedamage = true;
    }
    if (this.active) {
      if (this.target !== 3) S_damage(this);
      if (this.target === 3) S_damage_all(this);
      if (this.destroyonhit) instance_destroy(this);
    }
    for (const e of instancesOf('obj_knight_enemy')) e.aoedamage = false;
  }
  endStep() {
    this.damage = 206;
    this.grazepoints = 50;
    if (!on(this.alarm[0])) {
      this.width *= 0.66;
      this.image_alpha *= 0.66;
    }
    if (this.width < 12) this.active = false;
    if (this.width < 0.5) {
      instance_destroy(this);
      return;
    }
    if (this.width > 4) {
      for (const g of instancesOf('obj_growtangle')) {
        g.x = g.xstart + choose(-2, -1, 0, 1, 2);
        g.y = g.ystart + choose(-2, -1, 0, 1, 2);
      }
      scr_heartclamp();
    }
  }
  draw() {
    const hx = lengthdir_x(640, this.direction), hy = lengthdir_y(640, this.direction);
    const hxoff = lengthdir_x(this.width, this.direction + 90), hyoff = lengthdir_y(this.width, this.direction + 90);
    const color = make_color_rgb(255, (1 - this.image_alpha) * 255, (1 - this.image_alpha) * 255);
    const x = this.x, y = this.y;
    draw_set_alpha(this.image_alpha * 2);
    if (on(this.slashdir)) draw_triangle_color(x - hx * this.image_alpha, y - hy * this.image_alpha, x + hx + hxoff, y + hy + hyoff, x + hx - hxoff, y + hy - hyoff, color, color, color, false);
    else draw_triangle_color(x + hx * this.image_alpha, y + hy * this.image_alpha, x - hx + hxoff, y - hy + hyoff, x - hx - hxoff, y - hy - hyoff, color, color, color, false);
    draw_set_alpha(1);
  }
}
register('obj_roaringknight_slash', RoaringKnightSlash);

// scr_damage / scr_damage_all through the script table (the battle modules register them).
const S_damage = b => S.scr_damage(b);
const S_damage_all = b => S.scr_damage_all(b);

// ---------------------------------------------------------------- obj_knight_circle

export class KnightCircle extends Instance {
  create() {
    this.circle_size = 0;
    this.r = 128;
    this.g = 0;
    this.b = 0;
    this.r_goal = 0;
    this.g_goal = 0;
    this.b_goal = 0;
    this.fade_time = 28;
    this.size_goal = 960;
    this.growth = 40;
    this.my_surface = null;
    this.color_1 = 0;
    this.color_2 = c_red;
    this.draw_in_box = true;
  }
  cleanUp() {
    if (surface_exists(this.my_surface)) surface_free(this.my_surface);
  }
  step() {
    if (!i_ex('obj_knight_roaring_fx')) this.image_alpha -= 0.1;
    if (this.image_alpha < 0) {
      instance_destroy(this);
      return;
    }
    this.g = scr_approach(this.g, this.g_goal, 255 / this.fade_time);
    this.b = scr_approach(this.b, this.b_goal, 255 / this.fade_time);
    this.circle_size = scr_approach(this.circle_size, this.size_goal, this.growth);
    if (this.r === 0 && this.b === 0 && this.b === 0) instance_destroy(this);
  }
  draw() {
    if (this.draw_in_box) {
      const gt = boardRef();
      if (!surface_exists(this.my_surface)) this.my_surface = surface_create(75 * gt.image_xscale, 75 * gt.image_yscale);
      surface_set_target(this.my_surface);
      this.color_2 = make_color_rgb(this.r, this.g, this.b);
      draw_circle_color(this.x - scr_get_box(2), this.y - scr_get_box(1), this.circle_size, this.color_1, this.color_2, false);
      surface_reset_target();
      gpu_set_blendmode(1);
      draw_surface(this.my_surface, scr_get_box(2), scr_get_box(1));
      gpu_set_blendmode(0);
    } else {
      this.color_2 = make_color_rgb(this.r, this.g, this.b);
      gpu_set_blendmode(1);
      draw_set_alpha(this.image_alpha);
      draw_circle_color(this.x, this.y, this.circle_size, this.color_1, this.color_2, false);
      draw_set_alpha(1);
      gpu_set_blendmode(0);
    }
  }
}
register('obj_knight_circle', KnightCircle);

// ---------------------------------------------------------------- obj_afterimage_screen
// application_surface is the canvas as drawn so far this frame. GameMaker also writes alpha into
// application_surface, so when an echo copies the echoes drawn before it, those come out much
// fainter; on the opaque canvas they would stack into a blur. The echoes drawn in one frame and
// pass therefore all copy the screen as it was before the first of them.
const echoCapture = { key: null, surface: null };

export class AfterimageScreen extends Instance {
  create() {
    this.my_surface = null;
    this.xscale = 1;
    this.yscale = 1;
    this.alpha = 0.5;
    this.anchor_x = this.x - camerax();
    this.anchor_y = this.y - cameray();
    this.xrate = 0.01;
    this.yrate = 0.01;
    this.faderate = 0.00625;
    this.draw_end = false;
  }
  cleanUp() {
    if (surface_exists(this.my_surface)) surface_free(this.my_surface);
  }
  step() {
    this.xscale += this.xrate;
    this.yscale += this.yrate;
    this.alpha = scr_approach(this.alpha, 0, this.faderate);
    if (this.alpha === 0) instance_destroy(this);
  }
  capture() {
    const key = G.frame + (this.draw_end ? 'e' : 'd');
    if (echoCapture.key !== key) {
      echoCapture.key = key;
      if (!surface_exists(echoCapture.surface)) echoCapture.surface = surface_create(640, 480);
      const screen = G.ctx.canvas;
      const c = echoCapture.surface.ctx;
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'copy';
      c.drawImage(screen, 0, 0, screen.width, screen.height, 0, 0, 640, 480);
      c.restore();
    }
    draw_surface_ext(echoCapture.surface, this.x - this.anchor_x * this.xscale, this.y - this.anchor_y * this.yscale, this.xscale, this.yscale, 0, c_white, this.alpha);
  }
  draw() {
    if (this.draw_end) return;
    this.capture();
  }
  drawEnd() {
    if (!this.draw_end) return;
    this.capture();
    for (const h of instancesOf('obj_heart')) draw_self(h);
  }
}
register('obj_afterimage_screen', AfterimageScreen);

// ---------------------------------------------------------------- obj_knight_warp

export class KnightWarp extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_warp';
  }
  create() {
    this.master = null;
    this.master_xoffset = 0;
    this.master_yoffset = 0;
    scr_darksize(this);
    this.image_speed = 0;
    snd_play('snd_knight_teleport');
  }
  alarm0() {
    if (this.master && this.master.alive) this.master.image_alpha = 1;
    instance_destroy(this);
  }
  alarm1() { instance_destroy(this); }
  user0() {
    if (this.master && this.master.alive) this.master.image_alpha = 0;
    this.image_index = 6;
    scr_lerpvar(this, 'image_index', 5, 8, 4);
    this.alarm[0] = 4;
  }
  user1() {
    if (this.master && this.master.alive) this.master.image_alpha = 0;
    this.image_index = 8;
    scr_lerpvar(this, 'image_index', 8, 5, 4);
    this.alarm[1] = 4;
  }
  step() {
    if (this.master && this.master.alive) {
      this.x = this.master.x + this.master_xoffset;
      this.y = this.master.y + this.master_yoffset;
    }
  }
}
register('obj_knight_warp', KnightWarp);
