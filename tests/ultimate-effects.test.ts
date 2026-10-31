import { describe, expect, it } from 'vitest';
import { ultimateFrame, ultimateVisualFor, rabbitBitFrame, rabbitShotTimes, RABBIT_VOLLEY, rabbitWhiteout, rabbitTargetFrame, rabbitMount, rabbitCameraZoom, rabbitLoopCues, rabbitLoopCamera, rabbitEnergyFrame, RABBIT_FLIGHT, rabbitMuzzle } from '../src/platform/ultimate-choreography';
import { content } from '../src/content';
import { ultimateSoundFor } from '../src/platform/ultimate-audio';
import { ULTIMATE_TIMING, RABBIT_TIMING, RABBIT_SEQUENCE, rabbitStage, UltimateClock } from '../src/platform/ultimate-timing';

describe('ultimate presentation clock', () => {
  it('gives both Lunette forms their own rabbit summon and volley without replacing other characters', () => {
    for (const id of ['lunette', 'lunette-awakened']) expect(ultimateVisualFor(content.characters.find(c => c.id === id)!)).toBe('rabbit-bits');
    expect(ultimateVisualFor(content.characters.find(c => c.id === 'noelle')!)).toBe('stars');
    expect(ultimateVisualFor(content.characters.find(c => c.id === 'nox')!)).toBe('clockwork');
    expect(ultimateSoundFor('rabbit-bits')).toBe('ultimate-rabbits');
    const impact = RABBIT_TIMING.impact;
    for (let i = 0; i < 4; i++) {
      expect(rabbitBitFrame(i, impact - 1).summon).toBe(1);
      expect(rabbitBitFrame(i, impact - 1).beam).toBe(0);
      expect(rabbitBitFrame(i, impact + 210).beam).toBeGreaterThan(0);
      expect(rabbitBitFrame(i, RABBIT_TIMING.end).alpha).toBe(0);
    }
    expect(rabbitBitFrame(0, impact).beam).toBe(1);
    expect(rabbitBitFrame(1, impact).beam).toBe(0);
  });
  it('fires eight separate shots, rests, finishes together and remains visible through the final echo', () => {
    const shots=[0,1,2,3].flatMap(rabbitShotTimes).sort((a,b)=>a-b);
    expect(new Set(shots).size).toBe(8);
    expect(shots.at(-1)).toBeLessThan(RABBIT_VOLLEY.finale-.25);
    for(let bit=0;bit<4;bit++){
      for(const at of rabbitShotTimes(bit))expect(rabbitBitFrame(bit,RABBIT_TIMING.impact+at*1000).beam).toBeCloseTo(1);
      expect(rabbitBitFrame(bit,RABBIT_SEQUENCE.finish-250).finishCharge).toBeGreaterThan(.5);
      const last=rabbitBitFrame(bit,RABBIT_TIMING.impact+RABBIT_VOLLEY.finale*1000);
      expect(last.final).toBe(true);expect(last.beam).toBe(1);expect(last.alpha).toBe(1);
    }
  });
  it('whites out once at the finisher and reveals the battlefield before the replay advances', () => {
    const start=RABBIT_TIMING.impact+RABBIT_VOLLEY.finale*1000;
    expect(rabbitWhiteout(start)).toBe(0);
    expect(rabbitWhiteout(start+70)).toBeGreaterThan(.5);
    expect(rabbitWhiteout(start+150)).toBe(1);
    expect(rabbitWhiteout(start+400)).toBeGreaterThan(0);
    expect(rabbitWhiteout(RABBIT_TIMING.end)).toBe(0);
  });
  it('reacts on all eight shots and the finisher, with continuous final energy and distinct robot depths', () => {
    for(let bit=0;bit<4;bit++)for(const at of rabbitShotTimes(bit)){
      const state=rabbitTargetFrame(RABBIT_TIMING.impact+(at+RABBIT_FLIGHT.shot)*1000+.1);
      expect(state.flash).toBeGreaterThan(.1);expect(Math.abs(state.x)+Math.abs(state.y)).toBeGreaterThan(.3);
    }
    const charge=rabbitTargetFrame(RABBIT_SEQUENCE.charge+250);
    expect(charge.zoom).toBeGreaterThan(1.3);expect(charge.flash).toBe(0);
    const finish=rabbitTargetFrame(RABBIT_TIMING.damage+1);
    expect(finish.x).toBeGreaterThan(8);expect(finish.finish).toBe(true);
    expect(new Set([0,1,2,3].map(i=>rabbitMount(i,1700).size)).size).toBe(4);
    expect(RABBIT_TIMING.damage).toBe(RABBIT_TIMING.impact+RABBIT_VOLLEY.finale*1000);
  });
  it('separates materialization, aiming, crossfire and the final charge',()=>{
    expect(rabbitStage(0)).toBe('command');
    for(let bit=0;bit<4;bit++){
      const at=RABBIT_SEQUENCE.summon+bit*RABBIT_SEQUENCE.summonStep;
      expect(rabbitBitFrame(bit,at).summon).toBe(0);
      expect(rabbitBitFrame(bit,at+RABBIT_SEQUENCE.summonDuration).summon).toBe(1);
    }
    expect(rabbitStage(RABBIT_SEQUENCE.aim)).toBe('aim');
    expect(rabbitBitFrame(3,RABBIT_SEQUENCE.aim).summon).toBe(1);
    expect(rabbitBitFrame(0,RABBIT_SEQUENCE.fire-1).beam).toBe(0);
    expect(rabbitStage(RABBIT_SEQUENCE.fire)).toBe('volley');
    expect(rabbitStage(RABBIT_SEQUENCE.charge)).toBe('charge');
    expect(rabbitStage(RABBIT_SEQUENCE.finish)).toBe('finish');
  });
  it('accelerates from the second charge directly into heavy flight and reveals at neutral zoom',()=>{
    expect(rabbitCameraZoom(0)).toBe(1);
    const early=rabbitCameraZoom(3400)-rabbitCameraZoom(3200);
    const late=rabbitCameraZoom(4200)-rabbitCameraZoom(4000);
    expect(late).toBeGreaterThan(early*5);
    expect(rabbitCameraZoom(RABBIT_SEQUENCE.charge+240)).toBeGreaterThan(rabbitCameraZoom(RABBIT_SEQUENCE.charge));
    const launch=RABBIT_SEQUENCE.finish-RABBIT_FLIGHT.finale*1000;
    expect(Math.abs(rabbitCameraZoom(launch-1)-rabbitCameraZoom(launch+1))).toBeLessThan(.01);
    expect(rabbitCameraZoom(RABBIT_SEQUENCE.finish+80)).toBeCloseTo(1.38);
    expect(rabbitCameraZoom(RABBIT_SEQUENCE.end)).toBeCloseTo(1,10);
    for(let at=0;at<=RABBIT_SEQUENCE.end;at+=10){expect(rabbitCameraZoom(at)).toBeGreaterThanOrEqual(1-1e-10);expect(rabbitCameraZoom(at)).toBeLessThanOrEqual(1.381);}
  });
  it('accelerates the camera with the same rising charge after each pass',()=>{
    let previous=0;
    for(const cue of rabbitLoopCues()){
      const at=RABBIT_SEQUENCE.fire+cue.at*1000;
      const start=rabbitLoopCamera(at),peak=rabbitLoopCamera(at+cue.duration*1000*.55);
      expect(start.power).toBeCloseTo(0);expect(peak.round).toBe(cue.round);
      expect(peak.zoom).toBeCloseTo(cue.zoom);expect(peak.zoom).toBeGreaterThan(previous);previous=peak.zoom;
      const early=rabbitLoopCamera(at+cue.duration*1000*.15).zoom;
      const late=rabbitLoopCamera(at+cue.duration*1000*.45).zoom;
      expect(late).toBeGreaterThan(early*10);
      expect(rabbitLoopCamera(cue.round===RABBIT_VOLLEY.rounds-1?RABBIT_SEQUENCE.finish+1:at+cue.duration*1000+1).round).toBe(-1);
    }
  });
  it('changes local energy color on each charge and keeps it for the next shots',()=>{
    expect(rabbitEnergyFrame(4200).color).toBe(0x9aeee7);
    const cues=rabbitLoopCues();
    expect(rabbitEnergyFrame(4200+cues[0].at*1000+100).color).toBe(0xbea2ff);
    expect(rabbitEnergyFrame(5200).color).toBe(0xbea2ff);
    expect(rabbitEnergyFrame(4200+cues[1].at*1000+100).color).toBe(0xff9fbd);
    expect(rabbitEnergyFrame(RABBIT_SEQUENCE.finish).color).toBe(0xff9fbd);
  });
  it('launches from artwork clock faces, travels before damage and lands the heavy shot together',()=>{
    const first=RABBIT_TIMING.impact;
    const flying=rabbitBitFrame(0,first+35);
    expect(flying.flight).toBe(true);expect(flying.travel).toBeGreaterThan(0);expect(flying.travel).toBeLessThan(1);
    expect(flying.impact).toBe(0);expect(rabbitTargetFrame(first+35).shot).toBe(-1);
    expect(rabbitBitFrame(0,first+75).impact).toBe(1);expect(rabbitTargetFrame(first+75.1).shot).toBe(0);
    for(let bit=0;bit<4;bit++){
      expect(rabbitBitFrame(bit,RABBIT_SEQUENCE.finish-90).flight).toBe(true);
      expect(rabbitBitFrame(bit,RABBIT_SEQUENCE.finish-90).final).toBe(true);
      expect(rabbitBitFrame(bit,RABBIT_SEQUENCE.finish).impact).toBe(1);
      expect(rabbitBitFrame(bit,RABBIT_SEQUENCE.finish).flight).toBe(false);
      const m=rabbitMuzzle(bit,100,100,80,1,0);
      expect(Math.hypot(m.x-100,m.y-100)).toBeGreaterThan(5);
      const turned=rabbitMuzzle(bit,100,100,80,1,Math.PI);
      expect(turned.x-100).toBeCloseTo(100-m.x);expect(turned.y-100).toBeCloseTo(100-m.y);
    }
  });
  it('travels to the target, holds the impact and preserves time for readable results', () => {
    const impact = ULTIMATE_TIMING.impact;
    expect(ultimateFrame('blade',impact-95).travel).toBe(0);
    expect(ultimateFrame('blade',impact-45).travel).toBeGreaterThan(.5);
    expect(ultimateFrame('blade',impact+50).action).toBe(0);
    expect(ultimateFrame('blade',impact+160).action).toBeCloseTo(.1);
    expect(ultimateFrame('bloom',impact+50).action).toBeCloseTo(.05);
    expect(ULTIMATE_TIMING.end-impact).toBeGreaterThan(1500);
  });
  it('rounds fractional timer delays up so effects cannot miss their start gate', () => {
    const clock = new UltimateClock(); clock.sync('one', 1, 1000);
    const delay = clock.delay(ULTIMATE_TIMING.effect, 1000.25);
    expect(delay).toBe(900);
    expect(clock.position(1000.25 + delay)).toBeGreaterThanOrEqual(ULTIMATE_TIMING.effect);
  });
  it('keeps the impact shared by sound, particles and numbers when speed changes', () => {
    const clock = new UltimateClock();
    clock.sync('one', 1, 1000);
    clock.sync('one', 2, 1400);
    expect(clock.position(1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.effect, 1400)).toBe(400);
    expect(clock.delay(ULTIMATE_TIMING.impact, 1400)).toBe(840);
    expect(clock.delay(ULTIMATE_TIMING.end, 1400)).toBe(2240);
    clock.sync('one', 1, 2400);
    expect(clock.position(2400)).toBe(1650);
    expect(clock.delay(ULTIMATE_TIMING.impact, 2400)).toBe(0);
    clock.sync('two', 2, 5000);
    expect(clock.position(5000)).toBe(0);
    expect(clock.delay(ULTIMATE_TIMING.end, 5000)).toBe(2560);
  });
});
