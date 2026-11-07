// MAGIC / ITEM / SPARE resolution: obj_spellphase, scr_spelltext, scr_spell and the spell effects.
import {
  global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists,
  instance_find, withObj, event_user, random, ceil, round, merge_color, point_direction, point_distance,
  angle_difference, button1_p, draw_self, draw_sprite_ext, d3d_set_fog,
} from '../runtime/gm.js?v=20261107203111';
import { snd_play, snd_stop } from '../runtime/audio.js?v=20261107203111';
import { withInst, subst, knightEnemy } from './common.js?v=20261107203111';

const g = global;

// ---------------------------------------------------------------- spell phase

class SpellPhase extends Instance {
  create() {
    this.spelltimer = 0;
    this.spellmax = 40;
    this.spelltotal = 0;
    this.char = 0;
    this.castyet = 0;
    this.re_castyet = 0;
    this.active = 0;
    this.spellwriter = null;
    this.using = [0, 0, 0];
    this.gotspell = [0, 0, 0];
    this.gotitem = [0, 0, 0];
    this.alarm[0] = 5;
  }
  alarm0() {
    for (let xyz = 0; xyz < 3; xyz++) {
      this.using[xyz] = 0;
      this.gotspell[xyz] = 0;
      this.gotitem[xyz] = 0;
      for (const [action, state, got] of [[2, 2, this.gotspell], [4, 4, this.gotitem]]) {
        if (g.charaction[xyz] == action) {
          this.spelltotal += 1;
          this.using[xyz] = 1;
          got[xyz] = 1;
          if (this.castyet == 0) {
            withInst(g.charinstance[xyz], h => { h.state = state; h.attacktimer = 0; });
            this.castyet = 1;
            this.char = xyz + 1;
            S.scr_spelltext(this, g.charspecial[xyz], xyz);
            this.spellwriter = S.scr_battletext_default(this);
          }
        }
      }
    }
    this.active = 1;
    g.spelldelay = 90;
  }
  step() {
    if (this.active != 1) return;
    this.spelltimer += 1;
    if (this.spelltimer >= g.spelldelay && !instance_exists(this.spellwriter)) {
      if (this.char >= 3 || this.spelltotal == 1) {
        S.scr_attackphase();
        withInst(this.spellwriter, w => instance_destroy(w));
        instance_destroy(this);
      } else if (S.scr_monsterpop() > 0) {
        const c = this.char;
        for (const [got, state] of [[this.gotitem, 4], [this.gotspell, 2]]) {
          if (got[c] == 1) {
            this.re_castyet = 1;
            withInst(g.charinstance[c], h => { h.state = state; });
            withInst(this.spellwriter, w => instance_destroy(w));
            S.scr_spelltext(this, g.charspecial[c], c);
            this.spellwriter = S.scr_battletext_default(this);
          }
        }
        g.spelldelay = 90;
        if (this.re_castyet == 0) g.spelldelay = 1;
        this.char += 1;
        for (let k = 0; k < 2; k++) {
          if (this.char < 3 && this.using[this.char] == 0) this.char += 1;
        }
        this.spelltimer = 0;
        this.re_castyet = 0;
      } else {
        S.scr_attackphase();
        withInst(this.spellwriter, w => instance_destroy(w));
        instance_destroy(this);
      }
    }
  }
}
defineObject('obj_spellphase', SpellPhase);

// ---------------------------------------------------------------- spell text

