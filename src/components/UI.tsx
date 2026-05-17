import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store';
import { Play, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpCircle, LucideIcon } from 'lucide-react';

const ControlButton = ({ dir, Icon }: { dir: 'forward'|'backward'|'left'|'right'|'jump', Icon: LucideIcon }) => {
  const setControl = useGameStore(s => s.setMobileControl);
  
  const handleStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setControl(dir, true);
  };
  
  const handleEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setControl(dir, false);
  };

  return (
    <button
      className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-white active:bg-white/40 touch-none focus:outline-none flex items-center justify-center select-none"
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <Icon size={32} className="pointer-events-none" />
    </button>
  );
};

export default function UI() {
  const { gameStarted, startGame, screenVisible, countdown, targetColor, gamePhase } = useGameStore();

  const handleStart = () => {
    startGame();
  };

  return (
    <>
      <AnimatePresence>
        {!gameStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 transition-all font-sans" 
          >
            {/* Background - Pixelated */}
            <div 
              className="absolute inset-0 z-0" 
              style={{ 
                backgroundImage: 'url(https://i.imgur.com/IbFVifC.jpeg)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                filter: 'url(#pixelate)'
              }} 
            />

            <div className="max-w-3xl w-full mx-4 p-1 relative z-10">
              {/* Cyberpunk box border effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 opacity-50 rounded-xl blur-lg animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-600 rounded-xl" />
              
              <div className="relative p-10 md:p-14 flex flex-col items-center text-center">                
                <div className="absolute inset-0 bg-black/90 rounded-xl border border-white/10" />
                
                <div className="relative flex flex-col items-center text-center">
                  <img src="https://i.imgur.com/Umc6lim.png" alt="Chance Floor Logo" className="w-full max-w-sm mb-6" />
                  
                  {/* Container for pixelated text/buttons */}
                  <div style={{ filter: 'url(#pixelate)' }} className="flex flex-col items-center">
                    {useGameStore.getState().gameOver && (
                      <h1 className="text-4xl md:text-6xl font-retro text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-500 tracking-wider drop-shadow-[0_0_15px_rgba(255,20,147,0.8)] mb-6 uppercase leading-tight py-2">
                        YOU DIED
                      </h1>
                    )}
                    
                    <p className="text-white mb-10 px-4 text-2xl md:text-3xl font-retro leading-relaxed tracking-wider drop-shadow-md">
                      {useGameStore.getState().gameOver ? "Restarting cycle..." : "Survive the vanishing floor.\nMatch the screen color."}
                    </p>
                    
                    {!useGameStore.getState().gameOver && (
                      <button 
                        onClick={handleStart}
                        className="group relative inline-flex items-center justify-center gap-4 px-10 py-6 font-retro text-xl md:text-2xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 active:translate-y-0"
                      >
                        <div className="absolute inset-0 w-full h-full border-4 border-cyan-400 group-hover:bg-cyan-400 group-hover:bg-opacity-20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.5)] inset-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                        <Play size={32} className="text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,1)] z-10" fill="currentColor" />
                        <span className="z-10 drop-shadow-[0_0_5px_rgba(34,211,238,1)]">INITIATE</span>
                      </button>
                    )}
                  </div>
    
                  {!useGameStore.getState().gameOver && (
                    <div style={{ filter: 'url(#pixelate)' }} className="relative mt-12 flex flex-col md:flex-row gap-6 text-base md:text-lg text-cyan-500/80 font-retro font-bold">
                      <span className="flex items-center gap-3"><span className="border-2 border-cyan-500/40 px-3 py-2 rounded">WASD</span> MOVE</span>
                      <span className="flex items-center gap-3"><span className="border-2 border-cyan-500/40 px-3 py-2 rounded">SPACE</span> JUMP</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between">
        {/* Top UI element if screen is not visible */}
        {gameStarted && !screenVisible && (gamePhase === 'countdown' || gamePhase === 'elimination') ? (
          <div className="w-full flex justify-center pt-8 pointer-events-none" style={{ filter: 'url(#pixelate)' }}>
            <span 
              className="text-5xl md:text-7xl font-retro text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] transition-all"
              style={{ 
                color: gamePhase === 'elimination' ? '#FF0000' : (targetColor || '#FFFFFF'),
                WebkitTextStroke: '2px black'
              }}
            >
              {gamePhase === 'elimination' ? 'DANGER' : Math.ceil(countdown)}
            </span>
          </div>
        ) : (
          <div /> // Spacer
        )}

        {/* Game Over Screen Text */}
        {gamePhase === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none" style={{ filter: 'url(#pixelate)' }}>
            <div className="animate-game-over flex flex-col items-center gap-4 w-full px-4">
               <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-retro text-red-600 uppercase tracking-widest font-black drop-shadow-[0_0_40px_rgba(255,0,0,1)] text-center w-full" style={{ WebkitTextStroke: '4px black' }}>
                 GAME OVER
               </h1>
            </div>
          </div>
        )}

        {gameStarted && (
          <>
            <div className="absolute bottom-8 left-4 z-50 pointer-events-auto md:hidden touch-none" style={{ filter: 'url(#pixelate)' }}>
              <div className="grid grid-cols-3 gap-2 opacity-90 origin-bottom-left">
                <div />
                <ControlButton dir="forward" Icon={ArrowUp} />
                <div />
                <ControlButton dir="left" Icon={ArrowLeft} />
                <ControlButton dir="backward" Icon={ArrowDown} />
                <ControlButton dir="right" Icon={ArrowRight} />
              </div>
            </div>
            <div className="absolute bottom-8 right-6 z-50 pointer-events-auto md:hidden touch-none flex flex-col justify-end" style={{ filter: 'url(#pixelate)' }}>
              <div className="opacity-90 origin-bottom-right mb-4">
                <ControlButton dir="jump" Icon={ArrowUpCircle} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
