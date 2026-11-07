// Party damage, down state, revive/heal, enemy targeting, game over trigger.
import {
  global, G, defineScript, S, instance_create, instance_exists, withObj, choose, round, ceil,
} from '../runtime/gm.js?v=20261107001915';
import { snd_play, snd_stop, snd_free_all } from '../runtime/audio.js?v=20261107001915';
import { withInst, knightEnemy } from './common.js?v=20261107001915';

const g = global;

// scr_damage(): bullet scope. Reads caller.target (slot, 3 = all, 4 = anyone) and caller.damage.
// Chapter 3, with the Knight rules: Kris is not targeted while the others stand, ShadowMantle,
// downed Susie/Ralsei go to -999, and no game over from here (the Knight decides at turn end).
defineScript('scr_damage_calculation', (dmg, slot) => {
  let d = dmg;
  const def = g.battledf[slot];
  const maxhp = g.maxhp[g.char[slot]];
  for (let i = 0; i < def; i++) {
    if (d > maxhp / 5) d -= 3;
    else if (d > maxhp / 8) d -= 2;
    else d -= 1;
  }
  return Math.max(d, 1);
});

defineScript('scr_party_hpaverage', () => {
  let hp = 0, maxhp = 0;
  for (let i = 0; i < 3; i++) if (g.char[i] > 0) { hp += g.hp[g.char[i]]; maxhp += g.maxhp[g.char[i]]; }
  return hp > 0 ? Math.floor(hp / maxhp) : 0;
});

defineScript('scr_randomtarget_old', (inst) => {
  let able = 1;
  if (g.charcantarget[0] == 0 && g.charcantarget[1] == 0 && g.charcantarget[2] == 0) able = 0;
  inst.mytarget = choose(0, 1, 2);
  if (able == 1) { while (g.charcantarget[inst.mytarget] == 0) inst.mytarget = choose(0, 1, 2); }
  else inst.mytarget = 3;
  g.targeted[inst.mytarget] = 1;
});

const hasMantle = c => g.chararmor1[c] == 23 || g.chararmor2[c] == 23;

