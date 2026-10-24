import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/export-flower-motion.mjs <original-video-directory>');
mkdirSync('public/video',{recursive:true});
function ffmpeg(args) {
 const result=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error('Video export failed');
}
for(const id of ['selene','athena']) {
 const source=join(resolve(input),`${id}-original.mp4`);
 if(!existsSync(source))throw new Error(`Missing original: ${source}`);
 // Mirror the generated motion in time so both loop boundaries meet without a cut.
 ffmpeg(['-i',source,'-an','-filter_complex','[0:v]fps=24,trim=duration=10,setpts=PTS-STARTPTS,split[f][r];[r]reverse,setpts=PTS-STARTPTS[back];[f][back]concat=n=2:v=1:a=0,scale=720:1080:force_original_aspect_ratio=increase,crop=720:1080,setsar=1[out]','-map','[out]','-c:v','libx264','-profile:v','baseline','-level','3.1','-crf','26','-maxrate','1300k','-bufsize','2600k','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2',`public/video/gacha-${id}.mp4`]);
 ffmpeg(['-i',`public/video/gacha-${id}.mp4`,'-an','-vf','scale=320:480,fps=18','-c:v','libx264','-profile:v','baseline','-level','3.0','-crf','28','-maxrate','220k','-bufsize','440k','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2',`public/video/${id}-portrait.mp4`]);
 console.log(`Exported ${id}: silent 20s loop, 720x1080 and 320x480`);
}
