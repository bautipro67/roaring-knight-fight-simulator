// Generic effect objects and helpers (markers, afterimages, flashes, camera shake, fades, lerps),
// the Chapter 3 monster parent and enemy helpers, the fight background, and a stand-in enemy.
import {
  global, G, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists,
  draw_sprite_ext, d3d_set_fog, objectExists, lerp, make_color_hsv, merge_color, instancesOf,
} from '../runtime/gm.js?v=20261101025537';
import { splitCaller, draw_sprite_tiled_ext, knightEnemy } from './common.js?v=20261101025537';

// Generic effect objects the Knight modules may also register (their Chapter 3 versions win).
const shared = (name, cls) => { if (!objectExists(name)) defineObject(name, cls); };

class Marker extends Instance {}
shared('obj_marker', Marker);

class Afterimage extends Instance {
  create() { this.fadeSpeed = 0.04; }
  step() {
    this.image_alpha -= this.fadeSpeed;
    if (this.image_alpha < 0) instance_destroy(this);
  }
}
shared('obj_afterimage', Afterimage);

class AfterimageGrow extends Instance {
  create() { this.xrate = 0.2; this.yrate = 0.2; this.fade = 0.1; }
  step() {
    this.image_alpha -= this.fade;
    this.image_xscale += this.xrate;
    this.image_yscale += this.yrate;
    if (this.image_alpha < 0) instance_destroy(this);
  }
}
shared('obj_afterimage_grow', AfterimageGrow);

// scr_afterimage(): copies the caller's look into a fading obj_afterimage.
defineScript('scr_afterimage', (src) => {
  const a = instance_create(src.x, src.y, 'obj_afterimage');
  a.sprite_index = src.sprite_index;
  a.image_index = src.image_index;
  a.image_blend = src.image_blend;
  a.image_speed = 0;
  a.depth = src.depth;
  a.image_xscale = src.image_xscale;
  a.image_yscale = src.image_yscale;
  a.image_angle = src.image_angle;
  return a;
});

defineScript('scr_dark_marker', (...a) => {
  const [, [x, y, spr]] = splitCaller(a);
  const m = instance_create(x, y, 'obj_marker');
  m.sprite_index = spr;
  m.image_speed = 0;
  m.image_xscale = 2;
  m.image_yscale = 2;
  return m;
});

defineScript('scr_marker', (...a) => {
  const [, [x, y, spr]] = splitCaller(a);
  const m = instance_create(x, y, 'obj_marker');
  m.sprite_index = spr;
  m.image_speed = 0;
  return m;
});

// obj_oflash: a white silhouette pulse over its target.
class OFlash extends Instance {
  create() {
    this.flashspeed = 1;
    this.siner = 0;
    this.target = null;
    this.image_speed = 0;
    this.flashcolor = 0xffffff;
  }
  draw() {
    if (instance_exists(this.target)) {
      this.image_index = this.target.image_index;
      this.sprite_index = this.target.sprite_index;
    }
    this.siner += this.flashspeed;
    d3d_set_fog(true, this.flashcolor, 0, 1);
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, Math.sin(this.siner / 3));
    d3d_set_fog(false, 0, 0, 0);
    if (this.siner > 4 && Math.sin(this.siner / 3) < 0) instance_destroy(this);
  }
}
defineObject('obj_oflash', OFlash);

defineScript('scr_oflash', (src) => {
  const o = instance_create(src.x, src.y, 'obj_oflash');
  o.image_xscale = src.image_xscale;
  o.image_speed = 0;
  o.image_index = src.image_index;
  o.image_yscale = src.image_yscale;
  o.sprite_index = src.sprite_index;
  o.depth = src.depth - 1;
  o.target = src;
  return o;
});

