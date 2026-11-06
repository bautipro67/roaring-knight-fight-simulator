// "The Roaring" (obj_dbulletcontroller type 107): obj_knight_roaring2 (the box opens up, a giant
// Knight appears over a pulsing vortex that pulls the SOUL in while stars fly at it, then roars,
// stars burst out, and a final slash splits the screen in two) and obj_knight_roaring_star.
// obj_knight_roaring2's Other_10 is an older copy of its Step that nothing calls; not ported.
// The Knight's charge-up turn (myattackchoice -1) and the Roaring's hit (Other_12) are in enemy.js.
import {
  G, global, defineObject, instance_create, instance_create_depth, instance_destroy, instancesOf, irandom,
  irandom_range, random, choose, floor, min, sqr, lerp, clamp, merge_color, make_color_rgb, make_color_hsv, lengthdir_x,
  lengthdir_y, point_direction, point_distance, getSprite, sprite_get_width, sprite_get_height, sprite_create_from_surface,
  sprite_delete, draw_self, draw_sprite_ext, draw_sprite_part_ext, draw_sprite_tiled, draw_set_blend_mode,
  draw_set_alpha, draw_set_color, draw_rectangle, draw_circle_color, gpu_set_blendmode, gpu_set_blendmode_ext,
  surface_create, surface_exists, surface_free, surface_set_target, surface_reset_target, draw_clear_alpha,
  draw_surface, draw_surface_ext, snd_play, snd_stop, snd_volume, snd_pitch, c_white, c_black, bgr, S,
} from '../rt.js?v=20261106232406';
import {
  first, i_ex, enemyRef, heartRef, camerax, cameray, camerawidth, cameraheight, screenx, screeny, eq, clamp01, remap,
  scr_approach, scr_ease_out, scr_pingpong, scr_lerpvar, scr_script_delayed, scr_script_repeat, scr_var, scr_afterimage,
  scr_afterimagefast, scr_afterimage_grow, scr_bullet_init, scr_bullet_inherit, scr_darksize, scr_childbullet,
  scr_fire_bullet, scr_precise_hit, scr_draw_beam_color, scr_draw_outline_ext, scr_marker, snd_play_pitch,
} from '../common.js?v=20261106232406';
import { BulletParent, RegularBullet } from '../bullets.js?v=20261106232406';
import './rotating.js?v=20261106232406'; // obj_roaringknight_slash, obj_knight_circle, obj_afterimage_screen

const gtime = () => global.time ?? G.frame;
const GRAY_DARK = bgr(4210752); // 0x404040
const bboxLeft = n => getSprite(n)?.bbox?.[0] ?? 0;
const bboxTop = n => getSprite(n)?.bbox?.[1] ?? 0;

// Multiplies a canvas by a colour (draw_surface_part_ext with a tint, done once per frame).
let tintCanvas = null;
function tintedCopy(src, color) {
  if (!tintCanvas) tintCanvas = document.createElement('canvas');
  const c = tintCanvas;
  if (c.width !== src.width || c.height !== src.height) { c.width = src.width; c.height = src.height; }
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'copy';
  x.globalAlpha = 1;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = '#' + (color & 0xffffff).toString(16).padStart(6, '0');
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-over';
  return c;
}

