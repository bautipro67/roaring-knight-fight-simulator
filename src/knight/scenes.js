// The Roaring Knight's scenes around the fight (obj_ch3_PTB02 in room_dw_snow_zone, Chapter 3):
// - before: from Tenna's last line ("Now you can all finally") to the battle: the Knight cuts Tenna
//   down, takes Toriel, faces the party, roars and draws its sword (con 2-5);
// - GO BACK after a game over (tempflag[90] = 4): the party back in place, the Roaring (skipped
//   from the third try on) and the sword;
// - after a won fight (con 8 / 50): "We... we actually beat it?", then the Knight cuts the party down;
// - GO FORWARD after a game over (tempflag[90] = 1), and the end of the won fight (con 10-12): the
//   Knight takes Toriel and flies off with Undyne.
// Tenna (obj_actor_tenna, a 2000-line puppet) is drawn as the plain sprite he shows when the scene
// starts. The room's look comes from obj_dw_snow_zone_parallax, ported below.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_create_depth, instance_destroy,
  instance_exists, instancesOf, getSprite, choose, irandom, irandom_range, random, random_range, clamp, lerp,
  point_direction, point_distance, lengthdir_x, lengthdir_y, sprite_get_number, draw_self, draw_sprite_ext,
  draw_sprite_part_ext, draw_sprite_tiled, draw_set_color, draw_set_alpha, draw_rectangle, draw_ellipse, draw_triangle,
  draw_circle_color, draw_line_width_color, draw_set_blend_mode, gpu_set_blendmode, make_color_hsv, surface_create,
  surface_exists, surface_free, surface_set_target, surface_reset_target, draw_clear_alpha, draw_surface_ext,
  snd_play, snd_stop, snd_loop, snd_pitch, snd_volume, audio_stop_all, snd_init, mus_loop_ext, mus_volume, mus_stop,
  font_add_sprite_ext,
} from './rt.js?v=20261114041601';
import {
  first, i_ex, camerax, cameray, scr_movetowards, scr_lerpvar, scr_lerpvar_instance, scr_lerp_var_instance, scr_script_delayed,
  scr_script_repeat, scr_var, scr_doom, scr_dark_marker, scr_marker, scr_shakeobj, scr_afterimage, scr_afterimage_grow,
  scr_darksize, snd_play_x, draw_sprite_fog,
} from './common.js?v=20261114041601';
import {
  c, c_waitcustom_end, scr_cutscene_make, scr_actor_setup, scr_depth, d_ex, moveToPoint, scr_flip, setFacingSprites,
} from '../screens/cutscene.js?v=20261114041601';
import { startBattle } from '../battle/setup.js?v=20261114041601';
import { gotoRoom, fadeOut } from '../screens/common.js?v=20261114041601';
import { loadMusic } from '../runtime/assets.js?v=20261114041601';

const BS = String.fromCharCode(92);
const ROOM_W = 2960; // room_dw_snow_zone
const sceneMusic = () => (global.currentsong ??= [null, null]);
// scr_var as a delayed script: scr_delay_var(name, value, delay)
const delayVar = (inst, name, value, delay) => scr_script_delayed(inst, scr_var, delay, name, value);
// snd_play_delay(sound, delay, volume, pitch)
const sndPlayDelay = (owner, snd, delay, vol, pitch) => scr_script_delayed(owner, () => snd_play_x(snd, vol, pitch), delay);
const playSound = (self, snd) => snd_play(snd); // c_script_instance(id, snd_play, rate, sound)

// ---------------------------------------------------------------- the room (obj_dw_snow_zone_parallax)

// scr_draw_sprite_tiled_area, as written (the part's left/top are in scaled pixels, as in the game);
// draw_sprite_part clips the part to the frame.
function drawTiledArea(spr, sub, xx, yy, x1, y1, x2, y2, xscale, yscale) {
  const s = getSprite(spr);
  if (!s) return;
  const sw = s.w * xscale, sh = s.h * yscale;
  let i = x1 - (x1 % sw - xx % sw) - sw * (x1 % sw < xx % sw ? 1 : 0);
  let j = y1 - (y1 % sh - yy % sh) - sh * (y1 % sh < yy % sh ? 1 : 0);
  const jj = j;
  while (i <= x2) {
    while (j <= y2) {
      const left = i <= x1 ? x1 - i : 0;
      const top = j <= y1 ? y1 - j : 0;
      let width = x2 <= i + sw ? sw - (i + sw - x2) + 1 - left : sw - left;
      let height = y2 <= j + sh ? sh - (j + sh - y2) + 1 - top : sh - top;
      width = Math.min(width, s.w - left);
      height = Math.min(height, s.h - top);
      if (width > 0 && height > 0) draw_sprite_part_ext(spr, sub, left, top, width, height, i + left, j + top, xscale, yscale, 0xffffff, 1);
      j += sh;
    }
    j = jj;
    i += sw;
  }
}