// obj_shake: shakes the view (G.camX/G.camY) by 4 px, alternating sign, decaying by 1 per frame.
class Shake extends Instance {
  create() {
    this.camera = 0;
    this.shakespeed = 1;
    this.shakesign = 1;
    this.shakex = 4;
    this.shakey = 4;
    this.siner = 0;
    this.active = 0;
    this.permashake = 0;
    this.camerax = G.camX;
    this.cameray = G.camY;
  }
  step() {
    if (this.active == 0) {
      this.camerax = G.camX;
      this.cameray = G.camY;
      if (!global.flag || global.flag[12] == 0) {
        G.camX = this.camerax + this.shakex;
        G.camY = this.cameray + this.shakey;
      }
      this.shakesign = -this.shakesign;
      this.active = 1;
      this.alarm[0] = this.shakespeed;
    }
  }
  alarm0() {
    if (!global.flag || global.flag[12] == 0) {
      G.camX = this.camerax + this.shakex * this.shakesign;
      G.camY = this.cameray + this.shakey * this.shakesign;
    }
    if (this.permashake == 0) {
      if (this.shakex > 0) this.shakex -= 1;
      if (this.shakey > 0) this.shakey -= 1;
    }
    this.shakesign = -this.shakesign;
    this.alarm[0] = this.shakespeed;
    if (this.shakex == 0 && this.shakey == 0) instance_destroy(this);
  }
  onDestroy() {
    G.camX = this.camerax;
    G.camY = this.cameray;
  }
}
shared('obj_shake', Shake);

// ---------------------------------------------------------------- enemies

// scr_enemy_object_init(): the variables every Chapter 3 enemy starts with.
defineScript('scr_enemy_object_init', (m) => {
  Object.assign(m, {
    becomeflash: 0, flash: 0, turnt: 0, turns: 0, talktimer: 0, state: 0, siner: 0, fsiner: 0, talked: 0,
    attacked: 0, hurt: 0, hurttimer: 0, hurtshake: 0, shakex: 0, mywriter: null, acttimer: 0, con: 0, dodgetimer: 0,
    fatal: 0, candodge: 0, mytarget: 0, ambushed: 0, firststrike: 0, damage: -1, grazepoints: -1, timepoints: -1,
    inv: -1, target: -1, grazed: -1, grazetimer: -1, element: 'none', acting: 0, actcon: 0, actingsus: 0,
    actingnoe: 0, actingral: 0, actconsus: 0, actconral: 0, actconnoe: 0, simulorderkri: -1, simulordersus: -1,
    simulorderral: -1, simulordernoe: -1, simultotal: 0, simulboss: -1, talkmax: 90, mercymod: 0, maxmercy: 100,
    recruitable: 1, freezable: 1, recruitcount: 1, sactionboxx: 0, sactionboxy: 0, hurtspriteoffx: 0,
    hurtspriteoffy: 0, image_xscale: 2, image_yscale: 2, image_speed: 0.2, custombody: 0, hurtamt: 0,
  });
  m.depth = 90 - (m.y - G.camY) / 50;
});

// scr_enemy_hurt(): monster scope (state 3).
defineScript('scr_enemy_hurt', (m) => {
  m.hurttimer -= 1;
  if (m.hurttimer < 0) m.state = 0;
  else {
    m.hurtshake += 1;
    if (m.hurtshake > 1) {
      if (m.shakex > 0) m.shakex -= 1;
      if (m.shakex < 0) m.shakex += 1;
      m.shakex = -m.shakex;
      m.hurtshake = 0;
    }
  }
});

// draw_monster_body_part(sprite, image, x, y): monster scope; adds the target flash.
defineScript('draw_monster_body_part', (m, spr, sub, x, y) => {
  draw_sprite_ext(spr, sub, x, y, m.image_xscale, m.image_yscale, 0, m.image_blend, m.image_alpha);
  if (m.flash == 1) {
    d3d_set_fog(true, 0xffffff, 0, 1);
    draw_sprite_ext(spr, sub, x, y, m.image_xscale, m.image_yscale, 0, 0xffffff, (1 - Math.cos(m.fsiner / 5)) * 0.4 + 0.2);
    d3d_set_fog(false, 0, 0, 0);
  }
});

// scr_enemy_drawidle_generic(speed): monster scope.
defineScript('scr_enemy_drawidle_generic', (m, spd) => {
  if (m.state == 0) {
    m.fsiner += 1;
    m.siner += spd;
    let spr = m.idlesprite;
    if (global.mercymod[m.myself] >= global.mercymax[m.myself]) spr = m.sparedsprite;
    m.thissprite = spr;
    S.draw_monster_body_part(m, spr, m.siner, m.x, m.y);
  }
});

// scr_bulletspawner(x, y, obj): monster scope.
defineScript('scr_bulletspawner', (m, x, y, obj) => {
  const dc = instance_create(x, y, obj);
  dc.creator = m.myself;
  dc.creatorid = m;
  dc.target = m.mytarget;
  dc.damage = global.monsterat[m.myself] * 5;
  return dc;
});

