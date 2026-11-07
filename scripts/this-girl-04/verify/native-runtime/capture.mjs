/** Native capture plumbing. Service smoke tested; actual A/V capture not yet tested.
 * No browser launch or application mutations. Caller owns timeline and validation.
 */
import { spawn } from 'node:child_process';
import { openSync, closeSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export function startNativeCapture({file, width=450, height=848, fps=30, rate=48000, losslessCodec='libx264rgb'}) {
  if (!['libx264rgb','ffv1'].includes(losslessCodec)) throw Error('Unsupported lossless capture codec');
  const wallEpoch = Math.floor(Date.now()/1000);
  const log = `${file}.ffmpeg-debug.log`;
  const metadataFile = `${file}.clock.json`;
  const logFd = openSync(log, 'w');
  // Both demuxers use Unix wall-clock PTS natively. Preserve those timestamps,
  // then subtract one shared epoch at the muxer; never zero streams separately.
  const videoCodec = losslessCodec === 'libx264rgb'
    ? ['-c:v','libx264rgb','-crf','0','-preset','veryfast','-pix_fmt','rgb24','-bf','0','-threads','1']
    : ['-c:v','ffv1','-level','3','-threads','1'];
  const args = ['-hide_banner','-y','-loglevel','verbose','-debug_ts','-copyts',
    '-thread_queue_size','1024','-f','x11grab','-framerate',String(fps),
    '-video_size',`${width}x${height}`,'-i',`${process.env.DISPLAY || ':93'}.0+0,0`,
    '-thread_queue_size','1024','-f','pulse','-sample_rate',String(rate),
    '-channels','2','-i','stillveil.monitor',
    '-map','0:v:0','-map','1:a:0',...videoCodec,
    '-fps_mode','passthrough','-c:a','pcm_s16le','-avoid_negative_ts','disabled',
    '-output_ts_offset',String(-wallEpoch),file];
  const child = spawn('ffmpeg',args,{stdio:['pipe','ignore',logFd],env:process.env});
  closeSync(logFd);
  const metadata = {version:1, file, log, wallEpoch, width, height, fps, rate, losslessCodec,
    helperCodeSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    pixelPolicy:'Lossless RGB game pixels, no chroma subsampling. RGB24 packing discards only unused X11 padding. Final viewing MP4 is encoded separately as 8bit yuv420p.',
    mapping:'Unix wall time seconds = output packet PTS seconds + wallEpoch',
    timestampPolicy:'native Unix demuxer PTS; -copyts; shared muxer output_ts_offset',
    note:'Verify actual first packet times and flash/audio markers before relying on mapping.',
    args, startRequestedUnixMs:Date.now(), ffmpegPid:child.pid};
  writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');
  let settled;
  const done = new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',(code,signal)=>{settled={code,signal}; resolve(settled);});
  });
  return {process:child,wallEpoch,log,metadataFile,done,
    async stop() {
      if (!settled && !child.killed && child.stdin.writable) child.stdin.write('q\n');
      const result = await done;
      metadata.stopCompletedUnixMs=Date.now(); metadata.result=result;
      writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');
      if (result.code!==0) throw new Error(`ffmpeg failed: ${JSON.stringify(result)}; see ${log}`);
      return {...metadata,...result};
    }
  };
}
