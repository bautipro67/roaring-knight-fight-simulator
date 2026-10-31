// obj_writer (typing engine), scr_texttype, battle text box, enemy speech bubble, obj_darkener,
// and the obj_face / obj_smallface stubs.
import {
  global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists,
  instance_number, withObj, random, button1_p, button2_h, string_length, string_char_at,
  string_insert, string_delete, draw_set_font, draw_set_color, draw_get_color, draw_set_alpha, draw_text,
  draw_text_transformed, draw_text_color, draw_rectangle, draw_sprite_ext, draw_self, button3_h, instancesOf,
} from '../runtime/gm.js?v=20261031150323';
import { snd_play } from '../runtime/audio.js?v=20261031150323';

const sin = Math.sin;
import { fontName, splitCaller, view_x, view_y } from './common.js?v=20261031150323';

// Text sounds that exist in this build; the others are silent.
const TEXTSND = {
  snd_text: 'snd_text', snd_txtsus: 'snd_txtsus', snd_txtral: 'snd_txtral', snd_txtjok: 'snd_txtjok',
};
import { G } from '../runtime/gm.js?v=20261031150323';
const tsnd = n => TEXTSND[n] ?? null;

// scr_textsetup(font, color, x, y, charline, shake, rate, sound, hspace, vspace, special)
function scr_textsetup(w, font, color, x, y, charline, shake, rate, sound, hspace, vspace, special) {
  w.myfont = font;
  w.mycolor = color;
  w.writingx = x;
  w.writingy = y;
  w.charline = charline;
  w.shake = shake;
  w.rate = rate;
  w.textsound = sound;
  w.hspace = hspace;
  w.vspace = vspace;
  w.special = special;
  w.colorchange = 1;
  w.xcolor = w.mycolor;
}

function scr_texttype(w) {
  w.textscale = 1;
  const F = fontName, W = 0xffffff, x = w.x, y = w.y;
  const set = (f, c, yy, cl, sh, rate, snd, hs, vs, sp) => scr_textsetup(w, f, c, x, yy, cl, sh, rate, tsnd(snd), hs, vs, sp);
  switch (global.typer) {
    case 1: set(F('main'), W, y, 33, 0, 1, 'snd_text', 8, 18, 0); break;
    case 2: set(F('main'), W, y, 33, 0, 2, null, 8, 18, 0); break;
    case 3: set(F('main'), W, y, 33, 0, 2, 'snd_text', 8, 18, 1); break;
    case 4: set(F('mainbig'), W, y, 33, 0, 1, 'snd_text', 16, 28, 1); break;
    case 5: set(F('main'), W, y, 33, 0, 1, 'snd_text', 8, 18, 0); break;
    case 6: set(F('mainbig'), W, y, 33, 0, 1, 'snd_text', 16, 36, 1); break;
    case 7: case 8: set(F('main'), W, y, 33, 0, global.typer == 8 ? 2 : 1, 'snd_txttor', 8, 18, 0); break;
    case 10: case 11: set(F('main'), W, y, 33, 0, 1, 'snd_txtsus', 8, 18, 0); break;
    case 12: set(F('main'), W, y, 33, 0, 1, 'snd_txtnoe', 8, 18, 0); break;
    case 13: set(F('main'), W, y, 33, 0, 1, 'snd_txtber', 8, 18, 0); break;
    case 14: set(F('main'), W, y, 33, 0, 1, 'snd_txtsans', 8, 18, 0); break;
    case 15: case 19: set(F('main'), W, y, 33, 0, 1, 'snd_text', 8, 18, 0); break;
    case 17: set(F('main'), W, y, 33, 0, 1, 'snd_txtund', 8, 18, 0); break;
    case 18: set(F('main'), W, y, 33, 0, 1, 'snd_txtasg', 8, 18, 0); break;
    case 20: case 21: set(F('main'), W, y, 33, 0, 1, 'snd_txtal', 8, 18, 0); break;
    case 22: set(F('tinynoelle'), W, y + 7, 33, 0, 1, 'snd_txtal', 6, 18, 0); break;
    case 23: set(F('tinynoelle'), W, y + 7, 33, 0, 1, 'snd_txtnoe', 6, 18, 0); break;
    case 30: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtsus', 16, 36, 1); break;
    case 31: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtral', 16, 36, 1); break;
    case 32: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtlan', 16, 36, 1); break;
    case 33: set(F('mainbig'), W, y, 33, 0, 1, 'snd_dadtxt', 16, 36, 1); break;
    case 35: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtjok', 16, 36, 1); break;
    case 36: set(F('mainbig'), W, y, 33, 0, 1, null, 16, 36, 1); break;
    case 37: set(F('mainbig'), W, y, 33, 0, 3, 'snd_txtsus', 18, 36, 1); break;
    case 40: set(F('main'), W, y, 33, 0, 2, null, 8, 18, 0); break;
    case 41: set(F('main'), W, y, 33, 0, 3, null, 8, 18, 0); break;
    case 42: set(F('mainbig'), W, y, 33, 0, 2, null, 16, 36, 1); break;
    case 45: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtral', 16, 28, 1); break;
    case 46: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtlan', 16, 28, 1); break;
    case 47: set(F('mainbig'), W, y, 33, 0, 1, 'snd_txtsus', 16, 28, 1); break;
    case 48: set(F('mainbig'), W, y, 33, 0, 1, 'snd_dadtxt', 16, 28, 1); break;
    case 50: set(F('dotumche'), 0, y, 33, 0, 1, 'snd_text', 9, 20, 0); break;
    case 75: set(F('dotumche'), 0, y, 33, 0, 1, 'snd_txtsus', 9, 20, 0); break;
    case 80: set(F('mainbig'), W, y, 33, 0, 1, null, 16, 36, 1); break;
    case 81: set(F('dotumche'), 0, y, 33, 0, 1, null, 9, 20, 0); break;
    case 61: set(F('main'), W, y, 33, 0, 2, null, 8, 18, 0); break;
    case 51: set(F('mainbig'), W, y, 33, 0, 10, 'snd_text', 16, 36, 1); break;
    case 52: set(F('mainbig'), W, y, 33, 0, 4, 'snd_text', 16, 36, 1); break;
    case 53: set(F('dotumche'), 0, y, 33, 0, 1, 'snd_txtsus', 9, 20, 0); break;
    case 54: set(F('dotumche'), 0, y, 33, 0, 2, 'snd_txtsus', 9, 20, 0); break;
    case 55: set(F('main'), W, y, 33, 0, 1, 'snd_txtrud', 8, 18, 0); break;
    case 60: set(F('main'), W, y, 33, 0, 8, null, 8, 18, 0); break;
    case 666: set(F('main'), W, y, 33, 0, 4, null, 12, 20, 2); break;
    case 667: set(F('main'), W, y, 33, 0, 2, null, 12, 20, 2); break;
    case 999: set(F('main'), W, y, 33, 0, 4, null, 8, 18, 3); break;
    default: break;
  }
}
defineScript('scr_texttype', scr_texttype);

