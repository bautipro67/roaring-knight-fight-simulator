// "Stars" (obj_dbulletcontroller type 98): obj_knight_pointing_cone (the Knight pointing, the light
// cone and the box knockback), obj_knight_pointing_star (stars that stop, flash and burst) and
// obj_knight_pointing_starchild (the shards that turn and dash at the SOUL).
import {
  G, global, defineObject, instance_create, instance_destroy, instancesOf, random_range, irandom, irandom_range, choose,
  lerp, merge_color, angle_difference, point_direction, lengthdir_x, lengthdir_y, round, sprite_get_width, sprite_get_height,
  draw_self, draw_sprite_ext, draw_sprite_part_ext, draw_set_blend_mode, draw_set_color, draw_set_alpha, draw_rectangle,
  draw_primitive_begin, draw_vertex, draw_primitive_end, snd_play, draw_sprite, surface_create, surface_exists,
  surface_free, surface_set_target, surface_reset_target, draw_clear_alpha, draw_surface,
} from '../rt.js?v=20261107001915';
import {
  first, enemyRef, camerax, cameray, screenx, screeny, scr_movetowards, scr_ease_in, scr_ease_out, scr_afterimage, scr_custom_afterimage,
  scr_childbullet, scr_precise_hit, scr_draw_beam_color, scr_draw_outline, scr_pingpong, scr_rotatetowards, scr_angle_lerp,
  scr_onscreen_tolerance, clamp01, remap, gt_maxx, snd_play_x, snd_play_pitch,
} from '../common.js?v=20261107001915';
import { BulletParent, CollideBullet, RegularBullet } from '../bullets.js?v=20261107001915';
import { S } from '../../runtime/gm.js?v=20261107001915';

