import { resolve } from 'node:path';
import { content } from '../src/content';
import { exportMotionPosters } from './motion-posters';

exportMotionPosters(content.assets, resolve('public'));
console.log('Exported matching first-frame posters for all full-size and portrait videos.');