// obj_monsterparent: every enemy inherits this. Other_20 (event_user(10)) = spared/pacified.
export class MonsterParent extends Instance {
  create() {
    this.depth = 90;
    S.scr_enemy_object_init(this);
  }
  // Other_22: monster position + scr_monstersetup (enemies usually override this).
  user12() { S.scr_monster_setup_default(this); }
  user10() {
    S.scr_spareanim(this);
    S.scr_monsterdefeat(this);
    instance_destroy(this);
  }
}
defineObject('obj_monsterparent', MonsterParent);

// ---------------------------------------------------------------- fades and lerps

class FadeOut extends Instance {
  create() {
    this.image_blend = 0;
    this.fadespeed = 0.08;
    this.image_alpha = 0;
    this.length = 10 + 640 / 4;
    this.height = 10 + 480 / 4;
    this.x = -20; // Create moves it here, whatever position scr_fadeout gave it
    this.y = -20;
    this.fadein = 0;
    this.depth = -1000;
  }
  draw() {
    this.image_alpha += this.fadespeed;
    draw_sprite_ext('spr_pxwhite', 0, this.x, this.y, this.length * 4, this.height * 4, 0, this.image_blend, this.image_alpha);
    if (this.fadein == 1 && this.image_alpha <= 0) instance_destroy(this);
  }
}
shared('obj_fadeout', FadeOut);

defineScript('scr_fadeout', (...a) => {
  const [, [len]] = splitCaller(a);
  const f = instance_create(G.camX - 200, G.camY - 200, 'obj_fadeout');
  f.fadespeed = 1 / len;
  f.depth = 3;
  return f;
});

class LerpVar extends Instance {
  create() { this.target = null; this.varname = 'x'; this.pointa = 0; this.pointb = 0; this.time = 0; this.maxtime = 30; }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    this.time += 1;
    t[this.varname] = lerp(this.pointa, this.pointb, Math.min(1, this.time / this.maxtime));
    if (this.time >= this.maxtime) instance_destroy(this);
  }
}
shared('obj_lerpvar', LerpVar);

// scr_lerpvar(inst, varname, a, b, time): linear only.
defineScript('scr_lerpvar', (inst, varname, a, b, time) => {
  const l = instance_create(0, 0, 'obj_lerpvar');
  l.target = inst;
  l.varname = varname;
  l.pointa = a;
  l.pointb = b;
  l.maxtime = time;
  return l;
});

// ---------------------------------------------------------------- background (obj_bgfountaintest)

