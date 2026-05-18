import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore, CHARACTER_COLORS } from '../store';
import { Play, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpCircle, LucideIcon, Trophy, LogIn, Edit2, Check, X } from 'lucide-react';
import { auth, signInWithGoogle, logOut, getLeaderboard, LeaderboardEntry, updateUserName } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
      className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-xl text-white active:bg-white/40 touch-none focus:outline-none flex items-center justify-center select-none"
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <Icon size={36} className="pointer-events-none" />
    </button>
  );
};

export default function UI() {
  const { gameStarted, startGame, screenVisible, countdown, targetColor, gamePhase, score, round, ws, onlineUsers, gameMode } = useGameStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [user, setUser] = useState(auth.currentUser);
  const [inviteObj, setInviteObj] = useState<{fromDisplay: string, roomId: string} | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSaveName = async () => {
    if (newName.trim() && newName.length <= 15) {
      await updateUserName(newName.trim());
      setUser(auth.currentUser);
      setIsEditingName(false);
      getLeaderboard().then(setLeaderboard).catch(console.error);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      console.log('WS connected');
      useGameStore.getState().setWs(socket);
    };
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'onlineUsers') {
          useGameStore.getState().setOnlineUsers(msg.users);
        } else if (msg.type === 'publicState') {
          if (useGameStore.getState().gameMode === 'public') {
            useGameStore.setState({
              countdown: msg.state.countdown,
              countdownDuration: msg.state.countdownDuration,
              targetColor: msg.state.targetColor,
              gamePhase: msg.state.phase,
              round: msg.state.round
            });
          }
        } else if (msg.type === 'privateCreated' || msg.type === 'privateJoined') {
          useGameStore.getState().setRoomId(msg.roomId);
          if (msg.type === 'privateJoined') {
            useGameStore.getState().setGameMode('private');
            useGameStore.getState().startGame();
          }
        } else if (msg.type === 'inviteReceived') {
          setInviteObj({ fromDisplay: msg.fromDisplay, roomId: msg.roomId });
        } else if (msg.type === 'playerUpdate') {
           useGameStore.getState().updateOtherPlayer(msg.userId, { position: msg.position, displayName: msg.displayName, color: msg.color });
        } else if (msg.type === 'privateStateUpdate') {
           if (useGameStore.getState().gameMode === 'private') {
             useGameStore.setState({
               countdown: msg.state.countdown,
               countdownDuration: msg.state.countdownDuration,
               targetColor: msg.state.targetColor,
               gamePhase: msg.state.phase,
               round: msg.state.round
             });
           }
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    return () => socket.close();
  }, []);

  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN && user) {
      ws.send(JSON.stringify({ type: 'auth', userId: user.uid, displayName: user.displayName }));
    }
  }, [user, ws]);

  useEffect(() => {
    if (!gameStarted) {
      getLeaderboard().then(setLeaderboard).catch(console.error);
    }
  }, [gameStarted]);

  const handleStartLocal = () => {
    useGameStore.getState().setGameMode('local');
    startGame();
  };

  const handleStartPublic = () => {
    useGameStore.getState().setGameMode('public');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'joinPublic' }));
    }
    startGame();
  };

  const handleCreatePrivate = () => {
    useGameStore.getState().setGameMode('private');
    useGameStore.getState().setIsHost(true);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'createPrivate' }));
    }
    startGame(); // Host drives private game locally actually
  };

  const acceptInvite = () => {
    if (inviteObj && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'joinPrivate', roomId: inviteObj.roomId }));
      setInviteObj(null);
    }
  };

  const handleInvite = (userId: string) => {
    if (ws && ws.readyState === WebSocket.OPEN && useGameStore.getState().roomId) {
      ws.send(JSON.stringify({ type: 'invite', targetUserId: userId, roomId: useGameStore.getState().roomId }));
    } else {
      alert("Must create a private game first before inviting!");
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <>
      <div style={{ filter: 'url(#pixelate-text)' }} className="pointer-events-none fixed inset-0 z-50">
        <div className="pointer-events-auto w-full h-full">
          <AnimatePresence>
            {!gameStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 transition-all font-sans overflow-y-auto py-10" 
              >
            {/* Background - Pixelated */}
            <div 
              className="fixed inset-0 z-0" 
              style={{ 
                backgroundImage: 'url(https://i.imgur.com/IbFVifC.jpeg)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                filter: 'url(#pixelate)'
              }} 
            />

            <div className="max-w-4xl w-full mx-auto p-1 relative z-10 flex items-center justify-center min-h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start md:items-center w-full">
              {/* Left Column: Menu */}
              <div className="relative p-6 md:p-14 flex flex-col items-center text-center h-full">                
                <div className="absolute inset-0 bg-black/80 rounded-xl border border-cyan-500/30" />
                
                <div className="relative flex flex-col items-center text-center w-full">
                  <img src="https://i.imgur.com/Umc6lim.png" alt="Chance Floor Logo" className="w-[80%] max-w-sm mb-4 md:mb-6" />
                  
                  {/* Container for pixelated text/buttons */}
                  <div style={{ filter: 'url(#pixelate)' }} className="flex flex-col items-center">
                    {useGameStore.getState().gameOver && (
                      <h1 className="text-4xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-500 tracking-wider drop-shadow-[0_0_15px_rgba(255,20,147,0.8)] mb-4 md:mb-6 uppercase leading-tight py-2">
                        YOU DIED
                      </h1>
                    )}
                    
                    <p className="text-white mb-6 md:mb-10 px-4 text-lg md:text-4xl font-retro leading-relaxed tracking-wider drop-shadow-md">
                      {useGameStore.getState().gameOver ? "Restarting cycle..." : "Survive the vanishing floor.\nMatch the screen color."}
                    </p>

                    {useGameStore.getState().gameOver && (
                      <button 
                        onClick={() => useGameStore.getState().resetMenu()}
                        className="group relative inline-flex items-center justify-center gap-4 px-6 md:px-8 py-3 md:py-4 font-retro text-lg md:text-2xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 mt-2 md:mt-4"
                      >
                        <div className="absolute inset-0 w-full h-full border-4 border-pink-500 group-hover:bg-pink-500 group-hover:bg-opacity-20 transition-all" />
                        <span className="z-10 text-pink-300 drop-shadow-[0_0_5px_rgba(236,72,153,1)]">AFSLUITEN</span>
                      </button>
                    )}
                    
                    {!useGameStore.getState().gameOver && (
                      <div className="flex flex-col gap-3 md:gap-4 w-full items-center">
                        <button 
                          onClick={handleStartLocal}
                          className="group relative inline-flex items-center justify-center gap-3 md:gap-4 px-6 py-3 md:py-4 font-retro text-lg md:text-2xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 active:translate-y-0 w-full max-w-[300px]"
                        >
                          <div className="absolute inset-0 w-full h-full border-4 border-cyan-400 group-hover:bg-cyan-400 group-hover:bg-opacity-20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.5)] inset-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                          <Play size={20} className="text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,1)] z-10" fill="currentColor" />
                          <span className="z-10 drop-shadow-[0_0_5px_rgba(34,211,238,1)]">PLAY LOCAL</span>
                        </button>

                        <button 
                          onClick={handleStartPublic}
                          className="group relative inline-flex items-center justify-center gap-3 md:gap-4 px-6 py-3 md:py-4 font-retro text-lg md:text-2xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 active:translate-y-0 w-full max-w-[300px]"
                        >
                          <div className="absolute inset-0 w-full h-full border-4 border-purple-400 group-hover:bg-purple-400 group-hover:bg-opacity-20 transition-all shadow-[0_0_15px_rgba(168,85,247,0.5)] inset-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                          <Play size={20} className="text-purple-300 drop-shadow-[0_0_5px_rgba(168,85,247,1)] z-10" fill="currentColor" />
                          <span className="z-10 drop-shadow-[0_0_5px_rgba(168,85,247,1)]">PUBLIC SERVER</span>
                        </button>

                        {user && (
                          <button 
                            onClick={handleCreatePrivate}
                            className="group relative inline-flex items-center justify-center gap-3 md:gap-4 px-6 py-3 font-retro text-base md:text-xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 active:translate-y-0 w-full max-w-[300px] mt-1 md:mt-2"
                          >
                            <div className="absolute inset-0 w-full h-full border-4 border-green-400 group-hover:bg-green-400 group-hover:bg-opacity-20 transition-all shadow-[0_0_15px_rgba(74,222,128,0.5)] inset-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                            <span className="z-10 drop-shadow-[0_0_5px_rgba(74,222,128,1)]">CREATE PRIVATE</span>
                          </button>
                        )}

                        {!user && (
                          <button 
                            onClick={handleLogin}
                            className="group relative inline-flex items-center justify-center gap-3 md:gap-4 px-6 py-3 font-retro text-lg md:text-2xl uppercase tracking-widest text-white transition-all duration-200 bg-transparent overflow-hidden rounded-sm hover:-translate-y-1 active:translate-y-0 w-full max-w-[300px] mt-1 md:mt-2"
                          >
                            <div className="absolute inset-0 w-full h-full border-4 border-pink-400 group-hover:bg-pink-400 group-hover:bg-opacity-20 transition-all shadow-[0_0_15px_rgba(236,72,153,0.5)] inset-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                            <LogIn size={20} className="text-pink-300 drop-shadow-[0_0_5px_rgba(236,72,153,1)] z-10" />
                            <span className="z-10 drop-shadow-[0_0_5px_rgba(236,72,153,1)]">LOGIN TO SAVE</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    {user && (
                       <div className="flex flex-col items-center gap-2 mt-4">
                         {isEditingName ? (
                           <div className="flex items-center gap-2 font-retro">
                             <input 
                               value={newName}
                               onChange={e => setNewName(e.target.value)}
                               maxLength={15}
                               className="bg-black/50 border border-cyan-500 text-cyan-300 px-2 py-1 outline-none w-32"
                             />
                             <button onClick={handleSaveName} className="text-green-400 hover:text-green-300"><Check size={18} /></button>
                             <button onClick={() => setIsEditingName(false)} className="text-red-400 hover:text-red-300"><X size={18} /></button>
                           </div>
                         ) : (
                           <div className="flex items-center gap-3">
                             <p className="text-cyan-300 font-retro text-lg">Welcome, <span className="uppercase text-white">{user.displayName || 'Player'}</span></p>
                             <button onClick={() => { setNewName(user.displayName || ''); setIsEditingName(true); }} className="text-cyan-500 hover:text-cyan-400">
                               <Edit2 size={14} />
                             </button>
                           </div>
                         )}
                         <button 
                           onClick={logOut}
                           className="text-pink-400 hover:text-pink-300 font-retro text-base uppercase underline decoration-pink-500/50 underline-offset-4 mt-1"
                         >
                           Log out
                         </button>
                       </div>
                    )}
                  </div>
    
                  {!useGameStore.getState().gameOver && (
                    <div style={{ filter: 'url(#pixelate)' }} className="relative mt-8 flex flex-col items-center gap-4 text-base md:text-lg font-retro font-bold">
                      <div className="flex flex-col md:flex-row gap-6 text-cyan-500/80">
                        <span className="flex items-center gap-2"><span className="border-2 border-cyan-500/40 px-2 py-1 rounded">WASD</span> MOVE</span>
                        <span className="flex items-center gap-2"><span className="border-2 border-cyan-500/40 px-2 py-1 rounded">SPACE</span> JUMP</span>
                      </div>
                      
                      <div className="mt-4 flex gap-2 flex-wrap justify-center items-center">
                        <span className="text-white mr-2 text-sm">COLOR:</span>
                        {CHARACTER_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => useGameStore.getState().setPlayerColor(color)}
                            className={`w-6 h-6 border-2 flex items-center justify-center ${useGameStore.getState().playerColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent hover:scale-105'}`}
                            style={{ background: color === 'rainbow' ? 'linear-gradient(45deg, red, blue, yellow, green)' : color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Leaderboard */}
              <div className="relative p-6 flex flex-col h-full" style={{ filter: 'url(#pixelate)' }}>
                 <div className="absolute inset-0 bg-black/60 rounded-xl border border-cyan-500/30" />
                 <div className="relative flex flex-col w-full h-full">
                    <h2 className="text-4xl font-retro text-cyan-400 mb-6 flex items-center gap-4 border-b-2 border-cyan-500/30 pb-4">
                      <Trophy size={32} className="text-yellow-400" /> LEADERBOARD
                    </h2>
                    
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2">
                       {leaderboard.length === 0 ? (
                         <div className="text-cyan-500 font-retro text-xl text-center mt-10">No scores yet.</div>
                       ) : (
                         leaderboard.map((entry, idx) => {
                           const isOnline = onlineUsers.includes(entry.userId);
                           return (
                           <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/10 font-retro">
                             <div className="flex items-center gap-3">
                               <span className={`text-2xl ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-cyan-500'}`}>#{idx + 1}</span>
                               <span className="text-white uppercase truncate max-w-[150px]">{entry.displayName}</span>
                               {isOnline && <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Online" />}
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-cyan-400 text-2xl">{entry.score} pts</span>
                               {isOnline && user && entry.userId !== user.uid && useGameStore.getState().roomId && (
                                 <button 
                                   onClick={() => handleInvite(entry.userId)}
                                   className="px-2 py-1 bg-green-500/20 border border-green-500 text-green-400 text-sm rounded hover:bg-green-500/40 transition-colors pointer-events-auto"
                                 >
                                   INVITE
                                 </button>
                               )}
                             </div>
                           </div>
                           );
                         })
                       )}
                    </div>
                 </div>
              </div>
            </div>

            {/* Invite Toast */}
            {inviteObj && (
              <div className="absolute top-4 md:top-10 flex flex-col items-center w-full z-[100] pointer-events-none px-4" style={{ filter: 'url(#pixelate)' }}>
                <div className="bg-black/90 border-2 border-green-500 p-4 md:p-6 rounded-xl font-retro text-center shadow-[0_0_20px_rgba(34,197,94,0.4)] pointer-events-auto w-full max-w-sm">
                  <p className="text-white mb-3 md:mb-4 text-xl md:text-2xl">
                    <span className="text-green-400">{inviteObj.fromDisplay}</span> invited you!
                  </p>
                  <div className="flex gap-2 md:gap-4 justify-center">
                    <button onClick={acceptInvite} className="px-4 md:px-6 py-2 bg-green-500 text-black hover:bg-green-400">ACCEPT</button>
                    <button onClick={() => setInviteObj(null)} className="px-4 md:px-6 py-2 bg-red-500 text-white hover:bg-red-400">DECLINE</button>
                  </div>
                </div>
              </div>
            )}

          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between">
        {/* Top UI element if screen is not visible */}
        {gameStarted && !screenVisible && (gamePhase === 'countdown' || gamePhase === 'elimination') ? (
          <div className="w-full flex justify-center pt-8 pointer-events-none" style={{ filter: 'url(#pixelate)' }}>
            <span 
              className="text-6xl md:text-7xl font-retro text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] transition-all"
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

        {/* Top Right Score & Round Display */}
        {gameStarted && (
           <div className="absolute top-4 md:top-6 right-4 md:right-6 flex flex-col items-end pointer-events-none gap-2 z-[60]" style={{ filter: 'url(#pixelate)' }}>
             <div className="bg-black/60 border-2 border-cyan-500/50 px-3 py-2 rounded font-retro text-2xl md:text-4xl text-yellow-400 uppercase drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
               SCORE: <span className="text-white">{score}</span>
             </div>
             <div className="bg-black/60 border-2 border-pink-500/50 px-3 py-1 rounded font-retro text-base md:text-2xl text-pink-400 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
               ROUND {round}
             </div>
           </div>
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
              <div className="grid grid-cols-3 gap-2 opacity-90 origin-bottom-left scale-90 sm:scale-100">
                <div />
                <ControlButton dir="forward" Icon={ArrowUp} />
                <div />
                <ControlButton dir="left" Icon={ArrowLeft} />
                <ControlButton dir="backward" Icon={ArrowDown} />
                <ControlButton dir="right" Icon={ArrowRight} />
              </div>
            </div>
            <div className="absolute bottom-8 right-4 z-50 pointer-events-auto md:hidden touch-none flex flex-col justify-end" style={{ filter: 'url(#pixelate)' }}>
              <div className="opacity-90 origin-bottom-right mb-2 scale-90 sm:scale-100">
                <ControlButton dir="jump" Icon={ArrowUpCircle} />
              </div>
            </div>
          </>
        )}
      </div>
        </div>
      </div>
    </>
  );
}
