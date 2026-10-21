import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, supabaseReady } from './supabase.js';
import {
  Swords, Gamepad2, Compass, Users, MessageCircle, Mic, MicOff, Video,
  VideoOff, Plus, Search, Sparkles, ArrowUpRight, Smile, Send, ShieldCheck,
  ChevronRight, Volume2, CircleHelp, Copy, Check, X, Menu, House, Puzzle,
  Trophy, RotateCcw, Play, Pause, MoreHorizontal, Ban, Trash2, PlusCircle
} from 'lucide-react';
import './styles.css';

const gameData = [
  { id:'snake', title:'Snake', subtitle:'A tiny classic', tag:'ARCADE', color:'mint', icon:'▰', description:'Collect dots. Don’t bonk into yourself.' },
  { id:'blocks', title:'Block Party', subtitle:'A relaxing block puzzle', tag:'PUZZLE', color:'lilac', icon:'▦', description:'Fit pieces into the grid and clear lines.' },
  { id:'trivia', title:'Quick Quiz', subtitle:'Little questions, no pressure', tag:'CHILL', color:'peach', icon:'✳', description:'Pick an answer and see how you go.' }
];
const sampleRooms = [
  {id:'cozy-corner', name:'Cozy Corner', desc:'Low-key games & good vibes', people:3, game:'Block Party', color:'mint', initials:'CC'},
  {id:'snack-break', name:'Snack Break', desc:'A quick game before doing anything', people:2, game:'Snake', color:'peach', initials:'SB'},
  {id:'tiny-tournament', name:'Tiny Tournament', desc:'Friendly score challenges', people:4, game:'Quick Quiz', color:'lilac', initials:'TT'}
];

