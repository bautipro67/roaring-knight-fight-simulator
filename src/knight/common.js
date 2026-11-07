// Helpers shared by the Knight / bullet-phase ports (Chapter 3 scripts: easing, lerpvar,
// afterimages, delayed scripts, box queries...) and the generic Chapter 3 effect objects they
// create (obj_afterimage, obj_afterimage_grow, obj_afterimage_blend, obj_lerpvar,
// obj_script_delayed, obj_particle_generic, obj_doom, obj_shakeobj...).
//
// Conventions: GML scripts that read or write the calling instance take it as their first
// argument (scr_afterimage(self), scr_lerpvar(self, 'x', a, b, t)); obj_script_delayed calls
// its function as fn(target, ...args).
import {
  G, global, Instance, defineObject, objectExists, instancesOf, instance_find, instance_create, instance_create_depth,
  instance_destroy, instance_exists, point_direction, point_distance, getSprite, draw_self, draw_set_alpha, draw_set_color,
  draw_rectangle, draw_sprite_ext, lerp, lengthdir_x, lengthdir_y, angle_difference, collision_point, collision_circle,
  collision_rectangle, d3d_set_fog, draw_set_blend_mode, gpu_get_blendmode, sprite_get_width, sprite_get_height,
  sprite_get_xoffset, sprite_get_yoffset, draw_triangle_color, draw_circle, draw_get_alpha, merge_color, random, S,
  defineScript,
} from '../runtime/gm.js?v=20261107201438';
import { snd_play, snd_volume, snd_pitch } from '../runtime/audio.js?v=20261107201438';

export const VIEW_W = 640;
export const VIEW_H = 480;
export const room_width = 640;
export const room_height = 480;
// __view_get(0, 0) / __view_get(1, 0)
export const view_x = () => G.camX;
export const view_y = () => G.camY;
export const camerax = () => G.camX;
export const cameray = () => G.camY;
export const camerawidth = () => 640;
export const cameraheight = () => 480;
export const screenx = x => x - G.camX;
export const screeny = y => y - G.camY;
export const i_ex = t => instance_exists(t);

// GML `obj_x.var` reads the first instance; null when none exists.
export const first = name => instance_find(name, 0);
// GML `obj_x.var = v` writes every instance.
export function setAll(name, key, val) {
  for (const i of instancesOf(name)) i[key] = val;
}

// Stand-ins for reads of instances that may be gone (GameMaker would error instead).
export function heartRef() {
  return first('obj_heart') || { x: G.camX + 310, y: G.camY + 160, depth: 0, alive: false };
}
export function boardRef() {
  return first('obj_growtangle') || { x: G.camX + 320, y: G.camY + 170, sprite_width: 150, sprite_height: 150, image_xscale: 2, image_yscale: 2, alive: false };
}
export function enemyRef() {
  return first('obj_knight_enemy') || { x: G.camX + 480, y: G.camY + 160, depth: 0, aetimer: 0, visible: true, aoedamage: false, myattackchoice: 0, alive: false };
}

export function move_towards_point(inst, x, y, sp) {
  inst.direction = point_direction(inst.x, inst.y, x, y);
  inst.speed = sp;
}

export const scr_84_get_sound = name => name;

// GameMaker compares reals with an epsilon (math_set_epsilon, default 0.00001), which matters
// for accumulated fractions (0.1 added ten times is not >= 1 in JS but is in GML).
const EPS = 0.00001;
export const lt = (a, b) => a - b < -EPS;
export const gt = (a, b) => a - b > EPS;
export const le = (a, b) => a - b <= EPS;
export const ge = (a, b) => a - b >= -EPS;
export const eq = (a, b) => Math.abs(a - b) <= EPS;

// Marks a class as a child of a GML parent object without touching the registry
// (instancesOf/withObj/isA walk the constructor chain by objName).
export function tagParent(name, Base = Instance) {
  const C = class extends Base {};
  Object.defineProperty(C, 'objName', { value: name, writable: true, configurable: true });
  return C;
}

// Registers a generic object unless another module already did.
export function defineShared(name, cls) {
  if (!objectExists(name)) defineObject(name, cls);
}

// A script provided by the battle modules if they registered it, else the local version.
export const callOr = (name, fallback) => (...args) => (name in S ? S[name](...args) : fallback(...args));

// scr_armorcheck_equipped_party(armor): how many armour slots of the party (global.char) hold it.
export function scr_armorcheck_equipped_party(armor) {
  let n = 0;
  for (let i = 0; i < 3; i++) {
    const c = global.char?.[i];
    if (c == null || c == 0) continue;
    if (global.chararmor1?.[c] == armor) n += 1;
    if (global.chararmor2?.[c] == armor) n += 1;
  }
  return n;
}
if (!('scr_armorcheck_equipped_party' in S)) defineScript('scr_armorcheck_equipped_party', scr_armorcheck_equipped_party);

// ---------------------------------------------------------------- maths (Chapter 3 scripts)