// The snow zone's background. Its Create also makes the door and black covers at the room's left
// end (x < 1000), which the camera never shows in these scenes.
class SnowParallax extends Instance {
  create() {
    this.depth = 1000100;
    this.y_offset = -10;
    this.bg_height = (getSprite('spr_dw_snow_zone_bg_parallax_layer_1')?.h ?? 0) * 2;
    this.fountain_speed = 0.2;
  }
  // cx, cy: the camera (the battle draws the room with the scene's camera; see BattleRoom).
  drawRoom(cx = G.camX, cy = G.camY) {
    const yo = this.y_offset, bh = this.bg_height;
    const xo = cx >= 1320 ? 1320 : cx;
    drawTiledArea('spr_dw_snow_zone_bg_parallax_layer_1', 0, xo, yo + 20, xo * 0.9, yo + 20, xo * 0.9 + ROOM_W + 200, yo + 20 + bh, 2, 2);
    if (cx >= 860) {
      this.fountain_speed += 0.1;
      if (cx >= 2100) draw_sprite_ext('spr_dw_fountain_tall', this.fountain_speed, 2200, -120, 2, 2, 0, 0xffffff, 1);
      else draw_sprite_ext('spr_dw_fountain_tall', this.fountain_speed, xo * 0.95 + 300 - 1, -120, 2, 2, 0, 0xffffff, 1);
    }
    drawTiledArea('spr_dw_snow_zone_bg_parallax_layer_2_test', 0, xo * 0.9 - 40, yo + 20, xo * 0.9, yo + 20, xo * 0.9 + ROOM_W + 200, yo + 20 + bh, 2, 2);
    drawTiledArea('spr_dw_snow_zone_bg_parallax_layer_3_test', 0, xo * 0.6, yo, xo * 0.6, yo, xo * 0.6 + ROOM_W + 200, yo + bh, 2, 2);
    drawTiledArea('spr_dw_snow_zone_bg_parallax_layer_4_test', 0, 40, yo, 0, yo, ROOM_W, yo + bh, 2, 2);
    draw_sprite_ext('spr_dw_snow_zone_bg_fountain_hills', 0, 570, yo - 40, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_dw_snow_zone_bg_fountain_hills', 0, 800, yo - 110, 2, 2, 0, 0xffffff, 1);
    drawTiledArea('spr_dw_snow_zone_bg_parallax_layer_5_test', 0, 0, yo - 180, 0, yo - 180, ROOM_W, yo - 180 + bh, 2, 2);
    draw_sprite_ext('spr_dw_snow_zone_end', 0, 1998, yo - 66, 2, 2, 0, 0xffffff, 1);
    draw_set_color(0);
    draw_rectangle(2600, cy, ROOM_W * 2, cy + 480, false);
    draw_set_color(0xffffff);
    draw_sprite_ext('spr_cc_fountainbg', this.fountain_speed, 2370, 0, 2, 2, 0, 0xffffff, 1);
    // (two bm_subtract gradients at x 120..1000 darken the room's entrance; never on screen here)
  }
  draw() { this.drawRoom(); }
}
defineObject('obj_dw_snow_zone_parallax', SnowParallax);

// During the battle the room stays behind it (obj_battleback is removed): the battle's camera is
// at 0, the room's was at (vx, vy), so the room is drawn shifted by that. The scene's black
// overlay keeps pulsing over it (blackall, depth 1000000).
class BattleRoom extends Instance {
  create() {
    this.depth = 1000100;
    this.vx = 0;
    this.vy = 0;
    this.par = instance_create(0, 0, 'obj_dw_snow_zone_parallax');
    this.par.visible = false;
    this.overlay_pulse = false;
    this.overlay_alpha = 0;
    this.overlay_siner = 0;
  }
  draw() {
    const ctx = G.ctx;
    ctx.save();
    ctx.translate(-this.vx, -this.vy);
    this.par.drawRoom(G.camX + this.vx, G.camY + this.vy);
    if (this.overlay_pulse) {
      this.overlay_siner += 0.08;
      const a = clamp(this.overlay_alpha + Math.sin(this.overlay_siner) * 0.08, 0, 0.4);
      draw_sprite_ext('spr_pixel_white', 0, -10, -10, 999, 999, 0, 0, a);
    }
    ctx.restore();
  }
}
defineObject('obj_sim_ptb02_battleroom', BattleRoom);

// ---------------------------------------------------------------- small objects

// The simulator's way into the scene: black, clearing over 20 frames.
class SceneFadeIn extends Instance {
  create() { this.depth = -1000; this.image_alpha = 1; }
  draw() {
    this.image_alpha -= 0.05;
    if (this.image_alpha <= 0) { instance_destroy(this); return; }
    draw_sprite_ext('spr_pixel_white', 0, G.camX - 20, G.camY - 20, 170, 130, 0, 0, this.image_alpha);
  }
}
defineObject('obj_sim_ptb02_fadein', SceneFadeIn);

// scr_shakeobj_ext (obj_shakeobj_ext)
class ShakeObjExt extends Instance {
  create() {
    Object.assign(this, { active: 0, target: null, shakexamt: 10, shakeyamt: 10, shakereduct: 2, shakespeed: 1, nowx: 0, nowy: 0, on: 1, timer: 0 });
  }
  user0() {
    if (this.target && this.target.alive) { this.active = 1; this.nowx = this.target.x; this.nowy = this.target.y; }
    else instance_destroy(this);
  }
  step() {
    if (this.active === 0) { instance_destroy(this); return; }
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    this.timer += 1;
    if (this.timer >= this.shakespeed) {
      this.shakexamt = Math.max(0, this.shakexamt - this.shakereduct);
      this.shakeyamt = Math.max(0, this.shakeyamt - this.shakereduct);
      this.on *= -1;
      t.x = this.nowx + this.shakexamt * this.on;
      t.y = this.nowy + this.shakeyamt * this.on;
      if (this.shakexamt <= 0 && this.shakeyamt <= 0) instance_destroy(this);
      this.timer = 0;
    }
  }
}
defineObject('obj_shakeobj_ext', ShakeObjExt);
function scr_shakeobj_ext(target, xamt, yamt, reduct, speed) {
  const s = instance_create(target.x, target.y, 'obj_shakeobj_ext');
  s.target = target;
  if (xamt !== -1) s.shakexamt = xamt;
  if (yamt !== -1) s.shakeyamt = yamt;
  if (reduct !== -1) s.shakereduct = reduct;
  if (speed !== -1) s.shakespeed = speed;
  s.user0();
  return s;
}

// obj_ch3_PTB02_toriel: Toriel asleep on her throne, out of the gacha ball.
class TorielGacha extends Instance {
  create() {
    this.sprite_index = 'spr_toriel_sleep_throne';
    Object.assign(this, {
      image_xscale: 2, image_yscale: 2, ball_open: false, ballbot_pos_x: 0, ballbot_pos_y: 0, ballcover_pos_x: 0,
      ballcover_pos_y: 0, balltop_pos_x: 0, balltop_pos_y: 0, ball_alpha: 1, ball_top_alpha: 0.5, shadow_alpha: 0,
      shadow_y_offset: 40, shadow_x_offset: 44, shake_offset_x: 0, shake_offset_y: 0,
    });
    scr_depth(this);
  }
  step() {
    if (this.ball_open) {
      this.ball_open = false;
      // (scr_lerp_var_instance drops the "in": the game eases these out)
      const l = (v, d) => scr_lerp_var_instance(this, v, this[v], this[v] + d, 12, 2, 'in');
      l('ballbot_pos_x', 80); l('ballbot_pos_y', 80); l('ballcover_pos_x', 80); l('ballcover_pos_y', 80);
      l('balltop_pos_x', -80); l('balltop_pos_y', -80);
      scr_lerp_var_instance(this, 'ball_top_alpha', this.ball_top_alpha, 0, 12, 2, 'in');
      scr_lerp_var_instance(this, 'ball_alpha', 1, 0, 12, 2, 'in');
    }
  }
  draw() {
    const { x, y } = this;
    draw_set_color(0);
    draw_set_alpha(this.shadow_alpha);
    draw_ellipse(x - this.shadow_x_offset, y + this.shadow_y_offset, x + this.shadow_x_offset, y + this.shadow_y_offset + 20, false);
    draw_set_color(0xffffff);
    draw_set_alpha(1);
    draw_sprite_ext('spr_dw_tv_gachaball_transparent', 2, x + this.ballbot_pos_x, y + this.ballbot_pos_y, 2, 2, 0, 0xffffff, this.ball_alpha);
    draw_sprite_ext(this.sprite_index, 0, x - 50 + this.shake_offset_x, y - 54 + this.shake_offset_y, 2, 2, 0, 0xffffff, 1);
    // (the game draws the top half at y + balltop_pos_x)
    draw_sprite_ext('spr_dw_tv_gachaball_transparent', 1, x + this.balltop_pos_x, y + this.balltop_pos_x, 2, 2, 0, 0xffffff, this.ball_top_alpha);
    draw_sprite_ext('spr_dw_tv_gachaball_transparent', 3, x + this.ballcover_pos_x, y + this.ballcover_pos_y, 2, 2, 0, 0xffffff, this.ball_alpha);
  }
}
defineObject('obj_ch3_PTB02_toriel', TorielGacha);

// Tenna as he stands for his last line (obj_actor_tenna, preset 0: spr_tenna_hooray_armsup frame 3,
// with the squash c_tenna_sprite gives).
class TennaStill extends Instance {
  create() {
    this.sprite_index = 'spr_tenna_hooray_armsup';
    this.image_index = 3;
    this.image_speed = 0;
    this.image_xscale = 1.5;
    this.image_yscale = 2.5;
    scr_lerpvar(this, 'image_xscale', 1.5, 2, 16, -2, 'out');
    scr_lerpvar(this, 'image_yscale', 2.5, 2, 16, -2, 'out');
  }
  step() { scr_depth(this); }
}
defineObject('obj_sim_tenna_still', TennaStill);

// obj_tennadeath_event: Tenna's TV body after the cut: static, sparks, the arms falling away, the
// 5500-ish damage, then the test pattern and the body dropping out of sight.
class TennaDeath extends Instance {
  create() {
    this.sprite_index = 'spr_tennadeath_body';
    this.con = 0;
    this.timer = 0;
    scr_darksize(this);
    scr_depth(this);
    this.fg_arm = scr_dark_marker(this.x, this.y, 'spr_tennadeath_arm_fg');
    this.fg_arm.depth = this.depth - 5;
    scr_doom(this.fg_arm, 150);
    this.bg_arm = scr_dark_marker(this.x, this.y, 'spr_tennadeath_arm_bg');
    this.bg_arm.depth = this.depth + 5;
    scr_doom(this.bg_arm, 150);
    this.armsparks = 0;
    this.testbars = 0;
  }
  draw() {
    const n = sprite_get_number('spr_tennadeath_static');
    draw_sprite_ext('spr_tennadeath_static', irandom(n), this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    if (this.testbars) draw_sprite_ext('spr_tennadeath_testbars', 0, this.x, this.y, 1, 1, this.image_angle, this.image_blend, this.image_alpha);
    draw_self(this);
    if (this.armsparks) {
      const k = sprite_get_number('spr_tennadeath_armsparks');
      draw_sprite_ext('spr_tennadeath_armsparks', irandom(k), this.x, this.y, this.image_xscale + random(0.3), this.image_yscale - random(0.1), this.image_angle, this.image_blend, this.image_alpha - 0.4);
      draw_sprite_ext('spr_tennadeath_armsparks', irandom(k), this.x, this.y + 20, this.image_xscale + random(0.3), this.image_yscale - 0.4, this.image_angle, this.image_blend, this.image_alpha - 0.4);
      if (this.bg_arm.alive) this.bg_arm.image_angle -= 0.5;
      if (this.fg_arm.alive) this.fg_arm.image_angle += 0.5;
    }
    if (this.con === 0) { this.con = 1; this.timer = 0; }
    if (this.con === 1) {
      this.timer += 1;
      const t = this.timer;
      if (t === 1) {
        snd_play('snd_impact');
        snd_play_x('snd_closet_impact', 1, 1);
        snd_play_x('snd_closet_impact', 1, 0.5);
        snd_play_x('snd_bageldefeat', 0.8, 0.8);
        snd_play('snd_damage');
        snd_play_x('snd_glassbreak', 0.8, 0.4);
        snd_play_x('snd_glassbreak', 0.6, 0.3);
        const dmg = instance_create(this.x + 100, this.y + 180, 'obj_dmgwriter');
        dmg.damage = 5500 + Math.floor(random(500));
        dmg.type = 0;
        dmg.lightb = 0xff0000; // c_red
        dmg.depth = this.depth - 20;
        scr_shakeobj_ext(this, 20, 40, 2, 2);
        Object.assign(this.fg_arm, { gravity: 0.75, hspeed: -3, friction: 0.05, vspeed: -6 });
        Object.assign(this.bg_arm, { gravity: 0.5, hspeed: -5, friction: 0.05, vspeed: -5 });
      }
      if (t === 2) this.armsparks = 1;
      if (t === 50) {
        const b1 = snd_play_x('snd_tenna_beep_loop', 1, 1.2), b2 = snd_play_x('snd_tenna_beep_loop', 1, 1.11), b3 = snd_play_x('snd_tenna_beep_loop', 1, 1.08);
        snd_volume(b1, 0.7, 0); snd_volume(b1, 0, 60);
        snd_volume(b2, 0.7, 0); snd_volume(b2, 0, 75);
        snd_volume(b3, 0, 80);
        this.testbars = true;
        this.vspeed = 0.5;
      }
      if (t === 110) this.gravity = 1;
      if (t >= 50) {
        this.x += 1;
        this.image_angle -= 0.2;
      }
    }
  }
}
defineObject('obj_tennadeath_event', TennaDeath);

// obj_knight_crush: the dark circle that closes in on the Knight as it roars.
class KnightCrush extends Instance {
  create() {
    this.my_surface = null;
    this.radius = 960;
    this.alpha = 0;
    this.hsv = 256;
    scr_lerpvar(this, 'radius', 960, 160, 24);
    scr_lerpvar(this, 'alpha', 0, 0.1, 24);
    scr_lerpvar(this, 'hsv', 256, 64, 64, 1, 'out');
    this.alarm[0] = 24;
  }
  alarm0() {
    scr_lerpvar(this, 'radius', 160, 0, 64, 1, 'out');
    scr_lerpvar(this, 'alpha', 0.1, 1, 64, 1, 'out');
  }
  cleanUp() { if (surface_exists(this.my_surface)) surface_free(this.my_surface); }
  draw() {
    if (!surface_exists(this.my_surface)) this.my_surface = surface_create(640, 480);
    surface_set_target(this.my_surface);
    draw_clear_alpha(0, 0);
    draw_circle_color(this.x - G.camX, this.y - G.camY, this.radius, 0, 0, false);
    // gpu_set_colorwriteenable(true, true, true, false): only where the circle is
    draw_set_blend_mode('source-atop');
    draw_sprite_tiled('spr_knight_bullet_flow', 0, (global.time ?? G.frame) * 8, 0);
    draw_set_blend_mode(0);
    surface_reset_target();
    const color = make_color_hsv(this.hsv, 255, 255);
    gpu_set_blendmode(1);
    for (let i = 0; i < 4; i++) draw_surface_ext(this.my_surface, G.camX, G.camY, 1, 1, 0, color, this.alpha);
    draw_set_alpha(this.alpha);
    draw_circle_color(this.x, this.y, this.radius, 0xffffff, 0xffffff, false);
    draw_set_alpha(1);
    gpu_set_blendmode(0);
  }
}
defineObject('obj_knight_crush', KnightCrush);

// obj_knight_roaring_fx: the Roaring outside a battle (no bullets): the Knight turns to light,
// roars, and the rings and afterimages burst out for 190 frames.
class KnightRoaringFx extends Instance {
  create() {
    scr_darksize(this);
    Object.assign(this, {
      image_speed: 0, timer: 0, spin: choose(1, -1), attack_speed: 0, counter: 0, state: 'intro', whiteout: false,
      whiteout_counter: 0, shudder: 0, bar: 0, density: 12, roarendtimer: 0, roarendtimermax: 190,
    });
    this.sprite_index = 'spr_roaringknight_shift_ol';
    this.image_index = 1;
  }
  center() { return [this.x + this.sprite_width * 0.42, this.y + this.sprite_height * 0.5]; }
  step() {
    if (this.shudder) this.shudder -= 1;
    const [px, py] = this.center();
    if (this.whiteout) {
      this.whiteout_counter = Math.min(1, this.whiteout_counter + 1 / 48);
      if (this.state !== 'roaring') {
        const n = 2 + irandom(2);
        for (let k = 0; k < n; k++) {
          const randdir = irandom(360), dist = 40 + irandom(240), randsize = 0.25 + random(0.75);
          const p = instance_create(px + lengthdir_x(dist, randdir), py + lengthdir_y(dist, randdir), 'obj_particle_generic');
          p.image_xscale = randsize;
          p.image_yscale = randsize;
          p.direction = point_direction(p.x, p.y, px, py);
          p.image_angle = p.direction;
          scr_lerpvar(p, 'speed', 4, 16 + irandom(8), 32, 1, 'in');
          scr_lerpvar(p, 'image_xscale', p.image_xscale, p.image_xscale * 16, 32, 1, 'in');
          scr_lerpvar(p, 'image_yscale', p.image_yscale, p.image_xscale * 0.5, 32, 1, 'in');
        }
      }
      for (const p of instancesOf('obj_particle_generic')) if (point_distance(p.x, p.y, px, py) <= 32) instance_destroy(p);
    }
    if (this.state === 'intro') {
      this.timer += 1;
      if (this.timer === 16) instance_create(px, py, 'obj_knight_crush');
      if (this.timer === 24) {
        this.whiteout = true;
        snd_play_x('snd_knight_stretch', 1, 0.75);
      }
      if (this.timer === 8 || this.timer === 32) this.shudder = 999;
      if (this.timer === 64) { this.state = 'roaring'; this.timer = -20; }
    }
    if (this.state === 'roaring') {
      this.timer += 1;
      if (this.timer === 16 && !this.attack_speed) this.bar = 24;
      if (this.timer % 3 === 0 && this.attack_speed) {
        scr_afterimage_grow(this);
        const a = instance_create(px + irandom_range(-30, 30), py + irandom_range(-30, 30), 'obj_afterimage_screen');
        a.faderate = 0.05;
        a.draw_end = true;
      }
      if (this.timer === 24 - this.attack_speed) {
        if (this.attack_speed === 0) {
          this.sprite_index = 'spr_roaringknight_pose_ol';
          this.image_index = 0;
          this.image_speed = 0.5;
          snd_play('snd_knight_roar');
          this.whiteout = false;
          for (const p of instancesOf('obj_particle_generic')) instance_destroy(p);
          scr_script_repeat(this, () => instance_create(px, py, 'obj_afterimage_screen'), 8, 2);
          const ci = instance_create_depth(px, py, this.depth, 'obj_knight_circle');
          Object.assign(ci, { r: 255, g: 255, b: 255, draw_in_box: false });
        } else snd_play_x('snd_knight_puff', 1, 0.15);
      }
      if (this.timer === 28 - this.attack_speed) {
        this.spin *= -1;
        this.counter += 1;
        this.attack_speed = Math.min(14, this.attack_speed + 1);
        if (this.counter % 3 === 0) this.density = Math.max(6, this.density - 1);
        if (this.counter < 30) this.timer = 0;
      }
      this.roarendtimer += 1;
      if (this.roarendtimer >= this.roarendtimermax) instance_destroy(this);
    }
  }
  draw() {
    const [px, py] = this.center();
    if (this.bar) {
      draw_line_width_color(px, py - this.bar * 40, px, py + this.bar * 40, this.bar, 0xffffff, 0xffffff);
      this.bar *= 0.65;
      if (this.bar < 0.5) this.bar = 0;
    }
    if (this.sprite_index === 'spr_roaringknight_shift_ol') {
      const xo = this.shudder ? irandom_range(-1, 1) : 0, yo = this.shudder ? irandom_range(-1, 1) : 0;
      draw_sprite_ext(this.sprite_index, this.image_index, this.x - 20 + xo, this.y + 20 + yo, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
      if (this.whiteout) draw_sprite_fog(this.sprite_index, this.image_index, this.x - 20 + xo, this.y + 20 + yo, this.image_xscale, this.image_yscale, this.image_angle, 0xffffff, this.whiteout_counter);
    } else {
      draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y + Math.sin((global.time ?? G.frame) * 0.2) * 2, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    }
  }
}
defineObject('obj_knight_roaring_fx', KnightRoaringFx);

// ---------------------------------------------------------------- the Knight (obj_ch3_PTB02_roaringknight)

class SceneKnight extends Instance {
  create() {
    Object.assign(this, {
      image_speed: 0, siner2: 0, aetimer: 0, stopsiner2: false, state: 0, image_xscale: 2, image_yscale: 2,
      after_image_dir: 1, reach_speed: 1, reach_retract: false, reach_anim_pause: false,
      reach_sprite: 'spr_roaringknight_reach_overworld', reach_interrupt: false, susie_grab: false, susie_grab_timer: 0,
      susie_grab_x: 0, susie_grab_y: 0, susie_shake_timer: 0, susie_shake_time: 2, shake_offset: 0, undyne_catch: false,
      undyne_anim: 0, undyne_hat: false, undyne_hat_release: false, move_speed: 4, after_image_rate: 2, eye_shine: false,
      eye_shine_anim: 0, draw_sword: false, draw_timer: 0, sword_active: false, sword_appear: true, sword_flash: true,
      y_base_pos: this.y + 152, sword_alpha: 0, alpha_siner: 0, current_alpha: 0, grab_hand: false, hover_pause: false,
      after_active: true, static_timer: 0, static_fx_looping: false, shakeamt: 0, shaketimer: 0, shaketime: 1, shakex: 0,
      shakey: 0, sword_draw_index: 0, sword_draw_timer: 0, sword_draw_timestamps: [2, 2, 2, 2, 2, 4, 2, 2], battle_ready: false,
    });
  }
  afterimage(spr, sub, x = this.x, y = this.y) {
    const a = instance_create_depth(x, y, this.depth + 1, 'obj_afterimage');
    Object.assign(a, {
      sprite_index: spr, image_alpha: 0.6, fadeSpeed: 0.02, hspeed: this.after_image_rate * this.after_image_dir,
      image_index: sub, image_speed: 0, image_xscale: this.image_xscale, image_yscale: this.image_yscale,
    });
    return a;
  }
  step() {
    if (!this.reach_interrupt && !this.stopsiner2) this.siner2 += 1;
    if (!this.hover_pause) this.y = this.ystart + Math.cos(this.siner2 / 8) * 8;
    const ignore = this.state === 2 || this.state === 3;
    this.aetimer += 1;
    if (this.aetimer % this.move_speed === 0 && this.image_alpha !== 0 && !ignore) {
      if (this.state === 0) {
        if (this.draw_sword) {
          this.draw_timer += 1;
          const t = this.draw_timer;
          if (t === 1) {
            this.sword_active = true;
            this.sprite_index = 'spr_roaringknight_sword_appear';
            this.image_index = 0;
            this.image_speed = 0.3;
          }
          if (t === 3) {
            this.image_speed = 0;
            this.sword_appear = true;
            scr_lerpvar(this, 'sword_alpha', 0, 1, 15, 4, 'out');
            scr_lerpvar(this, 'y_base_pos', this.y_base_pos, this.y_base_pos - 266, 15, -1, 'out');
          }
          if (t === 8) { this.sword_flash = false; this.sword_appear = false; }
          if (t === 12) {
            this.sprite_index = 'spr_roaringknight_sword_appear_new';
            this.image_index = 0;
            this.sword_draw_timer = this.sword_draw_timestamps[this.sword_draw_index];
            this.grab_hand = true;
          }
          if (this.grab_hand && !this.battle_ready) {
            this.sword_draw_timer -= 1;
            if (this.sword_draw_timer <= 0) {
              this.sword_draw_index += 1;
              if (this.sword_draw_index >= this.sword_draw_timestamps.length) this.battle_ready = true;
              else {
                this.sword_draw_timer = this.sword_draw_timestamps[this.sword_draw_index];
                this.image_index = this.sword_draw_index;
              }
            }
          }
        }
        if (this.after_active) this.afterimage(this.sprite_index, this.image_index);
      }
      if (this.state === 1 && this.after_active) this.afterimage(this.reach_sprite, 3);
      if (this.state === 4) {
        const b = first('obj_ch3_PTB02_roaringknight_pull_test');
        if (b) {
          this.afterimage('spr_roaringknight_arm_reach_grow', b.handframe, b.hand_x_pos, b.hand_y_pos);
          this.afterimage(b.base_sprite, b.image_index, b.x, b.y);
        }
      }
      if (this.shakeamt > 0) {
        this.shaketimer -= 1;
        if (this.shaketimer <= 0) {
          this.shakex = random_range(-this.shakeamt, this.shakeamt);
          this.shakey = random_range(-this.shakeamt, this.shakeamt);
          this.shaketimer = this.shaketime;
        }
      } else {
        this.shakex = 0;
        this.shakey = 0;
      }
    }
    if (this.state === 2) {
      this.static_timer += 1;
      const t = this.static_timer;
      if (t === 1) {
        snd_stop('snd_tv_static');
        snd_play('snd_tv_static');
        this.sprite_index = 'spr_roaring_knight_overworld_warp';
        this.image_speed = 0;
        this.image_index = 5;
        this.shakeamt = 4;
        delayVar(this, 'static_timer', 0, 12);
        delayVar(this, 'state', 0, 12);
      }
      if (t === 2) this.image_index = 6;
      snd_pitch('snd_tv_static', 0.5 + random(1));
      if (t === 3) this.image_index = 7;
      if (t === 4) this.image_index = 8;
      if (t >= 5) this.image_index = choose(6, 7, 8);
      if (t === 10) { this.image_index = 6; snd_stop('snd_tv_static'); }
      if (t === 11) this.image_index = 5;
      if (t >= 12) this.image_index = 0;
      const a = scr_afterimage(this);
      a.depth = this.depth + 1;
      a.image_alpha = 0.5;
      a.direction = random(360);
      a.speed = 1;
    }
    if (this.state === 3) {
      this.static_timer += 1;
      if (this.static_timer === 1) {
        this.sprite_index = 'spr_roaring_knight_overworld_warp';
        this.image_speed = 0;
        this.static_fx_looping = true;
        snd_stop('snd_tv_static');
        snd_loop('snd_tv_static');
      } else if (this.static_timer % 2 === 0) {
        this.image_index = 5 + Math.floor(random(3) + 2.8);
        this.shakex = choose(-2, -1, 0, 1, 2);
        this.shakey = choose(-2, -1, 0, 1, 2);
        let a = scr_afterimage(this);
        Object.assign(a, { depth: this.depth - 1, image_alpha: 0.3, direction: random(360), speed: 1 });
        a = scr_afterimage(this);
        Object.assign(a, { depth: this.depth + 1, image_alpha: 0.5, direction: random(360), speed: 1 });
        if (Math.floor(random(10)) === 0) snd_pitch('snd_tv_static', 0.5 + random(1));
      }
    } else if (this.static_fx_looping) {
      this.static_fx_looping = false;
      snd_stop('snd_tv_static');
    }
    if (this.undyne_hat) {
      this.undyne_hat = false;
      this.undyne_hat_release = true;
      const hat = scr_dark_marker(this.x + 48, this.y + 20, 'spr_undyne_dw_hat');
      hat.depth = this.depth - 100;
      hat.hspeed = -8;
      hat.gravity = 1;
      scr_doom(hat, 60);
    }
    if (this.susie_grab) {
      this.susie_grab_timer += 1;
      if (this.susie_grab_timer === 1) {
        this.reach_interrupt = true;
        this.reach_anim_pause = true;
        const su = first('obj_ch3_PTB02')?.su_actor;
        if (su) { this.susie_grab_x = su.x; this.susie_grab_y = su.y; }
      }
    }
  }
  drawSword() {
    const x = this.x, y = this.y;
    if (!this.sword_appear) {
      draw_sprite_ext('spr_roaringknight_sword', 0, x, y + this.y_base_pos, 2, 2, 0, 0xffffff, 1);
      return;
    }
    this.alpha_siner += 1.5;
    this.current_alpha = this.sword_flash ? this.sword_alpha + Math.sin(this.alpha_siner) : 1;
    // The game writes the sword mask into the screen's alpha (at current_alpha), clears the alpha
    // in a column under the Knight's hand, then draws the sword through that alpha: the sword
    // flickers in, and nothing of it shows below the hand.
    const ctx = G.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4000, y - 4000, 8000, 8000);
    ctx.rect(x + 34, y + 58, 42, 4000);
    ctx.clip('evenodd');
    draw_sprite_ext('spr_roaringknight_sword', 0, x, y + this.y_base_pos, 2, 2, 0, 0xffffff, clamp(this.current_alpha, 0, 1));
    ctx.restore();
  }
  draw() {
    const x = this.x, y = this.y;
    if (this.state === 0) {
      draw_sprite_ext(this.sprite_index, this.image_index, x + this.shakex, y + this.shakey, this.image_xscale, 2, 0, 0xffffff, 1);
      if (this.eye_shine) draw_sprite_ext('spr_shine_white', this.eye_shine_anim, x + 100 + 38 - 4, y + 16 + 8 + 4 + 2, 2, 2, 0, 0xffffff, 1);
      if (this.undyne_catch) {
        this.undyne_anim += 0.3;
        draw_sprite_ext('spr_undyne_dw_caught', this.undyne_anim, x + 28, y + 26, 2, 2, 0, 0xffffff, 1);
        if (!this.undyne_hat_release) draw_sprite_ext('spr_undyne_dw_hat', 0, x + 56, y + 30, 2, 2, 0, 0xffffff, 1);
      }
      if (this.sword_active) this.drawSword();
      if (this.grab_hand) draw_sprite_ext('spr_roaringknight_sword_grab_hand_new', this.image_index, x, y, 2, 2, 0, 0xffffff, 1);
    }
    if (this.state === 1) {
      draw_sprite_ext(this.reach_sprite, 3, x, y, 2, 2, 0, 0xffffff, 1);
      if (this.susie_grab) {
        draw_sprite_ext('spr_susie_dw_fell_grab_no_hand', 0, this.susie_grab_x, this.susie_grab_y, 2, 2, 0, 0xffffff, 1);
        this.susie_shake_timer -= 1;
        if (this.susie_shake_timer <= 0) {
          this.susie_shake_timer = this.susie_shake_time;
          this.shake_offset = choose(0, 2);
        }
        draw_sprite_ext('spr_susie_dw_fell_grab_hand', 0, this.susie_grab_x + this.shake_offset, this.susie_grab_y, 2, 2, 0, 0xffffff, 1);
      }
    }
    if (this.state === 6) {
      draw_sprite_ext('spr_roaringknight_look_down_full', 0, x, y, 2, 2, 0, 0xffffff, 1);
      if (this.susie_grab) draw_sprite_ext('spr_susie_dw_fell_grab', 0, this.susie_grab_x, this.susie_grab_y, 2, 2, 0, 0xffffff, 1);
    }
    if (this.state >= 2) draw_sprite_ext(this.sprite_index, this.image_index, x + this.shakex, y + this.shakey, 2, 2, 0, 0xffffff, 1);
  }
}
defineObject('obj_ch3_PTB02_roaringknight', SceneKnight);

// obj_ch3_PTB02_roaringknight_pull_test: the Knight's arm reaching out, and the purple beam that
// pulls Toriel in.
class KnightBeam extends Instance {
  create() {
    Object.assign(this, {
      timer: 0, con: 0, triheight: 0, handframe: 0, image_xscale: 2, image_yscale: 2, image_speed: 0, hand_x_pos: 0,
      hand_y_pos: 0, base_sprite: 'spr_roaringknight_reach_base', susie_active: false, susie_display: false,
      susie_grab_x: 0, susie_grab_y: 0, susie_grab_sfx: false,
    });
  }
  draw() {
    let handx = 42;
    const handy = 40;
    if (this.con === 0) { this.handframe = 0; this.triheight = 0; this.con = 1; }
    if (this.con === 1) {
      this.con = 2;
      delayVar(this, 'con', 3, 12);
      scr_lerpvar(this, 'handframe', 0, 3, 16, 2, 'in');
    }
    if (this.con === 3) {
      snd_play_x('snd_spearappear', 1, 0.8);
      snd_play_x('snd_spearappear', 1, 0.5);
      snd_play_x('snd_spearappear', 1, 0.6);
      scr_lerpvar(this, 'triheight', 0, 100, 80, -2, 'out');
      this.con = 4;
    }
    if (this.con >= 4 && this.con < 7) {
      handx += random(2);
      this.x = this.xstart + random(1);
      snd_play_x('snd_spearappear', 0.2, 0.5 + random(0.3));
      this.triheight += Math.sin(this.timer / 2) * 2;
    }
    if (this.con === 7) {
      scr_lerpvar(this, 'triheight', this.triheight, 0, 20, 3, 'in');
      scr_lerpvar(this, 'handframe', 3, 0, 16, 0, 'in');
      if (this.susie_active) {
        this.susie_display = true;
        const su = first('obj_ch3_PTB02')?.su_actor;
        if (su) { this.susie_grab_x = su.x; this.susie_grab_y = su.y; }
      }
      this.con = 9;
    }
    this.timer += 1;
    draw_sprite_ext(this.base_sprite, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    this.hand_x_pos = this.x + handx;
    this.hand_y_pos = this.y + handy;
    draw_sprite_ext('spr_roaringknight_arm_reach_grow', this.handframe, this.hand_x_pos, this.hand_y_pos, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    if (this.susie_display) {
      if (!this.susie_grab_sfx) {
        this.susie_grab_sfx = true;
        this.base_sprite = 'spr_roaringknight_look_down_full';
        snd_play('snd_noise');
        scr_shakeobj(this);
      }
      draw_sprite_ext('spr_susie_dw_fell_grab', 0, this.susie_grab_x, this.susie_grab_y, 2, 2, 0, 0xffffff, 1);
    }
    if (this.triheight > 0) {
      const triy = this.y + handy + 12, trix = this.x + handx + 16;
      draw_set_blend_mode(1);
      draw_set_alpha(0.6 + Math.sin(this.timer / 3) * 0.1);
      draw_set_color(0x800080);
      draw_triangle(trix, triy, G.camX - 100, triy + this.triheight, G.camX - 80, triy - this.triheight, false);
      draw_set_alpha(1);
      draw_set_blend_mode(0);
      if (this.con >= 4 && this.con < 7) {
        const p = instance_create(G.camX - 80, triy + random_range(-this.triheight * 0.8, this.triheight * 0.8), 'obj_marker');
        Object.assign(p, { sprite_index: 'spr_ball_small_nooutline', image_xscale: 0.2, image_yscale: 2, image_alpha: 0.5 });
        scr_doom(p, 30);
        scr_lerpvar(p, 'x', p.x, trix, 30, 2, 'in');
        scr_lerpvar(p, 'y', p.y, triy, 30, 2, 'in');
        scr_lerpvar(p, 'image_xscale', p.image_xscale, 2, 30, 'in');
        scr_lerpvar(p, 'image_yscale', p.image_yscale, 0.2, 30, 'in');
        scr_lerpvar(p, 'image_alpha', 0.8, 0, 30, 'in');
      }
    }
  }
}
defineObject('obj_ch3_PTB02_roaringknight_pull_test', KnightBeam);

// obj_ch3_PTB02_roaringknight_speardodge_sequence: the Knight dodging Undyne's spears.
class SpearDodge extends Instance {
  create() {
    Object.assign(this, { timer: 0, con: 0, makespear: 0, rotate: 0, spear_dodge: 0, rem1: -1, done: 0, image_xscale: 2, image_yscale: 2, image_speed: 0 });
    this.sprite_index = 'spr_roaringknight_look_down';
  }
  draw() {
    this.timer += 1;
    if (this.done === 0) {
      if (this.con === 0) {
        this.con = -1;
        delayVar(this, 'spear_dodge', 1, 10);
        delayVar(this, 'con', 3, 12);
        this.makespear = 1;
        this.image_index = 12;
        scr_lerpvar(this, 'image_index', 12, 3, 18, 2, 'out');
        this.sprite_index = 'spr_roaringknight_ball_transition';
        this.image_speed = 0;
      }
      if (this.con === 3) {
        this.makespear = 0;
        this.rotate = 1;
        this.con = 4;
        if (this.done === 0) delayVar(this, 'con', 0, 6);
      }
    }
    if (this.done === 1) this.makespear = 0;
    if (this.spear_dodge === 1) {
      let gox = this.xstart + choose(40, 50, 60, 70) * this.rem1;
      let goy = this.ystart + choose(20, 30, 40) * choose(-1, 1);
      if (this.done) { gox = this.xstart; goy = this.ystart; }
      this.con = 2;
      scr_lerpvar(this, 'x', this.x, gox, 12, 2, 'out');
      scr_lerpvar(this, 'y', this.y, goy, 12, 2, 'out');
      this.rem1 *= -1;
      this.spear_dodge = 0;
    }
    if (this.rotate) this.image_index = 3 + Math.sin(this.timer / 2) * 1.6;
    if (this.makespear === 1 && this.timer % 4 === 0) {
      snd_play_x('snd_swing', 0.4 + random(0.3), 1.1 + random(0.4));
      const sp = scr_dark_marker(G.camX + 480 + random(200), G.camY - 80, 'spr_undyne_dw_spear');
      sp.depth = this.depth - 100;
      scr_doom(sp, 40);
      sp.friction = -1;
      sp.direction = point_direction(sp.x, sp.y, this.x + 110, this.y + 80) + random_range(-1, 1);
      sp.image_angle = sp.direction + 90;
      sp.speed = 7;
    }
    if (this.timer % 2 === 0) {
      const a = scr_afterimage(this);
      a.image_alpha = 0.8;
      a.direction = random(360);
      a.speed = 2;
      for (const m of instancesOf('obj_marker')) {
        if (m.sprite_index === 'spr_undyne_dw_spear') scr_afterimage(m).image_alpha = 0.5;
      }
    }
    draw_self(this);
  }
}
defineObject('obj_ch3_PTB02_roaringknight_speardodge_sequence', SpearDodge);

// The Knight's sword in the battle's first moments: obj_ch3_PTB02's knight_marker keeps playing
// the sword draw (its frames 7-18) while scr_battle moves it to the Knight's battle spot.
class BattleKnightMarker extends Instance {
  create() {
    this.sprite_index = 'spr_roaringknight_sword_appear_new';
    this.image_xscale = this.image_yscale = 2;
    this.image_speed = 0;
    this.index = 4;
    this.timer = 0;
    this.timestamps = [8, 1, 6, 6, 6, 6, 1, 2, 2, 6, 2, 8];
  }
  step() {
    this.timer -= 1;
    if (this.timer <= 0 && this.index < this.timestamps.length - 1) {
      this.index += 1;
      this.timer = this.timestamps[this.index];
      this.image_index = 7 + this.index;
    }
  }
}
defineObject('obj_sim_ptb02_knightmarker', BattleKnightMarker);

// ---------------------------------------------------------------- obj_ch3_PTB02

const R = { // sprite names for the command lists
  kris_defeat: 'spr_krisb_defeat', ralsei_defeat: 'spr_ralsei_defeat', susie_fell: 'spr_susie_dw_fell',
};

class PTB02 extends Instance {
  create() {
    this.depth = 500;
    this.con = -1;
    this.customcon = 0;
    this.kind = 'pre';
    this.teamdefeated = true;
    this.tree_marker = scr_dark_marker(1920, -200, 'spr_dw_snow_zone_tree');
    scr_depth(this.tree_marker);
    const cover = (blend) => {
      const m = scr_dark_marker(-10, -10, 'spr_pixel_white');
      Object.assign(m, { image_xscale: 999, image_yscale: 999, depth: -110, image_blend: blend, visible: false });
      return m;
    };
    this.blackall = cover(0);
    this.whiteall = cover(0xffffff);
    Object.assign(this, {
      roaring_knight: null, roaring_knight_fx: false, roaring_knight_turn: false, roaring_knight_bird: false,
      roaring_knight_hurt_pos: 0, roaring_knight_warp: false, roaring_knight_warp_timer: 0, roaring_knight_warp_cache: null,
      roaring_knight_warp_start: false, roaring_knight_beam: null, roaring_knight_beam_start: false,
      roaring_knight_beam_stop: false, roaring_knight_state: 0, bird_loop: false, bird_loop_timer: 10, bird_pitch: 0.6,
      bird_volume_multiplier: 1, tenna_hurt: false, susie_slash: false, susie_slash_timer: 0, susie_knight_slash: false,
      susie_knight_slash_timer: 0, susie_knight_shake_timer: 0, susie_knight_shake_time: 80, susie_knight_shake_sequence: false,
      slash_show: false, spear_throw_start: false, spear_throw_stop: false, spear_throw_controller: null, make_npcs: false,
      toriel_grab: false, toriel_grab_timer: 0, camera_pan: false, camera_pan_timer: 0, camera_x_pos: 2720,
      camera_pan_back: false, overlay_pulse: false, overlay_alpha: 0, overlay_siner: 0, knight_marker: null,
      piece_marker: null, sword_shiny: null, sword_draw: false, sword_draw_index: 0, sword_draw_timer: 0,
      sword_draw_timestamps: [8, 1, 6, 6, 6, 6, 1, 2, 2, 6, 2, 8], sword_draw_ready: false, big_shake: false,
      unskip_writer: false, te_actor: null, tennawhite: 0, drawbot: false, tennaslash: null, swoon_target: null,
      endtimer: 0,
    });
    this.white_slash = scr_dark_marker(0, 0, 'spr_roaringknight_slash_white_horizontal');
    this.white_slash.visible = false;
    // Undyne's spears stuck in the snow further right
    const spears = ['spr_undyne_dw_spear_ground_0', 'spr_undyne_dw_spear_ground_1', 'spr_undyne_dw_spear_ground_2'];
    for (let i = 0; i < 25; i++) {
      const spr = spears[irandom(spears.length - 1)];
      const s = scr_dark_marker(3490 + i * 80 + irandom(20), G.camY + 240 + irandom(90), spr);
      scr_depth(s);
      s.depth += 240;
    }
  }
  alarm0() { this.con += 1; }

  // scr_maincharacters_actors, then Tenna / Undyne as obj_ch3_PTB02 sets them up.
  makeActors(k, su, ra) {
    this.master = scr_cutscene_make(this);
    const add = (n, name, [x, y, spr]) => {
      const a = instance_create(x, y, 'obj_actor');
      scr_actor_setup(n, a, name);
      a.sprite_index = spr ?? a.dsprite;
      return a;
    };
    this.kr_actor = add(0, 'kris', k);
    this.su_actor = add(1, 'susie', su);
    this.ra_actor = add(2, 'ralsei', ra);
    for (const kc of instancesOf('obj_mainchara')) kc.visible = false;
    this.un_actor = instance_create(2255, G.camY - 200, 'obj_actor');
    scr_actor_setup(5, this.un_actor, 'undyne');
    this.un_actor.sprite_index = 'spr_undyne_dw_spear_point';
  }
  makeKnight(x, y, spr) {
    const rk = instance_create(x, y, 'obj_ch3_PTB02_roaringknight');
    rk.sprite_index = spr;
    this.roaring_knight = rk;
    return rk;
  }
  makeToriel(y) {
    const t = instance_create(2062, y, 'obj_ch3_PTB02_toriel');
    t.depth = this.tree_marker.depth - 10;
    this.toriel_gacha = t;
    return t;
  }

  // ---- before the fight, from "Now you can all finally"
  startPre() {
    this.kind = 'pre';
    G.camX = 1750;
    G.camY = 0;
    this.tree_marker.image_alpha = 0; // faded out when the ball opened
    this.drawbot = true;
    const t = this.makeToriel(170);
    t.ball_open = true;
    instance_create(1840, 195, 'obj_mainchara');
    const rk = this.makeKnight(2350, G.camY + 100, 'spr_roaringknight_faceaway_eye');
    rk.depth = 97550;
    this.makeActors([1910, 195, 'spr_krisr_dark'], [1850, 206, 'spr_susie_walk_right_dw'], [1800, 230, 'spr_ralsei_walk_right']);
    for (const a of [this.kr_actor, this.su_actor, this.ra_actor]) a.facing = 'r';
    this.un_actor.visible = false;
    this.te_actor = instance_create(2255, 290, 'obj_sim_tenna_still');
    this.con = 3;
    const id = this, { blackall, kr_actor: kr, su_actor: su, ra_actor: ra } = this;
    sceneMusic()[0] = snd_init('berdly_audience.ogg');
    sceneMusic()[1] = mus_loop_ext(sceneMusic()[0], 1, 1);
    c.msgside('bottom');
    // (the scene comes in from black)
    instance_create(0, 0, 'obj_sim_ptb02_fadein');
    c.wait(20);
    c.speaker('tenna');
    c.msgsetloc(0, BS + 'M1* Now you can all finally%%');
    c.talk();
    c.wait_talk();
    c.mus('free_all');
    c.var_instance(id, 'tennawhite', 1);
    c.wait(1);
    c.var_instance(blackall, 'visible', 1);
    c.wait(5);
    c.var_instance(id, 'slash_show', true);
    c.wait(90);
    c.sel(ra); c.sprite('spr_ralsei_shocked_right');
    c.sel(su); c.autowalk(0); c.imagespeed(0); c.sprite('spr_susie_surprised_step_back'); c.imageindex(0);
    c.wait(4);
    c.imageindex(1);
    c.var_instance(id, 'tenna_hurt', true);
    c.var_instance(this.te_actor, 'visible', 0);
    c.var_instance(id, 'tennawhite', 3);
    c.var_instance(blackall, 'image_alpha', 0);
    c.wait(120);
    c.speaker('susie');
    c.msgsetloc(0, BS + 'Ee* T- TENNA!?/%');
    c.talk_wait();
    c.sel(ra); c.facing('ralseiunhappy'); c.facing('r');
    c.sel(su); c.autowalk(1); c.facing('susieunhappy'); c.facing('r');
    c.sel(kr); c.walkdirect(2066, 218, 25); c.delayfacing(11, 'r');
    c.sel(ra); c.walkdirect(2014, 232, 25); c.delayfacing(11, 'r');
    c.sel(su); c.walkdirect_wait(2120, 180, 25);
    c.autodepth(0);
    c.depth(97500);
    c.wait(60);
    c.var_instance(id, 'drawbot', false);
    c.sound_play('snd_noise');
    c.sprite('spr_susie_point_right_unhappy');
    c.addxy(0, 60);
    c.shakeobj();
    c.speaker('susie');
    c.msgsetloc(0, BS + 'Ed* Who..^1. WHO the hell are you!?/%');
    c.talk_wait();
    c.wait(30);
    c.mus2('initloop', 'knight_appears.ogg', 0);
    c.mus2('volume', 0, 0);
    c.mus2('volume', 1, 120);
    c.var_instance(blackall, 'depth', 1000000);
    c.var_lerp_to_instance(id, 'overlay_alpha', 0.4, 120);
    c.var_instance(id, 'overlay_pulse', true);
    c.pan(1970, 0, 120);
    c.wait(150);
    c.sel(su); c.facing('r'); c.addxy(0, -60);
    c.speaker('susie');
    c.msgsetloc(0, BS + "Eb* If..^1. if you don't tell us who you are^1, then.../%");
    c.talk_wait();
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_faceaway_eye');
    c.var_instance(rk, 'eye_shine', true);
    c.var_lerp_to_instance(rk, 'eye_shine_anim', 3, 6);
    c.sound_play('snd_stardrop');
    c.wait(15);
    c.var_lerp_to_instance(rk, 'eye_shine_anim', 0, 6);
    c.wait(6);
    c.var_instance(rk, 'eye_shine', false);
    c.wait(5);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_faceaway_turning');
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0);
    c.wait(10);
    c.var_instance(rk, 'image_index', 1);
    c.wait(10);
    c.var_instance(rk, 'image_index', 2);
    c.wait(30);
    c.var_instance(rk, 'image_speed', 0.2);
    c.wait_if(rk, 'image_index', '>=', 9);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_droop');
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0.1);
    c.wait(90);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_droop_up');
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0.2);
    c.wait(30);
    c.var_instance(rk, 'image_speed', 0);
    c.wait(30);
    c.var_instance(id, 'roaring_knight_beam_start', true);
    c.wait(8);
    c.sound_play_x('snd_knight_stretch', 1, 0.6);
    c.var_instance(id, 'toriel_grab', true);
    c.sel(su); c.sprite('spr_susie_surprised_subtle_right');
    c.sel(ra); c.sprite('spr_ralsei_shocked_right');
    c.wait(110);
    c.var_instance(id, 'toriel_grab', false);
    c.var_instance(id, 'toriel_grab_timer', 0);
    c.sel(su); c.autowalk(0); c.sprite('spr_susie_hit_back_serious'); c.addxy(-4, 0);
    c.var_instance(id, 'susie_slash', true);
    c.wait(10);
    c.var_instance(id, 'roaring_knight_beam_stop', true);
    c.wait(60);
    c.sel(ra); c.facing('ralseiunhappy'); c.facing('r');
    c.speaker('susie');
    c.msgsetloc(0, BS + "Ed* Like hell we're letting you take her...!/%");
    c.talk_wait();
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_reach_overworld');
    c.var_instance(rk, 'state', 0);
    c.wait(15);
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_transition');
    c.var_instance(rk, 'image_index', 9);
    c.var_instance(rk, 'image_speed', -0.6);
    c.wait(15);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_fly');
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0.4);
    c.var_lerp_to_instance(rk, 'x', rk.x + 310 + 10, 20, -1, 'in');
    c.wait(20);
    c.speaker('susie');
    c.msgsetloc(0, BS + "EJ* Kris^1! Ralsei^1! C'mon!!/%");
    c.talk_wait();
    c.pan(2230, G.camY, 40);
    c.sel(kr); c.autowalk(0); c.sprite('spr_kris_run_serious_right'); c.imagespeed(0.4); c.walkdirect(2356, 104, 30);
    c.sel(ra); c.autowalk(0); c.sprite('spr_ralsei_run_serious_right'); c.imagespeed(0.4); c.walkdirect(2288, 190, 30);
    c.sel(su); c.autowalk(0); c.sprite('spr_susie_run_serious_right'); c.imagespeed(0.4); c.walkdirect_wait(2310, 142, 15);
    c.sel(su); c.sprite('spr_susie_halt_serious_right'); c.halt(); c.animate(0, 2, 0.2); c.delaycmd(7, 'sprite', 'spr_susie_idle_serious');
    c.wait(15);
    c.sel(kr); c.halt(); c.facing('r');
    c.sel(kr); c.sprite('spr_kris_halt_serious_right'); c.halt(); c.animate(0, 2, 0.2);
    c.sel(ra); c.sprite('spr_ralsei_halt_serious_right'); c.halt(); c.animate(0, 2, 0.2);
    c.wait(6);
    c.sel(ra); c.sprite('spr_ralsei_walk_right_unhappy');
    c.sel(kr); c.sprite('spr_krisb_idle');
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_transition');
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0.4);
    c.wait(22);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_idle_overworld');
    c.var_instance(rk, 'state', 0);
    c.waitcustom();
  }

  // ---- the room as obj_ch3_PTB02's Create leaves it when tempflag[90] > 0 (back from a game over)
  afterSetup(knightX, knightY) {
    global.interact = 1;
    const rk = this.makeKnight(knightX, knightY, 'spr_roaringknight_idle_overworld_sword');
    rk.image_speed = 0.1;
    scr_depth(rk);
    rk.sword_active = true;
    G.camX = 2230;
    G.camY = 0;
    instance_create(2356, 104, 'obj_mainchara');
    const t = this.makeToriel(160);
    t.ball_open = true;
    this.tree_marker.visible = false;
  }

  // tempflag[90] = 4: GO BACK. The party stands ready again; the Roaring, unless this is the third try or later.
  startRetry() {
    this.kind = 'pre';
    this.afterSetup(2655, G.camY + 106);
    this.makeActors([2356, 104, 'spr_krisb_idle'], [2310, 142, 'spr_susie_idle_serious'], [2288, 190, 'spr_ralsei_walk_right_unhappy']);
    const { whiteall, kr_actor: kr, su_actor: su, ra_actor: ra, roaring_knight: rk } = this;
    this.con = (G.knightLosses ?? 0) > 1 ? 3.1 : 3;
    whiteall.visible = true;
    c.var_lerp_to_instance(whiteall, 'image_alpha', 0, 30);
    c.sel(ra); c.autowalk(0); c.sprite('spr_ralsei_walk_right_unhappy'); c.setxy(2288, 190);
    c.sel(su); c.autowalk(0); c.sprite('spr_susie_idle_serious'); c.setxy(2310, 142);
    c.sel(kr); c.sprite('spr_krisb_idle'); c.setxy(2356, 104);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_idle_overworld');
    c.var_instance(rk, 'state', 0);
    c.wait(60);
    c.waitcustom();
  }

  // tempflag[90] = 1: GO FORWARD. The party lies beaten; the Knight stands over them.
  startLose() {
    this.kind = 'lose';
    this.afterSetup(2655, G.camY + 106);
    this.makeActors([2356, 104, R.kris_defeat], [2310, 142, R.susie_fell], [2288, 190, R.ralsei_defeat]);
    const { blackall, roaring_knight: rk } = this;
    this.con = 10;
    blackall.visible = true;
    blackall.image_alpha = 1;
    c.var_lerp_to_instance(blackall, 'image_alpha', 0, 30);
    rk.state = 0;
    rk.sword_active = true;
    rk.grab_hand = false;
    c.wait(90);
    c.waitcustom();
  }

  // con 8 after a won fight: the party where the battle left them (heroes: battle positions,
  // already in room coordinates), the Knight where its battle self was, all white.
  startWin(heroes, knight) {
    this.kind = 'win';
    this.teamdefeated = false;
    global.interact = 1;
    G.camX = 2230;
    G.camY = 0;
    const kc = instance_create(heroes[0][0], heroes[0][1], 'obj_mainchara');
    kc.visible = false;
    const t = this.makeToriel(170);
    t.ball_open = true;
    this.tree_marker.visible = false;
    this.makeActors([...heroes[0], 'spr_krisr_dark'], [...heroes[1], 'spr_susie_walk_right_dw_unhappy'], [...heroes[2], 'spr_ralsei_walk_right_unhappy']);
    this.un_actor.visible = false;
    const rk = this.makeKnight(knight[0], knight[1], 'spr_roaringknight_idle_overworld_sword');
    scr_depth(rk);
    this.roaring_knight_hurt_pos = rk.x;
    rk.state = 0;
    rk.sword_active = false;
    rk.grab_hand = false;
    this.whiteall.visible = true;
    // blackall is still the pulsing overlay it became before the fight
    this.blackall.visible = true;
    this.blackall.depth = 1000000;
    this.overlay_pulse = true;
    this.overlay_alpha = 0.4;
    this.con = 49;
    this.alarm[0] = 30;
    c.waitcustom(); // (the scene's cutscene master has been waiting since the battle began)
  }

  // con 50: "We... we actually beat it?"
  conWin() {
    audio_stop_all(); // snd_stop_all
    c_waitcustom_end();
    const id = this, { whiteall, white_slash, kr_actor: kr, su_actor: su, ra_actor: ra, roaring_knight: rk } = this;
    c.sel(kr); c.facing('r');
    c.sel(ra); c.setxy(2288, 190); c.facing('ralseiunhappy'); c.facing('r');
    c.sel(su); c.setxy(2310, 142); c.facing('susieunhappy'); c.facing('r');
    c.wait(60);
    c.var_lerp_to_instance(whiteall, 'image_alpha', 0, 60);
    c.mus2('initloop', 'wind_highplace.ogg', 0);
    c.mus2('pitch', 0.5, 0);
    c.mus2('volume', 0, 0);
    c.mus2('volume', 1, 60);
    c.wait(60);
    c.wait(60);
    c.var_instance(rk, 'after_active', false);
    c.var_instance(rk, 'reach_interrupt', true);
    c.wait(15);
    c.mus('free_all');
    c.var_instance(id, 'roaring_knight_warp', true);
    c.wait(30);
    c.wait_if(id, 'roaring_knight_warp', '=', false);
    c.wait(90);
    c.speaker('susie');
    c.msgsetloc(0, BS + 'Ee* We..^1. we actually beat it?/%');
    c.talk_wait();
    c.pannable(1);
    c.pan(2400, 0, 30);
    c.sel(su); c.autowalk(1); c.walkdirect(2510, 142, 30);
    c.msgzurasu(1);
    c.speaker('susie');
    c.var_instance(su, 'rsprite', 'spr_susier_dark');
    c.msgsetloc(0, BS + "EW* What^1, don't tell me you've had ENOUGH already?/");
    c.msgnextloc(BS + "EY* C'mon^1, we were just getting started!/%");
    c.talk_wait();
    c.wait(30);
    c.wait_if(su, 'x', '>=', 2510);
    c.sel(su); c.autowalk(0); c.autodepth(0);
    c.var_instance(id, 'susie_knight_slash', true);
    c.delaycmd(380, 'pan', G.camX, 0, 60);
    c.wait_if(id, 'susie_knight_slash', '=', false);
    c.wait(40);
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_transition_sword');
    c.var_lerp_instance(rk, 'image_index', 8, 5, 8);
    c.wait(8);
    c.var_instance(rk, 'reach_interrupt', false);
    c.var_instance(rk, 'hover_pause', false);
    c.var_instance(rk, 'after_active', true);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_fly');
    c.var_instance(rk, 'image_speed', 0.4);
    c.mus2('initloop', 'wind_highplace.ogg', 0);
    c.mus2('pitch', 0.5, 0);
    c.mus2('volume', 0, 0);
    c.mus2('volume', 1, 60);
    c.wait(145);
    c.speaker('susie');
    c.sel(su); c.sprite('spr_susieb_idle'); c.imagespeed(0.334);
    c.msgsetloc(0, BS + 'EX* Heheh.../%');
    c.talk_wait();
    c.flip('x');
    c.sprite('spr_susie_laugh_dw'); c.imagespeed(0.25); c.imageindex(0);
    c.soundplay('snd_suslaugh');
    c.wait(60);
    c.imagespeed(0);
    c.msgsetloc(0, BS + 'EY* Not so tough NOW^1, are you!?/%');
    c.talk_wait();
    c.sprite('spr_susie_laugh_dw'); c.imagespeed(0.25);
    c.mus2('loopsfx', 'snd_suslaugh', 0);
    c.wait(26);
    c.mus('loopsfxstop');
    c.mus('pause');
    for (const p of [0.06, 0.1, 0.12, 0.18, 0.24]) c.snd_play_x('snd_knight_cut2', 8, p);
    c.var_instance(whiteall, 'image_blend', 0);
    c.var_instance(whiteall, 'image_alpha', 1);
    c.var_instance(whiteall, 'visible', 1);
    c.var_instance(white_slash, 'depth', -120);
    c.var_instance(white_slash, 'x', 2420);
    c.var_instance(white_slash, 'y', 182);
    c.var_instance(white_slash, 'visible', 1);
    c.var_instance(rk, 'x', G.camX + 640 + 300);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_idle_overworld');
    c.flip('x');
    c.sel(su); c.setxy(2410, 142); c.sprite('spr_susie_dw_fell'); c.autodepth(1);
    c.sel(ra); c.facing('u');
    c.wait(55);
    c.sel(su); c.var_lerp_to('x', 2310, 40, 2, 'in');
    c.sel(ra); c.sprite('spr_ralsei_shocked_behind');
    c.wait(25);
    c.mus('resume');
    c.var_instance(id, 'big_shake', true);
    c.var_instance(whiteall, 'visible', 0);
    c.var_instance(white_slash, 'visible', 0);
    c.var_instance(id, 'swoon_target', su);
    c.wait(60);
    c.var_instance(id, 'unskip_writer', true);
    c.speaker('ralsei');
    c.msgsetloc(0, BS + 'EY* S-Susie!^1!!/%');
    c.talk_wait();
    c.var_instance(ra, 'rsprite', 'spr_ralsei_walk_right_unhappy');
    c.autowalk(1);
    c.walkwait('r', 8, 10);
    c.facing('u');
    c.wait(60);
    c.msgsetloc(0, BS + 'EZ* H..^1. how could you.../%');
    c.talk_wait();
    c.mus('pause');
    c.var_instance(id, 'unskip_writer', false);
    for (const p of [0.06, 0.1, 0.12, 0.18, 0.24]) c.snd_play_x('snd_knight_cut2', 8, p);
    c.var_instance(whiteall, 'visible', 1);
    c.var_instance(white_slash, 'depth', -120);
    c.var_instance(white_slash, 'x', 2408);
    c.var_instance(white_slash, 'y', 240);
    c.var_instance(white_slash, 'visible', 1);
    c.sel(ra); c.setxy(2328, 190); c.sprite('spr_ralsei_defeat');
    c.wait(90);
    c.mus('resume');
    c.var_instance(id, 'big_shake', true);
    c.var_instance(whiteall, 'visible', 0);
    c.var_instance(white_slash, 'visible', 0);
    c.var_lerp_to('x', 2280, 30, 2, 'out');
    c.var_instance(id, 'swoon_target', ra);
    c.sel(kr);
    c.wait(180);
    c.mus('pause');
    c.var_instance(whiteall, 'visible', 1);
    c.var_instance(rk, 'sprite_index', 'spr_roaring_knight_kris_knighting');
    c.var_instance(rk, 'y', 44);
    c.var_instance(rk, 'x', 2326);
    c.var_instance(rk, 'hover_pause', true);
    c.var_instance(rk, 'image_index', 1);
    c.var_instance(rk, 'image_speed', 0);
    c.var_instance(rk, 'after_active', false);
    c.sel(kr); c.visible(0);
    c.wait(90);
    c.var_instance(whiteall, 'visible', 0);
    c.mus('resume');
    c.wait(30);
    c.var_lerp_instance(rk, 'image_index', 1, 4, 90, 2, 'in');
    c.wait(120);
    c.mus('pause');
    c.var_instance(whiteall, 'visible', 1);
    c.sel(kr); c.sprite('spr_krisb_defeat'); c.visible(1);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_idle_overworld_sword');
    c.var_instance(rk, 'hover_pause', false);
    c.var_instance(rk, 'after_active', true);
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'x', 2655);
    c.wait(120);
    c.var_instance(whiteall, 'visible', 0);
    c.mus('free_all');
    c.wait(60);
    c.wait(60);
    c.waitcustom();
  }

  // con 10: the Knight takes Toriel; Undyne.
  conTake() {
    c_waitcustom_end();
    const id = this, { kr_actor: kr, su_actor: su, ra_actor: ra, un_actor: un, roaring_knight: rk } = this;
    c.mus2('initloop', 'knight_appears.ogg', 0);
    c.mus2('volume', 0, 0);
    c.mus2('volume', 1, 60);
    c.var_lerp_instance(rk, 'x', rk.x, rk.x - 347, 40, -1, 'inout');
    c.var_lerp_instance(rk, 'ystart', rk.ystart, 60, 40);
    c.wait(10);
    c.panspeed(-6, 0, 30);
    c.wait(120);
    c.var_instance(rk, 'hover_pause', true);
    c.var_instance(rk, 'y', 72);
    c.var_instance(id, 'roaring_knight_beam_start', true);
    c.sound_play_x('snd_knight_stretch', 0.8, 0.6);
    c.sound_play_x('snd_knight_stretch', 0.8, 0.4);
    c.var_instance(id, 'toriel_grab', true);
    c.wait(180);
    c.mus('free_all');
    c.var_instance(rk, 'reach_sprite', 'spr_roaringknight_look_down_full');
    c.var_instance(rk, 'susie_grab', true);
    c.wait(10);
    c.var_instance(id, 'roaring_knight_beam_stop', true);
    c.var_instance(id, 'toriel_grab', false);
    c.wait(40);
    c.speaker('susie');
    c.msgsetloc(0, BS + 'EV* No..^1. you... you can\'t.../');
    c.msgnextloc(BS + 'EV* You can\'t..^1. take her.../%');
    c.talk_wait();
    c.wait(60);
    c.sel(un); c.visible(1); c.autowalk(0); c.imagespeed(0.2); c.setxy(3135, 100);
    c.script_instance(id, playSound, 15, 'snd_spearappear');
    c.wait(40);
    c.script_instance_stop(id, playSound);
    c.wait(18);
    c.var_instance(rk, 'sword_active', false);
    c.var_instance(id, 'spear_throw_start', true);
    c.wait(18);
    c.sel(su); c.autodepth(1); c.sprite('spr_susieb_defeat'); c.shakeobj();
    c.wait(30);
    c.var_instance(id, 'spear_throw_stop', true);
    c.wait(60);
    c.var_instance(id, 'roaring_knight_turn', true);
    c.wait(10);
    c.pan(2720, G.camY, 30);
    c.wait(30);
    c.var_instance(rk, 'state', 0);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_ball_transition_sword');
    c.var_instance(rk, 'image_index', 0);
    c.var_instance(rk, 'image_speed', 0.4);
    c.wait(20);
    c.var_instance(rk, 'image_speed', 0);
    c.var_instance(rk, 'reach_interrupt', false);
    c.var_instance(rk, 'hover_pause', false);
    c.wait(10);
    c.mus2('initloop', 'creepychase.ogg', 0);
    c.speaker('undyne');
    c.msgsetloc(0, BS + 'E1* Hey!^1! You!^1! Stop!^1! Police!!/');
    c.msgnextloc(BS + 'E4* Wh..^1. What the hell is going on here!!?/');
    c.msgnextloc(BS + "E3* You've got some explaining to do^1, punk!!/%");
    c.talk_wait();
    c.var_instance(rk, 'hover_pause', true);
    c.var_instance(id, 'roaring_knight_bird', true);
    c.wait(1);
    c.snd_play('snd_drake_dodge');
    c.snd_play('snd_jump_bc');
    c.var_instance(rk, 'image_speed', 0.6);
    c.wait(5);
    c.var_instance(id, 'bird_loop', true);
    c.var_lerp_to_instance(rk, 'x', 6200, 160, 2, 'in');
    c.wait(20);
    c.var_instance(id, 'camera_pan', true);
    c.var_instance(rk, 'sprite_index', 'spr_roaringknight_fly');
    c.wait_if(rk, 'x', '>=', 3040);
    c.wait(1);
    c.sel(un); c.visible(0);
    c.var_instance(rk, 'undyne_catch', true);
    c.sound_play('snd_grab');
    c.msgzurasu(1);
    c.speaker('undyne');
    c.msgsetloc(0, BS + 'E8* Hey^1, what are you doing!?/');
    c.msgnextloc(BS + 'E9* Put me..^1. PUT ME DOWN!!!/%');
    c.talk();
    c.wait_if(rk, 'x', '>=', 4500);
    c.lerp_var_instance(id, 'bird_pitch', 0.6, 0.1, 60, 2, 'in');
    c.lerp_var_instance(id, 'bird_volume_multiplier', 1, 0, 60, 2, 'in');
    c.wait_talk();
    c.wait_if(id, 'bird_volume_multiplier', '<=', 0);
    c.var_instance(id, 'bird_loop', false);
    c.sel(ra); c.sprite('spr_ralsei_kneel_serious'); c.setxy(2227, 248);
    c.wait(60);
    c.var_instance(id, 'camera_pan', false);
    c.var_instance(id, 'camera_pan_timer', 0);
    c.var_instance(id, 'camera_pan_back', true);
    c.wait(120);
    c.var_instance(id, 'camera_pan_back', false);
    c.sel(su); c.shakeobj(); c.sound_play('snd_noise');
    c.speaker('susie');
    c.msgsetloc(0, BS + 'EV* Hey.../%');
    c.talk_wait();
    c.wait(30);
    c.sel(su); c.autowalk(0); c.sprite('spr_susie_crouch'); c.halt(); c.shakeobj(); c.sound_play('snd_noise');
    c.wait(5);
    c.imageindex(1);
    c.wait(15);
    c.sound_play('snd_wing');
    c.sprite('spr_susie_run_serious_right'); c.imagespeed(0.4); c.walkdirect(3400, 122, 90);
    c.speaker('susie');
    c.msgsetloc(0, BS + 'EJ* Hey^1, where the hell are you going?!/%');
    c.talk_wait();
    c.wait(60);
    c.sel(kr); c.autowalk(0); c.sprite('spr_kris_dw_landed'); c.halt();
    c.wait(4);
    c.imageindex(1);
    c.wait(4);
    c.imageindex(2);
    c.wait(4);
    c.imagespeed(0);
    c.wait(15);
    c.waitcustom();
  }

  // con 11: Kris gets up.
  conGetUp() {
    c_waitcustom_end();
    const { kr_actor: kr } = this;
    c.sel(kr); c.autowalk(1); c.facing('d'); c.addxy(8, 4);
    c.wait(15);
    c.var_instance(this, 'make_npcs', true);
    c.pan_wait(2063, G.camY, 15);
    c.wait(16);
    c.actortokris();
    c.actortocaterpillar();
    c.terminatekillactors();
  }

  // con 5: scr_battle(115, 1, knight_marker): the party jumps from where they stand, the
  // Knight's sword marker moves to the Knight's place, and the room stays behind the battle.
  startFight() {
    global.tempflag[93] = 1;
    const cx = G.camX, cy = G.camY;
    const at = a => [a.x - cx, a.y - cy];
    const rk = this.roaring_knight, km = this.knight_marker;
    startBattle({
      intro: true,
      introStart: [at(this.kr_actor), at(this.su_actor), at(this.ra_actor)],
      knightMarker: km ? { x: km.x - cx, y: km.y - cy, ystart: rk.ystart - cy, index: this.sword_draw_index, timer: this.sword_draw_timer } : null,
      sceneRoom: { vx: cx, vy: cy, overlay_pulse: this.overlay_pulse, overlay_alpha: this.overlay_alpha, overlay_siner: this.overlay_siner },
    });
  }

  step() {
    const rk = this.roaring_knight;
    // con 3: the Roaring
    if (this.con === 3 && this.customcon === 1 && !d_ex()) {
      this.con = 3.1;
      this.customcon = 0;
      if (this.te_actor) instance_destroy(this.te_actor);
      c_waitcustom_end();
      c.mus('free_all');
      c.wait(30);
      c.var_instance(rk, 'state', 99);
      c.wait(1);
      c.var_instance(rk, 'visible', 0);
      c.var_instance(this, 'roaring_knight_fx', true);
      c.wait(255);
      c.var_instance(rk, 'visible', 1);
      c.var_instance(rk, 'state', 0);
      c.waitcustom();
    }
    // con 3.1: the sword
    if (this.con === 3.1 && this.customcon === 1) {
      this.con = 4;
      this.customcon = 0;
      c_waitcustom_end();
      c.var_instance(rk, 'draw_sword', true);
      c.wait_if(rk, 'battle_ready', '=', true);
      c.var_instance(this, 'sword_draw', true);
      c.wait_if(this, 'sword_draw_ready', '=', true);
      c.waitcustom();
    }
    if (this.roaring_knight_beam_start) {
      this.roaring_knight_beam_start = false;
      const post = this.con >= 9;
      const b = instance_create(rk.x, rk.y, 'obj_ch3_PTB02_roaringknight_pull_test');
      b.depth = rk.depth - 5;
      b.base_sprite = post ? 'spr_roaringknight_reach_base_sword' : 'spr_roaringknight_reach_base';
      this.roaring_knight_beam = b;
      this.roaring_knight_state = rk.state;
      rk.state = 4;
      rk.hover_pause = true;
      rk.visible = false;
    }
    if (this.roaring_knight_beam_stop) {
      this.roaring_knight_beam_stop = false;
      const b = this.roaring_knight_beam;
      if (b && b.alive) b.con = 7;
      scr_doom(b, 17);
      if (this.con >= 9) {
        if (b) b.susie_active = true;
        delayVar(rk, 'sword_active', true, 17);
        delayVar(rk, 'state', 1, 17);
        delayVar(rk, 'reach_sprite', 'spr_roaringknight_look_down_full', 17);
      } else {
        delayVar(rk, 'state', this.roaring_knight_state, 17);
        delayVar(rk, 'hover_pause', false, 17);
      }
      delayVar(rk, 'visible', true, 17);
    }
    if (this.sword_draw) {
      if (!this.knight_marker) {
        this.knight_marker = scr_dark_marker(rk.x, rk.y, 'spr_roaringknight_sword_appear_new');
        this.knight_marker.image_index = 7;
        rk.visible = false;
        rk.state = 99;
      }
      this.sword_draw_timer -= 1;
      if (this.sword_draw_timer <= 0) {
        this.sword_draw_index += 1;
        if (this.sword_draw_index >= this.sword_draw_timestamps.length) this.sword_draw = false;
        else {
          this.sword_draw_timer = this.sword_draw_timestamps[this.sword_draw_index];
          this.knight_marker.image_index = 7 + this.sword_draw_index;
          if (this.knight_marker.image_index === 11) this.sword_draw_ready = true;
        }
      }
    }
    if (this.con === 4 && !d_ex() && this.customcon === 1 && this.sword_draw_ready) {
      this.con = 5;
      this.startFight();
      return;
    }
    if (this.con === 50) {
      this.con = 10;
      this.customcon = 0;
      this.conWin();
    }
    if (this.con === 10 && this.customcon === 1) {
      this.con = 11;
      this.customcon = 0;
      this.conTake();
    }
    if (this.bird_loop) {
      this.bird_loop_timer += 1;
      if (this.bird_loop_timer === 6) snd_play_x('snd_knight_puff', 0.85 * this.bird_volume_multiplier, this.bird_pitch);
      if (this.bird_loop_timer >= 10) {
        this.bird_loop_timer = 0;
        snd_play_x('snd_heavy_passing', this.bird_volume_multiplier, 1);
      }
    }
    if (this.con === 11 && this.customcon === 1) {
      this.con = 12;
      this.customcon = 0;
      this.conGetUp();
    }
    if (this.spear_throw_start) {
      this.spear_throw_start = false;
      this.spear_throw_controller = instance_create(rk.x, rk.y, 'obj_ch3_PTB02_roaringknight_speardodge_sequence');
      rk.after_active = false;
      rk.visible = false;
    }
    if (this.spear_throw_stop) {
      this.spear_throw_stop = false;
      const sc = this.spear_throw_controller;
      if (sc) { sc.done = 1; sc.spear_dodge = 1; }
      scr_doom(sc, 13);
      rk.sprite_index = 'spr_roaringknight_ball_fly';
      rk.image_speed = 0.2;
      rk.state = 0;
      delayVar(rk, 'visible', true, 13);
      delayVar(rk, 'after_active', true, 13);
    }
    // con 12: the scene is over (the player would walk on from here): the end screen.
    if (this.con === 12 && !i_ex('obj_cutscene_master')) {
      this.endtimer += 1;
      if (this.endtimer === 60) {
        mus_volume(sceneMusic()[1], 0, 30);
        fadeOut(30, () => S.startEnding(this.kind === 'win' ? 'win' : 'lose', { afterScene: true }));
      }
    }
    if (this.roaring_knight_warp) this.warpStep();
    if (this.unskip_writer) for (const w of instancesOf('obj_writer')) w.skippable = 0;
    if (this.swoon_target) {
      const d = instance_create(this.swoon_target.x + 20, this.swoon_target.y + 30, 'obj_dmgwriter');
      d.type = 12;
      this.swoon_target = null;
    }
    if (this.big_shake) {
      this.big_shake = false;
      snd_play('snd_impact');
      snd_play_x('snd_closet_impact', 1, 1);
      snd_play_x('snd_closet_impact', 1, 0.5);
      snd_play_x('snd_bageldefeat', 0.8, 0.8);
      snd_play('snd_damage');
      snd_play_x('snd_glassbreak', 0.8, 0.4);
      snd_play_x('snd_glassbreak', 0.6, 0.3);
      const sh = instance_create(0, 0, 'obj_shake');
      Object.assign(sh, { shakex: 10, shakespeed: 2, shakesign: 2 });
    }
    if (this.susie_knight_slash) this.susieKnightSlashStep();
    if (this.tenna_hurt) {
      this.tenna_hurt = false;
      for (const t of instancesOf('obj_tennadeath_event')) instance_destroy(t);
      instance_create(this.te_actor.x - 80, this.te_actor.y - 220, 'obj_tennadeath_event');
    }
    if (this.susie_slash) this.susieSlashStep();
    if (this.tennawhite === 1) {
      this.tennawhite = 2;
      const te = this.te_actor;
      te.sprite_index = 'spr_tenna_hooray_armsup';
      const f = scr_dark_marker(te.x, te.y, 'spr_roaringknight_slash_tenna');
      f.image_index = 13;
      f.image_speed = 0;
      f.depth = this.blackall.depth - 5;
      this.tennaslash = f;
    }
    if (this.tennawhite === 3) {
      if (this.tennaslash) instance_destroy(this.tennaslash);
      this.tennawhite = 0;
    }
    if (this.roaring_knight_fx) {
      this.roaring_knight_fx = false;
      for (const f of instancesOf('obj_knight_roaring_fx')) instance_destroy(f);
      instance_create(rk.x + 20, rk.y - 20, 'obj_knight_roaring_fx');
    }
    if (this.slash_show) {
      this.slash_show = false;
      sndPlayDelay(this, 'snd_damage', 4, 0.8, 1);
      sndPlayDelay(this, 'snd_damage', 4, 0.8, 0.6);
      const f = this.tennaslash;
      if (f) {
        scr_lerpvar(f, 'image_index', 0, 15, 40, 3, 'out');
        scr_script_delayed(f, (t) => scr_shakeobj(t), 10);
      }
    }
    if (this.roaring_knight_turn) {
      this.roaring_knight_turn = false;
      scr_flip(rk, 'x');
      rk.x += 20;
      rk.after_image_dir = -1;
      scr_lerpvar(rk, 'x', rk.x, rk.x + 440, 40, -1, 'inout');
    }
    if (this.roaring_knight_bird) {
      this.roaring_knight_bird = false;
      rk.sprite_index = 'spr_roaringknight_fly_transition';
      rk.image_index = 0;
      rk.image_xscale = 2;
      rk.x -= 234;
    }
    if (this.make_npcs) {
      this.make_npcs = false;
      global.facing = 0;
      // Ralsei stays kneeling as an NPC; the readables and walls of the free-roaming part are not needed.
      const ra = this.ra_actor;
      const npc = scr_dark_marker(ra.x, ra.y, ra.sprite_index);
      scr_depth(npc);
    }
    if (this.camera_pan) {
      this.camera_pan_timer += 1;
      if (this.camera_pan_timer === 1) {
        scr_lerpvar(this, 'camera_x_pos', G.camX, 5000, 112, 2, 'in');
        delayVar(rk, 'undyne_hat', true, 30);
      }
      G.camX = this.camera_x_pos;
    }
    if (this.camera_pan_back) {
      this.camera_pan_timer += 1;
      if (this.camera_pan_timer === 1) scr_lerpvar(this, 'camera_x_pos', G.camX, 1990, 120, 4, 'inout');
      G.camX = this.camera_x_pos;
    }
    if (this.toriel_grab) {
      this.toriel_grab_timer += 1;
      const t = this.toriel_gacha;
      if (this.toriel_grab_timer % 2 === 0) {
        t.shake_offset_x = choose(-1, 0, 1);
        t.shake_offset_y = choose(-1, 0, 1);
      }
      if ([1, 11, 41].includes(this.toriel_grab_timer)) {
        scr_lerpvar(t, 'hspeed', 0, 12, { 1: 10, 11: 30, 41: 50 }[this.toriel_grab_timer]);
        t.friction = 10;
      }
    }
    if (global.flag[20] === 1) {
      global.flag[20] = 0;
      for (const w of instancesOf('obj_writer')) w.rate = 3;
    }
    if (this.overlay_pulse) {
      this.overlay_siner += 0.08;
      this.blackall.image_alpha = clamp(this.overlay_alpha + Math.sin(this.overlay_siner) * 0.08, 0, 0.4);
    }
  }
  warpStep() {
    const rk = this.roaring_knight;
    this.roaring_knight_warp_timer += 1;
    const t = this.roaring_knight_warp_timer;
    if (t === 1) {
      this.roaring_knight_warp_cache ??= { x: rk.x, y: rk.y };
      rk.hover_pause = true;
      rk.state = 2;
    }
    if (t === 31 || t === 56 || t === 69 || t === 82) this.roaring_knight_warp_start = true;
    if (t === 95) {
      this.roaring_knight_warp = false;
      rk.x = this.roaring_knight_warp_cache.x;
      rk.y = this.roaring_knight_warp_cache.y;
      rk.state = 3;
    }
    if (this.roaring_knight_warp_start) {
      this.roaring_knight_warp_start = false;
      rk.sprite_index = 'spr_roaring_knight_static';
      rk.image_index = 0;
      rk.x += choose(-20, -10, 10, 20);
      rk.y += choose(-20, -10, 10, 20);
      rk.state = 2;
    }
  }
  // show_clash_overlay(time, alpha): a white flash over everything.
  clashOverlay(time = 8, alpha = 1) {
    const o = scr_dark_marker(-10, -10, 'spr_pixel_white');
    Object.assign(o, { image_xscale: 999, image_yscale: 999, depth: -110, image_blend: 0xffffff, image_alpha: 0, visible: true });
    scr_lerpvar_instance(o, 'image_alpha', 0, alpha, time, 2, 'out');
    scr_script_delayed(o, (t) => scr_lerpvar_instance(t, 'image_alpha', alpha, 0, time, 2, 'out'), time + 2);
    scr_doom(o, time + time + 2);
  }
  hitbackVfx(time, life, alpha, grow) {
    const rk = this.roaring_knight;
    const v = scr_dark_marker(rk.x - 90, rk.y - 90, 'spr_fx_hitback');
    scr_lerpvar(v, 'image_index', 0, 4, time);
    v.image_xscale = v.image_yscale = 2;
    if (grow) scr_afterimage_grow(v);
    if (alpha !== 1) {
      v.image_alpha = alpha;
      scr_lerpvar_instance(v, 'image_alpha', alpha, 0, life);
    }
    scr_doom(v, life);
  }
  // The won fight: Susie leaps at the Knight; their weapons clash until the Knight's sword chips.
  susieKnightSlashStep() {
    const rk = this.roaring_knight, su = this.su_actor;
    this.susie_knight_slash_timer += 1;
    const t = this.susie_knight_slash_timer;
    if (t === 1) {
      snd_play('snd_jump');
      su.depth = 6000;
      scr_lerpvar(su, 'hspeed', 0, 20, 5);
      Object.assign(su, { vspeed: -14, gravity: 2, sprite_index: 'spr_susie_clash_jump', image_index: 1, friction: 0 });
      this.clashOverlay();
    }
    if (t === 10) {
      this.susie_knight_shake_sequence = true;
      instance_create(0, 0, 'obj_shake');
      snd_play_x('snd_laz_c', 1, 0.7);
      snd_play('snd_heavyswing');
      snd_play_x('snd_closet_impact', 1, 0.9);
      snd_play_x('snd_impact', 1, 0.7);
      Object.assign(su, { friction: 0, vspeed: 0, gravity: 0, hspeed: 0, visible: false });
      su.x = rk.x - 30;
      su.y = rk.y - 40;
      Object.assign(rk, { sprite_index: 'spr_roaring_knight_susie_clash', image_speed: 0.4, state: 0, shakeamt: 2 });
      scr_shakeobj_ext(rk, 24, 10, 3, 2);
    }
    if (this.susie_knight_shake_sequence) {
      this.susie_knight_shake_timer += 1;
      if (this.susie_knight_shake_timer % this.susie_knight_shake_time === 1) {
        this.susie_knight_shake_time -= 10;
        if (this.susie_knight_shake_time <= 30) this.susie_knight_shake_sequence = false;
        instance_create(0, 0, 'obj_shake');
        this.hitbackVfx(12, 16, 1, true);
        this.hitbackVfx(24, 24, 0.5, false);
        snd_stop('snd_damage');
        snd_play('snd_damage');
        snd_play_x('snd_metal_hit_strong', 0.5, 0.8);
        snd_stop('snd_closet_impact');
        snd_stop('snd_impact');
        snd_play_x('snd_closet_impact', 1, 0.9);
        snd_play_x('snd_impact', 1, 0.7);
        this.clashOverlay(8, 0.5);
        const a = scr_afterimage(rk);
        a.speed = 4;
        a.direction = random_range(-60, 20);
        let b = scr_afterimage(rk);
        b.speed = 2;
        b.direction = a.speed;
        b = scr_afterimage(rk);
        b.speed = 1;
        b.direction = a.speed;
        scr_shakeobj_ext(rk, 24, 10, 3, 2);
      }
    } else {
      const finish = 300, jumpBack = finish + 20;
      if (t === finish) {
        this.hitbackVfx(12, 12, 1, false);
        snd_stop('snd_damage');
        snd_play('snd_damage');
        this.clashOverlay(8, 0.5);
        Object.assign(rk, { hspeed: 8, friction: 2, shakeamt: 0, image_index: 2, image_speed: 0 });
      }
      if (t === jumpBack) {
        snd_play_x('snd_laz_c', 1, 0.9);
        snd_play('snd_glassbreak');
        snd_play('snd_sparkle_glock');
        Object.assign(su, { visible: true, sprite_index: 'spr_susie_clash_jump', vspeed: -4, gravity: 2, hspeed: -14, image_index: 0, image_speed: 0 });
        Object.assign(rk, { sprite_index: 'spr_roaring_knight_clash_pull_back', image_index: 0, image_speed: 0, state: 0 });
        delayVar(rk, 'image_index', 1, 4);
        const p = scr_dark_marker(rk.x, rk.y, 'spr_roaringknight_sword_break_piece_small');
        scr_depth(p);
        Object.assign(p, { vspeed: -8, gravity: 2, hspeed: -7 });
        scr_lerpvar(p, 'image_angle', 0, 1280, 20);
        delayVar(p, 'gravity', 0, 16);
        delayVar(p, 'hspeed', 0, 16);
        delayVar(p, 'vspeed', 0, 16);
        this.piece_marker = p;
      }
      if (t === jumpBack + 10) Object.assign(su, { sprite_index: 'spr_susieb_idle_serious', vspeed: 0, gravity: 0, friction: 2, image_index: 0, image_speed: 0 });
      if (t === jumpBack + 20) {
        this.susie_knight_slash = false;
        const p = this.piece_marker;
        const s = scr_dark_marker(p.x - 4, p.y - 4, 'spr_shine_white');
        s.image_speed = 0.1;
        scr_depth(s);
        this.sword_shiny = s;
      }
    }
  }
  // Before the fight: Susie, hit by the Knight's arm, is thrown back.
  susieSlashStep() {
    const su = this.su_actor, rk = this.roaring_knight;
    this.susie_slash_timer += 1;
    const t = this.susie_slash_timer, sp = 2;
    if (t === 1) {
      scr_lerpvar(su, 'hspeed', 0, 14, 5);
      Object.assign(su, { vspeed: -14, gravity: 2, sprite_index: 'spr_susie_hit_back_serious', image_index: 1 });
    }
    if (t === 1 + sp) {
      rk.reach_speed = 8;
      rk.reach_retract = true;
      su.image_index = 3;
    }
    if (t === 1 + sp * 3) {
      snd_play_x('snd_laz_c', 1, 0.9);
      su.friction = 1.5;
      su.image_index = 12;
    }
    if (t === 1 + sp * 4) Object.assign(su, { vspeed: 0, gravity: 0, image_index: 13 });
    if (t === 1 + sp * 5) su.image_index = 14;
    if (t === 1 + sp * 6) su.sprite_index = 'spr_susie_idle_serious';
  }
  draw() {
    if (this.drawbot) {
      draw_set_color(0);
      draw_rectangle(G.camX, 440, G.camX + 640, 480, false);
    }
    draw_set_color(0xffffff);
  }
}
defineObject('obj_ch3_PTB02', PTB02);