class PointingCone extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_point_ol';
  }
  create() {
    this.surf = -4;
    this.starsurf = -4;
    this.angle = 0;
    this.target_angle = 60;
    this.bg_x = 0;
    this.lines_x = 0;
    this.tween = 0;
    this.angle_lerp = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.image_speed = 0;
    const k = first('obj_knight_enemy');
    if (k) {
      k.visible = false;
      this.aetimer = k.aetimer;
    } else this.aetimer = 0;
    this.con = 0;
    this.difficulty = 0;
    this.yoff = irandom(60) + 2;
    this.timer = 0;
    this.fake_gt = instance_create(this.x, this.y, 'obj_fake_gt');
    this.gt_x = first('obj_growtangle')?.x ?? camerax() + 320;
    this.knockback = 0;
    this.star_flicker = 0;
    this.draw_angle = 0;
    this.starlist = [];
    this.afterimage_spread = 0;
    this.timerb = 0;
    this.endtimer = 120;
  }
  cleanUp() {
    if (surface_exists(this.surf)) surface_free(this.surf);
    if (surface_exists(this.starsurf)) surface_free(this.starsurf);
    const k = first('obj_knight_enemy');
    if (k && !k.visible) {
      k.visible = true;
      k.aetimer = this.aetimer;
    }
  }
  step() {
    this.timerb += 1;
    if (this.timerb === 3) for (let i = 0; i < 3; i++) snd_play_x('snd_knight_drawpower', 1, 1.3);
    if (this.timerb === 120) for (let i = 0; i < 3; i++) snd_play_x('snd_knight_star_explosion_close', 2, 0.7);
    const g = first('obj_growtangle'), k = enemyRef();
    if (this.con === 4) {
      this.x = lerp(this.x, k.x, 0.15);
      this.y = lerp(this.y, k.y, 0.15);
      if (this.tween === 0) {
        this.con = 5;
        const ke = first('obj_knight_enemy');
        if (ke) {
          ke.visible = true;
          ke.aetimer = this.aetimer;
        }
      }
    } else if (this.tween < 1 && g) {
      this.tween = scr_movetowards(this.tween, 1, 0.05);
      const e = scr_ease_out(this.tween, 4);
      this.x = lerp(this.xstart, g.x + 115, e);
      this.y = lerp(this.ystart, g.y - 56, e);
    }
    if (this.con < 2) return;
    if (global.turntimer <= this.endtimer) {
      if (this.angle_lerp === 1) {
        const stars = instancesOf('obj_knight_pointing_star');
        stars.forEach((s, i) => {
          s.con = 1;
          s.timer = -i;
          if (i % 2 === 1) s.playSound = false;
        });
        this.knockback = 10;
      }
      if (this.angle_lerp === 0 && this.con < 3) {
        this.timer = 10;
        this.con = 3;
        this.yoff = 120 + irandom_range(-60, 60);
      }
      this.angle_lerp = scr_movetowards(this.angle_lerp, 0, 0.1);
      this.angle = lerp(0, this.target_angle, scr_ease_in(this.angle_lerp, 6));
    } else if (this.angle < this.target_angle) {
      this.angle_lerp = scr_movetowards(this.angle_lerp, 1, 0.025);
      this.angle = lerp(0, this.target_angle, scr_ease_out(this.angle_lerp, 6));
    } else this.x += 0.25;
    const fg = this.fake_gt;
    if (this.knockback !== 0) {
      const kb = scr_ease_in(this.knockback / 10, 5) * 10;
      this.gt_x -= kb;
      this.knockback = scr_movetowards(this.knockback, 0, 0.5);
      fg.xoffset = random_range(-1, 1) * (kb / 10);
      fg.yoffset = random_range(-1, 1) * (kb / 10);
    } else {
      this.gt_x -= this.angle / this.target_angle / 2;
      fg.xoffset = random_range(-1, 1) * (this.angle / this.target_angle);
      fg.yoffset = random_range(-1, 1) * (this.angle / this.target_angle);
    }
    if (g) g.x = round(this.gt_x);
    const h = first('obj_heart');
    if (h && g) h.x = Math.min(h.x, gt_maxx() - 22);
  }
  draw() {
    const n = 5;
    if (this.con >= 3) {
      if (this.image_index === n - 1) this.image_index -= 1;
      else if (this.image_index > 0) this.image_index -= 0.25;
    } else if (this.image_index < n - 1) this.image_index += 0.5;
    if (this.con < 5) draw_self(this);
    this.aetimer += 1;
    if (this.con <= 4 && this.aetimer % 4 === 0) {
      const a = scr_afterimage(this);
      a.image_alpha = 0.6;
      a.fadeSpeed = 0.02;
      a.speed = 2 + this.afterimage_spread / 30;
      a.direction = Math.sin(this.aetimer) * this.angle / 2;
      a.depth = enemyRef().depth + 1;
      if (this.con === 4) this.afterimage_spread = scr_movetowards(this.afterimage_spread, 0, 20);
      if (this.con >= 1) this.afterimage_spread += 1;
    }
    if (this.con >= 4) return;
    if (!surface_exists(this.surf)) this.surf = surface_create(640, 480);
    if (!surface_exists(this.starsurf)) this.starsurf = surface_create(640, 480);
    const cx = camerax(), w = (this.x + 22 - cx) / 2;
    if (this.con <= 1) {
      if (this.con === 0) this.con = 1;
      if (this.timer < 28) {
        draw_set_blend_mode(1);
        draw_sprite_part_ext('spr_knight_bullet_flow', 2, this.timer, this.timer * 4 + this.yoff - 2, w, 1, cx, this.y + 54, 2, 2, 0x808080, 1);
        if (this.timer % 2 === 0) draw_sprite_part_ext('spr_knight_bullet_flow', 2, this.timer * 2, this.timer * 4 + this.yoff, w, 1, cx, this.y + 54, 2, 2, 0x808080, 1);
        draw_set_blend_mode(0);
      } else {
        draw_set_color(0xffffff);
        draw_rectangle(cx, this.y + 54, this.x + 22, this.y + 56, false);
      }
      this.timer += 1;
      if (this.timer >= 30) {
        snd_play_pitch('snd_rocket_long', 0.6);
        this.con = 2;
      }
      return;
    }
    if (this.con === 3 && this.timer > 0) {
      draw_set_blend_mode(1);
      draw_sprite_part_ext('spr_knight_bullet_flow', 2, (10 - this.timer) * 2, this.yoff - (10 - this.timer) * 4, w, 1, cx, this.y + 54, 2, 2, 0x808080, this.timer / 10);
      draw_sprite_part_ext('spr_knight_bullet_flow', 2, (10 - this.timer) * 2, this.yoff + (10 - this.timer) * 4, w, 1, cx, this.y + 54, 2, 2, 0x808080, this.timer / 10);
      this.timer -= 1;
      draw_set_blend_mode(0);
      if (this.timer === 0) this.con = 4;
      return;
    }
    // The cone is drawn into a screen-sized surface and added to the screen.
    surface_set_target(this.surf);
    draw_clear_alpha(0, 0);
    draw_set_blend_mode(0);
    draw_set_alpha(1);
    draw_set_color(merge_color(0xffffff, 0, this.angle / this.target_angle));
    this.draw_angle = 1 - this.draw_angle;
    const ang = this.angle > 0 ? this.angle + this.draw_angle : 0;
    const ax = screenx(this.x + 22), ay = screeny(this.y);
    const xl = lengthdir_x(600, 180 + ang / 2), yt = lengthdir_y(600, 180 - ang / 2), yb = lengthdir_y(600, 180 + ang / 2);
    const cone = () => {
      draw_primitive_begin(4); // pr_trianglelist: the 4th vertex is ignored, as in GML
      draw_vertex(ax + xl, ay + 56 + yt);
      draw_vertex(ax, ay + 56);
      draw_vertex(ax + xl, ay + 58 + yb);
      draw_vertex(ax, ay + 58);
      draw_primitive_end();
    };
    cone();
    // sepalpha(bm_src_alpha, bm_one, bm_dest_alpha, bm_zero) + alpha test: the flow is added
    // inside the cone only (canvas: add, then cut back to the cone).
    draw_set_blend_mode(1);
    draw_sprite_ext('spr_knight_bullet_flow', 0, this.bg_x, 0, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_knight_bullet_flow', 0, this.bg_x + 640, 0, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_knight_bullet_flow', 1, this.lines_x, 0, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_knight_bullet_flow', 1, this.lines_x + 640, 0, 2, 2, 0, 0xffffff, 1);
    draw_set_blend_mode('destination-in');
    cone();
    this.lines_x -= 80;
    this.bg_x -= 20;
    if (this.lines_x < -640) this.lines_x += 640;
    if (this.bg_x < -640) this.bg_x += 640;
    // The SOUL is cut out of the cone.
    draw_set_blend_mode(3);
    for (const h of instancesOf('obj_heart')) draw_sprite(h.sprite_index, h.image_index, screenx(h.x), screeny(h.y));
    const stars = instancesOf('obj_knight_pointing_star');
    if (stars.length) {
      surface_set_target(this.starsurf);
      draw_set_blend_mode(0);
      draw_clear_alpha(0, 0);
      for (const s of stars) if (s.image_xscale > 0.5) s.user0();
      draw_set_blend_mode(3);
      draw_sprite_ext('spr_knight_line_grate', 0, 0, this.star_flicker, 2, 2, 0, 0, 1);
      this.star_flicker = 2 - this.star_flicker;
      draw_set_blend_mode(0);
      for (const s of stars) if (s.image_xscale <= 0.5) s.user0();
      surface_reset_target();
      // sepalpha(bm_src_alpha, bm_inv_src_alpha, bm_dest_alpha, bm_zero): stars only inside the cone.
      draw_set_blend_mode('source-atop');
      draw_surface(this.starsurf, 0, 0);
    }
    draw_set_blend_mode(1);
    surface_reset_target();
    draw_surface(this.surf, cx, cameray());
    draw_set_blend_mode(0);
  }
}
defineObject('obj_knight_pointing_cone', PointingCone);

