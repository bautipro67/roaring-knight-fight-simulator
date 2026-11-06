// obj_endbattle: the party walks back to the overworld spots, then the simulator's ending screen
// replaces the post-fight cutscene (obj_ch3_PTB02). obj_time also hands a pending game over to its screen.
import { global, G, Instance, defineObject, S, point_direction, point_distance } from '../runtime/gm.js?v=20261106200046';

const g = global;

class EndBattle extends Instance {
  create() {
    this.con = 0;
    g.tension = 0;
    const spr = ['spr_krisr_dark', 'spr_susier_dark_unhappy', 'spr_ralsei_walk_right_unhappy'];
    this.c = [];
    for (let i = 0; i < 3; i++) {
      const m = S.scr_dark_marker(g.heromakex[i], g.heromakey[i], spr[i]);
      const tx = g.introx?.[i] ?? m.x, ty = g.introy?.[i] ?? m.y;
      m.direction = point_direction(m.x, m.y, tx, ty);
      m.speed = point_distance(m.x, m.y, tx, ty) / 10;
      m.depth = 200 - i * 20;
      this.c.push(m);
    }
    this.alarm[0] = 10;
    // g.batmusic[1] is the playing voice (the runtime's mus_volume takes the stream).
    if (g.flag[9] == 1) g.batmusic[1]?.setVolume?.(0, this.alarm[0]);
  }
  alarm0() {
    for (const m of this.c) m.speed = 0;
    this.alarm[1] = 25;
  }
  alarm1() {
    S.startEnding('win');
  }
  draw() {}
}
defineObject('obj_endbattle', EndBattle);

void G;