const SILENT = new Set(['&', ' ', '^', '!', '.', '?', ',', ':', '/', '\\', '|', '*']);
function scr_textsound(w) {
  let playtextsound = 1;
  if (button2_h() == 1) playtextsound = 0;
  if (w.skippable == 0) playtextsound = 1;
  if (playtextsound == 1) {
    let getchar = w.rate <= 2 ? string_char_at(w.mystring, w.pos) : string_char_at(w.mystring, w.pos - 1);
    let play = 1;
    if (getchar == '&') {
      if (w.rate < 3) getchar = string_char_at(w.mystring, w.pos + 1);
      else play = 0;
    }
    if (SILENT.has(getchar)) play = 0;
    if (play == 1) {
      snd_play(w.textsound);
      withObj('obj_face_parent', f => { f.mouthmove = 1; });
    }
  }
}

function scr_nextmsg(w) {
  w.msgno += 1;
  w.lineno = 0;
  w.aster = 0;
  w.halt = 0;
  w.pos = 1;
  w.alarm[0] = 1;
  w.autoaster = 1;
  w.mystring = w.nstring[w.msgno] ?? '%%';
  w.reachedend = 0;
  w.formatted = 0;
  w.wxskip = 0;
  w.sound_played = 0;
  if (w.rate < 3) {
    w.firstnoise = 0;
    w.alarm[2] = 1;
  }
}

// scr_asterskip runs in the writer with the formatting loop's i.
function scr_asterskip(w, i) {
  if (w.aster == 1 && w.autoaster == 1) {
    w.length += 2;
    w.mystring = string_insert('||', w.mystring, i);
  }
  if (w.aster == 2) w.aster = 1;
}

// \E<c>: 0-9, A-Z = 10-35, a-z = 36-61.
const feOf = c => {
  const o = c.charCodeAt(0);
  if (o >= 48 && o <= 57) return o - 48;
  if (o >= 65 && o <= 90) return o - 55;
  if (o >= 97 && o <= 122) return o - 61;
  return null;
};
const FC = { 0: 0, S: 1, R: 2, N: 3, T: 4, L: 5, A: 10, a: 11, B: 12, r: 15, u: 18, K: 20 };
const XCOLOR = { R: 0xff0000, B: 0x0000ff, Y: 0xffff00, G: 0x00ff00, W: 0xffffff, X: 0x000000 };