const SPELLTEXT = {
  1: '* ~1 cast RUDE BUSTER!/%', 2: '* ~1 cast HEAL PRAYER!/%', 4: '* ~1 used RUDE BUSTER!/%', 5: '* ~1 used RED BUSTER!/%',
  6: '* ~1 cast DUAL HEAL!/%', 8: '* ~1 cast SLEEPMIST!/%', 9: '* ~1 cast ICESHOCK!/%', 10: '* ~1 cast SNOWGRAVE!/%',
  11: '* ~1 cast ULTRAHEAL!/%',
  201: '* ~1 used the DARK CANDY!/%', 202: '* ~1 used the REVIVEMINT!/%', 205: '* ~1 used the BROKEN CAKE!/%',
  206: '* ~1 used the TOPCAKE!/%', 207: '* ~1 used the SPINCAKE!/%', 208: '* ~1 used the DARKBURGER!/%',
  209: '* ~1 used the LANCERCOOKIE!/%', 210: '* ~1 used the GIGASALAD!/%', 211: '* ~1 used the CLUBS SANDWICH!/%',
  212: '* ~1 used the HEARTS DONUT!/%', 213: '* ~1 used the CHOCO DIAMOND!/%', 214: '* ~1 used the FAV SANDWICH!/%',
  215: '* ~1 used the ROUXLS ROUX!/%', 216: '* ~1 used the CD BAGEL!/%', 222: '* ~1 used the DD-BURGER!/%',
  223: '* ~1 used the LIGHTCANDY!/%', 224: '* ~1 used the BUTJUICE!/%', 225: '* ~1 used the SPAGHETTICODE!/%',
  226: '* ~1 used the JAVACOOKIE!/%', 227: '* ~1 used the TENSIONBIT!&* Tension raised up earlier./%',
  228: '* ~1 used the TENSIONGEM!/%', 229: '* ~1 used the TENSIONMAX!/%', 230: '* ~1 used the REVIVEDUST!/%',
  231: '* ~1 used the REVIVEBRIGHT!/%', 232: '* ~1 administered S.POISON!/%', 234: '* ~1 used the TVDINNER!/%',
  235: '* ~1 used the PIPIS!/%', 236: '* ~1 used the FLATSODA!/%', 237: '* ~1 used the TVSLOP!/%',
  238: '* ~1 used the EXECBUFFET!/%', 239: '* ~1 used the DELUXEDINNER!/%',
};

// scr_spelltext(spell, caster): caller scope (spell, caster, star); writes global.msg.
defineScript('scr_spelltext', (inst, spell, caster) => {
  inst.spell = spell;
  inst.caster = caster;
  inst.star = g.chartarget[caster];
  const name = g.charname[g.char[caster]];
  switch (spell) {
    case 3:
      g.msg[0] = subst('* ~1 cast PACIFY!/%', name);
      S.scr_retarget_spell(inst);
      if (g.monster[inst.star] == 1 && g.monsterstatus[inst.star] != 1) {
        g.msg[0] = subst('* ~1 cast PACIFY^1!&* But the enemy wasn\'t \\cBTIRED\\cW.../%', name);
        if (g.mercymod[inst.star] >= 100) g.msg[0] = subst('* ~1 cast PACIFY^1!&* But the foe wasn\'t \\cBTIRED\\cW... try \\cYSPARING\\cW!/%', name);
      }
      break;
    case 100: {
      inst.cancelattack = 0;
      g.msg[0] = subst('* ~1 spared ~2!/%', name, g.monstername[inst.star]);
      S.scr_retarget_spell(inst);
      const mn = g.monstername[inst.star];
      if (g.mercymod[inst.star] >= 100) g.msg[0] = subst('* ~1 spared ~2!/%', name, mn);
      else {
        g.msg[0] = subst('* ~1 spared ~2^2!&* But its name wasn\'t \\cYYELLOW\\cW.../%', name, mn);
        if (g.monsterstatus[inst.star] == 1) {
          g.msg[0] = subst('* ~1 spared ~2^2!&* But its name wasn\'t \\cYYELLOW\\cW.../', name, mn);
          g.msg[1] = '* (Try using Ralsei\'s \\cBPACIFY\\cW!)/%';
        }
      }
      if (inst.cancelattack == 1) g.msg[0] = subst('* ~1 spared!/%', name);
      break;
    }
    case 203:
      g.msg[0] = subst('* ~1 used the GLOWSHARD!/', name);
      g.msg[1] = '* But nothing happened.../%';
      break;
    case 204:
      g.msg[0] = subst('* ~1 read the MANUAL!/', name);
      g.msg[1] = '* But nothing happened.../%';
      break;
    default:
      if (SPELLTEXT[spell]) g.msg[0] = subst(SPELLTEXT[spell], name);
      break;
  }
});

// ---------------------------------------------------------------- spell effects

