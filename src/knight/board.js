// The bullet board (Chapter 3): obj_battlesolid (parent of every wall), obj_growtangle (with the
// custom-size boxes built from the nine-slice spr_battlebg_stretch), obj_battle_cleanup,
// obj_fake_gt (draws the box with an offset while it shakes), obj_heart_follower(_overshoot).
import {
  Instance, defineObject, instance_create, instance_destroy, instance_exists, instancesOf, merge_color, round,
  draw_sprite_ext, draw_self, draw_clear_alpha, surface_create, surface_set_target, surface_reset_target, surface_free,
  sprite_create_from_surface, sprite_exists, sprite_delete, getSprite, clamp,
} from '../runtime/gm.js?v=20261031172539';
import { first, scr_movetowards, heartRef } from './common.js?v=20261031172539';
import { BulletParent } from './bullets.js?v=20261031172539';

// Nine-slice borders of the stretchable box sprites (left, top, right, bottom).
export function setupNineSlices() {
  const a = getSprite('spr_battlebg_stretch'), b = getSprite('spr_battlebg_stretch_hitbox');
  if (a && !a.nine) a.nine = [2, 2, 2, 2];
  if (b && !b.nine) b.nine = [4, 4, 4, 4];
}

export class BattleSolid extends Instance {}
defineObject('obj_battlesolid', BattleSolid);