export class Writer extends Instance {
  create() {
    this.skipme = 0;
    this.textsound = 'snd_text';
    this.charline = 33;
    this.originalcharline = this.charline;
    this.hspace = 8;
    this.vspace = 18;
    this.rate = 1;
    this.mycolor = 0xffffff;
    this.myfont = fontName('main');
    this.shake = 0;
    this.special = 0;
    this.skippable = 1;
    this.automash_timer = 0;
    if (global.flag[6] == 1) this.skippable = 0;
    this.f = 1;
    if (global.darkzone == 1) this.f = 2;
    scr_texttype(this);
    this.autoaster = 1;
    this.pos = 2;
    this.lineno = 0;
    this.aster = 0;
    this.halt = 0;
    this.xcolor = 0;
    this.wxskip = 0;
    this.msgno = 0;
    this.first_alarm = 0;
    this.firstnoise = 0;
    this.noiseskip = 0;
    this.formatted = 0;
    this.colorchange = 0;
    this.fontchange = 0;
    this.sound_played = 0;
    this.writingx = this.x;
    this.writingy = this.y;
    this.dialoguer = 0;
    this.smallface = null;
    this.faced = 0;
    this.facedever = 0;
    this.facer = 0;
    this.siner = 0;
    this.specfade = 1;
    this.reachedend = 0;
    this.prevent_mash_buffer = 0;
    this.automash_timer = 0;
    this.specx = [];
    this.specy = [];
    for (let i = 0; i < 7; i++) { this.specx[i] = i * 6; this.specy[i] = i * 6; }
    const msg = Array.isArray(global.msg) ? global.msg : [String(global.msg)];
    this.mystring = String(msg[0] ?? ' ');
    this.nstring = [];
    for (let j = 0; j < 100; j++) this.nstring[j] = msg[j] ?? '%%';
    this.length = string_length(this.mystring);
    this.alarm[0] = this.rate;
    if (this.rate < 3) this.alarm[2] = 1;
    else scr_textsound(this);
  }