class PointingStar extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_bullet_star';
    this.mask_index = 'spr_knight_bullet_star_mask';
  }
  create() {
    S.scr_bullet_init(this);
    this.growspeed = 0.02;
    this.image_xscale = 0;
    this.image_yscale = 0;
    this.destroyonhit = false;
    this.timer = 0;
    this.con = 0;
    this.growstart = 0;
    this.playSound = true;
    this.damage = 1;
    this.grazepoints = 2;
    this.element = 5;
    this.difficulty = 0;
    this.grazetimer = 0;
    this.side = 0;
    this.init = false;
    this.dir = choose(-1, 1);
  }
  // Other_10: drawn by obj_knight_pointing_cone into its surface.
  user0() {
    const xs = (this.sprite_width + 16) / sprite_get_width(this.sprite_index);
    const ys = (this.sprite_height + 16) / sprite_get_height(this.sprite_index);
    draw_sprite_ext(this.sprite_index, 0, screenx(this.x), screeny(this.y), xs, ys, 0, 0xffffff, 1);
  }
  user5() {
    this.target = 3;
    this.damage = 75;
    const k = first('obj_knight_enemy');
    if (k) k.aoedamage = true;
    if (this.active == 1 && scr_precise_hit(this, 3)) {
      S.scr_damage_all(this);
      if (this.destroyonhit === 1) instance_destroy(this);
    }
    if (k) k.aoedamage = false;
  }
  step() {
    const cx = camerax(), cy = cameray();
    if (this.x < cx - this.sprite_width / 2 || this.y < cy - this.sprite_height / 2 || this.y > cy + 480 + this.sprite_height / 2) {
      instance_destroy(this);
      return;
    }
    if (!this.init) {
      if (this.difficulty === 0) this.sprite_index = 'spr_knight_bullet_star_easy';
      this.init = true;
    }
    this.grazetimer += 1;
    if (this.grazetimer % 4 === 0) this.grazed = 0;
    if (this.con === 0) {
      this.image_xscale += this.growspeed;
      this.image_yscale += this.growspeed;
    } else if (this.con === 1) {
      this.friction = 0.5;
      this.con += 1;
    } else if (this.con === 2) {
      this.mask_index = 'spr_knight_bullet_star_mask';
      if (this.speed === 0) {
        this.gravity = 0.1;
        this.gravity_direction = this.direction - 180;
        this.friction = 0;
      }
      this.timer += 1;
      if (this.timer >= 40) {
        this.timer = 0;
        this.con += 1;
        if (this.playSound) snd_play('snd_explosion_firework');
      }
      this.growstart = this.image_xscale;
    } else if (this.con === 3) {
      this.timer += 1;
      this.image_xscale = this.growstart + clamp01(this.timer / 2);
      this.image_yscale = this.growstart + clamp01(this.timer / 2);
      if (this.timer === 3) {
        let ang = 90;
        if (this.difficulty === 2) ang += this.side;
        for (let i = 0; i < 6; i++) {
          const d = scr_childbullet(this, this.x, this.y, 'obj_knight_pointing_starchild');
          d.image_angle = ang;
          d.direction = ang;
          if (this.difficulty === 0 && i % 2 === 1) {
            d.speed = 1;
            d.lifetime = 30;
          } else d.speed = 4;
          d.image_xscale = this.image_xscale * 0.5;
          d.image_yscale = this.image_yscale * 0.5;
          d.deceleration = 0.15;
          if (this.difficulty === 2 && i % 3 > 0) {
            d.difficulty = -1;
            d.lifetime = 30;
            d.speed = 2;
            const f = i === 1 || i === 4 ? 1 / 3 : 2 / 3;
            d.speed *= f;
            d.minspeed *= f;
            d.deceleration *= f;
            d.sprite_index = 'spr_knight_starchild_trail';
          } else d.difficulty = this.difficulty;
          if (i === 1 || i === 4) ang += this.difficulty === 2 ? 180 : 48;
          else ang += this.difficulty === 2 ? 0 : 66;
        }
        this.active = false;
      }
      if (this.timer >= 4) {
        this.image_xscale = (this.sprite_width + 16) / sprite_get_width(this.sprite_index);
        this.image_yscale = (this.sprite_height + 16) / sprite_get_height(this.sprite_index);
        const a = scr_afterimage(this);
        a.fadeSpeed *= 3;
        instance_destroy(this);
      }
    }
  }
  draw() {
    const xs = (this.sprite_width + 16) / sprite_get_width(this.sprite_index);
    const ys = (this.sprite_height + 16) / sprite_get_height(this.sprite_index);
    const color = merge_color(0x808080, 0xff0000, clamp01(this.timer / 30));
    const alpha = (Math.sin(this.timer * 3) + 1) * 0.25;
    // At con 0 the star is only drawn by the cone, into its surface (user0).
    if (this.con === 2 || this.con === 3) {
      let a = 1, len = 120, prog = clamp01(this.timer / 30);
      if (this.con === 2) {
        a = clamp01(prog - alpha);
        len = 50 * clamp01(prog - (this.timer % 2) * 0.75) + 50;
      }
      let off = 66;
      const sub = this.difficulty >= 1 ? len : len / 2;
      draw_set_blend_mode(1);
      let bc = this.difficulty >= 2 ? color : 0xffffff;
      if (this.difficulty === 2) {
        prog = scr_ease_in(clamp01(this.timer / 20), 4);
        off = this.con === 3 ? 5 : lerp(66, 5, prog);
        bc = color;
        if (this.timer >= 30) {
          prog = scr_ease_in(clamp01((this.timer - 30) / 10), 4);
          len += 50 - prog * 50;
        }
        const sd = this.side;
        scr_draw_beam_color(this.x, this.y, len, 10, 90 + sd, bc, 0, a, false);
        scr_draw_beam_color(this.x, this.y, len, 10, -90 + sd, bc, 0, a, false);
        for (const o of [90 + sd + off, 90 + sd - off, -90 + sd + off, -90 + sd - off]) scr_draw_beam_color(this.x, this.y, sub, 10, o, bc, 0, a, false);
      } else {
        scr_draw_beam_color(this.x, this.y, len, 10, 90, bc, 0, a, false);
        for (const o of [156, 24, 270]) scr_draw_beam_color(this.x, this.y, sub, 10, o, 0xffffff, 0, a, false);
        scr_draw_beam_color(this.x, this.y, len, 10, 336, bc, 0, a, false);
        scr_draw_beam_color(this.x, this.y, len, 10, 204, bc, 0, a, false);
      }
      draw_set_blend_mode(0);
    }
    if (this.con === 1 || this.con === 2) {
      draw_sprite_ext(this.sprite_index, 1, this.x, this.y, xs + 0.1, ys + 0.1, this.image_angle, 0xffffff, alpha);
      draw_sprite_ext(this.sprite_index, 0, this.x, this.y, xs, ys, this.image_angle, color, 1);
    }
    if (this.con === 3 || this.con === 4) {
      draw_sprite_ext(this.sprite_index, 2, this.x, this.y, xs + 0.1, ys + 0.1, this.image_angle, 0xffffff, (Math.sin(this.timer * 6) + 1) * 0.25);
      draw_sprite_ext(this.sprite_index, 2, this.x, this.y, xs, ys, this.image_angle, 0xffffff, 1);
    }
  }
}
defineObject('obj_knight_pointing_star', PointingStar);