function App() {
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).has('room') ? 'Room' : 'Home');
  const [name, setName] = useState('Guest');
  const [editingName, setEditingName] = useState(false);
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState(sampleRooms);
  const [activeRoom, setActiveRoom] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    return roomId ? { id: roomId, name: params.get('name') || 'Shared hangout', desc: 'An invite-only hangout', people: 1, game: 'Block Party', color: 'blue', initials: (params.get('name') || 'SH').slice(0, 2).toUpperCase() } : null;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomGame, setRoomGame] = useState('Block Party');
  const [chatInput, setChatInput] = useState('');
  const [blockedWords, setBlockedWords] = useState(() => { try { return JSON.parse(localStorage.getItem('sidequest-blocked-words') || '[]'); } catch { return []; } });
  const [blockedWordInput, setBlockedWordInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [messages, setMessages] = useState(() => new URLSearchParams(window.location.search).has('room') ? [] : [{who:'Milo', text:'anyone up for a tiny game? 🌱'}, {who:'You', text:'always'}]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(false);
  const [notice, setNotice] = useState('');
  const [game, setGame] = useState(null);
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeRunning, setSnakeRunning] = useState(false);
  const [snakeReset, setSnakeReset] = useState(0);
  const [blocks, setBlocks] = useState(Array(36).fill(false));
  const [quizAnswer, setQuizAnswer] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState(supabaseReady ? 'Connecting…' : 'Demo mode');
  const roomChannelRef = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);
  useEffect(() => { try { localStorage.setItem('sidequest-blocked-words', JSON.stringify(blockedWords)); } catch {} }, [blockedWords]);
  useEffect(() => {
    if (!activeRoom || !supabase) {
      roomChannelRef.current = null;
      setRealtimeStatus(supabaseReady ? 'Ready for a room' : 'Demo mode');
      return;
    }
    const channel = supabase.channel(`room:${activeRoom.id}`, {
      config: { broadcast: { self: false }, presence: { key: `${name}-${Math.random().toString(36).slice(2, 8)}` } }
    });
    roomChannelRef.current = channel;
    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        if (!payload || typeof payload.text !== 'string' || typeof payload.who !== 'string') return;
        if (containsBlockedWord(payload.text, blockedWords)) return;
        setMessages(old => [...old, { who: payload.who.slice(0, 18), text: payload.text.slice(0, 300) }]);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('Live room');
          await channel.track({ name: name.slice(0, 18), online_at: new Date().toISOString() });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('Connection issue');
        }
      });
    return () => {
      roomChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeRoom?.id, name, blockedWords]);

  useEffect(() => {
    if (!matching) return;
    const timer = setTimeout(() => { setMatching(false); setMatchResult(true); }, 1600);
    return () => clearTimeout(timer);
  }, [matching]);

  const toast = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2600); };
  const createRoom = () => {
    const title = roomName.trim() || `${name}'s room`;
    const newRoom = {id:`room-${Date.now()}`, name:title, desc:'A new little hangout', people:1, game:roomGame, color:'blue', initials:title.slice(0,2).toUpperCase()};
    setRooms([newRoom, ...rooms]);
    setShowCreate(false); setRoomName(''); setActiveRoom(newRoom); setPage('Room');
    window.history.replaceState({}, '', `${window.location.pathname}?room=${encodeURIComponent(newRoom.id)}&name=${encodeURIComponent(newRoom.name)}`);
    toast(supabaseReady ? 'Room created — share the invite link' : 'Demo room created — add Supabase for live chat');
  };
  const enterRoom = (r) => { setActiveRoom(r); setPage('Room'); setMessages([]); window.history.replaceState({}, '', `${window.location.pathname}?room=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.name)}`); };
  const addBlockedWord = (e) => {
    e.preventDefault();
    const word = blockedWordInput.trim().replace(/\s+/g, ' ');
    if (!word) return;
    if (blockedWords.some(existing => existing.toLowerCase() === word.toLowerCase())) { toast('That word or phrase is already blocked'); return; }
    setBlockedWords(old => [...old, word].sort((a,b) => a.localeCompare(b)));
    setBlockedWordInput('');
    toast('Blocked word added on this browser');
  };
  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim().slice(0, 300);
    const blocked = blockedWords.find(word => containsBlockedWord(text, [word]));
    if (blocked) { toast(`Message not sent: it contains a blocked word or phrase.`); return; }
    setMessages(old => [...old, {who:'You', text}]);
    setChatInput('');
    if (supabaseReady && roomChannelRef.current && activeRoom) {
      roomChannelRef.current.send({ type: 'broadcast', event: 'chat-message', payload: { who: name.slice(0, 18), text } });
    } else {
      setTimeout(() => setMessages(old => [...old, {who: activeRoom?.name || 'Demo buddy', text:'Nice 😄 (demo reply)'}]), 700);
    }
  };
  const startGame = (g) => { setGame(g); setPage('Game'); setSnakeScore(0); setSnakeRunning(false); setSnakeReset(n=>n+1); setBlocks(Array(36).fill(false)); setQuizAnswer(''); };
  const startMatch = () => { toast('Random matching is coming later. For now, use invite-only rooms while we build reporting and blocking.'); setPage('Rooms'); };
  const filteredRooms = rooms.filter(r => `${r.name} ${r.desc} ${r.game}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>setPage('Home')}><span className="brand-mark"><Swords size={19}/></span><span>sidequest<span className="brand-dot">.</span></span></button>
      <div className="side-label">YOUR SPACE</div>
      <nav>
        {[['Home',House],['Discover',Compass],['Rooms',Users],['Games',Gamepad2],['Moderation',ShieldCheck]].map(([label,Icon])=>
          <button key={label} className={`nav-item ${page===label?'selected':''}`} onClick={()=>setPage(label)}><Icon size={18}/><span>{label}</span>{label==='Rooms'&&<span className="nav-count">{rooms.length}</span>}</button>
        )}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-note"><div className="note-icon"><ShieldCheck size={17}/></div><div><strong>Keep it kind</strong><p>Meet new people, keep your boundaries.</p></div></div>
      <button className="profile" onClick={()=>setEditingName(!editingName)}><div className="avatar avatar-blue">{name.slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{name}</strong><span>Just hanging out</span></div><MoreHorizontal size={18}/></button>
      {editingName&&<div className="name-edit"><label>Your display name</label><input value={name} maxLength={18} onChange={e=>setName(e.target.value)} /><button className="small-primary" onClick={()=>{setEditingName(false);toast('Display name updated locally')}}>Save</button></div>}
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>Sidequest</span><ChevronRight size={14}/><strong>{page==='Room'?(activeRoom?.name||'Room'):page==='Game'?(game?.title||'Game'):page}</strong></div>
        <div className="top-actions"><span className="online-dot"/><span className="online-label">{supabaseReady ? realtimeStatus : 'Demo mode'}</span><button className="icon-button" aria-label="Help" onClick={()=>toast('This is a local prototype — no strangers are connected yet.')}><CircleHelp size={18}/></button><button className="create-button" onClick={()=>setShowCreate(true)}><Plus size={16}/> Create room</button></div>
      </header>

      {page==='Home'&&<div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> YOUR LITTLE CORNER OF THE INTERNET</div><h1>Hang out.<br/><span>Play a little.</span></h1><p className="hero-copy">Meet someone new, find a tiny game, and see where the conversation goes.</p><div className="hero-actions"><button className="primary-button" onClick={startMatch}><Sparkles size={16}/> Find someone</button><button className="secondary-button" onClick={()=>setPage('Games')}><Gamepad2 size={16}/> Browse games</button></div></div>
          <div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="float-card card-top"><span className="mini-face face-mint">✿</span><div><strong>little moments</strong><small>better together</small></div><span className="sparkle">✦</span></div><div className="big-smile">☺</div><div className="float-card card-bottom"><span className="mini-face face-peach">♫</span><div><strong>voice lounge</strong><small>3 people chilling</small></div><span className="live-pill">LIVE</span></div><span className="art-star star-one">✳</span><span className="art-star star-two">✦</span></div>
        </section>
        <section className="quick-stats"><div><span className="stat-icon mint-bg"><Users size={17}/></span><div><strong>Meet people</strong><span>Random or room-based</span></div></div><div><span className="stat-icon lilac-bg"><Gamepad2 size={17}/></span><div><strong>Play together</strong><span>Small games, no downloads</span></div></div><div><span className="stat-icon peach-bg"><MessageCircle size={17}/></span><div><strong>Keep chatting</strong><span>Stay in the same room</span></div></div></section>
        <section className="section-block"><div className="section-heading"><div><h2>Pick up a game</h2><p>Easy to learn, fun to share.</p></div><button className="text-button" onClick={()=>setPage('Games')}>All games <ArrowUpRight size={15}/></button></div><div className="game-grid">{gameData.map(g=><GameCard key={g.id} g={g} onClick={()=>startGame(g)}/>)}</div></section>
        <section className="section-block"><div className="section-heading"><div><h2>Rooms with space for you</h2><p>Drop into a room and say hey.</p></div><button className="text-button" onClick={()=>setPage('Rooms')}>Browse rooms <ArrowUpRight size={15}/></button></div><div className="room-grid">{rooms.slice(0,2).map(r=><RoomCard key={r.id} room={r} onClick={()=>enterRoom(r)}/>)}</div></section>
      </div>}

      {page==='Discover'&&<div className="page-content narrow-page"><div className="page-title"><div className="eyebrow"><Compass size={14}/> DISCOVER</div><h1>Someone new, <span>maybe?</span></h1><p>Choose a low-pressure way to meet people. You can leave any time.</p></div>
        <div className="match-card"><div className="match-illustration"><div className="match-face face-a">☺</div><div className="match-link">✦</div><div className="match-face face-b">☻</div></div><div className="match-copy"><span className="soft-tag">RANDOM MATCH</span><h2>{matching?'Finding your next hangout…':matchResult?'You found a demo match!':'A fresh conversation'}</h2><p>{matching?'Looking for someone who wants to chill and play.':matchResult?'This is a preview only — no real person has been connected.':'Meet someone for a quick chat, or start with a game to break the ice.'}</p><button className="primary-button" onClick={startMatch} disabled={matching}>{matching?<><span className="spinner"/> Finding…</>:<><Sparkles size={16}/>{matchResult?'Try again':'Find someone'}</>}</button>{matchResult&&<button className="secondary-button match-back" onClick={()=>{setMatchResult(false);setPage('Room');setActiveRoom({name:'Chill lobby',game:'Block Party',people:1,color:'lilac'});}}>Open demo lobby <ChevronRight size={15}/></button>}</div></div>
        <div className="safety-strip"><ShieldCheck size={20}/><div><strong>Your comfort comes first</strong><p>Block, report, mute, and leave controls should be built before real stranger matching goes live.</p></div></div>
      </div>}

      {page==='Rooms'&&<div className="page-content"><div className="page-title title-with-action"><div><div className="eyebrow"><Users size={14}/> THE LOUNGES</div><h1>Find your <span>people.</span></h1><p>Small rooms for small breaks and big laughs.</p></div><button className="primary-button" onClick={()=>setShowCreate(true)}><Plus size={16}/> Create a room</button></div><div className="search-bar"><Search size={17}/><input placeholder="Search rooms or games…" value={search} onChange={e=>setSearch(e.target.value)}/><span>{filteredRooms.length} rooms</span></div><div className="room-list">{filteredRooms.map(r=><RoomCard key={r.id} room={r} onClick={()=>enterRoom(r)}/>)}</div></div>}

      {page==='Games'&&<div className="page-content"><div className="page-title"><div className="eyebrow"><Gamepad2 size={14}/> THE ARCADE</div><h1>One more <span>round?</span></h1><p>Little games for the gaps in your day.</p></div><div className="game-grid games-page-grid">{gameData.map(g=><GameCard key={g.id} g={g} onClick={()=>startGame(g)}/>)}</div><div className="coming-soon"><div className="coming-icon"><Puzzle size={21}/></div><div><strong>More tiny games are on the way</strong><p>Multiplayer Snake, shared puzzles, and friendly scoreboards are on the roadmap.</p></div><span className="soft-tag">COMING SOON</span></div></div>}

      {page==='Moderation'&&<div className="page-content narrow-page moderation-page"><div className="page-title"><div className="eyebrow"><ShieldCheck size={14}/> COMMUNITY SAFETY</div><h1>Word <span>filter.</span></h1><p>Add words or phrases that chat messages should not contain.</p></div><section className="moderation-card"><div className="moderation-card-heading"><div className="moderation-icon"><Ban size={19}/></div><div><h2>Blocked words & phrases</h2><p>Matches are case-insensitive and checked as whole words or phrases.</p></div><span className="blocked-count">{blockedWords.length}</span></div><form className="blocked-word-form" onSubmit={addBlockedWord}><input aria-label="Word or phrase to block" value={blockedWordInput} onChange={e=>setBlockedWordInput(e.target.value)} placeholder="Add a word or phrase…" maxLength={60}/><button className="primary-button" type="submit"><PlusCircle size={15}/> Add</button></form>{blockedWords.length===0?<div className="blocked-empty"><ShieldCheck size={20}/><strong>Your blocklist is empty</strong><p>Add a word above to prevent it being sent in chat.</p></div>:<div className="blocked-word-list">{blockedWords.map(word=><div className="blocked-word-row" key={word.toLowerCase()}><span>{word}</span><button className="icon-button" aria-label={`Remove ${word}`} title="Remove word" onClick={()=>setBlockedWords(old=>old.filter(item=>item.toLowerCase()!==word.toLowerCase()))}><Trash2 size={15}/></button></div>)}</div>}<div className="moderation-warning"><ShieldCheck size={16}/><p><strong>Prototype limitation:</strong> this list is saved only in this browser. It filters your outgoing messages and hides matching incoming chat in this browser, but it does not yet enforce rules for everyone on the server. Before public launch, we should move this list to an admin-only database and validate messages server-side.</p></div></section></div>}

      {page==='Room'&&<div className="page-content room-page"><div className="room-header"><button className="back-link" onClick={()=>setPage('Rooms')}>← All rooms</button><div className="room-heading-row"><div><div className="eyebrow"><span className="online-dot"/> HANGOUT ROOM</div><h1>{activeRoom?.name||'Your room'}</h1><p>Come as you are. Stay for a round.</p></div><div className="room-header-actions"><button className={`round-control ${micOn?'control-active':''}`} onClick={()=>{setMicOn(!micOn);toast(micOn?'Mic off in demo':'Mic control toggled — no call connected')}}>{micOn?<Mic size={17}/>:<MicOff size={17}/>}</button><button className={`round-control ${videoOn?'control-active':''}`} onClick={()=>{setVideoOn(!videoOn);toast(videoOn?'Camera off in demo':'Camera control toggled — no call connected')}}>{videoOn?<Video size={17}/>:<VideoOff size={17}/>}</button><button className="leave-button" onClick={()=>{setActiveRoom(null);setPage('Rooms');}}><X size={15}/> Leave</button></div></div>
          <div className="room-layout"><div className="room-main"><div className="call-stage"><div className="call-empty-art"><div className="call-bubble bubble-one">✿</div><div className="call-person">☺</div><div className="call-bubble bubble-two">♫</div></div><h3>Your hangout starts here</h3><p>Voice and video controls are a visual prototype for now.</p><div className="call-stage-actions"><button className="secondary-button" onClick={()=>toast('Voice will be powered by a real-time calling service in the next stage.')}><Mic size={16}/> Start voice</button><button className="secondary-button" onClick={()=>toast('Video will be connected after room and moderation setup.')}><Video size={16}/> Start video</button></div></div>
            <div className="room-games"><div className="section-heading"><div><h2>Play something</h2><p>Pick a game for the room.</p></div><span className="soft-tag">CHILL MODE</span></div><div className="mini-game-list">{gameData.slice(0,2).map(g=><button key={g.id} className="mini-game-row" onClick={()=>startGame(g)}><div className={`mini-game-icon ${g.color}`}>{g.icon}</div><div><strong>{g.title}</strong><span>{g.subtitle}</span></div><Play size={16}/></button>)}</div></div>
          </div><aside className="chat-panel"><div className="chat-head"><div><strong>Room chat</strong><span><span className="online-dot"/> {supabaseReady ? realtimeStatus : 'Demo conversation'}</span></div><button className="icon-button" onClick={async()=>{const url=`${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(activeRoom?.id||'')}&name=${encodeURIComponent(activeRoom?.name||'Shared hangout')}`;try{await navigator.clipboard.writeText(url);toast('Invite link copied');}catch{window.prompt('Copy this invite link',url);}}} title="Copy invite link"><Copy size={16}/></button></div><div className="chat-messages">{messages.map((m,i)=><div key={i} className={`message ${m.who==='You'?'mine':''}`}><div className="message-avatar">{m.who.slice(0,1).toUpperCase()}</div><div><div className="message-meta"><strong>{m.who}</strong><span>{i===messages.length-1?'now':`${i+1}m`}</span></div><p>{m.text}</p></div></div>)}<div ref={chatEnd}/></div><form className="chat-compose" onSubmit={sendMessage}><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Say something nice…" maxLength={300}/><button aria-label="Send message" type="submit"><Send size={16}/></button></form><div className="chat-foot"><ShieldCheck size={13}/> Invite-only room. Don’t share personal details.</div></aside></div>
        </div>}

      {page==='Game'&&<div className="page-content game-page"><button className="back-link" onClick={()=>setPage(activeRoom?'Room':'Games')}>← Back to {activeRoom?'room':'arcade'}</button><div className="game-play-heading"><div><div className="eyebrow"><Gamepad2 size={14}/> MINI GAME</div><h1>{game?.title||'Mini game'}</h1><p>{game?.description}</p></div><span className="soft-tag">SOLO DEMO</span></div>
        {game?.id==='snake'&&<SnakeGame key={snakeReset} score={snakeScore} setScore={setSnakeScore} running={snakeRunning} setRunning={setSnakeRunning}/>}
        {game?.id==='blocks'&&<div className="play-card puzzle-play"><div className="puzzle-top"><div><span className="soft-tag">BLOCK PARTY</span><h2>Make a little space.</h2><p>Tap tiles to fill them. Complete a row to clear it.</p></div><button className="icon-button" onClick={()=>setBlocks(Array(36).fill(false))}><RotateCcw size={17}/></button></div><div className="block-grid">{blocks.map((b,i)=><button aria-label={`Tile ${i+1}`} key={i} className={`block-cell ${b?'filled':''}`} onClick={()=>setBlocks(old=>{const next=[...old];next[i]=!next[i];for(let r=0;r<6;r++){if(next.slice(r*6,r*6+6).every(Boolean))next.fill(false,r*6,r*6+6)}return next})}/>)}</div><div className="puzzle-hint"><Sparkles size={15}/> Try to complete a whole row.</div></div>}
        {game?.id==='trivia'&&<div className="play-card quiz-play"><span className="soft-tag">QUICK QUIZ · 1 QUESTION</span><h2>Which animal can sleep standing up?</h2><div className="quiz-options">{['Horse','Otter','Penguin','Fox'].map(a=><button key={a} className={`quiz-option ${quizAnswer===a?'chosen':''}`} onClick={()=>setQuizAnswer(a)}>{a}{quizAnswer===a&&<Check size={16}/>}</button>)}</div>{quizAnswer&&<div className={`quiz-feedback ${quizAnswer==='Horse'?'correct':''}`}>{quizAnswer==='Horse'?'Yep! Horses can rest while standing.':'Not quite — it’s a horse! Have another go next round.'}</div>}</div>}
      </div>}

      <footer className="footer"><span>sidequest<span className="brand-dot">.</span> <span className="footer-muted">A little place to play.</span></span><span>Prototype v0.1 · Built for good vibes</span></footer>
    </main>

    {showCreate&&<div className="modal-backdrop" onClick={()=>setShowCreate(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowCreate(false)}><X size={18}/></button><div className="modal-icon"><Plus size={22}/></div><div className="eyebrow">MAKE A LITTLE SPACE</div><h2>Create a room</h2><p>Give your hangout a name and pick the first game.</p><label>Room name</label><input className="modal-input" value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="e.g. late night lounge" maxLength={32}/><label>Starting game</label><select className="modal-input" value={roomGame} onChange={e=>setRoomGame(e.target.value)}><option>Block Party</option><option>Snake</option><option>Quick Quiz</option></select><div className="modal-actions"><button className="secondary-button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary-button" onClick={createRoom}><Plus size={15}/> Create room</button></div><div className="modal-note"><ShieldCheck size={14}/> Demo rooms are only stored in this browser session.</div></div></div>}
    {matching&&<div className="match-overlay"><div className="match-modal"><div className="matching-orbit"><div>☺</div><span>✦</span></div><h2>Finding your people…</h2><p>Looking for a chill conversation.</p><div className="match-progress"><span/></div><button className="secondary-button" onClick={()=>setMatching(false)}>Cancel</button></div></div>}
    {notice&&<div className="toast"><Sparkles size={15}/>{notice}</div>}
  </div>;
}

function GameCard({g,onClick}) {
  return <button className={`game-card ${g.color}`} onClick={onClick}><div className="game-card-top"><span className="game-tag">{g.tag}</span><span className="game-arrow"><ArrowUpRight size={17}/></span></div><div className={`game-art game-art-${g.id}`}>{g.id==='snake'?<div className="snake-art"><i/><i/><i/><i/><b/></div>:g.id==='blocks'?<div className="blocks-art">{Array.from({length:9},(_,i)=><i key={i} className={ [0,1,3,4,5,7].includes(i)?'on':''}/>)}</div>:<div className="trivia-art"><span>?</span><i>✦</i><b>✳</b></div>}</div><div className="game-card-copy"><h3>{g.title}</h3><p>{g.subtitle}</p><span className="play-link">Play now <ChevronRight size={15}/></span></div></button>;
}
function RoomCard({room,onClick}) {
  return <button className="room-card" onClick={onClick}><div className={`room-art ${room.color}`}><div className="room-art-avatar">{room.initials}</div><span className="room-art-spark">✦</span><span className="room-people"><Users size={13}/>{room.people} here</span></div><div className="room-card-copy"><div><h3>{room.name}</h3><p>{room.desc}</p></div><span className="room-game-pill">{room.game}</span></div><div className="room-card-bottom"><span><span className="online-dot"/> Open room</span><span className="join-text">Join <ChevronRight size={14}/></span></div></button>;
}

function SnakeGame({score,setScore,running,setRunning}) {
  const [snake,setSnake] = useState([{x:5,y:5},{x:4,y:5},{x:3,y:5}]);
  const [food,setFood] = useState({x:8,y:6});
  const [dir,setDir] = useState({x:1,y:0});
  const [over,setOver] = useState(false);
  const [tick,setTick] = useState(0);
  const reset = () => {setSnake([{x:5,y:5},{x:4,y:5},{x:3,y:5}]);setFood({x:8,y:6});setDir({x:1,y:0});setScore(0);setOver(false);setRunning(true);setTick(n=>n+1);};
  useEffect(()=>{const key=e=>{const map={ArrowUp:{x:0,y:-1},w:{x:0,y:-1},ArrowDown:{x:0,y:1},s:{x:0,y:1},ArrowLeft:{x:-1,y:0},a:{x:-1,y:0},ArrowRight:{x:1,y:0},d:{x:1,y:0}};const d=map[e.key];if(d&&!(d.x===-dir.x&&d.y===-dir.y)){e.preventDefault();setDir(d)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[dir]);
  useEffect(()=>{if(!running||over)return;const t=setInterval(()=>{setSnake(old=>{const head={x:old[0].x+dir.x,y:old[0].y+dir.y};if(head.x<0||head.x>=12||head.y<0||head.y>=12||old.some(p=>p.x===head.x&&p.y===head.y)){setOver(true);setRunning(false);return old;}const ate=head.x===food.x&&head.y===food.y;const next=[head,...old.slice(0,ate?old.length:old.length-1)];if(ate){setScore(s=>s+1);setFood({x:Math.floor(Math.random()*12),y:Math.floor(Math.random()*12)});}return next})},190);return()=>clearInterval(t)},[running,over,dir,food,setScore,setRunning]);
  return <div className="play-card snake-play"><div className="snake-toolbar"><div><span className="soft-tag">SNAKE</span><h2>Collect the dots.</h2><p>Use arrow keys or WASD.</p></div><div className="score-box"><span>SCORE</span><strong>{score}</strong></div></div><div className="snake-board">{Array.from({length:144},(_,i)=>{const x=i%12,y=Math.floor(i/12),isSnake=snake.some(p=>p.x===x&&p.y===y),isHead=snake[0]?.x===x&&snake[0]?.y===y,isFood=food.x===x&&food.y===y;return <div key={i} className={`snake-cell ${isSnake?'snake-part':''} ${isHead?'snake-head':''} ${isFood?'snake-food':''}`}>{isFood?'•':''}</div>})}{over&&<div className="snake-over"><div><h3>Nice little run.</h3><p>You scored {score}.</p><button className="primary-button" onClick={reset}><RotateCcw size={15}/> Play again</button></div></div>}</div><div className="snake-controls">{!running&&!over?<button className="primary-button" onClick={()=>setRunning(true)}><Play size={15}/> Start game</button>:running?<button className="secondary-button" onClick={()=>setRunning(false)}><Pause size={15}/> Pause</button>:<button className="primary-button" onClick={reset}><RotateCcw size={15}/> Play again</button>}<button className="secondary-button" onClick={reset}><RotateCcw size={15}/> Reset</button></div></div>;
}

function containsBlockedWord(text, words) {
  return words.some(word => {
    const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return false;
    try { return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu').test(text); }
    catch { return text.toLowerCase().includes(word.toLowerCase()); }
  });
}

createRoot(document.getElementById('root')).render(<App/>);
