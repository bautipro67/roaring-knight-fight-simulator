// THE ROARING KNIGHT: obj_knight_enemy (Create, Step, End Step, Draw, Alarm_4/6, Other_10/12/13/22,
// CleanUp) and obj_bgfountaintest (the fight's background).
// Battle-system scripts come from the battle modules through S (scr_enemyblcon, scr_battletext_default,
// scr_nextact, scr_damage, scr_monstersetup...); bullet-phase ones are local.
import {
  G, global, Instance, defineObject, instance_create, instance_create_depth, instance_destroy, instance_exists, instancesOf,
  choose, random, merge_color, make_color_hsv, draw_sprite_ext, d3d_set_fog, keyboard_check_pressed, button3_p,
  snd_play, snd_stop, mus_volume, draw_sprite_tiled_ext, bgr, S,
} from './rt.js?v=20261031170934';
import {
  first, camerax, cameray, i_ex, callOr, scr_lerpvar, scr_doom, snd_play_x, move_towards_point, tagParent,
} from './common.js?v=20261031170934';
import { scr_bulletspawner } from './dbullet.js?v=20261031170934';
import { point_distance, objectExists } from '../runtime/gm.js?v=20261031170934';

const MonsterParent = tagParent('obj_monsterparent');

// scr_isphase / scr_turntimer (local versions unless the battle modules registered them)
const isphase = callOr('scr_isphase', p => {
  if (p === 'menu') return global.myfight === 0;
  if (p === 'acting') return global.myfight === 3;
  if (p === 'enemytalk' || p === 'balloon') return global.mnfight === 1;
  if (p === 'bullets' || p === 'enemyattack') return global.mnfight === 2;
  return false;
});
const turntimer = callOr('scr_turntimer', t => { if (global.turntimer < t) global.turntimer = t; });
const moveheart = callOr('scr_moveheart', () => {
  const k = first('obj_herokris');
  return instance_create(k ? k.x + 10 : camerax() + 90, k ? k.y + 40 : cameray() + 140, 'obj_moveheart');
});
// msgsetloc / msgnextloc: global.msg[0] = text, then the next free slot. The slot counter is
// global.msgno, shared with the battle system's scr_anyface_next (face changes between lines).
function msgset(n, s) {
  global.msg ??= [];
  global.msg[n] = s;
  global.msgno = n;
  for (let i = n + 1; i < global.msg.length; i++) global.msg[i] = '%%';
}
function msgnext(s) {
  global.msgno = (global.msgno ?? 0) + 1;
  global.msg[global.msgno] = s;
}
const writerExists = () => i_ex('obj_writer');
// mus_volume / mus_fade on global.batmusic[1]: that is the playing voice (mus_loop_ext's return),
// which the runtime's mus_volume(stream) does not take, so its volume is set directly.
const musVolume = (v, frames) => global.batmusic?.[1]?.setVolume?.(v, frames);
// The objects each myattackchoice needs: a choice counts as ported once its attack module has
// registered them (a missing or failed module only disables that attack).
const CHOICE_OBJECTS = {
  0: ['obj_bullet_knight_crescentGenerator'], 1: ['obj_knight_pointing_cone'], 2: ['obj_roaringknight_boxsplitter_attack'],
  5: ['obj_knight_rotating_slash'], 7: ['obj_knight_combinations'], 9: ['obj_knight_roaring2'], 10: ['obj_knight_swordfall'],
  11: ['obj_tracking_swords_manager'], 12: ['obj_diagonal_bullet_manager'], 13: ['obj_sword_tunnel_manager'],
  14: ['obj_tracking_swords_manager'], 15: ['obj_sword_vortex_manager', 'obj_tracking_swords_manager'],
  16: ['obj_knight_rotating_slash', 'obj_tracking_swords_manager'], 17: ['obj_tracking_swords_manager'],
};
const PORTED_CHOICES = { has: c => !!CHOICE_OBJECTS[c] && CHOICE_OBJECTS[c].every(objectExists) };

