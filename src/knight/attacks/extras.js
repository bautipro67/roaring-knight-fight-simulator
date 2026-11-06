// Attacks the Knight's code still has but the fight does not normally reach:
// - Diagonal bullets (obj_dbulletcontroller type 152): obj_diagonal_bullet_manager and
//   obj_diagonal_bullet (rows of small bullets sweeping diagonally across the box).
// - Crescent slashes (type 109): obj_bullet_knight_crescentGenerator (the Knight slashes from
//   the right of the box, moving between rows), obj_bullet_knightcrescent (each half-moon) and
//   obj_knight_crescentslash_slashinganimation (the slash animation).
// The combination attack (type 105, obj_knight_combinations) is in combination.js.
import {
  global, Instance, defineObject, instance_create, instance_destroy, instance_exists, instancesOf, irandom, irandom_range,
  random_range, choose, round, clamp, lerp, abs, merge_color, draw_self, draw_line, c_white, c_black,
} from '../rt.js?v=20261106232406';
import {
  first, i_ex, enemyRef, boardRef, heartRef, scr_bullet_init, scr_darksize, scr_lerpvar, scr_afterimage, scr_dark_marker,
  scr_doom, snd_play_x, eq,
} from '../common.js?v=20261106232406';
import { BulletParent, RegularBullet } from '../bullets.js?v=20261106232406';
import { snd_stop } from '../../runtime/audio.js?v=20261106232406';
import './rotating.js?v=20261106232406'; // obj_knight_warp

// ---------------------------------------------------------------- diagonal bullets

class DiagonalBulletManager extends RegularBullet {
  create() {
    this.timer = 0;
    this.con = 0;
    this.damage = 1;
    this.grazepoint = 2;
    this.timepoints = 2;
    this.inv = 0;
    this.target = 4;
    this.grazed = 0;
    this.grazetimer = 0;
    this.creatorid = null;
    this.creator = -1;
    this.element = 0;
    this.rate = 44;
    this.verticalspeed = 6;
    this.horizontalspeed = -5;
    this.gapsize = 56;
    this.bulletcount = 24;
    this.timer = this.rate - 1;
  }
  step() {
    this.timer += 1;
    if (this.timer === this.rate) {
      this.timer = 0;
      const g = boardRef();
      const _vspeed = choose(this.verticalspeed, this.verticalspeed * -1);
      for (let i = 0; i < this.bulletcount; i++) {
        const inst = instance_create(g.x + 300, g.y - 100 + this.gapsize * i, 'obj_diagonal_bullet');
        inst.hspeed = this.horizontalspeed;
        inst.vspeed = _vspeed;
        if (_vspeed > 0) inst.y = inst.y - this.bulletcount * this.gapsize + 300;
      }
      this.rate -= 4;
      if (this.rate < 8) this.rate = 8;
    }
  }
  draw() {}
}
defineObject('obj_diagonal_bullet_manager', DiagonalBulletManager);

class DiagonalBullet extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_smallbullet';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.image_alpha = 0;
    scr_bullet_init(this);
    this.destroyonhit = 0;
  }
  step() {
    const g = boardRef();
    this.timer += 1;
    const a = clamp(abs(this.x - g.x) / 300, 0, 1);
    const maxalpha = lerp(1.3, 0, a);
    this.image_alpha = lerp(maxalpha, 0, abs(this.y - g.y) / 200);
    if (this.timer > 260) instance_destroy(this);
  }
  draw() { draw_self(this); }
}
defineObject('obj_diagonal_bullet', DiagonalBullet);

// ---------------------------------------------------------------- crescent slashes