defineScript('scr_damage', (inst) => {
  const debug_inv = g.chemg_god_mode ?? 0;
  if (!(g.inv < 0 && debug_inv == 0)) return;
  S.scr_damage_cache();
  const knight = knightEnemy();
  if (knight) knight.progamer = false;
  if (inst.target < 3) {
    if (g.hp[g.char[inst.target]] <= 0) {
      S.scr_randomtarget_old(inst);
      inst.target = inst.mytarget;
      withInst(g.charinstance[inst.target], h => { h.image_blend = 0xffffff; h.darkify = 0; });
    }
  }
  let remtarget = -1;
  if (inst.target == 4) {
    remtarget = 4;
    const avg = S.scr_party_hpaverage();
    S.scr_randomtarget_old(inst);
    inst.target = inst.mytarget;
    for (let k = 0; k < 2; k++) {
      if (inst.target < 3 && g.hp[g.char[inst.target]] / g.maxhp[g.char[inst.target]] < avg / 2) {
        S.scr_randomtarget_old(inst);
        inst.target = inst.mytarget;
      }
    }
    if (inst.target == 0 && g.hp[g.char[0]] / g.maxhp[g.char[0]] < 0.35) {
      S.scr_randomtarget_old(inst);
      inst.target = inst.mytarget;
    }
    withInst(g.charinstance[inst.target], h => { h.image_blend = 0xffffff; h.darkify = 0; });
  }
  const truedamage = instance_exists('obj_knight_roaring2') ? 1 : 0;
  inst.chartarget = 3;
  if (knight && truedamage == 0 && !knight.aoedamage) {
    if (inst.target == 0) {
      if (g.hp[2] > 0 && g.hp[3] > 0) inst.target = choose(1, 2);
      else if (g.hp[2] > 0) inst.target = 1;
      else if (g.hp[3] > 0) inst.target = 2;
    }
    if (knight.myattackchoice != 13 && (hasMantle(1) || hasMantle(2) || hasMantle(3))) {
      knight.damagecounter = (knight.damagecounter || 0) + 1;
      if (knight.damagecounter < 3) {
        if (g.hp[1] > 0 && hasMantle(1)) inst.target = 0;
        if (g.hp[2] > 0 && hasMantle(2)) inst.target = 1;
        if (g.hp[3] > 0 && hasMantle(3)) inst.target = 2;
      } else {
        inst.target = choose(0, 1, 2);
        for (let k = 0; k < 2; k++) {
          if (g.hp[1] < 1 && inst.target == 0) inst.target += 1;
          if (g.hp[2] < 1 && inst.target == 1) inst.target += 1;
          if (g.hp[3] < 1 && inst.target == 2) inst.target += 1;
          if (inst.target > 2) inst.target = 0;
        }
        // GML precedence: `target == 0 && chararmor1[1] == 23 || chararmor2[1] == 23` (no parentheses),
        // so a ShadowMantle in anyone's second armor slot keeps the counter from resetting.
        const a1 = g.chararmor1, a2 = g.chararmor2, t = inst.target;
        if (!((t == 0 && a1[1] == 23) || a2[1] == 23 || (t == 1 && a1[2] == 23) || a2[2] == 23
          || (t == 2 && a1[3] == 23) || a2[3] == 23)) knight.damagecounter = 0;
      }
    }
  }
  inst.tdamage = inst.damage;
  if (inst.target < 3) {
    if (truedamage == 0) inst.tdamage = S.scr_damage_calculation(inst.tdamage, inst.target);
    inst.chartarget = g.char[inst.target];
    if (knight && truedamage == 0 && hasMantle(inst.target + 1)) inst.tdamage = round(inst.tdamage * 0.33);
    if (truedamage == 0 && g.charaction[inst.target] == 10) inst.tdamage = ceil(2 * inst.tdamage / 3);
    if (inst.tdamage < 1) inst.tdamage = 1;
  }
  // Simulator option: Easy Mode halves the damage the party takes.
  if (G.settings?.easy) inst.tdamage = Math.max(1, ceil(inst.tdamage / 2));
  if (!instance_exists('obj_shake')) instance_create(0, 0, 'obj_shake');
  withInst(g.charinstance[inst.target], h => { h.hurt = 1; h.hurttimer = 0; });
  inst.hpdiff = inst.tdamage;
  withObj('obj_dmgwriter', d => { if (d.delaytimer >= 1) d.killactive = 1; });
  let doomtype = -1;
  withObj('obj_heart', h => { h.dmgnoise = 1; });
  if (inst.target < 3) {
    const ct = inst.chartarget;
    if (g.hp[ct] <= 0) {
      doomtype = 4;
      g.hp[ct] -= round(inst.tdamage / 4);
      inst.hpdiff = round(inst.tdamage / 4);
    } else {
      if (knight && knight.myattackchoice == 2 && (knight.difficulty == 1 || knight.difficulty == 3)) {
        inst.tdamage = round(inst.tdamage * 0.66);
        inst.hpdiff = inst.tdamage;
      }
      g.hp[ct] -= inst.tdamage;
      if (g.hp[ct] <= 0) {
        if (knight && inst.target != 0) {
          doomtype = 12;
          inst.hpdiff = round(g.hp[ct] + 999);
          g.hp[ct] = -999;
        } else {
          inst.hpdiff = Math.abs(g.hp[ct] - g.maxhp[ct] / 2);
          doomtype = 4;
          g.hp[ct] = round(-g.maxhp[ct] / 2);
        }
        S.scr_dead(inst.target);
      }
    }
    const h = g.charinstance[inst.target];
    if (h) {
      const dw = instance_create(h.x, h.y + h.myheight - 24, 'obj_dmgwriter');
      dw.damage = inst.hpdiff;
      dw.type = doomtype;
      inst.dmgwriter = dw;
    }
  }
  if (inst.target == 3) {
    for (let hpi = 0; hpi < 3; hpi++) {
      const ct = g.char[hpi];
      inst.chartarget = ct;
      if (g.hp[ct] >= 0) {
        // As in the GML, tdamage carries over: each hero's defense and mantle reduce it further.
        inst.tdamage = S.scr_damage_calculation(inst.tdamage, hpi);
        if (knight && hasMantle(hpi + 1)) inst.tdamage = round(inst.tdamage * 0.33);
        const td = inst.tdamage;
        if (g.charaction[hpi] == 10) g.hp[ct] -= ceil(3 * td / 4);
        else g.hp[ct] -= td;
        if (g.hp[ct] <= 0) g.hp[ct] = round(-g.maxhp[0] / 2);
      }
    }
  }
  g.inv = g.invc * 30;
  S.scr_damage_check();
  let gameover = 1;
  for (let i = 0; i < 3; i++) if (g.char[i] != 0 && g.hp[g.char[i]] > 0) gameover = 0;
  if (knight) gameover = 0;
  if (gameover == 1) S.scr_gameover();
  if (remtarget != -1) inst.target = remtarget;
});

