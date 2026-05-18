import { create } from 'zustand';

export type GamePhase = 'waiting' | 'countdown' | 'elimination' | 'gameover';

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

export const CHARACTER_COLORS = [
  ...TILE_COLORS,
  '#FFFFFF', // Wit
  '#000000', // Zwart
  'rainbow'
];

interface GameState {
  score: number;
  round: number;
  gameOver: boolean;
  gameStarted: boolean;
  gamePhase: GamePhase;
  targetColor: string | null;
  countdown: number;
  countdownDuration: number;
  screenVisible: boolean;
  startGame: () => void;
  endGame: () => void;
  nextRound: () => void;
  setGamePhase: (phase: GamePhase) => void;
  setTargetColor: (color: string | null) => void;
  setCountdown: (val: number) => void;
  setCountdownDuration: (val: number) => void;
  setScreenVisible: (val: boolean) => void;
  resetMenu: () => void;
  restartTimer: NodeJS.Timeout | null;
  setRestartTimer: (timer: NodeJS.Timeout | null) => void;
  gameMode: 'local' | 'public' | 'private';
  setGameMode: (mode: 'local' | 'public' | 'private') => void;
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;
  ws: WebSocket | null;
  setWs: (ws: WebSocket | null) => void;
  roomId: string | null;
  setRoomId: (id: string | null) => void;
  isHost: boolean;
  setIsHost: (val: boolean) => void;
  playerColor: string;
  setPlayerColor: (color: string) => void;
  otherPlayers: Record<string, { position: [number, number, number], displayName?: string, color?: string }>;
  updateOtherPlayer: (userId: string, data: { position: [number, number, number], displayName?: string, color?: string }) => void;
  removeOtherPlayer: (userId: string) => void;
  mobileControls: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean };
  setMobileControl: (control: 'forward' | 'backward' | 'left' | 'right' | 'jump', value: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  round: 1,
  gameOver: false,
  gameStarted: false,
  gamePhase: 'waiting',
  targetColor: null,
  countdown: 5,
  countdownDuration: 5,
  screenVisible: true,
  restartTimer: null,
  gameMode: 'local',
  onlineUsers: [],
  ws: null,
  roomId: null,
  isHost: false,
  playerColor: '#FFFFFF',
  otherPlayers: {},
  mobileControls: { forward: false, backward: false, left: false, right: false, jump: false },
  startGame: () => set({ gameStarted: true, gameOver: false, score: 0, round: 1, gamePhase: 'countdown', targetColor: TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)], countdown: 5, countdownDuration: 5 }),
  endGame: () => set({ gameOver: true, gameStarted: false, gamePhase: 'waiting', mobileControls: { forward: false, backward: false, left: false, right: false, jump: false } }),
  nextRound: () => set((state) => ({ score: state.score + state.round, round: state.round + 1 })),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setTargetColor: (color) => set({ targetColor: color }),
  setCountdown: (val) => set({ countdown: val }),
  setCountdownDuration: (val) => set({ countdownDuration: val }),
  setScreenVisible: (val) => set({ screenVisible: val }),
  resetMenu: () => set((state) => {
    if (state.restartTimer) clearTimeout(state.restartTimer);
    return { gameOver: false, gameStarted: false, gamePhase: 'waiting', restartTimer: null, gameMode: 'local', roomId: null, isHost: false, otherPlayers: {} };
  }),
  setRestartTimer: (timer) => set({ restartTimer: timer }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setWs: (ws) => set({ ws: ws }),
  setRoomId: (id) => set({ roomId: id }),
  setIsHost: (val) => set({ isHost: val }),
  setPlayerColor: (color) => set({ playerColor: color }),
  updateOtherPlayer: (userId, data) => set((state) => ({
    otherPlayers: { ...state.otherPlayers, [userId]: data }
  })),
  removeOtherPlayer: (userId) => set((state) => {
    const next = { ...state.otherPlayers };
    delete next[userId];
    return { otherPlayers: next };
  }),
  setMobileControl: (control, value) => set((state) => ({
    mobileControls: { ...state.mobileControls, [control]: value }
  })),
}));