class CrescentGenerator extends BulletParent {
  create() {
    this.image_speed = 0;
    const g = first('obj_growtangle');
    if (g) this.depth = g.depth;
    this.con = 0;
    this.timer = 0;
    this.box = null;
    this.yposcount = 7;
    this.posrange = 2;
    this.ypos = [0];
    this.curpos = 3;
    this.shoottimer = 0;
    this.shootrate = 30;
    this.movementmode = 0;
    this.movecon = 0;
    this.moverate = 5;
    this.init = 0;
    this.neverstaystill = false;
    this.movedown = 0;
    this.bulcount = 0;
    this.diagtimer = 0;
    this.subcon = 0;
    this.framecount = 0;
    this.subtimer = 0;
    this.diagattack = false;
    this.diagattackrate = 150;
    this.type = 2;
    this.slowdelaycount = 0;
    this.createslash = 0;
    this.prevy = this.y;
  }
  cleanUp() {
    for (const e of instancesOf('obj_knight_enemy')) {
      e.x = e.xstart;
      e.hspeed = 0;
      const w = instance_create(e.x, e.y, 'obj_knight_warp');
      w.depth = e.depth;
      w.master = e;
      w.user0();
    }
  }
  beginStep() { this.prevy = this.y; }
  setupType() {
    const t = this.type;
    if (t === 0) Object.assign(this, { movementmode: 0, shootrate: 30, posrange: 2, yposcount: 6, neverstaystill: 1, myspeed: -1, myfrict: -0.5 });
    if (t === 1) Object.assign(this, { movementmode: 1, shootrate: 20, posrange: 2, yposcount: 6, myspeed: -1, myfrict: -0.5 });
    if (t === 2) {
      Object.assign(this, { movementmode: 1, shootrate: 15, posrange: 2, yposcount: 6, neverstaystill: 1, myspeed: -1, myfrict: -0.35 });
      if (eq(enemyRef().damagereduction ?? 0, 0.04)) {
        this.shootrate = 20;
        this.myfrict = -0.3;
      }
    }
    if (t === 3) Object.assign(this, { diagattack: true, diagattackrate: 150, movementmode: 1, shootrate: 15, posrange: 2, yposcount: 6, neverstaystill: 1, myspeed: -1, myfrict: -0.35 });
    if (t === 4) Object.assign(this, { movementmode: 1, shootrate: 20, posrange: 1, yposcount: 6, myspeed: -1, myfrict: -0.5, neverstaystill: true, slowdelaycount: 0 });
    this.moverate = this.shootrate - 5;
  }
  pair(dy) {
    const bul = instance_create(this.x, this.y + 5, 'obj_bullet_knightcrescent');
    const bul2 = instance_create(this.x, this.y - 5, 'obj_bullet_knightcrescent');
    scr_darksize(bul);
    scr_darksize(bul2);
    bul2.image_yscale = -2;
    return [bul, bul2];
  }
  step() {
    if (this.init === 0) {
      this.setupType();
      if (!this.box) this.box = first('obj_growtangle');
      else this.init = 1;
    }
    if (this.init) {
      const box = this.box && this.box.alive ? this.box : boardRef();
      if (this.con === 0) {
        this.timer += 1;
        if (this.timer >= 1) {
          this.boxheight = box.sprite_height;
          this.con = 1;
          this.timer = 0;
          for (let i = 0; i < this.yposcount; i++) this.ypos[i] = box.y - this.boxheight / 2 + this.boxheight / (this.yposcount + 1) * (i + 1);
          this.curpos = round(this.yposcount / 2) - 1;
        }
      }
      if (this.con === 1) this.stepShoot();
      if (this.con === 10) this.stepDiagonal(box);
    }
    if (this.createslash) {
      const s = instance_create(this.x + 12, this.y + 18, 'obj_knight_crescentslash_slashinganimation');
      s.depth = this.depth - 20 - s.y;
      this.createslash = 0;
    }
  }
  stepShoot() {
    if (global.turntimer > 50) {
      this.shoottimer += 1;
      this.timer += 1;
    } else if (global.turntimer < 20) {
      instance_destroy(this);
      return;
    }
    if (this.diagattack) {
      this.diagtimer += 1;
      if (this.diagtimer === this.diagattackrate) {
        this.diagtimer = 0;
        this.con = 10;
        this.subcon = 0;
        this.shoottimer = 0;
        this.movetimer = 0;
        this.movecon = 0;
      }
    }
    if (this.shoottimer === this.shootrate - 4) this.createslash = 1;
    if (this.shoottimer >= this.shootrate) {
      this.bulcount += 1;
      const [bul, bul2] = this.pair();
      if (this.movementmode === 0) {
        scr_lerpvar(bul, 'y', bul.y, bul.y - 14, 25);
        scr_lerpvar(bul2, 'y', bul2.y, bul2.y + 14, 25);
      } else {
        scr_lerpvar(bul, 'y', bul.y, this.ypos[this.curpos] - 12, 30);
        scr_lerpvar(bul2, 'y', bul2.y, this.ypos[this.curpos] + 12, 30);
      }
      for (const b of [bul, bul2]) {
        b.hspeed = this.myspeed;
        b.friction = this.myfrict;
      }
      if (this.movementmode === 1 && this.type === 4 && choose(0, 0, 1) === 1 && this.slowdelaycount <= 0) {
        this.slowdelaycount = 2;
        bul.friction *= 0.25;
        bul2.friction *= 0.25;
        bul.hspeed *= 0.5;
        bul2.hspeed *= 0.5;
        bul.image_yscale = 1;
        bul2.image_yscale = -1;
      }
      this.movecon = 1;
      if (!this.neverstaystill) this.curpos += irandom_range(-this.posrange, this.posrange);
      else this.curpos += irandom_range(1, this.posrange) * choose(-1, 1);
      if (this.curpos >= this.yposcount) this.curpos -= 2;
      if (this.curpos < 0) this.curpos = -this.curpos;
      this.shoottimer = 0;
      if (this.slowdelaycount === 1) {
        this.shoottimer = -this.shootrate / 2;
        this.slowdelaycount = -1;
      }
      this.slowdelaycount -= 1;
    }
    if (this.movecon === 1) {
      if (this.movementmode === 0) scr_lerpvar(this, 'y', this.y, this.ypos[this.curpos], this.moverate, 2, 'out');
      if (this.movementmode === 1) scr_lerpvar(this, 'y', this.y, this.ypos[irandom(this.yposcount - 1)], this.moverate, 2, 'out');
      this.movecon = 0;
    }
  }
  stepDiagonal(box) {
    if (this.subcon === 0 && this.prevy === this.y) {
      this.diagtimer += 1;
      if (this.diagtimer === 3) this.subcon = 1;
    }
    if (this.subcon === 1) {
      const desy = irandom(this.yposcount - 2) + 1;
      scr_lerpvar(this, 'y', this.y, this.ypos[desy], 10, 2, 'out');
      this.subcon = 2;
      this.diagtimer = 0;
    }
    if (this.subcon === 2) {
      this.diagtimer += 1;
      if (this.diagtimer >= 30) {
        this.subcon = 3;
        this.diagtimer = 0;
        this.movedown = -1;
        if (box && this.y < box.y) this.movedown = 1;
        const heartmovespeed = heartRef().wspeed ?? 4;
        this.framecount = 15;
        scr_lerpvar(this, 'y', this.y, this.y + this.framecount * this.movedown * heartmovespeed, this.framecount);
        this.subtimer = 0;
      }
    }
    if (this.subcon === 3) {
      if (this.diagtimer === 2) this.createslash = 1;
      if (this.diagtimer <= 0) {
        const [bul, bul2] = this.pair();
        scr_lerpvar(bul, 'y', bul.y, bul.y - 16, 25);
        scr_lerpvar(bul2, 'y', bul2.y, bul2.y + 16, 25);
        for (const b of [bul, bul2]) {
          b.hspeed = this.myspeed;
          b.friction = this.myfrict;
        }
        this.diagtimer = 3;
      }
      this.diagtimer -= 1;
      this.subtimer += 1;
      if (box && ((this.movedown === 1 && this.y > box.y + box.sprite_height / 2 - 30) || (this.movedown === -1 && this.y < box.y - box.sprite_height / 2 + 30))) this.subtimer = this.framecount + 1;
      if (this.subtimer >= this.framecount) {
        this.con = 1;
        this.diagtimer = 0;
        this.subcon = 0;
        this.timer = 0;
        this.subtimer = 0;
        this.shoottimer = -10;
        this.movetimer = 0;
      }
    }
  }
  draw() {
    // knightsprite / drawline: the guide lines are off (drawline = 0).
    const drawline = 0;
    if (this.con >= 1 && drawline && this.box) {
      for (let i = 0; i < this.yposcount; i++) draw_line(this.x, this.ypos[i], this.box.x - this.box.sprite_width / 2, this.ypos[i]);
    }
  }
}
defineObject('obj_bullet_knight_crescentGenerator', CrescentGenerator);