class BgFountain extends Instance {
  create() {
    this.siner = 0;
    this.image_blend = 0x272882;
    this.battleprog = 0;
    this.alphafactor = 0;
    this.depth = 50000;
    this.oceanspeed = 1;
    this.death = 0;
    S.scr_lerpvar(this, 'alphafactor', 0, 1, 120);
  }
  draw() {
    const cx = G.camX, cy = G.camY;
    this.depth = 150000;
    this.siner += 1;
    let shakex = 0, shakey = 0;
    const sh = instancesOf('obj_shake')[0];
    if (sh) { shakex = sh.shakex * sh.shakesign; shakey = sh.shakey * sh.shakesign; }
    const k = knightEnemy();
    if (k) this.battleprog = 1 - (global.monsterhp[k.myself] - global.monstermaxhp[k.myself] * 0.8) / global.monstermaxhp[k.myself] * 5;
    this.oceanspeed = this.battleprog > 0.65 ? 2 : 1;
    const s = this.siner, os = this.oceanspeed, af = this.alphafactor;
    const desicolor = make_color_hsv(127.5 + Math.sin(s / 90) * 255 / 2, 255, 255);
    draw_sprite_tiled_ext('spr_bg_fountain1', 0, shakex + cx - s * os, shakey + cy + s * os, 2, 2, 0x800080, 0.5 * af * (this.battleprog + 0.3));
    draw_sprite_tiled_ext('spr_bg_fountain1', 0, shakex + cx - s * os / 2, shakey + cy - s * os / 2, 2, 2, 0x800080, 0.35 * af * (this.battleprog + 0.2));
    if (k) draw_sprite_ext('spr_bg_knight_gradient', 0, shakex + cx + 640 + 640, shakey + cy + 90, -2, 2, 0, 0, af);
    draw_sprite_ext('spr_bg_knight_gradient', 0, shakex + cx, shakey + cy + 90, 2, 2.05, 0, 0, af);
    draw_sprite_ext('spr_pxwhite', 0, shakex + cx - 40, shakey + cy, 720, 90, 0, 0, 1);
    this.image_blend = merge_color(0x272882, desicolor, Math.max(0, Math.min(1, this.battleprog / 2)));
    draw_sprite_ext('spr_pxwhite', 0, shakex + cx + 188, shakey + cy, 240, 90, 0, merge_color(this.image_blend, 0, 0.8), af);
    for (let i = 1; i < 3; i++) {
      draw_sprite_ext('spr_cc_fountainbg_white', s / 10, shakex + cx + 138 - Math.sin(s / 20) * (i * 12), shakey + cy, 2, 2, 0, this.image_blend, i / 12 * af);
      draw_sprite_ext('spr_cc_fountainbg_white', s / 10, shakex + cx + 138 + Math.sin(s / 13) * (i * 6), shakey + cy, 2, 2, 0, this.image_blend, i / 12 * af);
    }
    draw_sprite_ext('spr_cc_fountainbg_white', s / 10, shakex + cx + 138, shakey + cy, 2, 2, 0, this.image_blend, 1);
    if (k) {
      draw_sprite_ext('spr_pxwhite', 0, shakex + cx - 40, shakey + cy, 40, 480, 0, 0, 1);
      draw_sprite_ext('spr_pxwhite', 0, shakex + cx - 40, shakey + cy - 20, 720, 20, 0, 0, 1);
    }
    if (this.death == 0 && !instance_exists('obj_battlecontroller')) {
      this.death = 1;
      S.scr_lerpvar(this, 'alphafactor', this.alphafactor, 0, 30);
      this.alarm[0] = 31;
    }
  }
  alarm0() { instance_destroy(this); }
}
// Called at battle start: the Knight modules' own port wins if they made one.
export function registerBackground() { shared('obj_bgfountaintest', BgFountain); }

// ---------------------------------------------------------------- stand-in enemy

// Used only while obj_knight_enemy is not registered: no talk, a short empty "attack", plain ACT
// replies, so the battle flow can be exercised.
class KnightStub extends MonsterParent {
  create() {
    super.create();
    this.idlesprite = 'spr_roaringknight_idle';
    this.sparedsprite = 'spr_roaringknight_hurt';
    this.sprite_index = this.idlesprite;
    this.image_speed = 1 / 6;
    this.end_cutscene_version = 0;
    instance_create(this.x, this.y, 'obj_bgfountaintest');
  }
  user12() {
    global.monsterx[this.myself] = this.x + this.sprite_width / 2;
    global.monstery[this.myself] = this.y + this.sprite_height / 2;
    S.scr_monstersetup(this);
  }
  step() {
    if (global.monster[this.myself] == 1) {
      if (S.scr_isphase('enemytalk') && this.talked == 0) {
        S.scr_randomtarget(this);
        if (!instance_exists('obj_darkener')) instance_create(0, 0, 'obj_darkener');
        this.talked = 1;
        global.mnfight = 1.5;
      }
      if (global.mnfight == 1.5) {
        global.mnfight = 2;
        S.scr_turntimer(60);
      }
    }
    if (S.scr_isphase('acting')) {
      if (this.acting >= 1 && this.actcon == 0) {
        this.actcon = 1;
        S.msgsetloc(0, '* (Stand-in enemy.)/%');
        S.scr_battletext_default(this);
      }
      if ((this.actingsus && this.actconsus == 1) || (this.actingral && this.actconral == 1)) {
        this.actconsus = this.actconral = 0;
        this.actcon = 1;
        S.msgsetloc(0, '* (Stand-in S/R-Action.)/%');
        S.scr_battletext_default(this);
      }
      if (this.actcon == 1 && !instance_exists('obj_writer')) S.scr_nextact();
    }
    if (this.state == 3) S.scr_enemy_hurt(this);
  }
  draw() {
    if (this.state == 3) draw_sprite_ext('spr_roaringknight_hurt', 0, this.x + this.shakex, this.y, 2, 2, 0, 0xffffff, 1);
    S.scr_enemy_drawidle_generic(this, 1 / 6);
    if (this.becomeflash == 0) this.flash = 0;
    this.becomeflash = 0;
  }
}
defineObject('obj_knight_enemy_stub', KnightStub);