// scr_dmgwriter_selfchar(): hero scope.
defineScript('scr_dmgwriter_selfchar', (h) => instance_create(h.x, h.y + h.myheight - 24 - h.tu * 20, 'obj_dmgwriter'));

function healFx(h, amount) {
  const ha = instance_create(h.x, h.y, 'obj_healanim');
  ha.target = h;
  const dmgwr = S.scr_dmgwriter_selfchar(h);
  dmgwr.delay = 8;
  dmgwr.type = 3;
  if (amount !== undefined) dmgwr.damage = amount;
  if (g.hp[g.char[h.myself]] >= g.maxhp[g.char[h.myself]]) dmgwr.specialmessage = 3;
  h.tu += 1;
  return ha;
}

// scr_heal_amount_modify_by_equipment(amount): caller scope (caster); BlueRibbon adds 1/8.
const healMod = (inst, amt) => {
  const c = g.char[inst.caster] ?? 0;
  let add = 0;
  if (g.chararmor1[c] == 26) add += ceil(amt / 8);
  if (g.chararmor2[c] == 26) add += ceil(amt / 8);
  return amt + add;
};

// scr_healitemspell(amount): caller scope (star). Returns the heal animation.
defineScript('scr_healitemspell', (inst, amount) => {
  const amt = healMod(inst, amount);
  S.scr_heal(inst.star, amt);
  g.spelldelay = 15;
  let ha = null;
  withInst(g.charinstance[inst.star], h => { ha = healFx(h, amt); });
  return ha;
});

defineScript('scr_healallitemspell', (inst, amount) => {
  const amt = healMod(inst, amount);
  S.scr_healall(amt);
  for (let i = 0; i < 3; i++) withInst(g.charinstance[i], h => healFx(h, amt));
  g.spelldelay = 20;
});

// Items that heal one target: id -> amount (Chapter 3).
const HEAL1 = { 201: 40, 205: 20, 208: 70, 209: 50, 210: 4, 214: 500, 215: 50, 216: 80, 218: 10, 219: 10, 220: 10, 221: 10, 222: 60, 223: 120, 224: 100, 234: 100, 236: 20, 237: 80, 239: 140 };
const HEALALL = { 206: 160, 207: 150, 211: 70, 225: 30, 238: 100 };