  alarm0() {
    if (this.rate > 2) this.alarm[1] = 1;
    else if (this.first_alarm == 1 && this.pos >= 2) scr_textsound(this);
    if (this.pos <= this.length) this.alarm[0] = this.rate;
    else this.reachedend = 1;
    if (this.first_alarm == 0) {
      const getchar = string_char_at(this.mystring, 1);
      if (getchar == '\\') this.pos += 3;
      else this.pos += 1;
      this.first_alarm = 1;
    } else {
      let getchar = string_char_at(this.mystring, this.pos);
      let nextchar = string_char_at(this.mystring, this.pos + 1);
      if (getchar == '&') this.pos += 1;
      if (getchar == '\\') this.pos += 3;
      if (getchar == '/') {
        this.halt = 1;
        if (nextchar == '%') this.halt = 2;
        this.alarm[0] = -1;
      }
      getchar = string_char_at(this.mystring, this.pos);
      nextchar = string_char_at(this.mystring, this.pos + 1);
      if (getchar == '|') this.pos += 2;
      if (getchar == '^') {
        this.pos += 2;
        if (this.alarm[0] > 0) {
          const add = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 60, 8: 90, 9: 150 }[nextchar];
          if (add) this.alarm[0] += add;
        }
      }
      this.pos += 1;
    }
  }

  alarm1() {
    if (this.pos < this.length + 2) scr_textsound(this);
  }

  alarm2() {
    if (this.firstnoise == 0) {
      this.firstnoise = 1;
      scr_textsound(this);
    }
  }

  user5() { this.format(); }
  format() {
    this.length = string_length(this.mystring);
    let charpos = -1, remspace = -1, remchar = -1;
    this.linecount = 0;
    this.stringmax = 0;
    this.aster = 0;
    let textalignment = '';
    for (let i = 0; i < this.length + 1; i++) {
      let skip = 0;
      const thischar = string_char_at(this.mystring, i);
      if (thischar == '/' || thischar == '%') { if (charpos > -1) charpos -= 1; }
      if (thischar == '^') { if (charpos > -1) charpos -= 2; }
      if (thischar == '\\') {
        if (charpos > -1) charpos -= 3;
        const nextchar = string_char_at(this.mystring, i + 1);
        const nextchar2 = string_char_at(this.mystring, i + 2);
        if (this.dialoguer == 1) {
          if (nextchar == 'E' && nextchar2 !== '' && feOf(nextchar2) !== null) global.fe = feOf(nextchar2);
          if (nextchar == 'F') {
            if (nextchar2 in FC) global.fc = FC[nextchar2];
            if (global.fc == 0) { this.charline = this.originalcharline; this.writingx = this.x; }
            else { this.charline = 26; this.writingx = this.x + 58 * this.f; }
          }
        }
        if (nextchar == 'a') textalignment = nextchar2;
      }
      if (thischar == '&') {
        if (charpos > this.stringmax) this.stringmax = charpos;
        remspace = -1;
        charpos = 0;
        this.linecount += 1;
        skip = 1;
        const nextchar = string_char_at(this.mystring, i + 1);
        if (this.aster == 1 && this.autoaster == 1 && nextchar != '*') {
          charpos = 2;
          this.length += 2;
          this.mystring = string_insert('||', this.mystring, i + 1);
          i += 2;
        }
      }
      if (skip == 0) {
        if (thischar == ' ') { remspace = i; remchar = charpos; }
        if (thischar == '*') this.aster = 1;
        if (charpos >= this.charline) {
          if (remspace > 2) {
            this.mystring = string_delete(this.mystring, remspace, 1);
            this.mystring = string_insert('&', this.mystring, remspace);
            i = remspace + 1;
            if (remchar > this.stringmax) this.stringmax = remchar;
            remspace = -1;
            charpos = 1;
            this.linecount += 1;
            scr_asterskip(this, i);
          } else {
            if (charpos > this.stringmax) this.stringmax = charpos;
            this.mystring = string_insert('&', this.mystring, i);
            this.length += 1;
            charpos = 1;
            remspace = -1;
            this.linecount += 1;
            i += 1;
            scr_asterskip(this, i);
          }
        } else {
          charpos += 1;
        }
      }
    }
    if (charpos > this.stringmax) this.stringmax = charpos;
    this.formatted = 1;
    if (textalignment == 'c') this.writingx = view_x() + 320 - this.stringmax * this.hspace / 2;
  }

  draw() {
    let button1 = 0, button2 = 0;
    if (button1_p() == 1 && this.prevent_mash_buffer <= 0) button1 = 1;
    if (button2_h() == 1 && this.prevent_mash_buffer <= 0) button2 = 1;
    // flag[10]: holding the menu button (C) fast-forwards text.
    if (global.flag[10] == 1 && button3_h() == 1) {
      this.prevent_mash_buffer = 3;
      this.automash_timer = this.automash_timer == 0 ? 1 : 0;
      if (this.automash_timer == 0) button1 = 1;
      if (this.automash_timer == 1) button2 = 1;
    }
    this.prevent_mash_buffer -= 1;
    if (this.dialoguer == 1 && this.formatted == 0) {
      if (global.fc == 0) { this.charline = this.originalcharline; this.writingx = this.x; }
      else { this.charline = 26; this.writingx = this.x + 58 * this.f; }
    }
    if (this.formatted == 0) this.format();
    let wx = this.writingx, wy = this.writingy;
    this.colorchange = 0;
    draw_set_font(this.myfont);
    draw_set_color(this.mycolor);
    if (this.halt == 0 && button2 == 1 && this.pos < this.length && this.skippable == 1) this.skipme = 1;
    if (this.skipme == 1) {
      this.pos = string_length(this.mystring) + 1;
      this.reachedend = 1;
      this.alarm[0] = -1;
      this.alarm[1] = -1;
    }
    for (let n = 1; n < this.pos; n++) {
      let accept = 1;
      const mychar = string_char_at(this.mystring, n);
      if (mychar == '&') {
        accept = 0;
        wx = this.writingx;
        if (this.wxskip == 1) wx = this.writingx + 58;
        wy += this.vspace;
      }
      if (mychar == '|') { accept = 0; wx += this.hspace; }
      if (mychar == '^') { accept = 0; n += 1; }
      if (mychar == '/') {
        this.halt = 1;
        if (string_char_at(this.mystring, n + 1) == '%') this.halt = 2;
        this.reachedend = 1;
        accept = 0;
      }
      if (mychar == '%') {
        accept = 0;
        if (string_char_at(this.mystring, n - 1) == '/') this.halt = 2;
        if (string_char_at(this.mystring, n + 1) == '%') instance_destroy(this);
        else if (this.halt != 2) scr_nextmsg(this);
      }
      if (mychar == '\\') {
        const nextchar = string_char_at(this.mystring, n + 1);
        const nextchar2 = string_char_at(this.mystring, n + 2);
        if (nextchar == 'E' && nextchar2 !== '' && feOf(nextchar2) !== null) global.fe = feOf(nextchar2);
        if (nextchar == 'F') {
          if (nextchar2 in FC) global.fc = FC[nextchar2];
          if (this.dialoguer == 1) {
            if (global.fc == 0) { this.charline = this.originalcharline; wx = this.x; }
            else { this.charline = 26; wx = this.x + 58 * this.f; }
          }
        }
        if (nextchar == 'T') this.typerCode(nextchar2);
        if (nextchar == 's') {
          if (nextchar2 == '0') this.skippable = 0;
          if (nextchar2 == '1') this.skippable = 1;
        }
        if (nextchar == 'c') {
          this.colorchange = 1;
          if (nextchar2 in XCOLOR) this.xcolor = XCOLOR[nextchar2];
          if (nextchar2 == '0') this.xcolor = this.mycolor;
        }
        if (nextchar == 'M') {
          const v = '0123456789'.indexOf(nextchar2);
          if (v >= 0 && nextchar2 !== '') global.flag[20] = v;
        }
        if (nextchar == 'S' && this.sound_played == 0) {
          for (let i = 0; i < 10; i++) {
            if (nextchar2 == String(i) && this.sound_played == 0) {
              snd_play(global.writersnd?.[i]);
              this.sound_played = 1;
            }
          }
        }
        accept = 0;
        n += 2;
      }
      if (accept == 1) this.drawChar(mychar, wx, wy, n);
      if (accept == 1) wx += this.hspace;
    }
    if (this.halt != 0 && button1 == 1 && this.siner > 0) {
      if (this.halt == 1) scr_nextmsg(this);
      if (this.halt == 2) {
        if (this.facer == 1) withObj('obj_face', f => instance_destroy(f));
        instance_destroy(this);
      }
    }
    this.skipme = 0;
    this.siner += 1;
  }

  drawChar(mychar, wx, wy, n) {
    if (this.colorchange == 1) draw_set_color(this.xcolor);
    const sh = () => random(this.shake);
    if (this.special == 0) {
      draw_text_transformed(wx + sh(), wy + sh(), mychar, this.textscale, this.textscale, 0);
    }
    if (this.special == 1) {
      const col = draw_get_color();
      if (col != 0xffffff && col != 0) {
        draw_text_color(wx + sh() + 1, wy + sh() + 1, mychar, this.xcolor, this.xcolor, this.xcolor, this.xcolor, 0.3);
        draw_text_color(wx + sh(), wy + sh(), mychar, 0xffffff, 0xffffff, this.xcolor, this.xcolor, 1);
      } else {
        draw_text_color(wx + sh() + 1, wy + sh() + 1, mychar, 0x404040, 0x404040, 0x000080, 0x000080, 1);
        draw_text(wx + sh(), wy + sh(), mychar);
      }
    }
    if (this.special == 2) {
      const s = this.siner;
      draw_set_alpha(1 * this.specfade);
      draw_text(wx, wy, mychar);
      draw_set_alpha((0.3 + sin(s / 14) * 0.1) * this.specfade);
      draw_text(wx + 1, wy, mychar);
      draw_text(wx - 1, wy, mychar);
      draw_text(wx, wy + 1, mychar);
      draw_text(wx, wy - 1, mychar);
      draw_set_alpha((0.08 + sin(s / 14) * 0.04) * this.specfade);
      draw_text(wx + 1, wy + 1, mychar);
      draw_text(wx - 1, wy - 1, mychar);
      draw_text(wx - 1, wy + 1, mychar);
      draw_text(wx + 1, wy - 1, mychar);
      draw_set_alpha(1);
    }
    if (this.special == 3) {
      const s = this.siner;
      draw_set_color(0xffffff);
      draw_set_alpha(1);
      draw_text(wx + sin(s / 4), wy + Math.cos(s / 4), mychar);
      draw_set_alpha(0.5);
      draw_text(wx + sin(s / 5), wy + Math.cos(s / 5), mychar);
      draw_text(wx + sin(s / 7), wy + Math.cos(s / 7), mychar);
      draw_text(wx + sin(s / 9), wy + Math.cos(s / 9), mychar);
      for (let i = 0; i < 7; i++) {
        const ddir = 315 + random(15);
        if (n == 1) {
          this.specx[i] += 2 * Math.cos(ddir * Math.PI / 180);
          this.specy[i] -= 2 * Math.sin(ddir * Math.PI / 180);
          if (this.specx[i] >= 40) { this.specx[i] = 0; this.specy[i] = 0; }
        }
        draw_set_alpha((40 - this.specx[i]) / 40 * 0.7);
        draw_text(wx + this.specx[i], wy + this.specy[i], mychar);
      }
      draw_set_alpha(1);
    }
  }

  // \T<x>: switch the typer mid-text.
  typerCode(c) {
    const T = {
      0: () => (global.darkzone == 1 ? (global.fighting == 1 ? 4 : 6) : 5), 1: 2, A: 18, a: 20, N: 12, n: 23, B: 13,
      S: () => (global.darkzone == 1 ? (global.fighting == 1 ? 47 : 30) : 10),
      R: () => (global.flag[30] == 1 ? 6 : global.fighting == 1 ? 45 : 31),
      L: () => (global.fighting == 1 ? 46 : 32), X: 40, r: 55, T: 7, J: 35,
      K: () => (global.fighting == 1 ? 48 : global.plot < 235 ? 36 : 33),
    };
    if (!(c in T)) return;
    const v = T[c];
    global.typer = typeof v === 'function' ? v() : v;
    scr_texttype(this);
    if (this.dialoguer == 1) {
      if (global.fc == 0) this.charline = this.originalcharline;
      else this.wxskip = 1;
    }
  }
}
defineObject('obj_writer', Writer);