class KnightRoaring2 extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_attack_ol';
  }
  create() {
    scr_darksize(this);
    scr_bullet_init(this);
    this.image_speed = 0;
    this.jumpimages = false;
    this.my_surface = null;
    this.ball_surface = null;
    this.star_surface = null;
    this.terrible_surface = null;
    this.darkness = 0;
    this.ball_darkness = 0;
    this.timer = 0;
    this.fake_x = camerawidth() * 0.5;
    this.fake_y = 24;
    this.fake_alpha = 0;
    this.rand_angle = irandom(360);
    this.rand_dist = 320;
    this.star_flicker = 2;
    this.intensity = 1.5;
    this.intensify = 1.5;
    this.attack_timer = 0;
    this.attack_timer_goal = -2;
    this.attack_token = 1;
    this.roaring_timer = 0;
    this.line_timer = -1;
    this.r = 128;
    this.g = 128;
    this.b = 128;
    this.knight_sprite = 'spr_roaringknight_front';
    this.knight_sprite_image = 0;
    this.knight_sprite_speed = 0.5;
    this.bobble_count = 0;
    this.bobble_freq = 1;
    this.bobble_amp = 4;
    this.ball_counter = 0;
    this.ball_speed = 2;
    this.player_suck = 0.5;
    this.hsv = 128;
    this.hsv_switch = false;
    this.sound = null;
    this.soundPitch = 0.1;
    this.bullet_list = [];
    this.do_fake_screen = false;
    this.fakey_screen = null;
    this.fakey_screen_2 = null;
    this.stop = false;
    for (const h of instancesOf('obj_heart')) h.boundaryup = 160;
    this.y -= 320;
    for (const e of instancesOf('obj_knight_enemy')) {
      e.chargeupcon = 2;
      e.chargeuptimer = 0;
    }
    scr_script_delayed(this, scr_lerpvar, 20, 'darkness', 0, 1, 32);
    this.starcount_p1 = 0;
    this.starcount_p2 = 0;
    this.starvar = 0;
  }
  cleanUp() {
    for (const s of [this.my_surface, this.ball_surface, this.star_surface, this.terrible_surface]) if (surface_exists(s)) surface_free(s);
    this.bullet_list = [];
    sprite_delete(this.fakey_screen);
    sprite_delete(this.fakey_screen_2);
    // The halves' markers would keep falling with a deleted (blank) sprite: removed instead.
    for (const m of this.markers || []) instance_destroy(m);
    for (const e of instancesOf('obj_knight_enemy')) {
      e.image_alpha = 1;
      e.siner2 = 0;
      e.chargeupcon = 0;
    }
    snd_stop('snd_knight_stretch');
    snd_stop('snd_knight_roar');
    snd_stop('snd_stardrop');
    snd_stop('snd_knight_cut');
    for (const g of instancesOf('obj_growtangle')) instance_destroy(g);
  }
  get cx() { return camerax() + this.fake_x; }
  get cy() { return cameray() + this.fake_y + 55; }
  // with (scr_fire_bullet(..., obj_knight_roaring_star, ...)) { the usual incoming-star setup }
  incomingStar(x, y, spd, spinspeed = 1) {
    const s = scr_fire_bullet(this, x, y, 'obj_knight_roaring_star', 0, 0, 'spr_knight_bullet_star');
    s.wall_destroy = false;
    s.destroyonhit = false;
    s.bottomfade = false;
    s.spinspeed = spinspeed;
    s.visible = false;
    s.image_index = 0;
    s.image_speed = 0;
    s.image_xscale = 2;
    s.image_yscale = 2;
    s.direction = point_direction(s.x, s.y, this.cx, this.cy);
    s.speed = spd;
    s.friction = -0.1;
    return s;
  }
  outgoingStar(dir, spd, scale) {
    const s = scr_fire_bullet(this, this.cx, this.cy, 'obj_knight_roaring_star', dir, spd, 'spr_knight_bullet_star');
    s.visible = false;
    s.wall_destroy = false;
    s.bottomfade = false;
    s.destroyonhit = false;
    s.image_xscale = 0.1;
    s.image_yscale = 0.1;
    scr_lerpvar(s, 'image_xscale', 0.1, scale, 32);
    scr_lerpvar(s, 'image_yscale', 0.1, scale, 32);
    return s;
  }
  step() {
    for (const h of instancesOf('obj_heart')) {
      if (h.x < camerax()) h.x = camerax();
      if (h.x > camerax() + camerawidth() - 20) h.x = camerax() + camerawidth() - 20;
      if (h.y < cameray()) h.y = cameray();
      if (h.y > cameray() + cameraheight()) h.y = cameray() + cameraheight() - 20;
    }
    if (this.jumpimages) scr_afterimagefast(this);
    this.timer += 1;
    if (this.line_timer > -1) this.line_timer += 1;
    this.bobble_count += this.bobble_freq;
    if (this.timer === 30) {
      for (const g of instancesOf('obj_growtangle')) {
        // 2560 / sprite_width (bytecode: no * image_xscale): about 17x, a 1280x960 box.
        scr_lerpvar(g, 'image_xscale', g.image_xscale, 2560 / g.sprite_width, 160, 1, 'out');
        scr_lerpvar(g, 'image_yscale', g.image_yscale, 1920 / g.sprite_height, 160, 1, 'out');
      }
    }
    if (this.timer === 80) {
      scr_lerpvar(this, 'fake_alpha', 0, 1, 48, 1, 'out');
      scr_lerpvar(this, 'fake_y', 24, 88, 48, 2, 'out');
    }
    if (this.timer >= 120 && this.intensity < 3.75 && this.timer % 3 === 0) {
      const a = scr_afterimage_grow(this);
      a.sprite_index = 'spr_roaringknight_front_filled';
      a.image_alpha = 0.01;
      a.image_xscale = 2.2 + min(this.timer - 116, 18) * 0.15;
      a.image_yscale = 2.2 + min(this.timer - 116, 18) * 0.15;
      a.visible = false;
      a.xrate = 0;
      a.yrate = 0;
      a.fade = 0;
      scr_lerpvar(a, 'image_xscale', a.image_xscale, a.image_xscale * 1.2, 2, 1, 'out');
      scr_lerpvar(a, 'image_yscale', a.image_yscale, a.image_yscale * 1.2, 2, 1, 'out');
      scr_script_delayed(a, scr_lerpvar, 2, 'image_xscale', a.image_xscale * 1.2, 2, 14, 1, 'out');
      scr_script_delayed(a, scr_lerpvar, 2, 'image_yscale', a.image_yscale * 1.2, 2, 14, 1, 'out');
      scr_lerpvar(a, 'image_alpha', 0.01, 0.35, 16, 1, 'in');
      a.destroytime = 24;
    }
    for (const a of instancesOf('obj_afterimage_grow')) {
      a.x = camerax() + this.fake_x;
      a.y = cameray() + this.fake_y + Math.sin(this.bobble_count * 0.1) * this.bobble_amp - 10 + 55;
    }
    if (this.timer === 118) scr_script_delayed(this, scr_lerpvar, 16, 'ball_darkness', 0, 1, 32, 1, 'out');
    if (this.timer === 132) {
      this.sound = snd_play_pitch('snd_knight_stretch', 0.1);
      this.soundPitch = 0.1;
    }
    if (this.timer > 132 && this.sound) {
      this.soundPitch += 0.000535;
      snd_pitch(this.sound, this.soundPitch);
    }
    this.star_angle1 = 0;
    this.star_angle2 = 0;
    this.star_angle3 = 0;
    if (this.timer > 128) this.stepBuildUp();
    if (eq(this.intensity, 4)) this.stepRoar();
    if (this.roaring_timer < 1) {
      for (const s of instancesOf('obj_knight_roaring_star')) {
        if (this.roaring_timer < 180) {
          const d = point_distance(s.x, s.y, this.cx, this.cy);
          s.image_xscale = Math.max(0.2, 0.0058823529411764705 * d);
          s.image_yscale = Math.max(0.2, 0.0058823529411764705 * d);
          s.direction = point_direction(s.x, s.y, this.cx, this.cy);
          s.x += lengthdir_x(s.speed * 0.625 * (1 / this.intensity), s.direction + 90 * s.spinspeed);
          s.y += lengthdir_y(s.speed * 0.625 * (1 / this.intensity), s.direction + 90 * s.spinspeed);
        }
        if (point_distance(s.x, s.y, this.cx, this.cy) < 12) instance_destroy(s);
      }
    }
  }
  stepBuildUp() {
    this.intensity = scr_approach(this.intensity, 4, 0.008);
    if (this.roaring_timer < 1 && this.intensity < 4) {
      this.ball_speed = this.intensity * 3;
      if (this.intensity < 3.75) this.player_suck = scr_approach(this.player_suck, 1, 0.1625);
    }
    this.player_suck = scr_approach(this.player_suck, 0, 0.15);
    const h = first('obj_heart');
    if (h) {
      const tempdir = point_direction(h.x + 10, h.y + 10, this.cx, cameray() + this.fake_y + 55);
      h.x += lengthdir_x(this.player_suck, tempdir);
      h.y += lengthdir_y(this.player_suck, tempdir);
    }
    this.attack_timer += 1;
    if (this.timer % 3 === 0 && this.intensity < 3.9) {
      const a = instance_create(this.cx + irandom_range(-30, 30), this.cy + irandom_range(-30, 30), 'obj_afterimage_screen');
      a.faderate = 0.1 / this.intensity;
      a.draw_end = true;
      a.xrate = -0.01;
      a.yrate = -0.01;
    }
    if (eq(this.intensity, 3.66)) {
      scr_script_delayed(this, scr_lerpvar, 16, 'ball_darkness', 1, 0, 32, 1, 'out');
      const c = instance_create_depth(this.cx, this.cy, this.depth, 'obj_knight_circle');
      c.r = 0;
      c.g = 0;
      c.b = 0;
      c.r_goal = 255;
      c.g_goal = 255;
      c.b_goal = 255;
      c.fade_time = 48;
      c.circle_size = 480;
      c.size_goal = 0;
      c.growth = 10;
      // (the GML's scr_lerpvar(r_goal, ...) calls name a number, so they change nothing)
      scr_script_delayed(c, instance_destroy, 48);
      c.draw_in_box = false;
      c.visible = false;
    }
    if (eq(this.intensity, 3.74) && this.knight_sprite === 'spr_roaringknight_front') {
      this.knight_sprite = 'spr_roaringknight_front_flourish';
      this.knight_sprite_image = 0;
      this.knight_sprite_speed = 0;
      scr_script_delayed(this, scr_lerpvar, 8, 'knight_sprite_image', 0, 4, 16);
      scr_script_delayed(this, scr_lerpvar, 8, 'fake_alpha', 1, 0, 32);
    }
    if (this.timer >= 136 && this.intensity < 3.75) {
      const randangle = irandom(360);
      const randdistance = 480 + irandom(80);
      const p = instance_create(this.cx + lengthdir_x(randdistance, randangle), this.cy + lengthdir_y(randdistance, randangle), 'obj_particle_generic');
      p.not_outbound = false;
      p.sprite_index = 'spr_pixel_white_front';
      p.direction = point_direction(p.x, p.y, this.cx, this.cy);
      p.image_angle = p.direction;
      p.image_xscale = 16;
      p.image_yscale = 0.5;
      scr_lerpvar(p, 'image_xscale', 320, 2, 16);
      scr_lerpvar(p, 'image_yscale', 2, 0.1, 16);
      scr_lerpvar(p, 'image_alpha', 1, 0.5, 16);
      scr_lerpvar(p, 'x', p.x, this.cx, 8, 1, 'out');
      scr_lerpvar(p, 'y', p.y, this.cy, 8, 1, 'out');
      p.timer = 18;
    }
    if (this.attack_timer === 4) {
      this.rand_dist = 600;
      this.starcount_p1 += 1;
      const _spinspeed = choose(-1, 1);
      const sx = camerax() + this.fake_x, sy = cameray() + this.fake_y;
      if (this.starcount_p1 === 1 && this.intensity < 3.7) {
        if (this.intensity >= 2.7) {
          this.rand_angle += 9;
          this.star_angle1 = this.rand_angle;
          for (let o = 0; o < 360; o += 180) {
            this.incomingStar(sx + lengthdir_x(this.rand_dist, this.star_angle1 + o), sy + lengthdir_y(this.rand_dist, this.star_angle1 + o), 16);
          }
        } else {
          this.rand_angle += 32;
          for (let i = 0; i < 6; i++) {
            this.rand_angle += 60;
            this.incomingStar(sx + lengthdir_x(this.rand_dist, this.rand_angle), sy + lengthdir_y(this.rand_dist, this.rand_angle), 8 + this.intensity);
          }
        }
      }
      if (this.starcount_p1 === 3 || this.intensity >= 2.7) this.starcount_p1 = 0;
      this.star_angle1 = -1;
      this.star_angle2 = -1;
      this.star_angle3 = -1;
      // (the GML then fires extra stars only when star_angle1..3 != -1, which never happens)
      void _spinspeed;
      if (this.intensity >= 3 && this.intensity < 4) {
        for (const s of instancesOf('obj_knight_roaring_star')) {
          s.x = clamp(s.x, camerax() - 60, camerax() + camerawidth() + 60);
          if (s.y < cameray() - 60) s.y = cameray() - 60;
          if (s.y > cameray() + cameraheight() + 60) s.y = cameray() + cameraheight() + 60;
        }
      }
      this.attack_timer = floor(-1 + this.intensity);
    }
  }
  stepRoar() {
    this.roaring_timer += 1;
    const rt = this.roaring_timer;
    if (rt < 169) {
      if (rt === 9) {
        scr_lerpvar(this, 'knight_sprite_image', 4, 6, 4);
        this.fake_alpha = 1;
        this.player_suck = min(this.player_suck, -6);
        this.ball_speed = -32;
        this.ball_darkness = 1;
        scr_lerpvar(this, 'bobble_freq', 1, 3, 8);
        snd_play('snd_knight_roar');
        scr_script_repeat(this, (t, x, y) => instance_create(x, y, 'obj_afterimage_screen'), 8, 2, this.cx, this.cy);
        const c = instance_create_depth(this.cx, this.cy, this.depth, 'obj_knight_circle');
        c.r = 255;
        c.g = 255;
        c.b = 255;
        c.draw_in_box = false;
        c.visible = false;
        for (let a = 0; a < 8; a++) this.outgoingStar(a * 45, 8.5 + random(2), 1.2);
      }
      if (rt === 15) {
        this.sprite_index = 'spr_roaringknight_front_roar';
        this.image_speed = 0.5;
        this.knight_sprite = 'spr_roaringknight_front_roar';
        this.knight_sprite_image = 0;
        this.knight_sprite_speed = 0.5;
      }
      if (rt >= 9) this.player_suck = min(this.player_suck, -3);
      if (rt % 3 === 0) {
        const a = instance_create(this.cx + irandom_range(-30, 30), this.cy + irandom_range(-30, 30), 'obj_afterimage_screen');
        a.xrate = 0.015;
        a.yrate = 0.015;
        a.faderate = 0.025;
        a.draw_end = true;
      }
      if (rt > 15 && rt % 5 === 0) {
        const starsound = snd_play_pitch('snd_stardrop', 0.5);
        if (starsound) snd_volume(starsound, 0.5, 0);
        this.rand_angle += 60 + irandom(10);
        this.starcount_p2 += 1;
        this.star_angle1 = this.rand_angle;
        this.star_angle2 = this.rand_angle + 20;
        this.star_angle3 = this.rand_angle - 20;
        this.outgoingStar(this.star_angle1, 6.5 + random(2), 1.6);
        this.outgoingStar(this.star_angle2, 8.5 + random(2), 1.6);
        this.outgoingStar(this.star_angle3, 8.5 + random(2), 1.6);
      }
    }
    if (rt === 181) {
      this.colorize = 6;
      scr_lerpvar(this, 'player_suck', this.player_suck, 0, 24);
      scr_lerpvar(this, 'ball_speed', this.ball_speed, 1, 24);
      scr_lerpvar(this, 'bobble_freq', 3, 1, 16);
      this.sprite_index = 'spr_roaringknight_front_flourish';
      this.image_index = 0;
      this.image_speed = 0;
      this.knight_sprite = 'spr_roaringknight_front_flourish';
      this.knight_sprite_speed = 0;
      scr_lerpvar(this, 'knight_sprite_image', 5.99, 0, 12);
      for (const s of instancesOf('obj_knight_roaring_star')) {
        s.friction = 0.5;
        this.bullet_list.push(s);
      }
    }
    if (rt >= 182 && this.bullet_list.length) {
      const bul = this.bullet_list.shift();
      if (bul && bul.alive) bul.con = 1;
    }
    if (rt === 275) {
      this.sprite_index = 'spr_roaringknight_front_slash';
      this.knight_sprite = 'spr_roaringknight_front_slash';
      scr_lerpvar(this, 'knight_sprite_image', 0, 2, 8);
      scr_lerpvar(this, 'image_index', 0, 2, 8);
      scr_lerpvar(this, 'bobble_amp', 4, 0, 24);
      this.line_timer = 0;
      scr_lerpvar(this, 'r', 128, 255, 16);
      scr_lerpvar(this, 'g', 128, 0, 16);
      scr_lerpvar(this, 'b', 128, 0, 16);
    }
    if (rt === 299) {
      this.x = camerax() + this.fake_x;
      this.y = cameray() + this.fake_y + 20;
      for (const g of instancesOf('obj_growtangle')) {
        g.image_xscale = 0;
        g.image_yscale = 0;
      }
      scr_lerpvar(this, 'knight_sprite_image', 2, 5, 6);
      scr_lerpvar(this, 'image_index', 2, 5, 6);
      this.do_fake_screen = true;
      snd_play('snd_knight_cut');
      const s = instance_create(camerax() + camerawidth() * 0.5 - lengthdir_x(-160, 117), cameray() + cameraheight() * 0.5 - lengthdir_y(-160, 117), 'obj_roaringknight_slash');
      s.direction = 117;
      s.image_xscale = 4;
      s.image_angle = s.direction;
      s.width *= 4;
      s.slashdir = -1;
      scr_bullet_inherit(this, s);
      if (s.user0) s.user0();
      this.jumpimages = true;
      scr_lerpvar(this, 'y', this.y, this.y + 40, 16, 1, 'out');
      scr_script_delayed(this, scr_lerpvar, 16, 'y', this.y + 40, this.y - 320, 24, 1, 'in');
    }
    if (rt === 363) {
      this.jumpimages = false;
      const e = enemyRef();
      this.x = (this.creatorid && this.creatorid.alive ? this.creatorid : e).x;
      e.siner2 = 0;
      e.y = e.ystart + Math.cos(e.siner2 / 8) * 8;
      this.y = e.y;
      this.sprite_index = 'spr_knight_warp';
      this.image_index = 5;
      this.image_speed = 0;
      scr_lerpvar(this, 'image_index', 5, 8, 8);
    }
    if (rt === 375) {
      for (const e of instancesOf('obj_knight_enemy')) e.image_alpha = 1;
      for (const g of instancesOf('obj_growtangle')) {
        g.growcon = 3;
        g.timer = 0;
      }
      global.turntimer = -1;
    }
  }
  drawKnightRows(ox, oy) {
    const ks = this.knight_sprite, bl = bboxLeft(ks), bt = bboxTop(ks), hgt = sprite_get_height(ks), t = gtime();
    const by = oy + this.fake_y + Math.sin(this.bobble_count * 0.1) * this.bobble_amp - 10 - bt * 2;
    if (this.intensify > 1.5) {
      for (let a = 0; a < hgt; a++) {
        const w = Math.sin((a + t * 4) * 0.15) * (this.intensify - 1.5) * 8;
        draw_sprite_part_ext(ks, this.knight_sprite_image, bl, a, 70, 1, ox + this.fake_x - 70 + (a % 2 === 0 ? w : -w), by + a * 2, 2, 2, this.image_blend, this.fake_alpha * 0.75);
      }
    }
    for (let a = 0; a < hgt; a++) {
      draw_sprite_part_ext(ks, this.knight_sprite_image, bl, a, 70, 1, ox + this.fake_x - 70 + Math.sin((a + t * 4) * 0.2) * this.intensify * 0.3, by + a * 2, 2, 2, this.image_blend, this.fake_alpha);
    }
  }
  drawStars(skip) {
    for (const s of instancesOf('obj_knight_roaring_star')) {
      if (skip(s)) continue;
      if (s.con === 0) s.user0();
      else s.user1();
    }
  }
  draw() {
    const W = camerawidth(), H = cameraheight(), t = gtime();
    for (const k of ['my_surface', 'ball_surface', 'star_surface', 'terrible_surface']) if (!surface_exists(this[k])) this[k] = surface_create(W, H);
    draw_self(this);
    if (this.stop) return;
    // the vortex
    surface_set_target(this.ball_surface);
    draw_clear_alpha(0, 0);
    draw_sprite_tiled('spr_knight_bullet_flow', 0, this.fake_x + t * 2, this.fake_y);
    gpu_set_blendmode(1);
    for (let i = 0; i < 4; i++) draw_sprite_tiled('spr_knight_bullet_flow', 0, this.fake_x + t * 2, this.fake_y);
    gpu_set_blendmode(0);
    this.ball_counter += this.ball_speed;
    if (this.ball_counter < 0) this.ball_counter += 1800;
    if (this.ball_counter > 1800) this.ball_counter -= 1800;
    gpu_set_blendmode_ext(1, 3);
    for (let a = 0; a < 6; a++) draw_circle_color(this.fake_x, this.fake_y + 57, 1800 - (this.ball_counter + 300 * a) % 1800, c_white, bgr(5855577), false);
    draw_circle_color(this.fake_x, this.fake_y + 57, 640, c_white, c_black, false);
    gpu_set_blendmode(0);
    surface_reset_target();
    // stars, particles and afterimages (screen space)
    surface_set_target(this.star_surface);
    draw_clear_alpha(0, 0);
    for (const p of instancesOf('obj_particle_generic')) draw_sprite_ext(p.sprite_index, p.image_index, screenx(p.x), screeny(p.y), p.image_xscale, p.image_yscale, p.image_angle, p.image_blend, p.image_alpha);
    this.drawStars(s => s.image_blend === c_white);
    this.drawStars(s => s.image_blend === GRAY_DARK);
    // gpu_set_colorwriteenable(true, true, true, false): only the colour of what is there changes
    draw_set_blend_mode('source-atop');
    draw_sprite_ext('spr_knight_line_grate', 0, 0, this.star_flicker, 2, 2, 0, c_black, 1);
    draw_set_blend_mode(0);
    this.star_flicker = 2 - this.star_flicker;
    this.drawStars(s => (s.image_blend === GRAY_DARK || s.image_xscale > 1) && s.con < 1);
    for (const c of instancesOf('obj_knight_pointing_starchild')) {
      draw_set_blend_mode(1);
      const glow = scr_pingpong(c.timer, 2) / 4;
      scr_draw_outline_ext(c.sprite_index, c.image_index, screenx(c.x), screeny(c.y), c.image_xscale, c.image_yscale, c.image_angle, c_white, glow * c.image_alpha, c.image_xscale);
      draw_sprite_ext(c.sprite_index, c.image_index, screenx(c.x), screeny(c.y), c.image_xscale, c.image_yscale, c.image_angle, c_white, c.image_alpha);
      draw_set_blend_mode(0);
      c.image_alpha = clamp01(remap(45, 60, 1, 0, c.timer));
      if (c.image_alpha < 1) c.active = false;
      if (c.image_alpha === 0) instance_destroy(c);
    }
    for (const a of instancesOf('obj_afterimage')) {
      if (a.object_index !== 'obj_afterimage') continue;
      draw_sprite_ext(a.sprite_index, a.image_index, screenx(a.x), screeny(a.y), a.image_xscale, a.image_yscale, a.image_angle, c_white, a.image_alpha);
    }
    surface_reset_target();
    // the darkness, the vortex (wavy, hue-cycling), the stars and the giant Knight
    surface_set_target(this.my_surface);
    draw_clear_alpha(0, 0);
    draw_set_color(c_black);
    draw_rectangle(0, 0, W, H, false);
    draw_set_color(c_white);
    if (!this.hsv_switch) this.hsv += 1;
    else this.hsv -= 1;
    if (this.hsv >= 288) this.hsv_switch = true;
    if (this.hsv <= 128) this.hsv_switch = false;
    if (this.ball_darkness > 0) {
      const color = make_color_hsv(this.hsv % 255, 255, 255);
      const src = tintedCopy(this.ball_surface.canvas, color);
      const ctx = this.my_surface.ctx, bh = this.ball_surface.h, bw = this.ball_surface.w;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.ball_darkness);
      for (let a = 0; a < bh; a++) {
        const off = Math.sin((a + t) * 0.1) * 4 * this.intensity + Math.sin((a + t) * 0.35) * 0.5 * this.intensity;
        ctx.drawImage(src, 0, a, bw, 1, off, a, bw, 1);
      }
      ctx.restore();
    }
    gpu_set_blendmode(1);
    draw_surface(this.star_surface, 0, 0);
    gpu_set_blendmode(0);
    for (const a of instancesOf('obj_afterimage_grow')) draw_sprite_ext(a.sprite_index, a.image_index, screenx(a.x), screeny(a.y), a.image_xscale, a.image_yscale, a.image_angle, c_white, a.image_alpha);
    if (this.line_timer > -1) {
      const dir = -63, color = make_color_rgb(this.r, this.g, this.b);
      const lx = W * 0.5 - lengthdir_x(280, -63), ly = H * 0.5 - lengthdir_y(280, -63);
      const ys = 4 + 8 * (1 - min(this.line_timer, 16) / 16);
      draw_set_blend_mode('source-atop');
      draw_sprite_ext('spr_rk_quickslash_marker_gradient', 0, lx, ly, this.line_timer, ys, dir, color, 1);
      draw_sprite_ext('spr_rk_quickslash_marker', 0, lx, ly, this.line_timer, ys, dir, c_black, 1);
      draw_set_blend_mode(0);
    }
    this.knight_sprite_image += this.knight_sprite_speed;
    if (this.intensity < 3.75) this.intensify = this.intensity;
    else this.intensify = scr_approach(this.intensify, 0, 0.1);
    if (!this.do_fake_screen) this.drawKnightRows(0, 0);
    surface_reset_target();
    draw_surface_ext(this.my_surface, camerax(), cameray(), 1, 1, 0, c_white, this.darkness);
    for (const h of instancesOf('obj_heart')) draw_self(h);
    if (this.do_fake_screen) this.drawFakeScreen(W, H);
  }
  // The final slash: the screen is cut along a diagonal and both halves slide apart.
  drawFakeScreen(W, H) {
    const midway = W * 0.5;
    for (const c of instancesOf('obj_knight_pointing_starchild')) instance_destroy(c);
    this.drawKnightRows(camerax(), cameray());
    const ts = this.terrible_surface, ctx = ts.ctx;
    const paint = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.globalAlpha = Math.max(0, Math.min(1, this.darkness));
      ctx.drawImage(this.my_surface.canvas, 0, 0);
      ctx.restore();
      surface_set_target(ts);
      for (const h of instancesOf('obj_heart')) draw_sprite_ext(h.sprite_index, h.image_index, screenx(h.x), screeny(h.y), h.image_xscale, h.image_yscale, h.image_angle, h.image_blend, h.image_alpha);
      surface_reset_target();
    };
    // gpu_set_blendenable(false) + alpha 0: these shapes are cut out of the surface.
    const erase = pts => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    paint();
    erase([[midway + 120, -1], [W + 1, -1], [W + 1, H + 1], [midway + 120, H + 1]]);
    erase([[midway - 120, -1], [midway + 120, H], [midway + 120, -1]]);
    this.fakey_screen = sprite_create_from_surface(ts, 0, 0, W, H, false, false, W * 0.25, H * 0.5);
    paint();
    erase([[-1, 0], [midway - 119, 0], [midway - 119, H + 1], [-1, H + 1]]);
    erase([[midway - 120, 0], [midway - 120, H], [midway + 120, H]]);
    this.fakey_screen_2 = sprite_create_from_surface(ts, 0, 0, W, H, false, false, W * 0.75, H * 0.5);
    this.stop = true;
    for (const h of instancesOf('obj_heart')) instance_destroy(h);
    let m = scr_marker(camerax() + W * 0.25, cameray() + H * 0.5, this.fakey_screen);
    m.direction = 180;
    scr_lerpvar(m, 'speed', 15, 0.5, 12, 1, 'out');
    scr_script_delayed(m, scr_var, 12, 'gravity', 1);
    m.gravity_direction = 180;
    this.markers = [m];
    m = scr_marker(camerax() + W * 0.75, cameray() + H * 0.5, this.fakey_screen_2);
    m.direction = 0;
    scr_lerpvar(m, 'speed', 14, 0.5, 12, 1, 'out');
    scr_script_delayed(m, scr_var, 12, 'gravity', 1);
    m.gravity_direction = 0;
    this.markers.push(m);
  }
}
defineObject('obj_knight_roaring2', KnightRoaring2);