export const clamp01 = v => Math.max(0, Math.min(1, v));
export function scr_movetowards(a, b, amt) {
  if (a === b) return a;
  if (a > b) return Math.max(a - amt, b);
  return Math.min(a + amt, b);
}
export function scr_approach(a, b, amt) {
  if (a < b) {
    a += amt;
    if (a > b) return b;
  } else {
    a -= amt;
    if (a < b) return b;
  }
  return a;
}
export function scr_loop(v, n) {
  if (n === 0) return v;
  let r = v % n;
  if (v < 0) r += n;
  return r;
}
export function scr_loop_ext(v, a, b) {
  const range = b - a;
  if (range === 0) return v;
  const amount = v - a;
  let r = amount % range;
  if (amount < 0) r += range;
  return r + a;
}
export function scr_pingpong(v, n) {
  if (n === 0) return v;
  let r = scr_loop(v, n * 2);
  if (r > n) r = n * 2 - r;
  return r;
}
export function scr_pingpong_ext(v, a, b) {
  const range = b - a;
  if (range === 0) return v;
  let r = scr_loop(v - a, range * 2);
  if (r > range) r = range * 2 - r;
  return r + a;
}
export function scr_rotatetowards(a, b, amt) {
  const d = angle_difference(b, a);
  if (Math.abs(d) > amt) return a + Math.sign(d) * amt;
  return b;
}
export const scr_angle_lerp = (a, b, t) => a + lerp(0, angle_difference(b, a), t);
export const scr_anglechange = (a, b, amt) => Math.max(-amt, Math.min(amt, angle_difference(b, a)));
export const scr_inverselerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (a, b, c, d, v) => lerp(c, d, scr_inverselerp(a, b, v));
export const scr_remapvalue = (a, b, v, c, d) => (b === a ? c : lerp(c, d, (v - a) / (b - a)));
export const scr_even = n => n % 2 === 0;

// ---------------------------------------------------------------- easing

export function ease_out_bounce(t, b, c, d) {
  t /= d;
  if (t < 0.36363636363636365) return c * (7.5625 * t * t) + b;
  if (t < 0.7272727272727273) { t -= 0.5454545454545454; return c * (7.5625 * t * t + 0.75) + b; }
  if (t < 0.9090909090909091) { t -= 0.8181818181818182; return c * (7.5625 * t * t + 0.9375) + b; }
  t -= 0.9545454545454546;
  return c * (7.5625 * t * t + 0.984375) + b;
}
export const ease_in_bounce = (t, b, c, d) => c - ease_out_bounce(d - t, 0, c, d) + b;
export function ease_inout_bounce(t, b, c, d) {
  if (t < d * 0.5) return ease_in_bounce(t * 2, 0, c, d) * 0.5 + b;
  return ease_out_bounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
}
export function ease_in_elastic(t, b, c, d) {
  let s = 1.70158, p = 0, a = c;
  if (t === 0 || a === 0) return b;
  t /= d;
  if (t === 1) return b + c;
  if (p === 0) p = d * 0.3;
  if (a < Math.abs(c)) { a = c; s = p * 0.25; } else s = p / (2 * Math.PI) * Math.asin(c / a);
  t -= 1;
  return -(a * Math.pow(2, 10 * t) * Math.sin((t * d - s) * 2 * Math.PI / p)) + b;
}
export function ease_out_elastic(t, b, c, d) {
  let s = 1.70158, p = 0, a = c;
  if (t === 0 || c === 0) return b;
  t /= d;
  if (t === 1) return b + c;
  if (!p) p = d * 0.3;
  if (a < Math.abs(c)) { a = c; s = p * 0.25; } else s = p / (2 * Math.PI) * Math.asin(c / a);
  return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * 2 * Math.PI / p) + c + b;
}
export function ease_inout_elastic(t, b, c, d) {
  let s = 1.70158, p = 0, a = c;
  if (t === 0 || a === 0) return b;
  t /= d * 0.5;
  if (t === 2) return b + c;
  if (!p) p = d * 0.44999999999999996;
  if (a < Math.abs(c)) { a = c; s = p * 0.25; } else s = p / (2 * Math.PI) * Math.asin(c / a);
  if (t < 1) { t -= 1; return -0.5 * (a * Math.pow(2, 10 * t) * Math.sin((t * d - s) * 2 * Math.PI / p)) + b; }
  t -= 1;
  return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * 2 * Math.PI / p) * 0.5 + c + b;
}
export function ease_in_back(t, b, c, d) {
  const s = 1.70158;
  t /= d;
  return c * t * t * ((s + 1) * t - s) + b;
}
export function ease_out_back(t, b, c, d, s = 1.70158) {
  t = t / d - 1;
  return c * (t * t * ((s + 1) * t + s) + 1) + b;
}
export function ease_inout_back(t, b, c, d) {
  let s = 1.70158;
  t = (t / d) * 2;
  if (t < 1) { s *= 1.525; return c * 0.5 * (t * t * ((s + 1) * t - s)) + b; }
  t -= 2;
  s *= 1.525;
  return c * 0.5 * (t * t * ((s + 1) * t + s) + 2) + b;
}
export function scr_ease_in(t, n) {
  if (n < -3 || n > 7) return t;
  switch (n) {
    case -3: return ease_in_bounce(t, 0, 1, 1);
    case -2: return ease_in_elastic(t, 0, 1, 1);
    case -1: { const s = 1.70158; return t * t * ((s + 1) * t - s); }
    case 0: return t;
    case 1: return -Math.cos(t * 1.5707963267948966) + 1;
    case 6: return Math.pow(2, 10 * (t - 1));
    case 7: return -(Math.sqrt(1 - t * t) - 1);
    default: return Math.pow(t, n);
  }
}
export function scr_ease_out(t, n) {
  if (n < -3 || n > 7) return t;
  switch (n) {
    case -3: return ease_out_bounce(t, 0, 1, 1);
    case -2: return ease_out_elastic(t, 0, 1, 1);
    case -1: return ease_out_back(t, 0, 1, 1);
    case 0: return t;
    case 1: return Math.sin(t * 1.5707963267948966);
    case 2: return -t * (t - 2);
    case 6: return -Math.pow(2, -10 * t) + 1;
    case 7: t -= 1; return Math.sqrt(1 - t * t);
    default:
      t -= 1;
      if (n === 4) return -1 * (Math.pow(t, n) - 1);
      return Math.pow(t, n) + 1;
  }
}
export function scr_ease_inout(t, n) {
  if (n < -3 || n > 7) return t;
  if (n === -3) return ease_inout_bounce(t, 0, 1, 1);
  if (n === -2) return ease_inout_elastic(t, 0, 1, 1);
  if (n === -1) return ease_inout_back(t, 0, 1, 1);
  if (n === 1) return -0.5 * Math.cos(Math.PI * t - 1);
  if (n === 0) return t;
  t *= 2;
  if (t < 1) return 0.5 * scr_ease_in(t, n);
  t -= 1;
  return 0.5 * (scr_ease_out(t, n) + 1);
}
export const lerp_ease_in = (a, b, t, n) => lerp(a, b, scr_ease_in(t, n));
export const lerp_ease_out = (a, b, t, n) => lerp(a, b, scr_ease_out(t, n));
export const lerp_ease_inout = (a, b, t, n) => lerp(a, b, scr_ease_inout(t, n));
export function lerp_ease_ext(a, b, easeIn, easeOut, t, n) {
  if (easeIn && !easeOut) return lerp(a, b, scr_ease_in(t, n));
  if (!easeIn && easeOut) return lerp(a, b, scr_ease_out(t, n));
  if (easeIn && easeOut) return lerp(a, b, scr_ease_inout(t, n));
  return lerp(a, b, t);
}