// obj_face: draws the speaker's face in the battle box (Susie fc 1, Ralsei fc 2; Chapter 2+ sprites).
class FaceParent extends Instance {
  create() { this.depth = 10; this.mouthmove = 0; }
  draw() {}
}
defineObject('obj_face_parent', FaceParent);
class Face extends FaceParent {
  create() {
    super.create();
    this.depth = 0;
    this.mouthtimer = 0;
    this.face_index = 0;
    this.image_speed = 0;
    this.nowface = global.fc;
    this.facechange = 2;
    this.rate = 1;
    this.buffer = 4;
    this.f = global.darkzone == 1 ? 2 : 1;
  }
  draw() {
    this.facechange -= 1;
    if (this.nowface != global.fc) this.facechange = 3;
    if (this.facechange <= 0) {
      const f = this.f;
      if (global.fc == 1) {
        if (global.fe == 61) draw_sprite_ext('spr_face_placeholder', 0, this.x - 5, this.y, f, f, 0, 0xffffff, 1);
        else draw_sprite_ext('spr_face_susie_alt', global.fe, this.x - 5, this.y, f, f, 0, 0xffffff, 1);
      }
      if (global.fc == 2) {
        if (global.fe == 61) draw_sprite_ext('spr_face_placeholder', 0, this.x - 15, this.y - 10, f, f, 0, 0xffffff, 1);
        else draw_sprite_ext('spr_face_r_nohat', global.fe, this.x - 15, this.y - 10, f, f, 0, 0xffffff, 1);
      }
    }
    this.nowface = global.fc;
  }
}
defineObject('obj_face', Face);
class SmallFace extends Instance {
  create() { this.depth = -5; this.getrid = 0; }
  draw() {}
}
defineObject('obj_smallface', SmallFace);