class PointingStarchild extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_starchild_parts';
  }
  create() {
    super.create();
    this.deceleration = 0.1;
    this.minspeed = 1;
    this.timer = 0;
    this.drawtimer = 0;
    this.damage = 1;
    this.element = 5;
    this.lifetime = 60;
    this.difficulty = 0;
    this.con = 0;
    this.tracking = true;
    this.target_angle = 0;
    this.rotation = 0;
    this.delay = 0;
    this.init = false;
    this.ease = 0;
    this.xscale_start = 0;
    this.yscale_start = 0;
    this.outline = 0;
  }
  user5() {
    this.target = 3;
    this.damage = 75;
    const k = first('obj_knight_enemy');
    if (k) k.aoedamage = true;
    const h = first('obj_heart');
    if (this.active == 1 && h && scr_precise_hit(this, h.sprite_index === 'spr_dodgeheart_smaller_2px' ? 1 : 5)) {
      if (first('obj_knight_roaring2')) k?.user2();
      else S.scr_damage_all(this);
      if (this.destroyonhit === 1) instance_destroy(this);
    }
    if (k) k.aoedamage = false;
  }
  step() {
    if (!this.init) {
      this.init = true;
      if (this.difficulty >= 2) {
        this.delay = 25;
        for (const dc of instancesOf('obj_dbulletcontroller')) {
          this.delay += dc.delay;
          if (dc.subdelay === 4) {
            dc.subdelay = 0;
            dc.delay += 5;
          } else {
            dc.subdelay += 1;
            dc.delay += 1;
          }
        }
      }
    }
    super.step();
    if (!this.alive || first('obj_knight_roaring2')) return;
    if (this.con <= 2) {
      if (this.speed > this.minspeed) this.speed = scr_movetowards(this.speed, this.minspeed, this.deceleration);
      if (this.con === 0 && this.delay > 0) {
        this.timer += 1;
        if (this.timer >= this.delay) {
          if (!scr_onscreen_tolerance(this, 10)) instance_destroy(this);
          this.timer = 0;
          this.con = 1;
        }
      }
    }
    const f = first('obj_heart_follower') || first('obj_heart');
    if (this.con >= 1 && this.con <= 3 && f) {
      this.target_angle = point_direction(this.x, this.y, f.x + 10, f.y + 10);
      if (this.con >= 2 && this.tracking) {
        const diff = angle_difference(this.target_angle, this.direction);
        if (Math.abs(diff) < 90) {
          if (this.con < 3) {
            this.direction = scr_rotatetowards(this.direction, this.target_angle, 2);
            this.image_angle = this.direction;
          } else if (Math.abs(diff) <= 4) this.rotation = 0;
          else if (Math.abs(diff) > 30) this.rotation = Math.sign(diff) * 2;
          else this.rotation = Math.sign(diff);
        } else if (this.con >= 3) {
          this.tracking = false;
          this.rotation = Math.sign(this.rotation);
        }
      } else {
        this.direction += this.rotation;
        this.image_angle += this.rotation;
      }
    }
    if (this.con === 1) {
      this.image_angle = scr_angle_lerp(this.direction, this.target_angle, this.timer / 10);
      this.timer += 1;
      if (this.timer >= 10) {
        this.timer = 0;
        this.con = 2;
        this.direction = this.image_angle;
        this.tracking = true;
      }
      if (this.xscale_start === 0) this.xscale_start = this.image_xscale;
      if (this.yscale_start === 0) this.yscale_start = this.image_yscale;
      const c = Math.cos(this.timer / 5 * Math.PI);
      this.image_yscale = this.yscale_start * c;
      this.image_blend = merge_color(0xffffff, 0, c);
      this.outline = merge_color(0, 0xff0000, c);
    }
    if (this.con === 2) {
      this.timer += 1;
      if (this.timer >= 10) {
        this.timer = 0;
        this.con = 3;
      }
    }
    if (this.con >= 1 && this.ease < 40) {
      const sp = (1 - this.ease / 40) * 2;
      this.x -= lengthdir_x(sp, this.target_angle);
      this.y -= lengthdir_y(sp, this.target_angle);
      this.ease += 1;
    }
    if (this.con === 3) {
      this.speed = scr_movetowards(this.speed, 25, 0.5);
      this.image_xscale = this.xscale_start + this.speed / 60;
      this.image_yscale = this.yscale_start - this.speed / 90;
      scr_custom_afterimage(this, 'obj_afterimage_blend');
      const a = scr_custom_afterimage(this, 'obj_afterimage_blend');
      a.image_blend = 0xff0000;
      a.fadeSpeed = 0.25;
      a.image_alpha = 0.5;
      a.direction = this.image_angle;
      a.speed = 1;
    }
  }
  draw() {
    draw_set_blend_mode(1);
    this.drawtimer += 1;
    const glow = scr_pingpong(this.drawtimer, 2) / 4;
    let gc = 0xffffff;
    if (this.con >= 1) gc = this.con > 1 ? 0xff0000 : merge_color(0xffffff, 0xff0000, this.timer / 10);
    scr_draw_outline(this, this.image_xscale, gc, glow * this.image_alpha);
    if (this.con > 0) draw_sprite_ext(this.sprite_index, 1, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.outline, this.image_alpha);
    draw_set_blend_mode(0);
    draw_sprite_ext(this.sprite_index, 0, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    if (this.difficulty < 2) {
      this.image_alpha = clamp01(remap(this.lifetime - 15, this.lifetime, 1, 0, this.drawtimer));
      if (this.image_alpha < 1) this.active = false;
      if (this.image_alpha === 0) instance_destroy(this);
    }
  }
}
defineObject('obj_knight_pointing_starchild', PointingStarchild);