// scr_damage_all(): bullet scope; hits every standing hero once.
defineScript('scr_damage_all', (inst) => {
  if (g.inv < 0) {
    S.scr_damage_cache();
    const remdamage = inst.damage;
    const temptarget = inst.target;
    for (let ti = 0; ti < 3; ti++) {
      g.inv = -1;
      inst.damage = remdamage;
      inst.target = ti;
      if (g.hp[g.char[ti]] > 0 && g.char[ti] != 0) S.scr_damage(inst);
      if (!G.instances.length) return; // game over reset the room
    }
    g.inv = g.invc * 30;
    inst.target = temptarget;
    S.scr_damage_check();
  }
});

// scr_damage_maxhp(fraction = 1, ignore_defend = false, never_kill = false): bullet scope; takes
// a fraction of the target's max HP (used by the Knight's big slashes).
defineScript('scr_damage_maxhp', (inst, frac = 1, ignoreDefend = false, neverKill = false) => {
  const debug_inv = g.chemg_god_mode ?? 0;
  if (!(g.inv < 0 && debug_inv == 0)) return;
  S.scr_damage_cache();
  if (inst.target < 3) {
    if (g.hp[g.char[inst.target]] <= 0) {
      S.scr_randomtarget_old(inst);
      inst.target = inst.mytarget;
      withInst(g.charinstance[inst.target], h => { h.image_blend = 0xffffff; h.darkify = 0; });
    }
  }
  let remtarget = -1;
  if (inst.target == 4) {
    remtarget = 4;
    S.scr_randomtarget_old(inst);
    inst.target = inst.mytarget;
    for (let k = 0; k < 2; k++) {
      if (g.hp[g.char[inst.target]] / g.maxhp[g.char[inst.target]] < S.scr_party_hpaverage() / 2) {
        S.scr_randomtarget_old(inst);
        inst.target = inst.mytarget;
      }
    }
    if (inst.target == 0 && g.hp[g.char[inst.target]] / g.maxhp[g.char[inst.target]] < 0.35) {
      S.scr_randomtarget_old(inst);
      inst.target = inst.mytarget;
    }
    withInst(g.charinstance[inst.target], h => { h.image_blend = 0xffffff; h.darkify = 0; });
  }
  inst.chartarget = 3;
  const knight = knightEnemy();
  if (knight && !instance_exists('obj_knight_roaring2') && knight.aoedamage == 0) {
    if (inst.target == 0) {
      if (g.hp[2] > 0 && g.hp[3] > 0) inst.target = choose(1, 2);
      else if (g.hp[2] > 0) inst.target = 1;
      else if (g.hp[3] > 0) inst.target = 2;
    }
    if (knight.myattackchoice != 13 && (hasMantle(1) || hasMantle(2) || hasMantle(3))) {
      knight.damagecounter = (knight.damagecounter || 0) + 1;
      if (knight.damagecounter < 3) {
        if (g.hp[1] > 0 && hasMantle(1)) inst.target = 0;
        if (g.hp[2] > 0 && hasMantle(2)) inst.target = 1;
        if (g.hp[3] > 0 && hasMantle(3)) inst.target = 2;
      } else {
        inst.target = choose(0, 1, 2);
        for (let k = 0; k < 2; k++) {
          if (g.hp[1] < 1 && inst.target == 0) inst.target += 1;
          if (g.hp[2] < 1 && inst.target == 1) inst.target += 1;
          if (g.hp[3] < 1 && inst.target == 2) inst.target += 1;
          if (inst.target > 2) inst.target = 0;
        }
        if (!hasMantle(inst.target + 1)) knight.damagecounter = 0;
      }
    }
    if (inst.target < 3 && hasMantle(inst.target + 1)) frac /= 2;
  }
  let chartarget = g.char[inst.target];
  inst.chartarget = chartarget;
  let tdamage = ceil(g.maxhp[chartarget] * frac);
  if (g.charaction[inst.target] == 10 && !ignoreDefend) tdamage = ceil(tdamage / 1.5);
  if (neverKill) tdamage = Math.max(1, Math.min(tdamage, g.hp[chartarget] - 1));
  // Simulator option: Easy Mode halves the damage the party takes.
  if (G.settings?.easy) tdamage = Math.max(1, ceil(tdamage / 2));
  inst.tdamage = tdamage;
  if (!instance_exists('obj_shake')) instance_create(0, 0, 'obj_shake');
  withInst(g.charinstance[inst.target], h => { h.hurt = 1; h.hurttimer = 0; });
  inst.hpdiff = tdamage;
  withObj('obj_dmgwriter', d => { if (d.delaytimer >= 1) d.killactive = 1; });
  let doomtype = -1;
  withObj('obj_heart', h => { h.dmgnoise = 1; });
  if (inst.target < 3) {
    if (g.hp[chartarget] <= 0) {
      doomtype = 4;
      g.hp[chartarget] -= round(tdamage / 4);
      inst.hpdiff = round(tdamage / 4);
    } else {
      g.hp[chartarget] -= tdamage;
      if (g.hp[chartarget] <= 0) {
        if (knight) {
          if (g.hp[1] < 0) {
            g.hp[1] = 1;
            inst.hpdiff = round(g.hp[chartarget] - 1);
            doomtype = 4;
            S.scr_battle_sprite_set('kris', 'spr_kris_fallen_dark', 0.25, true);
          } else {
            doomtype = 12;
            inst.hpdiff = round(g.hp[chartarget] + 999);
            g.hp[chartarget] = -999;
            S.scr_dead(inst.target);
          }
        } else {
          inst.hpdiff = Math.abs(g.hp[chartarget] - g.maxhp[chartarget] / 2);
          doomtype = 4;
          g.hp[chartarget] = round(-g.maxhp[chartarget] / 2);
          S.scr_dead(inst.target);
        }
      }
    }
    const h = g.charinstance[inst.target];
    if (h) {
      const dw = instance_create(h.x, h.y + h.myheight - 24, 'obj_dmgwriter');
      dw.damage = inst.hpdiff;
      dw.type = doomtype;
      inst.dmgwriter = dw;
    }
  }
  if (inst.target == 3) {
    for (let hpi = 0; hpi < 3; hpi++) {
      chartarget = g.char[hpi];
      if (g.hp[chartarget] >= 0) {
        // TODO: scr_element_damage_reduction is not ported (no elemental armour here).
        const td = tdamage = S.scr_damage_calculation(tdamage, hpi); // carries over, as in the GML
        if (g.charaction[hpi] == 10) g.hp[chartarget] -= ceil(3 * td / 4);
        else g.hp[chartarget] -= td;
        if (g.hp[chartarget] <= 0) g.hp[chartarget] = round(-g.maxhp[0] / 2);
      }
    }
  }
  g.inv = g.invc * 30;
  S.scr_damage_check();
  let gameover = 1;
  for (let i = 0; i < 3; i++) if (g.char[i] != 0 && g.hp[g.char[i]] > 0) gameover = 0;
  if (knight) gameover = 0; // as in scr_damage here: the Knight decides at turn end
  if (gameover == 1) S.scr_gameover();
  if (remtarget != -1) inst.target = remtarget;
});