// ---------------------------------------------------------------- battle text

// scr_battletext(): sets caller.battlewriter / caller.myface; returns the writer.
function scr_battletext(...a) {
  const [caller] = splitCaller(a);
  const xx = view_x(), yy = view_y();
  const writer = instance_create(xx + 30, yy + 376, 'obj_writer');
  const face = instance_create(xx + 26, yy + 380, 'obj_face');
  writer.dialoguer = 1;
  writer.facer = 1;
  if (global.fc == 0 && writer.originalcharline == 33) writer.charline = 26;
  if (caller) {
    caller.xx = xx;
    caller.yy = yy;
    caller.battlewriter = writer;
    caller.myface = face;
  }
  return writer;
}
defineScript('scr_battletext', scr_battletext);
defineScript('scr_battletext_default', (...a) => {
  global.fc = 0;
  global.typer = 4;
  return scr_battletext(...a);
});

// ---------------------------------------------------------------- speech bubble

// obj_battleblcon (Chapter 3): auto_length balloons size themselves around the text.
class BattleBlcon extends Instance {
  create() {
    this.sprite_index = 'spr_battleblcon';
    this.image_speed = 0;
    this.mywriter = instance_create(this.x + 5, this.y + 3, 'obj_writer');
    this.mywriter.depth = 9999999;
    this.auto_length = 0;
    this.side = 1;
    this.xoffset = 0;
    this.init = 0;
    this.reformatted = 0;
    this.remmsgno = -1;
    this.initwritingx = -1;
    this.initwritingy = -1;
  }
  step() {
    if (!instance_exists(this.mywriter)) instance_destroy(this);
  }
  draw() {
    const w = this.mywriter;
    if (!instance_exists(w)) return;
    w.depth = this.depth - 5;
    if (this.remmsgno != w.msgno) this.reformatted = 0;
    if (this.auto_length == 0) { this.init = 1; this.reformatted = 1; }
    if (this.reformatted == 0) {
      if (w.formatted == 0) w.user5();
      if (w.formatted == 1) {
        if (this.init == 0) {
          this.initwritingx = w.writingx;
          this.initwritingy = w.writingy;
          this.init = 1;
        }
        this.balloonwidth = w.stringmax * w.hspace + 10;
        this.balloonheight = (w.linecount + 1) * w.vspace + 5;
        if (this.side == 1) {
          w.writingx = this.initwritingx - (this.balloonwidth + 20);
          w.writingy = this.initwritingy - this.balloonheight / 2;
        }
        if (this.side == -1) {
          this.xoffset = 20;
          w.writingx = this.initwritingx;
          w.writingy = this.initwritingy - this.balloonheight / 2;
        }
        if (this.side == 2) {
          w.writingx = this.initwritingx - this.balloonwidth / 2;
          w.writingy = this.initwritingy - (this.balloonheight + 20);
        }
        this.writingx = w.writingx;
        this.writingy = w.writingy;
      }
    }
    if (this.auto_length == 0) draw_self(this);
    if (this.auto_length == 1 && this.init == 1 && this.writingx !== undefined) {
      const sc = this.balloonheight < 40 ? 0.5 : 1;
      if (this.side == 1) draw_sprite_ext('spr_battleblcon_parts', 4, this.x, this.y, 1, sc, 0, 0xffffff, 1);
      if (this.side == -1) draw_sprite_ext('spr_battleblcon_parts', 4, this.x - this.xoffset, this.y, -1, sc, 0, 0xffffff, 1);
      if (this.side == 2) draw_sprite_ext('spr_battleblcon_parts', 4, this.x, this.y, 1, 1, -90, 0xffffff, 1);
      draw_set_color(0xffffff);
      const wx = this.writingx, wy = this.writingy, bw = this.balloonwidth, bh = this.balloonheight;
      draw_rectangle(wx - 10, wy - 5, wx + bw, wy + bh - 5, false);
      draw_rectangle(wx - 5, wy - 10, wx + bw - 5, wy + bh, false);
    }
    this.remmsgno = w.msgno;
  }
}
defineObject('obj_battleblcon', BattleBlcon);

