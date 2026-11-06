import {afterEach,describe,it,expect,vi} from 'vitest';
import {acquireGameAudioContext,releaseGameAudioContext} from '../src/platform/audio-context';
class DeviceContext extends EventTarget {
 state='running';sampleRate=48000;
 close=vi.fn(async()=>{this.state='closed';this.dispatchEvent(new Event('statechange'));});
}
let last:AudioContext|undefined;
afterEach(()=>{if(last){releaseGameAudioContext('music',last);releaseGameAudioContext('effects',last);}last=undefined;vi.unstubAllGlobals();});
describe('one game audio device clock',()=>{
 it('shares the device-native sample rate for BGM and effects and does not close effects when music is disposed',()=>{
  const construct=vi.fn(function(){return new DeviceContext();});vi.stubGlobal('window',{AudioContext:construct});
  const bgm=acquireGameAudioContext('music'),se=acquireGameAudioContext('effects');last=se;
  expect(bgm).toBe(se);expect(construct).toHaveBeenCalledTimes(1);expect(construct).toHaveBeenCalledWith({latencyHint:'interactive'});
  releaseGameAudioContext('music',bgm);expect(bgm.close).not.toHaveBeenCalled();expect(acquireGameAudioContext('effects')).toBe(se);
  releaseGameAudioContext('effects',se);expect(bgm.close).toHaveBeenCalledTimes(1);
 });
 it('replaces a closed device once and ignores a stale owner releasing the previous context',()=>{
  const construct=vi.fn(function(){return new DeviceContext();});vi.stubGlobal('window',{AudioContext:construct});
  const old=acquireGameAudioContext('music');void old.close();
  const se=acquireGameAudioContext('effects');last=se;expect(se).not.toBe(old);expect(acquireGameAudioContext('music')).toBe(se);
  releaseGameAudioContext('music',old);expect(se.close).not.toHaveBeenCalled();expect(construct).toHaveBeenCalledTimes(2);
 });
});
