// Game over after the Knight fight (Chapter 3 "knight mode", global.tempflag[93]): obj_gameover_init
// keeps the SOUL whole and lifts it to the top of the screen, then DEVICE_FAILURE's knight messages
// ("VERY INTERESTING." ...) and the choice GO BACK (FIGHT AGAIN) / GO FORWARD (MOVE ON).
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists,
  withObj, button1_p, left_p, right_p, button2_h, draw_self, draw_sprite_ext, draw_set_color,
  draw_set_alpha, draw_set_font, draw_rectangle, draw_text, string_width, lerp,
} from '../runtime/gm.js?v=20261031150323';
import { snd_play, snd_free_all, snd_init, mus_loop, mus_volume, mus_stop } from '../runtime/audio.js?v=20261031150323';
import { startBattle } from '../battle/setup.js?v=20261031150323';
import { gotoRoom } from './common.js?v=20261031150323';

// The battle as it looked when the party fell (sprite_create_from_surface).
class Screenshot extends Instance {
  create() { this.depth = 100; this.img = null; }
  draw() {
    if (this.img) G.ctx.drawImage(this.img, G.camX, G.camY);
  }
}
defineObject('obj_sim_screenshot', Screenshot);

class GameoverInit extends Instance {
  create() {
    this.depth = -40000;
    this.sprite_index = 'spr_heart';
    this.image_speed = 0;
    this.visible = false;
    this.bg = instance_create(0, 0, 'obj_sim_screenshot');
    this.timer = 0;
    this.knight_mode = global.tempflag?.[93] == 1;
    this.lerp = null;
  }
  step() {
    this.timer += 1;
    if (this.timer == 1) snd_free_all();
    if (this.timer == 30) {
      instance_destroy(this.bg);
      this.visible = true;
      this.x = global.heartx;
      this.y = global.hearty;
    }
    // knight_mode: the SOUL does not break; it rises to where DEVICE_FAILURE draws it.
    if (this.timer == 80) this.lerp = { x0: this.x, y0: this.y, t: 0 };
    if (this.lerp && this.lerp.t < 30) {
      this.lerp.t += 1;
      const k = 1 - Math.pow(1 - this.lerp.t / 30, 2);
      this.x = lerp(this.lerp.x0, 312, k);
      this.y = lerp(this.lerp.y0, 80, k);
    }
    // Quick retry: a press skips the wait.
    if (this.timer >= 40 && this.timer < 150 && button1_p()) this.timer = 149;
    if (this.timer >= 150) S.startFailure();
  }
  draw() { draw_self(this); }
}
defineObject('obj_gameover_init', GameoverInit);

defineScript('startGameover', (p) => {
  gotoRoom({ heartx: p.x, hearty: p.y });
  global.tempflag[93] = 1;
  const go = instance_create(0, 0, 'obj_gameover_init');
  go.bg.img = p.shot;
});

// ---------------------------------------------------------------- DEVICE_FAILURE (320x240 room)

class DeviceChoice extends Instance {
  create() {
    this.NAME = ['GO BACK\n(FIGHT AGAIN)', 'GO FORWARD\n(MOVE ON)'];
    this.NAMEX = [70, 190];
    this.NAMEY = [180, 180];
    this.CURX = 0; // preselected so one press retries (the game starts with neither)
    this.IDEALX = 190;
    this.IDEALY = 180;
    this.HEARTX = 150;
    this.HEARTY = 180;
    this.ONEBUFFER = 0;
    this.FINISH = 0;
    this.fadebuffer = 20;
    this.choice_y_offset = 20;
    global.choice = -1;
  }
  step() {
    if (this.choice_y_offset > 0) this.choice_y_offset -= 1;
    if (this.fadebuffer > 0) this.ONEBUFFER = 1;
    if (this.fadebuffer < 0 && this.FINISH == 0) {
      if (right_p()) this.CURX = 1;
      if (left_p()) this.CURX = 0;
    }
    draw_set_font('fnt_main');
    const first = s => s.split('\n')[0];
    this.IDEALX = this.NAMEX[this.CURX] + (string_width(first(this.NAME[this.CURX])) / 2 - 10);
    this.IDEALY = this.NAMEY[this.CURX] + 8;
    if (Math.abs(this.HEARTX - this.IDEALX) <= 2) this.HEARTX = this.IDEALX;
    if (Math.abs(this.HEARTY - this.IDEALY) <= 2) this.HEARTY = this.IDEALY;
    this.HEARTX += (this.IDEALX - this.HEARTX) * 0.3;
    this.HEARTY += (this.IDEALY - this.HEARTY) * 0.3;
    if (this.FINISH == 0 && button1_p() && this.CURX >= 0 && this.ONEBUFFER < 0) {
      global.choice = this.CURX;
      this.FINISH = 1;
      this.ONEBUFFER = 99;
    }
    this.ONEBUFFER -= 1;
    if (this.FINISH == 0) this.fadebuffer -= 1;
    if (this.FINISH == 1) {
      global.flag[20] = 1;
      if (this.fadebuffer < 0) this.fadebuffer = 0;
      this.fadebuffer += 1;
      if (this.fadebuffer >= 10) instance_destroy(this);
    }
  }
  draw() {
    draw_set_font('fnt_main');
    const xfade = Math.min(1, (20 - Math.max(0, this.fadebuffer)) / 10);
    draw_sprite_ext('IMAGE_SOUL_BLUR', 0, this.HEARTX, this.HEARTY, 1, 1, 0, 0xffffff, 0.6 * xfade);
    draw_set_alpha(xfade);
    for (let i = 0; i <= 1; i++) {
      draw_set_color(this.CURX == i ? 0xffff00 : 0xffffff);
      draw_text(this.NAMEX[i], this.NAMEY[i] + this.choice_y_offset, this.NAME[i]);
    }
    draw_set_alpha(1);
  }
}
defineObject('DEVICE_CHOICE', DeviceChoice);