export class KnightEnemy extends MonsterParent {
  constructor() {
    super();
    this.sprite_index = 'spr_roaringknight_idle';
  }
  create() {
    // scr_enemy_object_init
    Object.assign(this, {
      becomeflash: 0, flash: 0, turnt: 0, turns: 0, talktimer: 0, state: 0, siner: 0, fsiner: 0, talked: 0, attacked: 0,
      hurt: 0, hurttimer: 0, hurtshake: 0, shakex: 0, mywriter: 343249823, acttimer: 0, con: 0, dodgetimer: 0, fatal: 0,
      candodge: 0, mytarget: 0, damage: -1, grazepoints: -1, timepoints: -1, inv: -1, target: -1, grazed: -1, grazetimer: -1,
      element: 'none', acting: 0, actcon: 0, actingsus: 0, actingral: 0, actingnoe: 0, actconsus: 0, actconral: 0, actconnoe: 0,
      talkmax: 90, mercymod: 0, maxmercy: 100, recruitable: 1, recruitcount: 1, hurtspriteoffx: 0, hurtspriteoffy: 0,
    });
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.depth = 90 - (this.y - cameray()) / 50;
    // Create_0
    this.recruitcount = 5;
    this.image_speed = 1 / 6;
    this.idlesprite = 'spr_roaringknight_idle';
    this.hurtsprite = 'spr_roaringknight_idle';
    this.sparedsprite = 'spr_roaringknight_hurt';
    this.siner = 0;
    this.siner2 = 0;
    this.aetimer = 0;
    this.combo_power = 1;
    this.first_attack = 4;
    this.second_attack = 2;
    this.third_attack = 3;
    this.rotatingslash3used = false;
    this.holdbreathcount = 0;
    this.sactcount = 0;
    this.ractcount = 0;
    this.chargeupcon = 0;
    this.chargeuptimer = 0;
    this.turn = 0;
    this.phase = 1;
    this.phaseturn = 0;
    this.myattackchoice = 0;
    this.difficulty = 0;
    this.endcon = 0;
    this.endtimer = 0;
    this.end_cutscene_version = 0;
    this.balloonturn = 0;
    for (const c of instancesOf('obj_battlecontroller')) { c.cantspare ??= []; c.cantspare[0] = 1; }
    this.ballooncon = 0;
    this.balloonend = 1;
    this.blocking = 1;
    this.blockanim = 0;
    this.blocktimer = 0;
    this.damagereduction = 0.04;
    this.damagereductiontimer = 0;
    this.krisdamagereduction = 0.5;
    this.whiteflash = 0;
    this.haveusedroaring = false;
    this.checkcount = 0;
    this.aoedamage = false;
    this.stronghurtanim = false;
    this.progamer = true;
    this.krisdownmessage = false;
    this.susiedownmessage = false;
    this.ralseidownmessage = false;
    this.setdownmessage = false;
    this.damagecounter = 0;
    this.phase4turn = 0;
    this.rtimer = 0;
    global.firstknightbattle = (global.firstknightbattle ?? 0) + 1;
    this.overrideAttack = 0;
    for (const s of instancesOf('obj_herosusie')) {
      s.normalsprite = 'spr_susier_dark_unhappy';
      s.idlesprite = 'spr_susieb_idle_serious';
      s.defendsprite = 'spr_susieb_defend_unhappy';
      s.actreadysprite = 'spr_susieb_actready';
      s.attacksprite = 'spr_susieb_attack_serious';
      if (global.charweapon && global.charweapon[2] === 0) s.idlesprite = 'spr_susieb_idle_unarmed_unhappy';
      s.itemsprite = 'spr_susieb_item_unhappy';
      s.itemreadysprite = 'spr_susieb_itemready_unhappy';
      s.spellreadysprite = 'spr_susieb_spellready_unhappy';
      s.spellsprite = 'spr_susieb_spell_unhappy';
      s.defeatsprite = 'spr_susie_dw_fell';
    }
    for (const b of instancesOf('obj_battleback')) instance_destroy(b);
    if (!i_ex('obj_bgfountaintest')) instance_create(this.x, this.y, 'obj_bgfountaintest');
    global.tempflag ??= [];
    global.tempflag[96] = 0;
  }
  cleanUp() { global.invc = 1; }
  alarm4() { this.con += 1; }
  alarm6() {
    if (this.balloonend === 1) this.talked = 1;
    else {
      this.talked = 0.6;
      this.talktimer = 0;
    }
  }
  // Other_22: called by the battle controller right after creation.
  user12() {
    global.monsterx[this.myself] = this.x + this.sprite_width / 2;
    global.monstery[this.myself] = this.y + this.sprite_height / 2;
    S.scr_monstersetup(this);
    knightStats(this.myself);
  }
  // Other_10: the attack for this turn, in fight order.
  user0() {
    if (this.phase !== 4) {
      this.turn += 1;
      this.phaseturn += 1;
    }
    if (this.overrideAttack > 0) this.phaseturn = this.overrideAttack;
    const set = (choice, diff) => {
      // TODO: attacks not ported yet (tracking swords, sword tunnel, rotating slash, vortex,
      // combination, diagonal bullets, the Roaring) fall back to Stars / Flurry, alternating,
      // at this phase's difficulty, so no turn is left empty.
      if (choice > 0 && !PORTED_CHOICES.has(choice)) {
        const flurry = this.turn % 2 === 0;
        const p = Math.min(Math.max(this.phase, 1), 3);
        choice = flurry ? 2 : 1;
        diff = flurry ? [0, 1, 3][p - 1] : p - 1;
      }
      this.myattackchoice = choice;
      this.difficulty = diff;
    };
    if (this.phase === 1) {
      const t = this.phaseturn;
      if (t === 1) set(1, 0);
      if (t === 2) set(11, 0);
      if (t === 3) set(2, 0);
      if (t === 4) set(13, 0);
      if (t === 5) { set(5, 0); this.phase = 2; this.phaseturn = 0; }
      if (t === 6) set(12, 0);
      if (t === 7) set(16, 0);
      if (t === 8) set(17, 0);
      if (t === 9) set(7, 0);
    }
    if (this.phase === 2) {
      const t = this.phaseturn;
      if (t === 1) set(1, 1);
      if (t === 2) set(2, 1);
      if (t === 3) set(13, 3);
      if (t === 4) set(15, 0);
      if (t === 5) { set(5, 1); this.phase = 3; this.phaseturn = 0; }
    }
    if (this.phase === 3) {
      const t = this.phaseturn;
      if (t === 1) set(1, 2);
      if (t === 2) set(2, 3);
      if (t === 3) set(14, 0);
      if (t === 4) set(13, 4);
      if (t === 5) { set(5, 2); this.rotatingslash3used = true; this.phaseturn = 0; }
    }
    if (this.phase === 4) {
      this.phase4turn += 1;
      if (this.phase4turn === 1 && this.rotatingslash3used) this.phase4turn = 2;
      if (this.phase4turn === 1) set(5, 2);
      if (this.phase4turn === 2) set(-1, 1);
      if (this.phase4turn === 3) {
        set(9, 0);
        this.damagereduction = 0.4;
        this.haveusedroaring = true;
        this.phase = 3;
      }
    }
  }
  // Other_12: the Roaring's hit (40 damage to everyone, never lethal below 41 HP).
  user2() {
    if (!(global.inv < 0)) return;
    const temptarget = this.target;
    for (let ti = 0; ti < 3; ti++) {
      global.inv = -1;
      this.damage = 40;
      const hp = global.hp[ti + 1];
      if (hp > 1 && hp < 41) this.damage = hp - 1;
      this.target = ti;
      if (global.hp[global.char[ti]] > 0 && global.char[ti] !== 0) S.scr_damage(this);
    }
    global.inv = global.invc * 30;
    this.target = temptarget;
  }
  // Other_13: defeat bookkeeping (flags 40-54).
  user3() {
    const f = global.flag, m = this.myself;
    if (!f) return;
    global.monstergold[3] += global.monstergold[m];
    global.monsterexp[3] += global.monsterexp[m];
    if (f[51 + m] === 0) f[51 + m] = global.monsterhp[m] <= 0 ? 1 : 2;
    if (f[51 + m] === 1) f[40] += 1;
    if (f[51 + m] === 2) f[41] += 1;
    let violenced = 0, spared = 0;
    for (let i = 0; i < 3; i++) {
      if (f[51 + i] === 1) violenced += 1;
      if (f[51 + i] === 2) spared += 1;
    }
    if (spared > 0) f[50] = 2;
    if (violenced > 0) f[50] = 1;
  }
  step() {
    const m = this.myself;
    if (!i_ex('obj_herosusie') || !i_ex('obj_heroralsei')) return;
    if (global.monsterhp[m] <= global.monstermaxhp[m] * 0.8) global.tempflag[96] = 1;
    const heart = first('obj_heart');
    if (this.holdbreathcount > 0 && heart) heart.wspeed = 5;
    if (this.holdbreathcount > 0 && i_ex('obj_knight_roaring2') && heart) heart.wspeed = 6;
    this.damagereductiontimer += 1;
    if (this.damagereductiontimer === 1) {
      this.damagereduction = 0.2;
      global.monstername[m] = 'Knight';
      this.blocking = 0;
      this.hurtsprite = 'spr_roaringknight_hurt';
    }
    this.stepBlock();
    if (global.monster[m] === 1) this.stepBattle();
    if (global.myfight === 3) this.stepActs();
    if (this.state === 3) {
      if ('scr_enemy_hurt' in S) S.scr_enemy_hurt(this);
      else {
        this.hurttimer -= 1;
        if (this.hurttimer < 0) this.state = 0;
        else if (++this.hurtshake > 1) {
          if (this.shakex > 0) this.shakex -= 1;
          if (this.shakex < 0) this.shakex += 1;
          this.shakex = -this.shakex;
          this.hurtshake = 0;
        }
      }
    }
    if (this.end_cutscene_version === 1) {
      this.endtimer += 1;
      if (this.endtimer === 32) {
        S.scr_fadeout(15);
        for (const f of instancesOf('obj_fadeout')) {
          f.image_blend = 0xffffff;
          f.x -= 40;
          f.length *= 2;
        }
      }
      if (this.endcon === 1 && this.endtimer > 45) {
        if (global.flag) { global.flag[50] = 0; global.flag[51] = 1; }
        for (const a of instancesOf('obj_attackpress')) instance_destroy(a);
        for (const a of instancesOf('obj_dmgwriter')) instance_destroy(a);
        this.endcon = 2;
        this.endBattle();
      }
    }
    if (this.chargeupcon === 1) {
      this.chargeuptimer += 1;
      if (this.chargeuptimer === 1) snd_play('snd_knight_powerup_white');
      if (this.chargeuptimer % 4 === 0 && this.chargeuptimer > 10) {
        const fade = instance_create_depth(this.x, this.y, this.depth + 1, 'obj_afterimage_fade_to_white');
        fade.sprite_index = this.sprite_index;
        fade.image_index = this.image_index;
        fade.image_speed = 0;
        fade.image_xscale = this.image_xscale;
        fade.image_yscale = this.image_yscale;
        fade.image_alpha = 0.6;
        fade.speed = 4;
        fade.direction = random(360);
      }
      if (this.chargeuptimer === 60) global.turntimer = 1;
    }
  }
  endBattle() {
    for (const c of instancesOf('obj_battlecontroller')) { c.noreturn = 1; c.intro = 2; }
    for (const t of instancesOf('obj_tensionbar')) { t.alarm[5] = 15; t.hspeed = -10; t.friction = -0.4; }
    this.user3();
    global.fighting = 0;
    musVolume(0, 90);
  }
  stepBlock() {
    if (this.blockanim === 1) {
      snd_stop('snd_bell');
      snd_play('snd_bell');
      this.idlesprite = 'spr_roaringknight_block_ol';
      this.whiteflash = 2;
      this.blockanim = 2;
      this.blocktimer = 0;
      this.shakex = 5;
      this.state = 3;
      this.hurttimer = 30;
    }
    if (this.blockanim === 2) {
      this.blocktimer += 1;
      const vfx = (vs, grav) => {
        const a = instance_create(this.x + 14, this.y + 40, 'obj_block_vfx');
        a.sprite_index = 'spr_roaringknight_block_vfx';
        a.image_xscale = 1.3;
        a.image_yscale = 1.3;
        a.vspeed = vs;
        a.gravity_direction = 0;
        a.gravity = grav;
        a.image_speed = 0.5;
      };
      if (this.blocktimer === 1) { vfx(-8, 1); vfx(8, 2); }
      if (this.blocktimer === 3 || this.blocktimer === 6) vfx(choose(-8, 8), 2);
      if (this.blocktimer === 15) {
        this.blocktimer = 0;
        this.blockanim = 0;
        this.idlesprite = 'spr_roaringknight_idle';
      }
    }
  }
  stepBattle() {
    const m = this.myself;
    if (isphase('enemytalk') && this.talked === 0 && this.end_cutscene_version === 0) {
      S.scr_randomtarget(this);
      if (!instance_exists('obj_darkener')) instance_create(0, 0, 'obj_darkener');
      global.fc = 22;
      global.typer = 81;
      let createballoon = false;
      if (global.hp[2] > 0) {
        this.balloonturn += 1;
        const bt = this.balloonturn, kd = global.hp[1] < 1 && global.hp[3] < 1;
        const say = (s, con, end) => { msgset(0, s); this.ballooncon = con; this.balloonend = end; createballoon = true; };
        if (bt === 6) say('Heheh.../%', 1, 0);
        if (bt === 7) say('Thing is,&you actually.../%', 2, 0);
        if (bt === 8) say("You? You're all&damn alone.../%", 3, 0);
        if (bt === 9) say('Even... even if&you knock me down.../%', 4, 0);
        if (bt === 9 && kd) say('Even... even if&you knock them down.../%', 5, 0);
        if (bt === 10) say('As long as Kris has got&a hand to lift me up with.../%', 6, 0);
        if (bt === 10 && kd) say("As long as I'm here to&lift them back up.../%", 6, 0);
        if (bt === 11) say('So... give up./%', 0, 1);
        if (bt === 12) say("You know you can't&win... so... give up!/%", 0, 1);
        if (bt === 13) say("... You won't even.../%", 7, 0);
        if (bt === 14) say('... heh... heheheh.../%', 8, 0);
      }
      if (createballoon) this.susieBalloon();
      if (!createballoon) global.mnfight = 1.5;
      else if (this.ballooncon === 0) { this.talked = 0.5; this.talktimer = 0; } else { this.talked = 0.6; this.talktimer = 0; }
      this.rtimer = 0;
    }
    if (this.talked === 0.5) {
      this.talktimer += 1;
      if ((button3_p() && this.talktimer > 15) || !writerExists()) {
        for (const w of instancesOf('obj_writer')) instance_destroy(w);
        this.alarm[6] = 1;
      }
    }
    if (this.talked === 0.6) {
      this.talktimer += 1;
      if ((button3_p() && this.talktimer > 15) || !writerExists()) {
        for (const w of instancesOf('obj_writer')) instance_destroy(w);
        const next = {
          1: ["Didn't... think&we'd still be&standing, did you?/%", 0, 1],
          2: ['You actually messed up,&picking a fight with US!/%', 0, 1],
          3: ['Me? I got...&Kris and Ralsei&behind me./%', 0, 1],
          4: ['As long as Kris,&Ralsei, are here.../%', 0, 1],
          5: ["As long as&I'm here.../%", 0, 1],
          6: ["Heh... you're never gonna&win, you hear me?!/%", 0, 1],
          7: ['... say a thing, huh.../%', 0, 1],
          8: ["Man, I'm done talking./%", 9, 0],
          9: ['... people like you...&just piss me off./%', 0, 1],
        }[this.ballooncon];
        if (next) {
          msgset(0, next[0]);
          this.ballooncon = next[1];
          this.balloonend = next[2];
        }
        this.talked = 0.7;
        this.susieBalloon();
        this.alarm[6] = 1;
      }
    }
    if (this.talked === 1 && isphase('enemytalk') && !writerExists()) {
      global.mnfight = 1.5;
      this.attackchosen = false;
    }
    if (global.mnfight === 1.5 && this.end_cutscene_version === 0) this.startBullets();
    if (isphase('bullets') && this.attacked === 0 && this.end_cutscene_version === 0) {
      this.rtimer += 1;
      if (this.rtimer === 12) this.launchAttack();
    }
    if (global.mnfight === 2 && global.turntimer <= 1 && !this.setdownmessage) this.downMessages();
    if (global.hp[1] < 1 && global.hp[2] < 1 && global.hp[3] < 1 && global.turntimer > 0) {
      global.turntimer = 0;
      for (const o of instancesOf(['obj_lerpvar', 'obj_script_delayed', 'obj_afterimage_grow'])) instance_destroy(o);
    }
    if (global.mnfight === 2 && global.turntimer < 1 && global.hp[1] < 1 && global.hp[2] < 1 && global.hp[3] < 1 && this.endcon === 0) {
      this.endcon = 1;
      for (const p of instancesOf('obj_particle_generic')) instance_destroy(p);
      // scr_get_knight_total_attempts() > 0 in the simulator: the party fell, so it is a game over.
      S.scr_gameover();
    }
  }
  susieBalloon() {
    global.typer = 75;
    const s = first('obj_herosusie');
    S.scr_enemyblcon(this, s ? s.x + 92 : 180, s ? s.y + 38 : 190, 14);
    S.scr_guardpeek(this, 'obj_herosusie');
    if (this.myblcon && this.myblcon.alive) this.myblcon.depth = this.depth - 100;
  }
  // global.mnfight == 1.5: choose the attack, make the box and send the SOUL in.
  startBullets() {
    if (!instance_exists('obj_growtangle')) {
      this.user0();
      this.setdownmessage = false;
      if (this.damagereduction >= 0.2 && this.damagereduction < 0.35) this.damagereduction += 0.01;
      const c = this.myattackchoice, vx = camerax(), vy = cameray();
      let g = null;
      if (c === -1) { /* no box: the charge-up turn */ }
      else if (c === 0) g = instance_create(vx + 320 - 152, vy + 170, 'obj_growtangle');
      else if (c === 11) g = instance_create(vx + 320, vy + 190, 'obj_growtangle');
      else if (c === 13) g = instance_create(vx + 300, vy + 190, 'obj_growtangle');
      else g = instance_create(vx + 320, vy + 170, 'obj_growtangle');
      if (g) {
        if (c === 0) g.maxxscale = 0.5;
        if (c === 1) { g.maxxscale = 2.25; g.maxyscale = 1.75; }
        if (c === 4) { g.maxxscale = 3.5; g.maxyscale = 3.5; }
        if (c === 13) g.maxxscale = 3;
      }
    }
    if (!instance_exists('obj_moveheart') && !i_ex('obj_heart') && this.myattackchoice !== -1) {
      moveheart();
      if (this.myattackchoice === 13) {
        const g = first('obj_growtangle');
        for (const mh of instancesOf('obj_moveheart')) {
          mh.distx = g.x - 40;
          mh.disty = g.y - 8;
          mh.dist = point_distance(mh.x, mh.y, mh.distx, mh.disty);
          move_towards_point(mh, mh.distx, mh.disty, mh.dist / mh.flytime);
        }
      }
    }
    global.mnfight = 2;
    turntimer(90);
  }
  // rtimer == 12 of the bullet phase: the dbulletcontroller for this turn's attack.
  launchAttack() {
    const m = this.myself, c = this.myattackchoice, d = this.difficulty;
    this.aoedamage = false;
    global.monsterattackname ??= [];
    const spawn = (name, type, diff, dmg) => {
      global.monsterattackname[m] = name;
      const dc = scr_bulletspawner(this, this.x, this.y, 'obj_dbulletcontroller');
      dc.type = type;
      if (diff !== undefined) dc.difficulty = diff;
      if (dmg !== undefined) dc.damage = dmg;
      return dc;
    };
    if (c === 0) { spawn('Swordslash', 109, d); global.invc = 0.4; }
    else if (c === 1) { spawn('Stars', 98, d); global.invc = 1; }
    else if (c === 2) { spawn('Flurry', 99, d); global.invc = 0.4; }
    else if (c === 3) { spawn('swordtunnel', 102); global.invc = 0.4; }
    else if (c === 4) { spawn('xattacks', 103); global.invc = 0.4; }
    else if (c === 5) { spawn('rotatingslash', 104, d); global.invc = 1; }
    else if (c === 6) { spawn('underboxattack', 106); global.invc = 0.4; }
    else if (c === 7) { spawn('combinationattack', 105); global.invc = 0.4; }
    else if (c === 9) { spawn('roaring', 107); global.invc = 1; }
    else if (c === 10) { spawn('swords falling', 108, d); global.invc = 0.4; }
    else if (c === 11) { spawn('tracking swords', 151, 0, 206); global.invc = 0.4; }
    else if (c === 12) { spawn('diagonal bullets', 152, d); global.invc = 0.4; }
    else if (c === 13) { spawn('sword tunnel new', 153, d, 62); global.invc = 0.14; }
    else if (c === 14) { spawn('tracking swords', 151, 3, 206); global.invc = 0.4; }
    else if (c === 15) { spawn('sword vortex', 154, 3, 206); spawn('tracking swords', 151, 0, 206); global.invc = 0.4; }
    else if (c === 16) { spawn('rotatingslash', 104, 0); spawn('tracking swords', 151, 0, 206); global.invc = 0.4; }
    else if (c === 17) { spawn('tracking swords', 151, 2, 206); global.invc = 0.4; }
    if (c === -1) this.chargeupcon = 1;
    else if (c === 20) spawn('knightlines', 101);
    if (c === 7) turntimer(270);
    else if (c === 2) turntimer(350);
    else if (c === 0) turntimer(300);
    else if (c === 11 && d === 0) turntimer(292);
    else if (c === 11 || c === 12 || c === 14 || c === 15) turntimer(300);
    else if (c === 13 && d === 3) turntimer(360);
    else if (c === 13) turntimer(330);
    else turntimer(240);
    if (this.damagereductiontimer >= 750) global.monstername[m] = 'Knight';
    this.turns += 1;
    global.typer = 6;
    global.fc = 0;
    global.battlemsg ??= [];
    const T = {
      1: ['* You felt lightheaded.&* You saw silver stars...', '* You felt something hovering close behind your head...', '* Suddenly, the north wind blew fiercely.', '* Your vision narrows.', '* Your chest feels tight.'],
      2: ['* You felt lightheaded.&* You saw golden stars...', '* Suddenly, the north and east winds blew fiercely.', '* Your vision narrows.&* ... Your head is spinning.', '* You feel surrounded.', '* You felt your chest twisting.'],
      3: ['* You felt lightheaded.&* You felt a migraine coming on...', '* Suddenly, a tempest.', '* Your vision narrows.&* ... The world revolves around you.', '* You feel cornered.', '* Your heartbeat becomes twisted.'],
    }[this.phase];
    if (T && T[this.phaseturn] !== undefined) global.battlemsg[0] = T[this.phaseturn];
    if (this.phase === 4 || this.haveusedroaring) {
      if (this.phase4turn === 2) global.battlemsg[0] = "* The Knight's hands glow a strange color...";
      if (this.phase4turn > 2) global.battlemsg[0] = '* The enemy suddenly let down its guard!';
      if (this.phase4turn === 3 && this.progamer) global.battlemsg[0] = '* Kris coughed.&* The enemy slowly tilted its head...';
    }
    this.attacked = 1;
  }
  downMessages() {
    const m = this.myself;
    this.setdownmessage = true;
    if (global.monsterhp[m] <= global.monstermaxhp[m] * 0.8 && !this.haveusedroaring && this.phase !== 4) this.phase = 4;
    if (this.phase === 4 && this.phase4turn < 3) {
      if (this.phase4turn === 0) global.battlemsg[0] = '* Your heartbeat becomes twisted.';
      if (this.phase4turn === 1 && global.hp[2] > 0) global.battlemsg[0] = '* Susie grew pale.';
      if (this.phase4turn === 1 && global.hp[2] < 1) global.battlemsg[0] = '* Susie struggled to give some kind of warning.';
      return;
    }
    let krisdown = '', susiedown = '', ralseidown = '', downcount = 0;
    if (!this.krisdownmessage && global.hp[1] < 1) {
      krisdown = '* Kris kneeled in silence.&';
      downcount += 1;
      this.krisdownmessage = true;
      global.battlemsg[0] = krisdown;
    }
    if (!this.susiedownmessage && global.hp[2] < 1) {
      susiedown = '* Susie was hurt and beaten.&';
      downcount += 1;
      this.susiedownmessage = true;
      global.battlemsg[0] = susiedown;
    }
    if (!this.ralseidownmessage && global.hp[3] < 1) {
      ralseidown = '* Ralsei became a pile of fluff.&';
      downcount += 1;
      this.ralseidownmessage = true;
      global.battlemsg[0] = ralseidown;
    }
    if (downcount === 2) global.battlemsg[0] = krisdown + susiedown + ralseidown;
  }
  // ACTs: Check, HoldBreath, S-Action, R-Action.
  stepActs() {
    if (this.acting === 1 && this.actcon === 0) {
      this.actcon = 1;
      this.checkcount += 1;
      if (this.checkcount === 1) {
        msgset(0, '* Kris analyzed the enemy!/');
        msgnext("* But Kris&couldn't learn anything./%");
      } else {
        msgset(0, '* Kris points into the distance./');
        msgnext('* Nothing happened./%');
      }
      S.scr_battletext_default(this);
    }
    if (this.acting === 2 && this.actcon === 0) {
      this.actcon = 1;
      this.holdbreathcount += 1;
      if (this.holdbreathcount <= 1) msgset(0, '* Kris held their breath.&* Their heartbeat quickened.&* The SOUL now moves faster./%');
      else msgset(0, '* Kris held their breath...&* Kris smiled.&* Nothing happened./%');
      S.scr_battletext_default(this);
      this.holdbreathcount = 1;
    }
    if (this.actingsus === 1 && this.actconsus === 1) {
      S.scr_speaker('noone');
      msgset(0, '* Susie talked to the Knight!/');
      S.scr_anyface_next('susie', 'J');
      msgnext("\\EJ* I don't know what the hell you are, but.../");
      msgnext('\\EJ* Leave Toriel alone! You hear me!?/');
      msgnext('\\EV* .../');
      msgnext("\\EW* ... Fine, you don't wanna listen?/");
      msgnext("\\EX* Then we'll just. Have to do things the hard way./");
      S.scr_anyface_next('none', 0);
      msgnext('* (Susie will not ACT any more.)/%');
      S.scr_battletext_default(this);
      this.sactcount = 1;
      this.actcon = 1;
      this.actconsus = 0;
      const m = this.myself;
      for (const k of ['canactsus', 'actsimulsus', 'actactorsus', 'actcostsus']) if (global[k]?.[m]) global[k][m][0] = 0;
      if (global.actnamesus?.[m]) global.actnamesus[m][0] = '';
      if (global.battlespell?.[1]) global.battlespell[1][0] = -1;
      if (global.battleactcount) global.battleactcount[1] = 0;
      if (global.battlespellname?.[1]) global.battlespellname[1][0] = '';
      if (global.battlespelldesc?.[1]) global.battlespelldesc[1][0] = '';
      S.scr_spellmenu_setup();
    }
    if (this.actingral === 1 && this.actconral === 1) {
      this.ractcount += 1;
      S.scr_speaker('noone');
      msgset(0, '* Ralsei tried talking.../');
      if (this.ractcount === 1) {
        S.scr_anyface_next('ralsei', 'Q');
        msgnext("\\EQ* Please... please, don't do this.../");
        msgnext('\\Ee* If the Roaring happens, then... then.../');
        msgnext('\\EZ* Please... stop...!/');
      } else {
        S.scr_anyface_next('ralsei', '8');
        msgnext('\\E8* Please, stop.../');
      }
      S.scr_anyface_next('none', 0);
      msgnext('* (... but nothing happened.)/%');
      S.scr_battletext_default(this);
      this.actcon = 1;
      this.actconral = 0;
    }
    if (this.actcon === 20 || this.actconsus === 20 || this.actconral === 20) {
      if (S.scr_terminate_writer()) {
        this.actconsus = -1;
        this.actconral = -1;
        this.actcon = 1;
      }
    }
    if (this.actcon === 1 && !writerExists()) S.scr_nextact(this);
  }
  // End Step: the Swordslash box keeps the SOUL on its left part; the end hides damage numbers.
  endStep() {
    if (isphase('bullets') && this.myattackchoice === 0) {
      const h = first('obj_heart');
      if (h && h.x > camerax() + 165) h.x = camerax() + 165;
    }
    if (this.end_cutscene_version === 1) for (const d of instancesOf('obj_dmgwriter')) instance_destroy(d);
  }
  draw() {
    const m = this.myself;
    if (!i_ex('obj_knight_roaring2')) this.siner2 += 1;
    if (i_ex('obj_knight_swordtunnelanim')) return;
    if (this.chargeupcon === 2) {
      this.chargeuptimer += 1;
      d3d_set_fog(true, 0xffffff);
      draw_sprite_ext(this.idlesprite, this.siner, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, (10 - this.chargeuptimer) / 10);
      d3d_set_fog(false);
      if (this.chargeuptimer === 10) {
        this.chargeupcon = 3;
        this.image_alpha = 0;
      }
      return;
    }
    if (this.state === 0 || this.state === 3) {
      this.image_index = 0;
      this.y = this.ystart + Math.cos(this.siner2 / 8) * 8;
      this.aetimer += 1;
      if (this.aetimer % 4 === 0 && this.image_alpha !== 0 && this.chargeupcon === 0) {
        let a = null;
        if (this.state === 0 && !i_ex('obj_knight_roaring2')) {
          a = instance_create_depth(this.x, this.y, this.depth + 1, 'obj_afterimage');
          a.sprite_index = 'spr_roaringknight_idle';
          a.image_index = this.image_index;
        }
        if (this.state === 3) {
          a = instance_create_depth(this.x + this.shakex + this.hurtspriteoffx, this.y + this.hurtspriteoffy, this.depth + 1, 'obj_afterimage');
          a.image_index = this.image_index;
          if (this.hurttimer % 2 === 0 || !this.stronghurtanim) a.sprite_index = this.idlesprite;
          else {
            a.sprite_index = 'spr_roaringknight_ball_transition';
            a.image_index = 7;
          }
        }
        if (a) {
          a.image_alpha = 0.6;
          a.fadeSpeed = 0.02;
          a.hspeed = 2;
          a.image_speed = 0;
          a.image_xscale = this.image_xscale;
          a.image_yscale = this.image_yscale;
        }
      }
    }
    if (this.end_cutscene_version === 1) {
      this.stronghurtanim = true;
      this.state = 3;
      this.shakex = 0;
    }
    if (this.state === 3 && this.hurttimer >= 0) {
      if (this.haveusedroaring && this.end_cutscene_version === 0 && global.monsterhp[m] <= global.monstermaxhp[m] * 0.8 && this.endcon !== 1) {
        // The hit after the Roaring ends the fight (end cutscene version 1).
        for (const sp of instancesOf('obj_spellphase')) {
          S.scr_attackphase();
          if (sp.spellwriter) instance_destroy(sp.spellwriter);
          for (const f of instancesOf('obj_face')) instance_destroy(f);
          instance_destroy(sp);
        }
        this.end_cutscene_version = 1;
        this.endcon = 1;
        musVolume(0, 1); // mus_fade(global.batmusic[1], 1)
        const inst = instance_create(this.x, this.y, 'obj_shake');
        if (inst.alive) {
          inst.shakex = 30;
          inst.shakey = 8;
          inst.shakespeed = 2;
        }
        this.stronghurtanim = true;
        this.hurttimer = 999;
        snd_play_x('snd_knight_hurt', 0.8, 1);
        snd_play_x('snd_knight_hurt', 0.8, 0.7);
        snd_play_x('snd_knight_hurt', 0.8, 1.3);
      }
      const hx = this.x + this.shakex + this.hurtspriteoffx, hy = this.y + this.hurtspriteoffy;
      const mod = this.end_cutscene_version === 1 ? 3 : 2;
      if (this.hurttimer % mod === 0 || !this.stronghurtanim) draw_sprite_ext(this.idlesprite, this.siner, hx, hy, 2, 2, 0, this.image_blend, 1);
      else draw_sprite_ext('spr_roaringknight_ball_transition', 7, hx, hy, 2, 2, 0, this.image_blend, 1);
      if (this.hurttimer === 29 && this.stronghurtanim && this.end_cutscene_version === 0) snd_play('snd_knight_hurtb');
      if (this.hurttimer === 15) this.stronghurtanim = false;
    }
    // scr_enemy_drawidle_generic(1/6)
    if (this.state === 0) {
      this.fsiner += 1;
      this.siner += 1 / 6;
      const spr = global.mercymod?.[m] >= global.mercymax?.[m] ? this.sparedsprite : this.idlesprite;
      draw_sprite_ext(spr, this.siner, this.x, this.y, this.image_xscale, this.image_yscale, 0, this.image_blend, this.image_alpha);
      if (this.flash === 1) {
        d3d_set_fog(true, 0xffffff);
        draw_sprite_ext(spr, this.siner, this.x, this.y, this.image_xscale, this.image_yscale, 0, 0xffffff, (1 - Math.cos(this.fsiner / 5)) * 0.4);
        d3d_set_fog(false);
      }
    }
    if (this.whiteflash > 0) {
      this.whiteflash -= 1;
      d3d_set_fog(true, 0xffffff);
      if (this.state === 3 && this.hurttimer >= 0) draw_sprite_ext(this.hurtsprite, 0, this.x + this.shakex + this.hurtspriteoffx, this.y + this.hurtspriteoffy, 2, 2, 0, this.image_blend, 0.62);
      if (this.state === 0) draw_sprite_ext(this.idlesprite, this.siner, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, 0.62);
      d3d_set_fog(false);
    }
    if (this.chargeupcon === 1) {
      d3d_set_fog(true, 0xffffff);
      draw_sprite_ext(this.idlesprite, this.siner, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.chargeuptimer / 10);
      d3d_set_fog(false);
    }
    if (this.becomeflash === 0) this.flash = 0;
    this.becomeflash = 0;
  }
}
defineObject('obj_knight_enemy', KnightEnemy);