export class Growtangle extends BattleSolid {
  constructor() {
    super();
    this.sprite_index = 'spr_battlebg_0';
    this.mask_index = 'spr_battlebg_0';
    // object_get_depth (__global_object_depths): behind the SOUL (depth 1).
    this.depth = 5;
  }
  create() {
    setupNineSlices();
    this.image_xscale = 0;
    this.image_yscale = 0;
    this.image_alpha = 0.3;
    this.timer = 0;
    this.maxtimer = 15;
    this.growcon = 1;
    this.image_speed = 0;
    // merge_color(c_green, c_lime, 0.5); both are the same in BGR and RGB.
    this.image_blend = merge_color(0x008000, 0x00ff00, 0.5);
    this.target_angle = 0;
    this.fullgrow = 0;
    this.keep = 0;
    this.megakeep = 0;
    this.maxxscale = 2;
    this.maxyscale = 2;
    this.customBox = false;
    this.init = 0;
    this.spr_custom_box = this.sprite_index;
    this.sizer = 0;
    this.growscale = 2;
    this.growth = 0;
  }
  cleanUp() {
    if (this.customBox) {
      const d = instance_create(this.x, this.y, 'obj_battle_cleanup');
      d.custom_box_sprite = this.spr_custom_box;
    }
  }
  step() {
    if (!this.init) {
      if (this.visible && (this.maxxscale !== 2 || this.maxyscale !== 2) && this.sprite_index === 'spr_battlebg_0') {
        this.customBox = true;
        // The object's mask stays spr_battlebg_0 (scaled normally); only the look changes.
        this.sprite_index = 'spr_battlebg_stretch_hitbox';
        if (this.maxxscale % 2 !== 0) this.maxxscale = round(this.maxxscale * 37.5) / 37.5;
        if (this.maxyscale % 2 !== 0) this.maxyscale = round(this.maxyscale * 37.5) / 37.5;
        this.image_xscale = this.maxxscale / 2;
        this.image_yscale = this.maxyscale / 2;
        // A sprite of the box at half size (the nine-slice border stays 2 px), drawn at 2x while growing.
        // The stretched sprite's origin scales with it, so it is drawn (and anchored) at 37 * scale;
        // at a plain 37 the left and top borders fell outside the surface.
        const ox = 37 * this.image_xscale, oy = 37 * this.image_yscale;
        const surf = surface_create(this.sprite_width, this.sprite_height);
        surface_set_target(surf);
        draw_clear_alpha(0, 0);
        draw_sprite_ext('spr_battlebg_stretch', 0, ox, oy, this.image_xscale, this.image_yscale, 0, 0xffffff, 1);
        surface_reset_target();
        this.spr_custom_box = sprite_create_from_surface(surf, 0, 0, this.sprite_width, this.sprite_height, false, false, ox, oy);
        surface_free(surf);
      }
      this.init = 1;
    }
    this.growth = 0;
    if (this.timer < this.maxtimer && this.growcon === 1) this.growth = 1;
    if (this.timer > 0 && this.growcon === 3) this.growth = 1;
    if (this.growth === 1) {
      if (this.growcon === 1) this.timer += 1;
      if (this.growcon === 3) this.timer -= 1;
      this.sizer = this.timer / this.maxtimer;
      this.image_xscale = this.maxxscale * this.sizer;
      this.image_yscale = this.maxyscale * this.sizer;
      this.image_angle = 180 + 180 * (this.timer / this.maxtimer) + this.target_angle;
      this.image_alpha = 0.5 + this.timer / this.maxtimer * 0.5;
      if (this.visible) {
        const d = instance_create(this.x, this.y, 'obj_afterimage');
        d.sprite_index = this.spr_custom_box;
        const s = this.sizer * this.growscale;
        d.image_xscale = s;
        d.image_yscale = s;
        d.image_angle = this.image_angle;
        d.depth = this.depth - 1;
        d.image_blend = this.image_blend;
        d.image_alpha = 1 - this.image_alpha + 0.1;
        d.image_speed = 0;
      }
      if (this.timer >= this.maxtimer && this.growcon === 1) {
        this.growcon = 2;
        this.image_angle = this.target_angle;
      }
      if (this.timer <= 0 && this.growcon === 3) instance_destroy(this);
    }
  }
  endStep() {
    if (this.keep === 1) {
      const h = first('obj_heart');
      if (h && (this.speed !== 0 || this.megakeep === 1)) {
        const lborder = this.x - this.sprite_width / 2;
        const rborder = this.x + this.sprite_width / 2;
        const uborder = this.y - this.sprite_height / 2;
        const dborder = this.y + this.sprite_height / 2;
        if (h.x < lborder + 5) h.x = lborder + 5;
        if (h.x > rborder - 22) h.x = rborder - 22;
        if (h.y < uborder + 5) h.y = uborder + 5;
        if (h.y > dborder - 22) h.y = dborder - 22;
      }
    }
  }
  draw() {
    draw_sprite_ext(this.sprite_index, 1, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    if (this.customBox && this.growth && this.growcon !== 2) {
      const s = this.sizer * this.growscale;
      draw_sprite_ext(this.spr_custom_box, 0, this.x, this.y, s, s, this.image_angle, this.image_blend, this.image_alpha);
    } else draw_self(this);
  }
  // draw_self_offset for obj_fake_gt
  drawOffset(dx, dy) {
    draw_sprite_ext(this.sprite_index, 1, this.x + dx, this.y + dy, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    if (this.customBox && this.growth && this.growcon !== 2) {
      draw_sprite_ext(this.spr_custom_box, 0, this.x + dx, this.y + dy, this.image_xscale / (this.maxxscale / 2), this.image_yscale / (this.maxyscale / 2), this.image_angle, this.image_blend, this.image_alpha);
    } else draw_sprite_ext(this.sprite_index, this.image_index, this.x + dx, this.y + dy, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
  }
}
defineObject('obj_growtangle', Growtangle);

class BattleCleanup extends Instance {
  create() {
    this.custom_box_sprite = null;
    this.alarm[0] = 30;
  }
  alarm0() {
    if (sprite_exists(this.custom_box_sprite)) sprite_delete(this.custom_box_sprite);
    instance_destroy(this);
  }
  step() {
    if (!instance_exists('obj_afterimage')) {
      if (sprite_exists(this.custom_box_sprite)) sprite_delete(this.custom_box_sprite);
      instance_destroy(this);
    }
  }
  draw() {}
}
defineObject('obj_battle_cleanup', BattleCleanup);

// obj_fake_gt: hides obj_growtangle and draws it at (xoffset, yoffset) instead.
class FakeGt extends BulletParent {
  create() {
    this.xoffset = 0;
    this.yoffset = 0;
    const g = first('obj_growtangle');
    if (g) {
      g.visible = false;
      this.depth = g.depth;
    }
  }
  cleanUp() {
    for (const g of instancesOf('obj_growtangle')) g.visible = true;
  }
  endStep() {
    const g = first('obj_growtangle');
    if (!g) return;
    this.x = g.x;
    this.y = g.y;
    this.image_xscale = g.image_xscale;
    this.image_yscale = g.image_yscale;
  }
  draw() {
    for (const g of instancesOf('obj_growtangle')) g.drawOffset(this.xoffset, this.yoffset);
  }
}
defineObject('obj_fake_gt', FakeGt);

// obj_heart_follower: an invisible point that trails the SOUL (stars aim at it).
class HeartFollower extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_hiddenheart';
    this.visible = false;
  }
  create() {
    this.target = 'obj_heart';
    this.depth = heartRef().depth - 5;
    this.smoothing = 0.125;
    this.max_speed = 4;
  }
  step() {
    const t = typeof this.target === 'string' ? first(this.target) : this.target;
    if (!t) return;
    const xdiff = t.x - this.x, ydiff = t.y - this.y;
    this.x = scr_movetowards(this.x, t.x, clamp(Math.abs(xdiff) * this.smoothing, 1, this.max_speed));
    this.y = scr_movetowards(this.y, t.y, clamp(Math.abs(ydiff) * this.smoothing, 1, this.max_speed));
  }
}
defineObject('obj_heart_follower', HeartFollower);

class HeartFollowerOvershoot extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_hiddenheart';
  }
  create() {
    this.target = 'obj_heart';
    this.depth = heartRef().depth - 5;
    this.smoothing = 0.5;
    this.xvelocity = 0;
    this.yvelocity = 0;
    this.max_speed = 8;
  }
  step() {
    const t = typeof this.target === 'string' ? first(this.target) : this.target;
    if (!t) return;
    const xdiff = t.x - this.x, ydiff = t.y - this.y;
    this.xvelocity = scr_movetowards(this.xvelocity, clamp(xdiff, -this.max_speed, this.max_speed), this.smoothing);
    this.yvelocity = scr_movetowards(this.yvelocity, clamp(ydiff, -this.max_speed, this.max_speed), this.smoothing);
    this.x += this.xvelocity;
    this.y += this.yvelocity;
  }
}
defineObject('obj_heart_follower_overshoot', HeartFollowerOvershoot);