// ---------------------------------------------------------------- sound helpers

export function snd_play_pitch(name, pitch) {
  const v = snd_play(name);
  if (v) snd_pitch(v, pitch);
  return v;
}
export function snd_play_x(name, vol, pitch) {
  const v = snd_play(name);
  if (v) {
    snd_volume(v, vol, 0);
    snd_pitch(v, pitch);
  }
  return v;
}

// ---------------------------------------------------------------- bullets and the box

// scr_bullet_init (caller scope)
export function scr_bullet_init(self) {
  self.grazed = 0;
  self.grazetimer = 0;
  self.destroyonhit = 1;
  self.target = 0;
  self.inv = 60;
  self.damage = 10;
  self.element = 0;
  self.grazepoints = 1;
  self.timepoints = 1;
  self.active = 1;
  self.updateimageangle = 0;
}

// scr_childbullet(x, y, obj[, parent]): a new bullet that copies the parent's damage settings.
export function scr_childbullet(self, x, y, obj, parent = self) {
  const c = instance_create(x, y, obj);
  if (parent.damage !== -1 && parent.damage !== undefined) c.damage = parent.damage;
  if (parent.grazepoints !== -1 && parent.grazepoints !== undefined) c.grazepoints = parent.grazepoints;
  if (parent.timepoints !== -1 && parent.timepoints !== undefined) c.timepoints = parent.timepoints;
  if (parent.inv !== -1 && parent.inv !== undefined) c.inv = parent.inv;
  if (parent.target !== -1 && parent.target !== undefined) c.target = parent.target;
  if (parent.grazed !== -1 && parent.grazed !== undefined) c.grazed = parent.grazed;
  if (parent.grazetimer !== -1 && parent.grazetimer !== undefined) c.grazetimer = parent.grazetimer;
  c.element = parent.element;
  return c;
}

// scr_bullet_inherit(bullet), Chapter 3 version (caller scope).
export function scr_bullet_inherit(self, b) {
  if (!b || !b.alive) return;
  if (self.damage !== -1) b.damage = self.damage;
  if (self.grazepoints !== -1) b.grazepoints = self.grazepoints;
  if (self.timepoints !== -1) b.timepoints = self.timepoints;
  if (self.inv !== -1) b.inv = self.inv;
  if (self.target !== -1) b.target = self.target;
  if (self.grazed !== -1) b.grazed = 0;
  if (self.grazetimer !== -1) b.grazetimer = 0;
  if (self.object_index === 'obj_dbulletcontroller') {
    b.creatorid = self.creatorid;
    b.creator = self.creator;
  }
  b.element = self.element;
}