// scr_enemyblcon(x, y, type): accepts an optional caller first (sets caller.myblcon/mywriter).
const BLCON = {
  2: ['spr_battleblcon_v'], 3: ['spr_battleblcon_long'], 4: ['spr_battleblcon_long', 0], 5: ['spr_battleblcon_long', 1],
  6: ['spr_battleblcon_clubs', 2], 7: ['spr_battleblcon_long_r', 2], 8: ['spr_battleblcon_long_tall'],
  10: ['spr_battleblcon_long', null, 1, 1], 11: ['spr_battleblcon_v2_left'], 12: ['spr_battleblcon_v2_right'],
  12.1: ['spr_battleblcon_v2_right2'], 12.2: ['spr_battleblcon_v2_right3'], 12.3: ['spr_battleblcon_v2_right4'],
  12.4: ['spr_battleblcon_v2_right5'], 13: ['spr_battleblcon_long', null, 1, 2], 14: ['spr_battleblcon_long', null, 1, -1],
};
defineScript('scr_enemyblcon', (...a) => {
  const [caller, [x, y, type]] = splitCaller(a);
  if (type == 0) {
    const w = instance_create(x, y, 'obj_writer');
    if (caller) caller.mywriter = w;
    return w;
  }
  const b = instance_create(x, y, 'obj_battleblcon');
  const e = BLCON[type];
  if (e) {
    b.sprite_index = e[0];
    if (e[1] != null) { b.image_index = e[1]; b.image_speed = 0; }
    if (e[2]) b.auto_length = 1;
    if (e[3] != null) b.side = e[3];
  }
  if (caller) caller.myblcon = b;
  return b;
});

// ---------------------------------------------------------------- messages and speakers

defineScript('msgset', (i, str) => { global.msgno = i; global.msg[i] = str; });
defineScript('msgsetloc', (i, str) => S.msgset(i, str));
defineScript('msgnext', (str) => { global.msgno = (global.msgno ?? 0) + 1; S.msgset(global.msgno, str); });
defineScript('msgnextloc', (str) => S.msgnext(str));
defineScript('msgsetsub', (i, str, ...subs) => S.msgset(i, subs.reduce((s, v, k) => s.split('~' + (k + 1)).join(String(v)), String(str))));

// scr_speaker(name): sets the typer and face for the next message.
defineScript('scr_speaker', (name) => {
  global.typer = 5;
  if (global.darkzone == 1) global.typer = 6;
  if (global.fighting == 1) global.typer = 4;
  global.fc = 0;
  global.fe = 0;
  if (name == 'silent') global.typer = global.darkzone == 1 ? 36 : 2;
  if (name == 'balloon' || name == 'enemy') global.typer = 50;
  if (name == 'susie' || name == 'sus') {
    global.fc = 1;
    global.typer = global.darkzone == 1 ? (global.fighting == 1 ? 47 : 30) : 10;
  }
  if (name == 'ralsei' || name == 'ral') {
    global.fc = 2;
    global.typer = global.fighting == 1 ? 45 : 31;
  }
  if (name == 'tenna') global.typer = global.fighting == 1 ? 81 : 80;
});

