export interface WishState {
  text: string;
  author: string;
}

export enum InteractionState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SHOWING = 'SHOWING',
  ERROR = 'ERROR'
}

export enum TreeMode {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface TreeConfig {
  color: string;
  ornamentColor: string;
  lightsColor: string;
}