// scr_fire_bullet(x, y, obj, dir, speed[, sprite, updateimageangle, inherit, depth])
export function scr_fire_bullet(self, x, y, obj, dir, spd, sprite = null, updateangle = 0, inherit = false, depth = 87135) {
  const b = depth !== 87135 ? instance_create_depth(x, y, depth, obj) : instance_create(x, y, obj);
  b.direction = dir;
  b.speed = spd;
  if (sprite !== null && sprite !== -4) b.sprite_index = sprite;
  b.updateimageangle = updateangle;
  if (updateangle) b.image_angle = dir;
  if (inherit) scr_bullet_inherit(self, b);
  return b;
}

// scr_get_box(side): 0 right, 1 top, 2 left, 3 bottom, 4 centre x, 5 centre y of obj_growtangle.
export function scr_get_box(n) {
  const b = boardRef();
  switch (n) {
    case 0: return b.x + b.sprite_width * 0.5;
    case 1: return b.y - b.sprite_height * 0.5;
    case 2: return b.x - b.sprite_width * 0.5;
    case 3: return b.y + b.sprite_height * 0.5;
    case 4: return b.x;
    case 5: return b.y;
  }
  return 0;
}
export const gt_maxx = () => scr_get_box(0);
export const gt_minx = () => scr_get_box(2);
export const gt_maxy = () => scr_get_box(3);
export const gt_miny = () => scr_get_box(1);

// scr_heartclamp(xpad, ypad): keeps the SOUL inside obj_growtangle.
export function scr_heartclamp(xp = 0, yp = 0) {
  const b = first('obj_growtangle');
  if (!b) return;
  for (const h of instancesOf('obj_heart')) {
    const xthick = b.image_xscale * 2 + 1, ythick = b.image_yscale * 2 + 1;
    h.x = Math.max(scr_get_box(2) + xthick + xp, Math.min(h.x, scr_get_box(0) - (20 + xthick + xp)));
    h.y = Math.max(scr_get_box(1) + ythick + yp, Math.min(h.y, scr_get_box(3) - (20 + ythick + yp)));
  }
}

// scr_precise_hit(size, circle): does this bullet's mask touch the SOUL's centre area?
export function scr_precise_hit(self, size = 3, circle = false) {
  const h = first('obj_heart');
  if (!h) return null;
  size /= 2;
  const hx = h.x + 10, hy = h.y + 10;
  if (size <= 0) return collision_point(hx, hy, self, true);
  if (circle) return collision_circle(hx, hy, size, self, true);
  return collision_rectangle(hx - size, hy - size, hx + size, hy + size, self, true);
}

export function scr_at_player(self, x = self.x, y = self.y) {
  const h = heartRef();
  return point_direction(x, y, h.x + 10, h.y + 10);
}

export function scr_bulletparent_count() {
  return instancesOf('obj_bulletparent').filter(i => i.object_index === 'obj_bulletparent').length;
}

export function scr_darksize(inst) {
  inst.image_xscale = 2;
  inst.image_yscale = 2;
}

export function scr_onscreen_tolerance(obj, spacer) {
  return !(obj.x + obj.sprite_width + spacer < camerax() || obj.x - spacer > camerax() + 640
    || obj.y + obj.sprite_height + spacer < cameray() || obj.y - spacer > cameray() + 480);
}

export function scr_orbitaroundpoint(self, cx, cy, ang) {
  let t = point_direction(cx, cy, self.x, self.y);
  const r = point_distance(cx, cy, self.x, self.y);
  t += ang;
  self.x = cx + lengthdir_x(r, t);
  self.y = cy + lengthdir_y(r, t);
}

export function scr_obj_movetowards_point(self, x, y, spd) {
  const d = point_distance(self.x, self.y, x, y);
  if (spd >= d) { self.x = x; self.y = y; } else {
    const dir = point_direction(self.x, self.y, x, y);
    self.x += lengthdir_x(spd, dir);
    self.y += lengthdir_y(spd, dir);
  }
}

// ---------------------------------------------------------------- afterimages and markers