// scr_anyface(speaker, msgno, emotion): a one-line message that switches the face.
const BS = String.fromCharCode(92);
defineScript('scr_anyface', (speaker, no, emotion) => {
  let e = emotion;
  if (typeof e === 'number' && e >= 10) e = e < 36 ? String.fromCharCode(55 + e) : String.fromCharCode(61 + e);
  const sp = String(speaker).toLowerCase();
  global.msg[no] = '* Face ' + sp + ' not found/';
  if (sp == 'susie' || sp == 'sus') global.msg[no] = BS + 'TX ' + BS + 'F0 ' + BS + 'E' + e + ' ' + BS + 'FS ' + BS + 'TS %';
  if (sp == 'ralsei' || sp == 'ral') global.msg[no] = BS + 'TX ' + BS + 'F0 ' + BS + 'E' + e + ' ' + BS + 'FR ' + BS + 'TR %';
  if (sp == 'none' || sp == 'x' || sp == 'no name' || sp == 'no_name') global.msg[no] = BS + 'TX ' + BS + 'F0 ' + BS + 'T0 %';
});
defineScript('scr_anyface_next', (speaker, emotion) => {
  global.msgno = (global.msgno ?? 0) + 1;
  S.scr_anyface(speaker, global.msgno, emotion);
});

// scr_terminate_writer(): true once every writer is done (or one confirm press ends them).
defineScript('scr_terminate_writer', () => {
  const ws = instancesOf('obj_writer');
  if (!ws.length) return 1;
  const killable = ws.every(w => w.reachedend == 1);
  if (button1_p() && killable) {
    withObj('obj_writer', w => instance_destroy(w));
    return 1;
  }
  return 0;
});

// scr_guardpeek(hero object): a DEFENDing hero peeks out of the guard while an enemy talks.
defineScript('scr_guardpeek', (obj) => {
  const name = obj == 1412 ? 'obj_herosusie' : obj == 1413 ? 'obj_heroralsei' : obj;
  const h = instancesOf(name)[0];
  if (!h || global.faceaction[h.myself] != 4) return 0;
  h.image_alpha = 0;
  const susie = name === 'obj_herosusie';
  const p = S.scr_battle_marker(h.x + (susie ? 8 : 0), h.y + (susie ? 4 : 0), susie ? 'spr_susie_defend_peek' : 'spr_ralsei_defend_peek');
  p.depth = h.depth;
  p.sourceobject = h;
  return p;
});

// obj_battle_marker: hands the hero back its visibility once the bullet phase starts.
class BattleMarker extends Instance {
  create() { this.sourceobject = null; this.image_xscale = 2; this.image_yscale = 2; this.image_speed = 0; }
  step() {
    if (global.mnfight == 2 || global.myfight == 0) {
      if (this.sourceobject && this.sourceobject.alive) this.sourceobject.image_alpha = 1;
      instance_destroy(this);
    }
  }
}
defineObject('obj_battle_marker', BattleMarker);
defineScript('scr_battle_marker', (x, y, spr) => {
  const m = instance_create(x, y, 'obj_battle_marker');
  m.sprite_index = spr;
  return m;
});

// scr_blconskip(n): monster scope (talktimer, talkmax).
defineScript('scr_blconskip', (inst, n) => {
  if (n != -1) {
    if (button1_p() && inst.talktimer > n) inst.talktimer = inst.talkmax;
    inst.talktimer += 1;
    if (inst.talktimer >= inst.talkmax) {
      withObj('obj_writer', w => instance_destroy(w));
      global.mnfight = 2;
    }
  }
  if (n == -1) {
    if (!instance_exists('obj_writer')) global.mnfight = 2;
  }
});

// ---------------------------------------------------------------- darkener

class Darkener extends Instance {
  create() {
    this.depth = 200;
    if (instance_number('obj_darkener') > 1) instance_destroy(this);
    this.darken = 1;
    this.darkamt = 0;
  }
  onDestroy() {
    withObj('obj_whiteedge', e => { e.image_alpha = 0; });
  }
  draw() {
    if (this.darken == 1) {
      withObj('obj_heroparent', h => { h.darkify = 1; });
      if (this.darkamt < 15) this.darkamt += 1;
      withObj('obj_whiteedge', e => { e.image_alpha = this.darkamt / 15; });
    }
    if (this.darken == 0) {
      withObj('obj_growtangle', b => { b.growcon = 3; });
      withObj('obj_heroparent', h => { h.darkify = 0; });
      if (this.darkamt > 0) this.darkamt -= 1;
      withObj('obj_whiteedge', e => { e.image_alpha = this.darkamt / 15; });
      if (this.darkamt <= 0) instance_destroy(this);
    }
    draw_set_alpha(this.darkamt / 20);
    draw_set_color(0);
    draw_rectangle(view_x() - 40, view_y() - 40, view_x() + 680, view_y() + 520, false);
    draw_set_alpha(1);
  }
}
defineObject('obj_darkener', Darkener);