// scr_spell(spell, caster): hero scope.
defineScript('scr_spell', (inst, spell, caster) => {
  inst.spell = spell;
  inst.caster = caster;
  inst.star = g.chartarget[caster];
  g.spelldelay = 10;
  const star = () => inst.star;
  const knight = knightEnemy();
  if (HEAL1[spell]) { S.scr_healitemspell(inst, HEAL1[spell]); return; }
  if (HEALALL[spell]) { S.scr_healallitemspell(inst, HEALALL[spell]); return; }
  switch (spell) {
    case 2:
    case 11: {
      let healnum;
      if (spell == 2) healnum = healMod(inst, g.battlemag[caster] * 5);
      else {
        g.flag[1045] = Math.min(5, g.flag[1045] + 1);
        healnum = ceil(healMod(inst, g.battlemag[caster] * 1.5 + 5 + g.flag[1045]));
      }
      S.scr_heal(star(), healnum);
      withInst(g.charinstance[star()], h => {
        h.healnum = healnum;
        healFx(h, healnum);
      });
      g.spelldelay = 15;
      if (spell == 11) S.scr_spellmenu_setup();
      break;
    }
    case 3:
      if (g.monster[star()] == 0) S.scr_retarget_spell(inst);
      if (g.monster[star()] == 1) {
        if (g.monsterstatus[star()] == 1) {
          withInst(g.monsterinstance[star()], m => {
            const p = instance_create(g.monsterx[m.myself], g.monstery[m.myself], 'obj_pacifyspell');
            p.con = 20;
            p.target = m;
            g.flag[51 + m.myself] = 3;
            m.user10?.();
            S.scr_monsterdefeat(m);
          });
        } else {
          const p = instance_create(0, 0, 'obj_pacifyspell');
          p.target = g.monsterinstance[star()];
          p.fail = 1;
        }
      }
      g.spelldelay = 20;
      break;
    case 4:
    case 5: {
      inst.cancelattack = 0;
      g.spelldelay = 30;
      if (g.monster[star()] == 0) S.scr_retarget_spell(inst);
      if (inst.cancelattack == 0) {
        g.spelldelay = 70;
        let damage = spell == 4
          ? ceil(g.battlemag[caster] * 5 + g.battleat[caster] * 11 - g.monsterdf[star()] * 3)
          : ceil(g.battlemag[caster] * 6 + g.battleat[caster] * 13 - g.monsterdf[star()] * 6);
        if (spell == 4 && knight) damage = ceil(damage * (knight.damagereduction + 0.65));
        if (g.automiss[star()] == 1) damage = 0;
        const sus = instance_find('obj_herosusie', 0);
        const attack = instance_create(sus ? sus.x : inst.x, sus ? sus.y : inst.y, 'obj_rudebuster_anim');
        attack.damage = damage;
        attack.star = star();
        attack.caster = caster;
        attack.target = g.monsterinstance[star()];
        if (spell == 5) attack.red = 1;
      }
      break;
    }
    case 100:
      if (g.monster[star()] == 0) S.scr_retarget_spell(inst);
      if (g.monster[star()] == 1) {
        if (g.mercymod[star()] >= 100) {
          withInst(g.monsterinstance[star()], m => {
            g.flag[51 + m.myself] = 2;
            m.user10?.();
            S.scr_monsterdefeat(m);
          });
        } else {
          S.scr_mercyadd(star(), g.sparepoint[star()]);
          const p = instance_create(0, 0, 'obj_pacifyspell');
          p.target = g.monsterinstance[star()];
          p.fail = 1;
          p.flashcolor = 0xffff00;
        }
      }
      g.spelldelay = 0;
      break;
    case 202: {
      const c = g.char[star()];
      let reviveamt = ceil(g.maxhp[c] / 2);
      if (g.hp[c] <= 0) reviveamt = ceil(g.maxhp[c]) + Math.abs(g.hp[c]);
      S.scr_healitemspell(inst, reviveamt);
      break;
    }
    case 212: {
      const c = g.char[star()];
      S.scr_healitemspell(inst, { 1: 20, 2: 80, 3: 50, 4: 30 }[c] ?? 20);
      break;
    }
    case 213: {
      const c = g.char[star()];
      S.scr_healitemspell(inst, { 1: 80, 2: 20, 3: 50, 4: 70 }[c] ?? 20);
      break;
    }
    case 226: S.scr_healitemspell(inst, g.char[star()] == 1 ? 100 : 90); break;
    case 230:
    case 231:
      for (let j = 0; j < 3; j++) {
        if (g.char[j] > 0) {
          inst.star = j;
          const c = g.char[j];
          let amt = spell == 230 ? 10 : 50;
          if (g.hp[c] <= 0) amt = spell == 230 ? ceil(g.maxhp[c] / 4) + Math.abs(g.hp[c]) : 999;
          S.scr_healitemspell(inst, amt);
        }
      }
      break;
    case 232: {
      withInst(g.charinstance[star()], h => { h.poisonamount = 60; });
      snd_play('snd_hurt1');
      const ha = S.scr_healitemspell(inst, 40);
      if (ha) ha.particlecolor = 0xff00ff;
      break;
    }
    default: break;
  }
});

// scr_mercyadd(enemy, amount): with the +N% mercy number (dmgwriter type 5).
defineScript('scr_mercyadd', (m, amt) => {
  g.mercymod[m] += amt;
  if (g.mercymod[m] < 0) g.mercymod[m] = 0;
  if (g.mercymod[m] >= 100) g.mercymod[m] = 100;
  const d = instance_create(g.monsterx[m], g.monstery[m] + 20 - g.hittarget[m] * 20, 'obj_dmgwriter');
  d.damage = amt;
  d.type = 5;
  g.hittarget[m] += 1;
});

// ---------------------------------------------------------------- Rude Buster