function copyLook(self, a) {
  a.sprite_index = self.sprite_index;
  a.image_index = self.image_index;
  a.image_blend = self.image_blend;
  a.image_speed = 0;
  a.image_xscale = self.image_xscale;
  a.image_yscale = self.image_yscale;
  a.image_angle = self.image_angle;
  return a;
}
// scr_afterimage (caller scope)
export function scr_afterimage(self) {
  const a = copyLook(self, instance_create(self.x, self.y, 'obj_afterimage'));
  a.depth = self.depth;
  return a;
}
export function scr_afterimagefast(self) {
  const a = scr_afterimage(self);
  a.fadeSpeed = 0.08;
  return a;
}
export function scr_afterimage_grow(self) {
  const a = copyLook(self, instance_create(self.x, self.y, 'obj_afterimage_grow'));
  a.depth = self.depth;
  return a;
}
// scr_custom_afterimage(obj): an afterimage of another object type, one depth behind.
export function scr_custom_afterimage(self, obj) {
  const a = copyLook(self, instance_create(self.x, self.y, obj));
  a.depth = self.depth + 1;
  return a;
}
export function scr_custom_afterimage_ext(self, obj, spr, sub, x, y, xs, ys) {
  const a = instance_create(x, y, obj);
  a.sprite_index = spr;
  a.image_index = sub;
  a.image_blend = self.image_blend;
  a.image_speed = 0;
  a.depth = self.depth + 1;
  a.image_angle = self.image_angle;
  a.image_xscale = xs;
  a.image_yscale = ys;
  return a;
}

export function scr_marker(x, y, spr) {
  const m = instance_create(x, y, 'obj_marker');
  m.sprite_index = spr;
  m.image_speed = 0;
  return m;
}
// scr_dark_marker(x, y, sprite)
export function scr_dark_marker(x, y, spr) {
  const m = scr_marker(x, y, spr);
  m.image_xscale = 2;
  m.image_yscale = 2;
  return m;
}

// scr_doom(target, frames): destroys target after that many frames.
export function scr_doom(target, frames) {
  const d = instance_create_depth(0, 0, 0, 'obj_doom');
  d.alarm[0] = frames;
  d.target = target;
  return d;
}

export function scr_shakeobj(self, target = self, amt = -1, reduct = -1) {
  const s = instance_create(self.x, self.y, 'obj_shakeobj');
  s.target = target && target.alive ? target : self;
  if (amt !== -1) s.shakeamt = amt;
  if (reduct !== -1) s.shakereduct = reduct;
  s.user0();
  return s;
}
export const scr_shakescreen = () => instance_create(0, 0, 'obj_shake');

// ---------------------------------------------------------------- lerpvar / delayed scripts

// scr_lerpvar_instance(target, var, from, to, frames[, easetype, "in"|"out"|"inout"])
export function scr_lerpvar_instance(target, varname, a, b, time, easetype, easeinout) {
  const l = instance_create(0, 0, 'obj_lerpvar');
  l.target = target;
  l.varname = varname;
  l.pointa = a;
  l.pointb = b;
  l.maxtime = time;
  if (easetype !== undefined) l.easetype = easetype;
  if (easeinout !== undefined) l.easeinout = easeinout;
  return l;
}
export const scr_lerpvar = (self, ...args) => scr_lerpvar_instance(self, ...args);
export const scr_lerp_var_instance = scr_lerpvar_instance;

// scr_script_delayed(fn, delay, ...args): fn(target, ...args) after `delay` frames.
export function scr_script_delayed(self, fn, delay, ...args) {
  const d = instance_create(0, 0, 'obj_script_delayed');
  d.script = fn;
  d.alarm[0] = delay;
  d.target = self;
  d.script_arg = args;
  d.arg_count = args.length;
  return d;
}
// scr_script_repeat(fn, max_time, rate, ...args)
export function scr_script_repeat(self, fn, maxTime, rate, ...args) {
  const d = instance_create(0, 0, 'obj_script_delayed');
  d.script = fn;
  d.alarm[0] = -2;
  d.max_time = maxTime;
  d.rate = rate;
  d.constant = 1;
  d.target = self;
  d.script_arg = args;
  d.arg_count = args.length;
  return d;
}
export const scr_var = (self, name, value) => { self[name] = value; };
export const scr_var_delayed = (self, name, value, delay) => scr_script_delayed(self, scr_var, delay, name, value);

// ---------------------------------------------------------------- drawing helpers

// d3d_set_fog(true, colour, ...) + draw_sprite_ext: the sprite as a solid-colour silhouette.
export function draw_sprite_fog(name, sub, x, y, xs, ys, rot, color, alpha) {
  d3d_set_fog(true, color);
  draw_sprite_ext(name, sub, x, y, xs, ys, rot, 0xffffff, alpha);
  d3d_set_fog(false);
}