// ---------------------------------------------------------------- entry points

function enterSnowZone() {
  const tempflag = global.tempflag;
  const losses = G.knightLosses;
  gotoRoom();
  global.tempflag = tempflag ?? new Array(100).fill(0);
  global.interact = 1;
  global.facing = 1;
  global.currentsong = [null, null];
  G.roomW = ROOM_W;
  G.knightLosses = losses;
  global.damagefont = font_add_sprite_ext('spr_numbersfontbig', '0123456789', true, 0);
  loadMusic('creepychase.ogg'); // (Undyne's arrival; fetched now so it is there in time)
  instance_create(0, 0, 'obj_time');
  instance_create(40, 0, 'obj_dw_snow_zone_parallax');
  return instance_create(0, 200, 'obj_ch3_PTB02');
}

// BEGIN / TRY AGAIN (and GO BACK, opts.retry) with SCENES on.
export function startKnightFight(opts = {}) {
  if (G.settings?.scenes === false) return startBattle({ intro: G.settings?.intro !== false });
  const p = enterSnowZone();
  if (opts.retry) p.startRetry();
  else p.startPre();
}

// After the fight: 'win' (heroes / knight: where the battle left them, battle coordinates) or
// 'lose' (GO FORWARD).
export function startKnightAfterScene(kind, opts = {}) {
  const p = enterSnowZone();
  if (kind === 'win') {
    const ox = 2230, oy = 0;
    const heroes = (opts.heroes ?? [[126, 104], [80, 142], [58, 190]]).map(([x, y]) => [x + ox, y + oy]);
    const knight = opts.knight ? [opts.knight[0] + ox, opts.knight[1] + oy] : [2655, 106];
    p.startWin(heroes, knight);
  } else p.startLose();
}

defineScript('startKnightFight', startKnightFight);
// (used by startBattle for the Knight's sword marker)
defineScript('scr_move_to_point_over_time', (inst, x, y, t) => moveToPoint(inst, x, y, t));
defineScript('scr_doom', (inst, t) => scr_doom(inst, t));
defineScript('startKnightAfterScene', startKnightAfterScene);
void [setFacingSprites, mus_stop, instance_exists];