// Achievement bookkeeping in the original; kept for the cache only.
defineScript('scr_damage_cache', () => {
  g.damage_cache = [];
  for (let i = 0; i < 3; i++) g.damage_cache.push(g.hp[g.char[i]]);
});
defineScript('scr_damage_check', () => {
  const cache = g.damage_cache || [];
  for (let i = 0; i < cache.length; i++) if (g.hp[g.char[i]] < cache[i]) return true;
  return false;
});

defineScript('scr_dead', (slot) => {
  g.charmove[slot] = 0;
  g.charcantarget[slot] = 0;
  g.chardead[slot] = 1;
  g.charaction[slot] = 0;
  g.charspecial[slot] = 0;
});

defineScript('scr_revive', (slot) => {
  g.charmove[slot] = 1;
  g.charcantarget[slot] = 1;
  g.chardead[slot] = 0;
});

// scr_heal(slot, amount): returns the HP actually gained.
defineScript('scr_heal', (slot, amt) => {
  let abovemaxhp = 0, belowzero = 0;
  const t = g.char[slot];
  const curhp = g.hp[t];
  if (g.hp[t] <= 0) belowzero = 1;
  if (g.hp[t] > g.maxhp[t]) abovemaxhp = 1;
  if (abovemaxhp == 0) {
    g.hp[t] += amt;
    if (g.hp[t] > g.maxhp[t]) g.hp[t] = g.maxhp[t];
  }
  if (belowzero == 1 && g.hp[t] >= 0) {
    if (g.hp[t] < ceil(g.maxhp[t] / 6)) g.hp[t] = ceil(g.maxhp[t] / 6);
    S.scr_revive(slot);
  }
  snd_stop('snd_power');
  snd_play('snd_power');
  return g.hp[t] - curhp;
});