// scr_draw_outline(size, colour, alpha): four fogged copies of the caller around itself.
export function scr_draw_outline(self, size, color, alpha) {
  let xa = size, xb = 0, ya = 0, yb = size;
  if (self.image_angle % 90 !== 0) {
    xa = lengthdir_x(size, self.image_angle);
    xb = lengthdir_x(size, self.image_angle + 90);
    ya = lengthdir_y(size, self.image_angle + 90);
    yb = lengthdir_y(size, self.image_angle);
  }
  d3d_set_fog(true, color);
  const s = self, a = s.image_alpha * alpha;
  draw_sprite_ext(s.sprite_index, s.image_index, s.x + xa, s.y + ya, s.image_xscale, s.image_yscale, s.image_angle, 0xffffff, a);
  draw_sprite_ext(s.sprite_index, s.image_index, s.x - xa, s.y - ya, s.image_xscale, s.image_yscale, s.image_angle, 0xffffff, a);
  draw_sprite_ext(s.sprite_index, s.image_index, s.x + xb, s.y + yb, s.image_xscale, s.image_yscale, s.image_angle, 0xffffff, a);
  draw_sprite_ext(s.sprite_index, s.image_index, s.x - xb, s.y - yb, s.image_xscale, s.image_yscale, s.image_angle, 0xffffff, a);
  d3d_set_fog(false);
}
// scr_draw_outline_ext(sprite, sub, x, y, xs, ys, angle, colour, alpha, size)
export function scr_draw_outline_ext(spr, sub, x, y, xs, ys, ang, color, alpha, size) {
  let xa = size, xb = 0, ya = 0, yb = size;
  if (ang % 90 !== 0) {
    xa = lengthdir_x(size, ang);
    xb = lengthdir_x(size, ang + 90);
    ya = lengthdir_y(size, ang + 90);
    yb = lengthdir_y(size, ang);
  }
  d3d_set_fog(true, color);
  draw_sprite_ext(spr, sub, x + xa, y + ya, xs, ys, ang, 0xffffff, alpha);
  draw_sprite_ext(spr, sub, x - xa, y - ya, xs, ys, ang, 0xffffff, alpha);
  draw_sprite_ext(spr, sub, x + xb, y + yb, xs, ys, ang, 0xffffff, alpha);
  draw_sprite_ext(spr, sub, x - xb, y - yb, xs, ys, ang, 0xffffff, alpha);
  d3d_set_fog(false);
}

// scr_draw_beam_color(x, y, length, width, angle, colour_base, colour_tip, alpha, round_tip)
export function scr_draw_beam_color(x, y, len, width, ang, c1, c2, alpha, roundTip) {
  const e0x = x + lengthdir_x(len, ang), e0y = y + lengthdir_y(len, ang);
  const e1x = x + lengthdir_x(len, ang + width / 2), e1y = y + lengthdir_y(len, ang + width / 2);
  const e2x = x + lengthdir_x(len, ang - width / 2), e2y = y + lengthdir_y(len, ang - width / 2);
  const prev = draw_get_alpha();
  draw_set_alpha(alpha);
  if (roundTip) draw_circle(e0x, e0y, width / 2, false);
  // The tip colour fades into the base; drawn as a gradient strip of thin triangles.
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const col = merge_color(c1, c2, (t0 + t1) / 2);
    const ax = lerp(e1x, e2x, t0), ay = lerp(e1y, e2y, t0), bx = lerp(e1x, e2x, t1), by = lerp(e1y, e2y, t1);
    draw_triangle_color(x, y, ax, ay, bx, by, c1, col, col, false);
  }
  draw_set_alpha(prev);
}

// draw_sprite_ext_centerscale(sprite, sub, x, y, xs, ys, rot, col, alpha) (caller scope)
export function draw_sprite_ext_centerscale(self, spr, sub, x, y, xs, ys, rot, col, alpha) {
  const xoff = sprite_get_xoffset(spr) * self.image_xscale, yoff = sprite_get_yoffset(spr) * self.image_yscale;
  const w = sprite_get_width(spr) * self.image_xscale, h = sprite_get_height(spr) * self.image_yscale;
  draw_sprite_ext(spr, sub, x - (w - xoff) * (xs - self.image_xscale) / 2, y - (h - yoff) * (ys - self.image_yscale) / 2, xs, ys, rot, col, alpha);
}

// ---------------------------------------------------------------- generic effect objects (Chapter 3)

export class Afterimage extends Instance {
  create() { this.fadeSpeed = 0.04; }
  step() {
    this.image_alpha -= this.fadeSpeed;
    if (this.image_alpha < 0) instance_destroy(this);
  }
}
defineObject('obj_afterimage', Afterimage);

class AfterimageGrow extends Instance {
  create() {
    this.xrate = 0.2;
    this.yrate = 0.2;
    this.fade = 0.1;
    this.target = null;
    this.destroytime = -1;
  }
  step() {
    if (this.target && this.target.alive) {
      this.x = this.target.x;
      this.y = this.target.y;
    }
    this.image_alpha -= this.fade;
    this.image_xscale += this.xrate;
    this.image_yscale += this.yrate;
    if (this.image_alpha < 0) instance_destroy(this);
    if (this.destroytime > -1) this.destroytime -= 1;
    if (this.destroytime === 0) instance_destroy(this);
  }
}
defineObject('obj_afterimage_grow', AfterimageGrow);

// obj_afterimage_blend: an afterimage drawn with another blend mode (bm_add by default).
class AfterimageBlend extends Afterimage {
  create() {
    this.blendmode = 1;
    this.dest_blend = -4;
    super.create();
  }
  draw() {
    const prev = gpu_get_blendmode();
    draw_set_blend_mode(this.blendmode);
    draw_self(this);
    draw_set_blend_mode(prev);
  }
}
defineObject('obj_afterimage_blend', AfterimageBlend);