class RudeBusterAnim extends Instance {
  create() {
    this.sprite_index = 'spr_susie_rudebuster';
    this.t = 0;
    this.image_speed = 0;
    this.target = null;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.damage = 1;
    this.caster = 0;
    this.star = 0;
    const sus = instance_find('obj_herosusie', 0);
    if (sus) this.depth = sus.depth;
    withObj('obj_herosusie', h => { h.visible = false; });
    this.red = 0;
  }
  step() {
    this.image_index = this.t / 2;
    if (this.t >= 28) {
      withObj('obj_herosusie', h => { h.visible = true; });
      instance_destroy(this);
    }
    if (instance_exists(this.target) && this.t == 10) {
      snd_play('snd_rudebuster_swing');
      const blast = instance_create(this.x + 40, this.y + 30, 'obj_rudebuster_bolt');
      blast.caster = this.caster;
      blast.target = this.target;
      blast.damage = this.damage;
      blast.star = this.star;
      if (this.red == 1) blast.red = 1;
    }
    this.t += 1;
  }
}
defineObject('obj_rudebuster_anim', RudeBusterAnim);

class RudeBusterBolt extends Instance {
  create() {
    this.depth = -10;
    this.sprite_index = 'spr_rudebuster_beam';
    this.target = null;
    this.damage = 1;
    this.star = 0;
    this.caster = 0;
    this.image_alpha = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.image_speed = 1;
    this.a = 0;
    this.cx = 0;
    this.cy = 0;
    this.t = 0;
    this.explode = 0;
    this.maxaft = 0;
    this.aft = [];
    this.burst = [];
    this.bolt_timer = 0;
    this.chosen_bolt = 0;
    this.final_bolt = 0;
    this.red = 0;
  }
  step() {
    if (this.image_alpha < 1) this.image_alpha += 0.25;
    else this.image_alpha = 1;
    if (this.t == 0) {
      const m = this.target ? this.target.myself : this.star;
      this.cx = g.monsterx[m];
      this.cy = g.monstery[m];
      this.direction = point_direction(this.x, this.y, this.cx, this.cy) - 20;
      this.speed = 24;
      this.friction = -1.5;
      this.image_angle = this.direction;
      if (this.red == 1) {
        this.sprite_index = 'spr_rudebuster_beam_red';
        this.image_xscale = 2.5;
        this.image_yscale = 2.5;
      }
    }
    if (this.t >= 1 && this.explode == 0) {
      this.bolt_timer += 1;
      if (button1_p() && this.bolt_timer >= 4 && this.chosen_bolt == 0) this.chosen_bolt = this.bolt_timer;
      const dir = point_direction(this.x, this.y, this.cx, this.cy);
      this.direction = this.direction + angle_difference(dir, this.direction) / 4;
      this.image_angle = this.direction;
      if (point_distance(this.x, this.y, this.cx, this.cy) <= 40) {
        this.final_bolt = this.bolt_timer;
        this.visible = false;
        this.explode = 1;
        this.t = 1;
      }
    }
    if (this.explode == 1) {
      if (this.t == 1) {
        if (this.chosen_bolt > 0) {
          const d = this.final_bolt - this.chosen_bolt;
          const bonus = { 0: 30, 1: 28, 2: 22, 3: 20, 4: 13, 5: 11, 6: 10 }[d];
          if (bonus) this.damage += bonus;
          if (Math.abs(this.chosen_bolt - this.final_bolt) <= 2) snd_play('snd_scytheburst');
        }
        if (this.red == 1) this.damage += 90;
        g.hittarget[this.star] = 0;
        if (knightEnemy()) this.damage = round(this.damage / 2);
        S.scr_damage_enemy(this, this.star, this.damage);
        if (g.monstertype[0] != 20) {
          withInst(this.target, tg => {
            const of = S.scr_oflash(tg);
            if (this.red == 1) of.flashcolor = 0xff0000;
          });
        }
        snd_play('snd_rudebuster_hit');
        for (let i = 0; i < 8; i++) {
          const b = S.scr_afterimage(this);
          b.image_speed = 0.5;
          b.x = this.cx;
          b.y = this.cy;
          b.image_angle = 45 + i * 90;
          b.direction = b.image_angle;
          b.speed = 25;
          b.depth = this.depth - 10;
          this.burst[i] = b;
        }
      }
      if (this.t >= 2) {
        for (let i = 0; i < 8; i++) {
          withInst(this.burst[i], b => {
            b.speed = b.speed * (i < 4 ? 0.75 : 0.8);
            b.image_xscale *= 0.8;
          });
        }
      }
      if (this.t >= 18) instance_destroy(this);
    }
    if (this.explode == 0) {
      const a = S.scr_afterimage(this);
      a.image_yscale = 1.8;
      a.image_angle = this.image_angle;
      a.image_index = 4;
      a.image_speed = 0.5;
      a.image_alpha = this.image_alpha - 0.2;
      this.aft[this.maxaft] = a;
      this.maxaft += 1;
    }
    for (let i = 0; i < this.maxaft; i++) {
      withInst(this.aft[i], a => {
        a.image_yscale -= 0.1;
        if (a.image_yscale <= 0.1) instance_destroy(a);
      });
      if (this.explode == 1) {
        withInst(this.aft[i], a => {
          a.image_alpha -= 0.07;
          a.image_yscale *= 0.9;
          if (a.image_yscale <= 0.1) instance_destroy(a);
        });
      }
    }
    this.a += 1;
    this.t += 1;
  }
  draw() { draw_self(this); }
}
defineObject('obj_rudebuster_bolt', RudeBusterBolt);

