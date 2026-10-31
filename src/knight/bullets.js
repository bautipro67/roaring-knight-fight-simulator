// Bullet base objects (Chapter 3): obj_bulletparent, obj_bulletgenparent, obj_collidebullet,
// obj_regularbullet, and the scripts scr_bullet_init / scr_bullet_inherit / scr_childbullet.
import {
  Instance, defineObject, defineScript, instance_destroy, instance_exists, S,
} from '../runtime/gm.js?v=20261031165601';
import { view_x, view_y, cameray, scr_bullet_init, scr_bullet_inherit, scr_childbullet } from './common.js?v=20261031165601';

export class BulletParent extends Instance {}
defineObject('obj_bulletparent', BulletParent);

export class BulletGenParent extends Instance {}
defineObject('obj_bulletgenparent', BulletGenParent);

// Anything the SOUL can touch. Other_15 (event_user(5)) is called by obj_heart's collision.
export class CollideBullet extends BulletParent {
  user5() {
    // GML booleans are numbers: some ported bullets store true/false, so compare loosely.
    if (this.active == 1) {
      if (this.target !== 3) S.scr_damage(this);
      if (this.target === 3) S.scr_damage_all(this);
      if (this.destroyonhit == 1) instance_destroy(this);
    }
  }
}
defineObject('obj_collidebullet', CollideBullet);

export class RegularBullet extends CollideBullet {
  create() {
    scr_bullet_init(this);
    this.spin = 0;
    this.spinspeed = 0;
    this.image_alpha = 1;
    if (!instance_exists('obj_heart')) instance_destroy(this);
    this.wall_destroy = 1;
    this.bottomfade = 0;
  }
  step() {
    if (this.wall_destroy == 1) {
      if (this.x < view_x() - 80) instance_destroy(this);
      if (this.x > view_x() + 760) instance_destroy(this);
      if (this.y < view_y() - 80) instance_destroy(this);
      if (this.y > view_y() + 580) instance_destroy(this);
    }
    if (this.updateimageangle == 1) this.image_angle = this.direction;
    if (this.spin == 1) this.image_angle += this.spinspeed;
    if (this.bottomfade !== 0 && this.y > cameray() + this.bottomfade) this.image_alpha *= 0.8;
  }
}
defineObject('obj_regularbullet', RegularBullet);

// Damages without being destroyed (kept for older patterns).
export class RegularBulletPermanent extends RegularBullet {
  create() {
    super.create();
    this.destroyonhit = 0;
  }
}
defineObject('obj_regularbullet_permanent', RegularBulletPermanent);

defineScript('scr_bullet_init', scr_bullet_init);
defineScript('scr_bullet_inherit', scr_bullet_inherit);
defineScript('scr_childbullet', scr_childbullet);
export { scr_bullet_inherit, scr_bullet_init, scr_childbullet };
