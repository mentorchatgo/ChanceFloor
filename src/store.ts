import { create } from 'zustand';

export type GamePhase = 'waiting' | 'countdown' | 'elimination';

export const TILE_COLORS = [
  '#9C27B0', // Paars
  '#FF0000', // Rood
  '#FF1493', // Roze
  '#FFFF00', // Geel
  '#00FF00', // Groen
  '#00FFFF', // Lichtblauw
  '#0000CD', // Donkerblauw
  '#006400', // Donkergroen
  '#FFA500', // Oranje
  '#98FF98'  // Mintgroen
];

interface GameState {
  score: number;
  gameOver: boolean;
  gameStarted: boolean;
  gamePhase: GamePhase;
  targetColor: string | null;
  countdown: number;
  countdownDuration: number;
  screenVisible: boolean;
  startGame: () => void;
  endGame: () => void;
  increaseScore: () => void;
  setGamePhase: (phase: GamePhase) => void;
  setTargetColor: (color: string | null) => void;
  setCountdown: (val: number) => void;
  setCountdownDuration: (val: number) => void;
  setScreenVisible: (val: boolean) => void;
  mobileControls: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean };
  setMobileControl: (control: 'forward' | 'backward' | 'left' | 'right' | 'jump', value: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  gameOver: false,
  gameStarted: false,
  gamePhase: 'waiting',
  targetColor: null,
  countdown: 5,
  countdownDuration: 5,
  screenVisible: true,
  mobileControls: { forward: false, backward: false, left: false, right: false, jump: false },
  startGame: () => set({ gameStarted: true, gameOver: false, score: 0, gamePhase: 'countdown', targetColor: TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)], countdown: 5, countdownDuration: 5 }),
  endGame: () => set({ gameOver: true, gameStarted: false, gamePhase: 'waiting', mobileControls: { forward: false, backward: false, left: false, right: false, jump: false } }),
  increaseScore: () => set((state) => ({ score: state.score + 10 })),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setTargetColor: (color) => set({ targetColor: color }),
  setCountdown: (val) => set({ countdown: val }),
  setCountdownDuration: (val) => set({ countdownDuration: val }),
  setScreenVisible: (val) => set({ screenVisible: val }),
  setMobileControl: (control, value) => set((state) => ({
    mobileControls: { ...state.mobileControls, [control]: value }
  })),
}));