// ---------------------------------------------------------------- heal sparkles

class HealAnim extends Instance {
  create() {
    this.sprite_index = 'spr_sparestar_anim';
    this.visible = true;
    this.target = null;
    this.starcount = 0;
    this.star = [];
    this.t = 0;
    this.particlesprite = 'spr_sparestar_anim';
    this.particlecolor = 0x00ff00;
  }
  step() {
    this.t += 1;
    if (instance_exists(this.target)) {
      const tg = this.target;
      if (this.t == 1) {
        this.x = tg.x;
        this.y = tg.y;
        this.image_xscale = tg.image_xscale;
        this.image_yscale = tg.image_yscale;
        this.sprite_index = tg.sprite_index;
        this.sw = this.sprite_width;
        this.sh = this.sprite_height;
        if (['obj_herokris', 'obj_herosusie', 'obj_heroralsei'].includes(tg.object_index)) {
          this.sw = tg.mywidth;
          this.sh = tg.myheight;
        }
        S.scr_oflash(tg);
      }
      if (this.t >= 1 && this.t <= 5) {
        for (let i = 0; i < 2; i++) {
          const s = instance_create(this.x + random(this.sw), this.y + random(this.sh), 'obj_marker');
          s.image_angle = random(360);
          s.depth = -10;
          s.image_xscale = 2;
          s.image_yscale = 2;
          s.image_alpha = 2;
          s.image_speed = 0.25;
          s.hspeed = 2 - random(2);
          s.vspeed = -3 - random(2);
          s.friction = 0.2;
          s.sprite_index = this.particlesprite;
          s.image_blend = this.particlecolor;
          this.star[this.starcount++] = s;
        }
      }
      if (this.t >= 5 && this.t <= 30) {
        for (let i = 0; i < this.starcount; i++) {
          withInst(this.star[i], s => {
            s.image_angle -= 10;
            s.image_alpha -= 0.1;
            if (s.image_alpha <= 0) instance_destroy(s);
          });
        }
        if (this.t >= 30) instance_destroy(this);
      }
    } else {
      for (let i = 0; i < this.starcount; i++) withInst(this.star[i], s => instance_destroy(s));
      instance_destroy(this);
    }
  }
  draw() {}
}
defineObject('obj_healanim', HealAnim);

// ---------------------------------------------------------------- Pacify / failed SPARE flash