class AfterimageGlow extends Instance {
  create() {
    this.fadeSpeed = 0.04;
    this.solidcolor = -1;
  }
  step() {
    this.image_alpha -= this.fadeSpeed;
    if (this.image_alpha < 0) instance_destroy(this);
  }
  draw() {
    draw_set_blend_mode(1);
    if (this.solidcolor !== -1) d3d_set_fog(true, this.solidcolor);
    draw_self(this);
    if (this.solidcolor !== -1) d3d_set_fog(false);
    draw_set_blend_mode(0);
  }
}
defineObject('obj_afterimage_glow', AfterimageGlow);

class AfterimageFadeToWhite extends Instance {
  create() {
    this.fadeSpeed = 0.13;
    this.con = 0;
    this.whitealpha = 0;
  }
  draw() {
    draw_self(this);
    if (this.con === 0) this.whitealpha += this.fadeSpeed;
    if (this.whitealpha >= 1) {
      this.con = 1;
      this.whitealpha = 1;
      this.image_alpha = 0;
    }
    if (this.con === 1) {
      this.whitealpha -= this.fadeSpeed;
      if (this.whitealpha < 0) instance_destroy(this);
    }
    draw_sprite_fog(this.sprite_index, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, 0xffffff, this.whitealpha);
  }
}
defineObject('obj_afterimage_fade_to_white', AfterimageFadeToWhite);

class ParticleGeneric extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pixel_white';
  }
  create() {
    this.fade_rate = 0;
    this.shrink_rate = 0;
    this.timer = -1;
  }
  alarm0() { instance_destroy(this); }
  step() {
    this.image_alpha = scr_approach(this.image_alpha, 0, this.fade_rate);
    this.image_xscale = scr_approach(this.image_xscale, 0, this.shrink_rate);
    this.image_yscale = scr_approach(this.image_yscale, 0, this.shrink_rate);
    if (this.image_xscale === 0 || this.image_yscale === 0) instance_destroy(this);
    if (this.image_alpha === 0) instance_destroy(this);
    this.timer -= 1;
    if (this.timer === 0) instance_destroy(this);
  }
}
defineObject('obj_particle_generic', ParticleGeneric);

class Doom extends Instance {
  alarm0() {
    if (this.target) instance_destroy(this.target);
    instance_destroy(this);
  }
}
defineObject('obj_doom', Doom);

class LerpVar extends Instance {
  create() {
    this.varname = 'variable';
    this.pointa = 0;
    this.pointb = 0;
    this.time = 0;
    this.maxtime = 30;
    this.target = null;
    this.init = 0;
    this.easetype = 0;
    this.easeinout = 'out';
  }
  step() {
    const t = this.target;
    if (!(t && t.alive !== false && (t.alive || t.isGlobal))) {
      instance_destroy(this);
      return;
    }
    if (this.init === 0) {
      if (typeof this.pointa === 'string') this.pointa = t[this.varname];
      this.init = 1;
    }
    this.time += 1;
    const k = this.time / this.maxtime;
    let v;
    if (this.easetype === 0) v = lerp(this.pointa, this.pointb, k);
    else if (this.easeinout === 'in') v = lerp_ease_in(this.pointa, this.pointb, k, this.easetype);
    else if (this.easeinout === 'inout') v = lerp_ease_inout(this.pointa, this.pointb, k, this.easetype);
    else v = lerp_ease_out(this.pointa, this.pointb, k, this.easetype);
    t[this.varname] = v;
    if (this.time >= this.maxtime) instance_destroy(this);
  }
}
defineObject('obj_lerpvar', LerpVar);

class ScriptDelayed extends Instance {
  create() {
    this.script = null;
    this.target = null;
    this.rate = 1;
    this.alarm[0] = 1;
    this.script_arg = [];
    this.arg_count = 0;
    this.constant = 0;
    this.max_time = 0;
    this.timer = 999;
    this.totaltimer = 0;
  }
  alarm0() {
    this.user0();
    instance_destroy(this);
  }
  user0() {
    if (this.target && this.target.alive && typeof this.script === 'function') this.script(this.target, ...this.script_arg);
  }
  step() {
    if (this.constant === 1) {
      if (this.max_time === -1) this.totaltimer = -10;
      this.timer += 1;
      if (this.timer >= this.rate) {
        if (this.target && this.target.alive && this.totaltimer < this.max_time) {
          this.user0();
          this.timer = 0;
        } else instance_destroy(this);
      }
      this.totaltimer += 1;
    }
  }
}
defineObject('obj_script_delayed', ScriptDelayed);

class ShakeObj extends Instance {
  create() {
    this.active = 0;
    this.target = null;
    this.shakeamt = 10;
    this.shakereduct = 2;
    if (global.darkzone === 0) {
      this.shakeamt = 5;
      this.shakereduct = 1;
    }
    this.nowx = 0;
    this.nowy = 0;
    this.on = 1;
  }
  user0() {
    if (this.target && this.target.alive) {
      this.active = 1;
      this.nowx = this.target.x;
      this.nowy = this.target.y;
    } else instance_destroy(this);
  }
  step() {
    if (this.active == 0) instance_destroy(this);
    if (this.active == 1) {
      if (this.target && this.target.alive) {
        this.shakeamt -= this.shakereduct;
        this.on *= -1;
        this.target.x = this.nowx + this.shakeamt * this.on;
        if (this.shakeamt <= 0) instance_destroy(this);
      } else instance_destroy(this);
    }
  }
}
defineObject('obj_shakeobj', ShakeObj);