// ---------------------------------------------------------------- obj_knight_roaring_star
// Invisible: obj_knight_roaring2 draws it (user0 / user1) into its star surface.

class KnightRoaringStar extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_bullet_star';
  }
  create() {
    scr_bullet_init(this);
    this.image_xscale = 0;
    this.image_yscale = 0;
    this.even = false;
    this.destroyonhit = false;
    this.timer = 0;
    this.con = 0;
    this.growstart = 0;
    this.playSound = true;
    this.beamflicker = 0;
    this.split = 0;
    this.outbound = false;
    this.splitmax = 14;
    this.splitease = 0;
    this.finalx = 0;
    this.damage = 206;
    this.element = 5;
    this.spinspeed = 0;
  }
  scales() {
    const sw = sprite_get_width(this.sprite_index), sh = sprite_get_height(this.sprite_index);
    return [(this.sprite_width + 16) / sw, (this.sprite_height + 16) / sh];
  }
  user0() {
    const [xs, ys] = this.scales();
    if (this.split < 2) draw_sprite_ext(this.sprite_index, 0, screenx(this.x), screeny(this.y), xs, ys, this.image_angle, this.image_blend, this.image_alpha);
    else {
      draw_sprite_ext('spr_knight_bullet_star_top', 0, screenx(this.x) + this.splitease / 2, screeny(this.y) + this.splitease, xs, ys, this.image_angle, this.image_blend, this.image_alpha);
      draw_sprite_ext('spr_knight_bullet_star_bottom', 0, screenx(this.x) - this.splitease / 2, screeny(this.y) - this.splitease, xs, ys, this.image_angle, this.image_blend, this.image_alpha);
    }
  }
  user1() {
    const [xs, ys] = this.scales();
    const alpha = (Math.sin(this.timer * 3) + 1) * 0.25;
    const topx = screenx(this.x) + this.splitease / 2, topy = screeny(this.y) + this.splitease;
    const botx = screenx(this.x) - this.splitease / 2, boty = screeny(this.y) - this.splitease;
    const con = this.con;
    if (con === 2 || con === 2.5 || con === 3) {
      let a = 1, len = 120;
      if (con === 2) {
        a = clamp01(this.timer / 30 - alpha);
        len = 50 * clamp01(this.timer / 30 - this.timer % 2 * 0.75) + 50;
      }
      draw_set_blend_mode(1);
      scr_draw_beam_color(topx, topy, len, 10, 90, c_white, c_black, a, false);
      scr_draw_beam_color(botx, boty, len, 10, 156, c_white, c_black, a, false);
      scr_draw_beam_color(topx, topy, len, 10, 24, c_white, c_black, a, false);
      scr_draw_beam_color(botx, boty, len, 10, 270, c_white, c_black, a, false);
      scr_draw_beam_color(topx, topy, len, 10, 336, c_white, c_black, a, false);
      scr_draw_beam_color(botx, boty, len, 10, 204, c_white, c_black, a, false);
      draw_set_blend_mode(0);
    }
    if (con === 1 || con === 2 || con === 2.5) {
      const color = merge_color(0x808080, bgr(255), clamp01(this.timer / 30));
      draw_sprite_ext(this.sprite_index, 1, topx, topy, xs + 0.1, ys + 0.1, 0, c_white, alpha);
      draw_sprite_ext(this.sprite_index, 0, topx, topy, xs, ys, 0, color, 1);
      if (this.split >= 2) {
        draw_sprite_ext('spr_knight_bullet_star_bottom', 1, botx, boty, xs + 0.1, ys + 0.1, 0, c_white, alpha);
        draw_sprite_ext('spr_knight_bullet_star_bottom', 0, botx, boty, xs, ys, 0, color, 1);
      }
    }
    if (con === 3 || con === 4) {
      const fl = (Math.sin(this.timer * 6) + 1) * 0.25;
      draw_sprite_ext(this.sprite_index, 2, topx, topy, xs + 0.1, ys + 0.1, 0, c_white, fl);
      draw_sprite_ext(this.sprite_index, 2, topx, topy, xs, ys, 0, c_white, 1);
      if (this.split >= 2) {
        draw_sprite_ext('spr_knight_bullet_star_bottom', 2, botx, boty, xs + 0.1, ys + 0.1, 0, c_white, fl);
        draw_sprite_ext('spr_knight_bullet_star_bottom', 2, botx, boty, xs, ys, 0, c_white, 1);
      }
    }
  }
  user5() {
    if (this.active !== 1 && this.active !== true) return;
    const h = heartRef();
    const hitbox = h.sprite_index === 'spr_dodgeheart_smaller_2px' ? 0 : 2;
    if (!scr_precise_hit(this, hitbox)) return;
    if (i_ex('obj_knight_roaring2')) {
      for (const e of instancesOf('obj_knight_enemy')) e.user2();
    } else {
      if (this.target !== 3) S.scr_damage(this);
      if (this.target === 3) S.scr_damage_all(this);
    }
    if (this.destroyonhit === 1 || this.destroyonhit === true) instance_destroy(this);
  }
  step() {
    if (this.x < camerax() - this.sprite_width || this.x > camerax() + camerawidth() + this.sprite_width || this.y < cameray() - this.sprite_height || this.y > cameray() + 480 + this.sprite_height) {
      if (this.outbound) {
        instance_destroy(this);
        return;
      }
    } else this.outbound = true;
    if (this.con === 1) {
      this.friction = 0.5;
      this.con += 1;
    } else if (this.con === 2) {
      if (this.speed === 0 && this.gravity === 0) {
        this.gravity = 0.1;
        this.gravity_direction = this.direction - 180;
        this.friction = 0;
        if (this.split) {
          const ft = 54 - this.timer;
          const len = 0.5 * this.gravity * sqr(ft);
          const sfx = screenx(this.x) + lengthdir_x(len, this.gravity_direction);
          const sfy = screeny(this.y) + lengthdir_y(len, this.gravity_direction);
          this.finalx = sfx - sfy / 2;
        }
      }
      this.timer += 1;
      if (this.timer >= 40 && !this.split) {
        this.timer = 0;
        this.con += 1;
        if (this.playSound) snd_play('snd_explosion_firework');
      }
      this.growstart = this.image_xscale;
    } else if (this.con === 2.5) {
      if (this.split === 1) {
        this.speed = 0;
        this.gravity = 0;
        this.sprite_index = 'spr_knight_bullet_star_top';
        this.timer = -10;
        this.split = 2;
      }
      this.timer += 1;
      this.splitease = scr_ease_out(clamp01(this.timer / 20), 4) * this.splitmax * this.image_xscale;
      if (this.timer === 20) {
        this.con = 3;
        this.timer = 0;
      }
    } else if (this.con === 3) {
      this.timer += 1;
      this.image_xscale = this.growstart + clamp01(this.timer / 2);
      this.image_yscale = this.growstart + clamp01(this.timer / 2);
      if (this.timer === 3) {
        let angle = 90;
        for (let i = 0; i < 6; i++) {
          const d = scr_childbullet(this, this.x, this.y, 'obj_knight_pointing_starchild');
          d.image_angle = angle;
          d.direction = angle;
          d.speed = 1;
          d.friction = -0.1;
          d.image_xscale = this.image_xscale * 0.5;
          d.image_yscale = this.image_yscale * 0.5;
          d.deceleration = 0.15;
          angle += i === 1 || i === 4 ? 57 : 66;
        }
      }
      if (this.timer >= 4) {
        const [xs, ys] = this.scales();
        this.image_xscale = xs;
        this.image_yscale = ys;
        const ai = scr_afterimage(this);
        ai.fadeSpeed *= 3;
        instance_destroy(this);
      }
    }
  }
}
defineObject('obj_knight_roaring_star', KnightRoaringStar);