class PacifySpell extends Instance {
  create() {
    this.target = null;
    this.con = 1;
    this.siner = 0;
    this.alarm[4] = 50;
    this.fail = 0;
    this.flashcolor = 0x0000ff;
  }
  alarm4() { this.con += 1; }
  step() {
    if (!instance_exists(this.target)) { this.con = 99; instance_destroy(this); return; }
    const tg = this.target;
    if (this.con == 1) {
      if (this.fail == 0) {
        this.siner += 1;
        tg.image_blend = merge_color(tg.image_blend, this.flashcolor, 0.1);
        if (this.siner % 2 == 0) {
          const ai = instance_create(tg.x + random(tg.sprite_width), tg.y + tg.sprite_height - 20, 'obj_afterimage');
          ai.gravity = 0.5;
          ai.sprite_index = 'spr_savepoint';
          ai.image_speed = 0.2;
        }
        tg.x += this.siner / 4 + Math.sin(this.siner / 8) * 10;
        tg.y -= this.siner / 5;
      } else {
        this.siner = 0;
        this.con = 5;
      }
    }
    if (this.con == 2) {
      instance_destroy(tg);
      instance_destroy(this);
      return;
    }
    if (this.con == 5) { this.con = 6; this.alarm[4] = 8; }
    if (this.con == 6) tg.image_blend = merge_color(tg.image_blend, this.flashcolor, 0.12);
    if (this.con == 7) { this.con = 8; this.alarm[4] = 8; }
    if (this.con == 8) tg.image_blend = merge_color(tg.image_blend, 0xffffff, 0.16);
    if (this.con == 9) {
      tg.image_blend = 0xffffff;
      instance_destroy(this);
    }
  }
  draw() {}
}
defineObject('obj_pacifyspell', PacifySpell);

// ---------------------------------------------------------------- spare animation

// scr_spareanim(): caller scope (sparedsprite, scale).
defineScript('scr_spareanim', (src) => {
  const a = instance_create(src.x, src.y, 'obj_spareanim');
  a.sprite_index = src.sparedsprite ?? src.sprite_index;
  a.image_index = 0;
  a.image_xscale = src.image_xscale;
  a.image_yscale = src.image_yscale;
  return a;
});

class SpareAnim extends Instance {
  create() {
    this.t = 0;
    this.image_speed = 0;
    this.starcount = 0;
    this.star = [];
    this.afterimage = 0;
    this.tone = 0;
    this.neotone = 0;
    snd_stop('snd_spare');
    snd_play('snd_spare');
  }
  draw() {
    const t = this.t, spr = this.sprite_index;
    if (spr && t >= 6 && t <= 26) {
      this.afterimage += 1;
      d3d_set_fog(true, 0xffffff, 0, 1);
      draw_sprite_ext(spr, this.image_index, this.x + this.afterimage * 4, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, 0.7 - this.afterimage / 25);
      draw_sprite_ext(spr, this.image_index, this.x + this.afterimage * 8, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, 0.4 - this.afterimage / 30);
      d3d_set_fog(false, 0, 0, 0);
    }
    if (spr && t < 6) {
      if (t < 5) draw_sprite_ext(spr, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, 1 - this.neotone / 4);
      d3d_set_fog(true, 0xffffff, 0, 1);
      const maxwhite = Math.min(1, t / 5);
      draw_sprite_ext(spr, this.image_index, this.x, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, maxwhite - this.tone / 5);
      d3d_set_fog(false, 0, 0, 0);
    }
    if (t >= 1 && t <= 5) {
      for (let i = 0; i < 2; i++) {
        const s = instance_create(this.x + random(this.sprite_width), this.y + random(this.sprite_height), 'obj_marker');
        s.image_xscale = 2;
        s.image_yscale = 2;
        s.sprite_index = 'spr_sparestar_anim';
        s.image_alpha = 2;
        s.image_speed = 0.25;
        s.hspeed = -3;
        s.gravity = 0.5;
        s.gravity_direction = 0;
        this.star[this.starcount++] = s;
      }
    }
    if (t >= 5 && t <= 30) {
      for (let i = 0; i < this.starcount; i++) {
        withInst(this.star[i], s => {
          s.image_angle += 10;
          s.image_alpha -= 0.1;
          if (s.image_alpha <= 0) instance_destroy(s);
        });
      }
    }
    if (t >= 5 && t < 10) this.tone += 1;
    if (t >= 9) {
      this.neotone += 1;
      if (this.neotone >= 30) {
        for (let i = 0; i < this.starcount; i++) withInst(this.star[i], s => instance_destroy(s));
        instance_destroy(this);
      }
    }
    this.t += 1;
  }
}
defineObject('obj_spareanim', SpareAnim);