class KnightCrescent extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_bullet_knightcrescent';
    this.mask_index = 'spr_bullet_knightcrescent_hitbox';
  }
  create() {
    super.create();
    this.damage = 206;
    if (eq(enemyRef().damagereduction ?? 0, 0.04)) this.damage = 50;
    this.grazepoints = 3;
    this.timer = 0;
    this.element = 5;
    this.mask_index = 'spr_bullet_knightcrescent_hitbox';
  }
  trail() {
    const a = scr_afterimage(this);
    a.vspeed = random_range(-0.5, 0.5);
    a.image_alpha = 0.35;
    const h = first('obj_heart');
    if (h) a.depth = h.depth + 1;
  }
  onDestroy() { this.trail(); }
  step() {
    super.step();
    if (!this.alive) return;
    this.timer += 1;
    this.trail();
  }
}
defineObject('obj_bullet_knightcrescent', KnightCrescent);

class CrescentSlashAnimation extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_knight_crescentslash';
  }
  create() {
    scr_darksize(this);
    this.image_speed = 0.5;
    this.slash1 = 0;
    this.slash2 = 0;
  }
  step() {
    if (this.image_index > 7) {
      instance_destroy(this);
      return;
    }
    if (this.image_index >= 5) this.image_blend = merge_color(c_white, c_black, 0.4);
    if (this.image_index >= 6) this.image_blend = merge_color(c_white, c_black, 0.8);
    if (this.image_index >= 7) this.image_blend = c_black;
    if (this.image_index === 1) {
      const lifetime = 8, startalpha = 0.5;
      snd_stop('snd_knight_cut2');
      snd_play_x('snd_knight_cut2', 0.5, 1.3);
      const mk = (index, yscale, grav) => {
        const s = scr_dark_marker(this.x - 12, this.y - 18, 'spr_bullet_knightcrescent');
        if (yscale !== null) s.image_yscale = yscale;
        s.image_speed = 0;
        s.image_index = index;
        s.image_alpha = startalpha;
        scr_lerpvar(s, 'image_alpha', startalpha, 0, lifetime, 2, 'in');
        scr_lerpvar(s, 'image_yscale', s.image_yscale, s.image_yscale * 2, lifetime, 2, 'out');
        scr_doom(s, lifetime + 1);
        s.gravity = grav;
        s.hspeed = 2;
        return s;
      };
      if (this.slash1 === 0) this.slash1 = mk(0, null, -0.5);
      if (this.slash2 === 0) this.slash2 = mk(1, -2, 0.5);
    }
    const fade = scr_afterimage(this);
    fade.image_alpha = 0.3;
    fade.fadeSpeed = 0.05;
    fade.image_blend = this.image_blend;
    fade.depth = this.depth + 1000;
  }
}
defineObject('obj_knight_crescentslash_slashinganimation', CrescentSlashAnimation);
