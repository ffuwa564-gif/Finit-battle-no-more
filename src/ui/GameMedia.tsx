import type { ComponentPropsWithRef } from 'react';
import './game-interaction.css';

type Gesture = `on${'Click' | 'DoubleClick' | 'ContextMenu' | 'PointerDown' | 'PointerUp' | 'PointerMove' | 'PointerCancel' | 'MouseDown' | 'MouseUp' | 'TouchStart' | 'TouchMove' | 'TouchEnd' | 'TouchCancel' | 'DragStart' | 'Drag' | 'DragEnd' | 'KeyDown' | 'KeyUp'}${'' | 'Capture'}`;

/** Artwork never owns a native gesture. Put game actions on the surrounding
 * shared control so Safari cannot turn a hold into an image preview. */
export type GameImageProps = Omit<ComponentPropsWithRef<'img'>, 'draggable' | Gesture> & { draggable?: false };
export function GameImage({ style, ...props }: GameImageProps) {
  return <img {...props} data-game-media="image" draggable={false} style={{ ...style, pointerEvents: 'none' }} />;
}

/** Playback belongs to AnimatedIllustration's accessible game buttons. */
export type GameVideoProps = Omit<ComponentPropsWithRef<'video'>, 'controls' | 'draggable' | Gesture> & { controls?: false; draggable?: false };
export function GameVideo({ style, ...props }: GameVideoProps) {
  return <video {...props} data-game-media="video" draggable={false} controls={false} playsInline disablePictureInPicture style={{ ...style, pointerEvents: 'none' }} />;
}
