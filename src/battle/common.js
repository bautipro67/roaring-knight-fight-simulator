// Small helpers shared by the battle modules.
import { G, Instance, instance_exists } from '../runtime/gm.js?v=20261031165601';

export const arr = (n, v = 0) => new Array(n).fill(v);
export const arr2 = (n, m, v = 0) => Array.from({ length: n }, () => new Array(m).fill(v));

// __view_get(0/1, 0): the camera; obj_shake moves it.
export const view_x = () => G.camX;
export const view_y = () => G.camY;

// scr_84_get_font(name)
export const fontName = n => 'fnt_' + n;

// Scripts that may be called either as S.scr_x(caller, ...args) or S.scr_x(...args).
export function splitCaller(args) {
  if (args.length && args[0] instanceof Instance) return [args[0], args.slice(1)];
  return [null, args];
}

// GML's with(instance-or-dummy-id): run fn when the reference is a live instance.
export function withInst(ref, fn) {
  if (ref instanceof Instance && ref.alive) fn(ref);
}
export const exists = ref => ref != null && instance_exists(ref);

// GML numbers print without trailing ".0"; integers print as integers.
export function gmlString(v) {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
}

export const subst = (str, ...subs) => {
  let s = String(str);
  subs.forEach((v, i) => { s = s.split('~' + (i + 1)).join(String(v)); });
  return s;
};

// The Roaring Knight (obj_knight_enemy), or null: the Chapter 3 code tests i_ex(obj_knight_enemy).
export const knightEnemy = () => G.instances.find(i => i.alive && i.constructor.objName === 'obj_knight_enemy' || (i.alive && i.isKnightEnemy)) || null;

// draw_sprite_tiled_ext
import { getSprite, draw_sprite_ext } from '../runtime/gm.js?v=20261031165601';
export function draw_sprite_tiled_ext(name, sub, x, y, xs, ys, col, alpha) {
  const spr = getSprite(name);
  if (!spr) return;
  const w = spr.w * xs, h = spr.h * ys;
  const ox = ((x - G.camX) % w + w) % w - w + G.camX, oy = ((y - G.camY) % h + h) % h - h + G.camY;
  for (let yy = oy; yy < G.camY + 480 + h; yy += h)
    for (let xx = ox; xx < G.camX + 640 + w; xx += w) draw_sprite_ext(name, sub, xx, yy, xs, ys, 0, col, alpha);
}