// The knight-mode lines (DEVICE_FAILURE Step), by how many times the fight was lost.
const FIRST = ['\\M0     VERY^6& &  INTERESTING./%', '\\M0 YOUR LOSS HERE^6& &     IS ALL^6& & BUT GUARANTEED./%',
  '\\M0    AND YET^6& & YOU PERSIST.../%', '\\M0IF YOU ARE SO&DETERMINED&TO TRY ONCE MORE/%', '\\M0      THEN^6& &SHALL WE HASTEN?/%'];
const AGAIN = ['\\M0  AND SO, YOU&  MEET WITH THE &  SAME FATE./%', '\\M0  SHALL YOU TRY&  ONCE MORE?/%'];
const MISSING = ['\\M0     VERY^6& &  INTERESTING./%', '\\M0  YOU ARE MISSING&  SOMETHING&  IMPORTANT./%',
  '\\M0  YOU WON\'T WIN&  LIKE THIS./%', '\\M0  STILL...&  WILL YOU&  PERSIST?/%'];
const SHINING = ['\\M0   INCREDIBLE./%', '\\M0 I FELT IT THERE^6& &    SHINING./%', '\\M0   YOUR POWER./%', '\\M0A LITTLE FURTHER./%'];

class DeviceFailure extends Instance {
  create() {
    this.depth = 10;
    global.flag[20] = 0;
    global.flag[6] = 0;
    global.typer = 667;
    global.fc = 0;
    this.FADEFACTOR = 0;
    this.FADEUP = 0;
    this.WHITEFADE = 0;
    this.con = 0;
    this.wait = 0;
    this.heart_alpha = 1;
    this.music = snd_init('AUDIO_DRONE.ogg');
    mus_loop(this.music);
    // global.knight_battle_losses (kept across retries in G).
    G.knightLosses = (G.knightLosses || 0) + 1;
    const losses = G.knightLosses;
    this.lines = FIRST;
    if (losses >= 2) this.lines = (global.chararmor1?.[1] == 23 || global.chararmor2?.[1] == 23) ? AGAIN : MISSING;
    if (losses >= 3) {
      // tempflag[96]: the Knight's HP went below 80% this time (shown once).
      if (G.knightNearWin && !G.knightShiningShown) {
        G.knightShiningShown = true;
        this.lines = SHINING;
      } else this.lines = AGAIN;
    }
    this.line = 0;
  }
  writer(msg) {
    global.typer = 667;
    global.fc = 0;
    global.msg = new Array(100).fill('%%');
    global.msg[0] = msg;
    return instance_create(70, 80, 'obj_writer');
  }
  step() {
    if (this.con == 0) {
      if (this.wait > 0) { this.wait -= 1; return; }
      if (!instance_exists('obj_writer')) {
        if (this.line < this.lines.length) {
          this.writer(this.lines[this.line]);
          this.line += 1;
          this.wait = this.line > 1 ? 30 : 0;
        } else {
          this.con = 1;
          instance_create(100, 120, 'DEVICE_CHOICE');
        }
      }
      // X speeds the text up (as in the game's DEVICE_FAILURE).
      if (button2_h()) withObj('obj_writer', w => { if (w.pos < w.length - 3) w.pos += 2; });
    }
    if (this.con == 1) {
      if (this.heart_alpha > 0) this.heart_alpha -= 1 / 15;
      if (global.choice == 0) { this.con = 2; this.t = 0; snd_free_all(); this.WHITEFADE = 1; this.FADEUP = 1 / 30; }
      if (global.choice == 1) { this.con = 3; this.t = 0; mus_volume(this.music, 0, 30); this.FADEUP = 1 / 30; }
    }
    if (this.con == 2 || this.con == 3) {
      this.t += 1;
      if (this.t >= 35) {
        mus_stop(this.music);
        if (this.con == 2) startBattle({ intro: G.settings?.intro !== false });
        else S.startEnding('lose');
        this.con = 4;
      }
    }
  }
  draw() {
    if (this.heart_alpha > 0) draw_sprite_ext('spr_heart', 0, 156, 40, 0.5, 0.5, 0, 0xffffff, this.heart_alpha);
    draw_set_alpha(Math.min(1, this.FADEFACTOR));
    draw_set_color(this.WHITEFADE == 0 ? 0 : 0xffffff);
    draw_rectangle(-10, -10, 999, 999, false);
    draw_set_alpha(1);
    if (this.FADEUP > 0 && this.FADEFACTOR < 1) this.FADEFACTOR += this.FADEUP;
  }
}
defineObject('DEVICE_FAILURE', DeviceFailure);

defineScript('startFailure', () => {
  gotoRoom();
  G.viewScale = 2;
  global.tempflag = global.tempflag || new Array(100).fill(0);
  global.tempflag[93] = 1;
  instance_create(0, 0, 'DEVICE_FAILURE');
});

void snd_play;