// scr_monstersetup type 104 (used when the battle modules leave the Knight's stats unset).
export function knightStats(m) {
  if (global.monstermaxhp?.[m] > 0) return;
  global.monstername[m] = '';
  global.monstermaxhp[m] = 7300;
  global.monsterhp[m] = 7300;
  global.monsterat[m] = 40;
  global.monsterdf[m] = 0;
  global.monsterexp[m] = 0;
  global.monstergold[m] = 0;
  global.mercymax ??= [];
  global.mercymax[m] = 100;
}

// obj_bgfountaintest: the scrolling fountain background behind the fight.
class BgFountain extends Instance {
  create() {
    this.siner = 0;
    this.image_blend = bgr(4139303);
    this.battleprog = 0;
    this.alphafactor = 0;
    this.depth = 150000;
    this.oceanspeed = 1;
    this.death = 0;
    scr_lerpvar(this, 'alphafactor', 0, 1, 120);
  }
  draw() {
    const cx = camerax(), cy = cameray();
    this.siner += 1;
    let sx = 0, sy = 0;
    const sh = first('obj_shake');
    if (sh) { sx = sh.shakex * sh.shakesign; sy = sh.shakey * sh.shakesign; }
    const k = first('obj_knight_enemy');
    if (k && global.monstermaxhp?.[k.myself]) this.battleprog = 1 - (global.monsterhp[k.myself] - global.monstermaxhp[k.myself] * 0.8) / global.monstermaxhp[k.myself] * 5;
    this.oceanspeed = this.battleprog > 0.65 ? 2 : 1;
    const desicolor = make_color_hsv(127.5 + Math.sin(this.siner / 90) * 255 / 2, 255, 255);
    const s = this.siner, os = this.oceanspeed, af = this.alphafactor;
    draw_sprite_tiled_ext('spr_bg_fountain1', 0, sx + cx - s * os, sy + cy + s * os, 2, 2, 0x800080, 0.5 * af * (this.battleprog + 0.3));
    draw_sprite_tiled_ext('spr_bg_fountain1', 0, sx + cx - s * os / 2, sy + cy - s * os / 2, 2, 2, 0x800080, 0.35 * af * (this.battleprog + 0.2));
    if (k) draw_sprite_ext('spr_bg_knight_gradient', 0, sx + cx + 640 + 640, sy + cy + 90, -2, 2, 0, 0, af);
    draw_sprite_ext('spr_bg_knight_gradient', 0, sx + cx, sy + cy + 90, 2, 2.05, 0, 0, af);
    draw_sprite_ext('spr_pxwhite', 0, sx + cx - 40, sy + cy, 720, 90, 0, 0, 1);
    const base = bgr(4139303);
    this.image_blend = merge_color(base, desicolor, this.battleprog / 2);
    draw_sprite_ext('spr_pxwhite', 0, sx + cx + 188, sy + cy, 240, 90, 0, merge_color(this.image_blend, 0, 0.8), af);
    for (let i = 1; i < 3; i++) {
      draw_sprite_ext('spr_cc_fountainbg_white', s / 10, sx + cx + 138 - Math.sin(s / 20) * (i * 12), sy + cy, 2, 2, 0, this.image_blend, i / 12 * af);
      draw_sprite_ext('spr_cc_fountainbg_white', s / 10, sx + cx + 138 + Math.sin(s / 13) * (i * 6), sy + cy, 2, 2, 0, this.image_blend, i / 12 * af);
    }
    draw_sprite_ext('spr_cc_fountainbg_white', s / 10, sx + cx + 138, sy + cy, 2, 2, 0, this.image_blend, 1);
    if (k) {
      draw_sprite_ext('spr_pxwhite', 0, sx + cx - 40, sy + cy, 40, 480, 0, 0, 1);
      draw_sprite_ext('spr_pxwhite', 0, sx + cx - 40, sy + cy - 20, 720, 20, 0, 0, 1);
    }
    if (this.death === 0 && !i_ex('obj_battlecontroller')) {
      this.death = 1;
      scr_lerpvar(this, 'alphafactor', this.alphafactor, 0, 30);
      scr_doom(this, 31);
    }
  }
}
defineObject('obj_bgfountaintest', BgFountain);