class LerpImageBlend extends Instance {
  create() {
    this.blendindex = 0;
    this.color1 = 0xffffff;
    this.color2 = 0;
    this.target = null;
  }
  alarm0() { instance_destroy(this); }
  step() {
    if (this.target && this.target.alive) this.target.image_blend = merge_color(this.color1, this.color2, clamp01(this.blendindex));
    else instance_destroy(this);
  }
}
defineObject('obj_lerpimageblend', LerpImageBlend);
export function scr_lerp_imageblend(self, target, c1, c2, time, style, ease) {
  const l = instance_create(self.x, self.y, 'obj_lerpimageblend');
  l.target = target;
  l.color1 = c1;
  l.color2 = c2;
  l.mylerp = style !== undefined ? scr_lerpvar_instance(l, 'blendindex', 0, 1, time, style, ease) : scr_lerpvar_instance(l, 'blendindex', 0, 1, time);
  l.alarm[0] = time;
  return l;
}

// obj_block_vfx: the sparks of the Knight's block.
class BlockVfx extends Instance {
  create() {
    this.x += -6 + random(12);
    this.y += -6 + random(12);
    this.image_index = 0;
  }
  step() {
    if (this.vspeed < 0) this.vspeed += 0.4;
    if (this.vspeed > 0) this.vspeed -= 0.4;
    if (Math.floor(this.image_index) === 2) this.depth += 1;
    if (Math.floor(this.image_index) === 1) {
      this.image_xscale = 1;
      this.image_yscale = 1;
    }
  }
  animationEnd() { instance_destroy(this); }
}
defineObject('obj_block_vfx', BlockVfx);

class Marker extends Instance {}
defineShared('obj_marker', Marker);

// global.flag[12] = screen shake disabled
const shakeOff = () => !!(global.flag && global.flag[12] === 1);

class Shake extends Instance {
  create() {
    this.camera = 0;
    this.shakespeed = 1;
    this.shakesign = 1;
    this.shakex = 4;
    this.shakey = 4;
    this.active = 0;
    this.permashake = 0;
    this.beenset = 0;
    if (instancesOf('obj_shake').length >= 2) {
      this.active = -1;
      instance_destroy(this);
    }
  }
  step() {
    if (this.active == 0) {
      this.beenset = 1;
      this.mycamerax = G.camX;
      this.mycameray = G.camY;
      if (!shakeOff()) {
        G.camX = this.mycamerax + this.shakex;
        G.camY = this.mycameray + this.shakey;
      }
      this.shakesign = -this.shakesign;
      this.active = 1;
      this.alarm[0] = this.shakespeed;
    }
  }
  alarm0() {
    if (!shakeOff()) {
      G.camX = this.mycamerax + this.shakex * this.shakesign;
      G.camY = this.mycameray + this.shakey * this.shakesign;
    }
    if (this.permashake === 0) {
      if (this.shakex > 0) this.shakex -= 1;
      if (this.shakey > 0) this.shakey -= 1;
    }
    this.shakesign = -this.shakesign;
    this.alarm[0] = this.shakespeed;
    if (this.shakex === 0 && this.shakey === 0) instance_destroy(this);
  }
  onDestroy() {
    if (this.beenset) {
      G.camX = this.mycamerax;
      G.camY = this.mycameray;
    }
  }
}
defineShared('obj_shake', Shake);

// obj_darkener (battle flow; the Knight creates it at talk time). Depth 205.
class Darkener extends Instance {
  constructor() {
    super();
    this.depth = 205; // Chapters 2 and 3 (behind Kris, who stands at 200)
  }
  create() {
    if (instancesOf('obj_darkener').length > 1) instance_destroy(this);
    this.darken = 1;
    this.darkamt = 0;
  }
  draw() {
    if (this.darken === 1) {
      for (const h of instancesOf('obj_heroparent')) h.darkify = 1;
      if (this.darkamt < 15) this.darkamt += 1;
    }
    if (this.darken === 0) {
      for (const g of instancesOf('obj_growtangle')) g.growcon = 3;
      for (const h of instancesOf('obj_heroparent')) h.darkify = 0;
      if (this.darkamt > 0) this.darkamt -= 1;
      if (this.darkamt <= 0) instance_destroy(this);
    }
    draw_set_alpha(this.darkamt / 20);
    draw_set_color(0);
    draw_rectangle(G.camX - 40, G.camY - 40, G.camX + 680, G.camY + 520, false);
    draw_set_alpha(1);
  }
}
defineShared('obj_darkener', Darkener);

export { draw_self };