defineScript('scr_healall', (amt) => {
  for (let i = 0; i < 3; i++) if (g.char[i] != 0) S.scr_heal(i, amt);
});

// scr_randomtarget(): monster/bullet scope; sets caller.mytarget and marks global.targeted.
defineScript('scr_randomtarget', (inst) => {
  let abletotarget = 1;
  if (g.charcantarget[0] == 0 && g.charcantarget[1] == 0 && g.charcantarget[2] == 0) abletotarget = 0;
  inst.mytarget = choose(0, 1, 2);
  if (abletotarget == 1) {
    while (g.charcantarget[inst.mytarget] == 0) inst.mytarget = choose(0, 1, 2);
  } else inst.mytarget = 3;
  g.targeted[inst.mytarget] = 1;
  // Chapter 2+: every standing hero is marked; the bullet picks its victim on hit (target 4).
  if (inst.mytarget != 3) {
    for (let i = 0; i < 3; i++) if (g.charcantarget[i]) g.targeted[i] = 1;
    inst.mytarget = 4;
  }
});

defineScript('scr_targetall', (inst) => {
  for (let i = 0; i < 3; i++) if (g.charcantarget[i] == 1) g.targeted[i] = 1;
  inst.mytarget = 3;
  inst.target = 3;
});

// scr_gameover(): stop everything and go to the heart-break sequence.
// The room change happens at the start of the next frame (obj_time), like room_goto.
defineScript('scr_gameover', () => {
  if (G.pendingGameover) return;
  snd_free_all();
  snd_play('snd_hurt1');
  let shot = null;
  if (G.ctx) {
    shot = document.createElement('canvas');
    shot.width = G.ctx.canvas.width;
    shot.height = G.ctx.canvas.height;
    shot.getContext('2d').drawImage(G.ctx.canvas, 0, 0);
  }
  // The SOUL appears where it was (or where it would enter the box); tempflag[96]: the Knight's HP
  // went below 80% (DEVICE_FAILURE's "I FELT IT THERE SHINING" lines).
  const heart = G.instances.find(i => i.alive && (i.constructor.objName === 'obj_heart'));
  G.knightNearWin = g.tempflag?.[96] == 1;
  G.pendingGameover = { x: heart ? heart.x - G.camX : (g.heartx ?? 310), y: heart ? heart.y - G.camY : (g.hearty ?? 160), shot };
});
