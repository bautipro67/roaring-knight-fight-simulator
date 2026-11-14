// What the self test plays in the Roaring Knight simulator (see tools/selftest/runner.js for the
// helpers). Each scenario: name, settings (G.settings while it runs), start(ctx), until(ctx) (its
// end; none for the sandbox runs, which only have to run without errors), frames (the most it may
// take), and optionally status(ctx) (shown when it does not end), input(ctx, frame) (returns true
// when it played the frame itself) and menu(ctx) (the battle menu option to take instead of FIGHT).
export const title = 'Roaring Knight Fight Simulator';

export function scenarios({ S, sandbox, has, first }) {
  const ending = () => has(/^obj_sim_ending$/);
  const battle = () => has(/^obj_battlecontroller$/);
  const list = [
    { name: 'story: Tenna and the Knight, the whole fight, the scenes after it and the end', settings: { scenes: true, intro: true },
      start: () => S.startKnightFight(), until: ending, end: 'the result screen', frames: 60000 },
    { name: 'the whole fight with SCENES off', settings: { scenes: false, intro: true },
      start: () => S.startKnightFight(), until: ending, end: 'the result screen', frames: 50000 },
    { name: 'GO BACK after a game over: the scene back to the fight', settings: { scenes: true },
      start: () => S.startKnightFight({ retry: true }), until: battle, end: 'the battle', frames: 8000 },
    { name: 'GO FORWARD after a game over: the Knight takes Toriel', settings: { scenes: true },
      start: () => S.startKnightAfterScene('lose'), until: ending, end: 'the result screen', frames: 8000 },
    { name: 'practice mode, every attack in order', start: () => sandbox.startPractice({ start: 0, hp: 90 }),
      until: ctx => ctx.practiceDone(), status: ctx => ctx.practiceStatus(), end: 'the practice results', frames: 40000 },
  ];
  sandbox.ATTACKS.forEach((a, i) => list.push({
    name: `sandbox ${i}: ${a[2]}`, sandbox: true, frames: 1500,
    start: () => sandbox.startSandbox(new URLSearchParams('attack=' + i)),
  }));
  return list;
}
