
import React, { useState, useEffect } from 'react';
import { UserRole, Stage, ChatMessage } from './types';
import { RoleSelection } from './components/RoleSelection';
import { FestivalMap } from './components/FestivalMap';
import { generateFestivalData, chatAboutFestival } from './services/geminiService';

// Theme configuration for different roles
const ROLE_THEMES = {
  [UserRole.PUNTER]: {
    accent: '#ccff00', // Neon Lime
    secondary: '#7000ff', // Electric Purple
    bg: '#0a0a0f',
    border: 'rgba(204, 255, 0, 0.3)',
    glow: 'rgba(204, 255, 0, 0.15)',
    label: 'PUNTER VIEW'
  },
  [UserRole.PROMOTER]: {
    accent: '#22d3ee', // Cyan
    secondary: '#0ea5e9', // Sky Blue
    bg: '#0f172a', // Dark Slate
    border: 'rgba(34, 211, 238, 0.3)',
    glow: 'rgba(34, 211, 238, 0.15)',
    label: 'PROMOTER OPS'
  },
  [UserRole.NONE]: {
    accent: '#ffffff',
    secondary: '#ffffff',
    bg: '#000000',
    border: 'transparent',
    glow: 'transparent',
    label: ''
  }
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hey! I am your festival guide. Ask me about the lineup or where to go next!' }
  ]);
  
  // Social & Wallet State
  const [balance, setBalance] = useState(245.50);
  const [monitoringCount, setMonitoringCount] = useState(role === UserRole.PROMOTER ? 52 : 3);
  const [friendCode, setFriendCode] = useState('');

  const currentTheme = ROLE_THEMES[role] || ROLE_THEMES[UserRole.NONE];

  // Initial Data Load
  useEffect(() => {
    if (role !== UserRole.NONE) {
      setLoading(true);
      generateFestivalData().then(data => {
        setStages(data);
        setLoading(false);
        // Promoter monitors way more people
        if (role === UserRole.PROMOTER) setMonitoringCount(52);
      });
    }
  }, [role]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: 'user' as const, text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');

    const response = await chatAboutFestival(chatInput, stages);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
  };

  const handleAddFriend = () => {
    if (!friendCode.trim()) return;
    const code = friendCode.toUpperCase().replace('#', '');
    alert(role === UserRole.PROMOTER ? `Staff ID ${code} added to tracking grid.` : `Request sent to friend ${code}`);
    setFriendCode('');
  };

  if (role === UserRole.NONE) {
    return <RoleSelection onSelect={setRole} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors duration-500"
         style={{ backgroundColor: currentTheme.bg, color: '#fff' }}>
      
      {/* Top Navigation */}
      <nav 
        className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-black/20 backdrop-blur-xl z-30 transition-colors duration-500 shadow-lg"
        style={{ borderColor: currentTheme.border }}
      >
        <div className="flex items-center gap-4">
            <h1 
              className="text-2xl font-black italic tracking-tighter transition-colors duration-300"
              style={{ color: currentTheme.accent }}
            >
              TENTSCAPE
            </h1>
            <span 
              className="hidden sm:inline-block bg-white/5 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest text-gray-400 border border-white/10"
            >
                {currentTheme.label}
            </span>
        </div>

        {/* Center: Privacy & Connection (Moved from Map Overlay) */}
        <div className="flex items-center bg-black/40 rounded-full border border-white/10 px-4 py-1.5 mx-2 shadow-inner">
            {/* Privacy Status */}
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: role === UserRole.PROMOTER ? '#ef4444' : currentTheme.accent }}></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: role === UserRole.PROMOTER ? '#ef4444' : currentTheme.accent }}></span>
                </span>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                        {role === UserRole.PROMOTER ? 'LIVE OPS' : 'FRIENDS'}
                    </span>
                    <span className="text-[9px] text-gray-500">
                        {monitoringCount} {role === UserRole.PROMOTER ? 'UNITS ACTIVE' : 'ONLINE'}
                    </span>
                </div>
            </div>
            
            {/* Add Friend/Staff Input */}
            <div className="flex items-center gap-2 pl-4">
                <input 
                    type="text" 
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value)}
                    placeholder={role === UserRole.PROMOTER ? "STAFF ID" : "FRIEND #"}
                    className="w-20 sm:w-28 bg-transparent border-none text-xs font-mono text-white placeholder-gray-600 focus:outline-none uppercase"
                />
                <button 
                    onClick={handleAddFriend}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ color: currentTheme.accent }}
                >
                    <span className="text-lg font-bold leading-none pb-1">+</span>
                </button>
            </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
             {/* Wallet Balance - HIDDEN FOR PROMOTER */}
             {role !== UserRole.PROMOTER && (
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Balance</span>
                    <span className="font-mono text-lg font-bold leading-none transition-colors" style={{ color: currentTheme.accent }}>
                      ${balance.toFixed(2)}
                    </span>
                </div>
             )}

             <div className="hidden md:flex gap-2">
                <button className="px-3 py-1.5 text-xs font-bold hover:bg-white/5 rounded transition-colors text-gray-300 hover:text-white">
                    {role === UserRole.PROMOTER ? 'ROSTER' : 'LINEUP'}
                </button>
                <button className="px-3 py-1.5 text-xs font-bold hover:bg-white/5 rounded transition-colors text-gray-300 hover:text-white">
                    {role === UserRole.PROMOTER ? 'INCIDENTS' : 'MAP'}
                </button>
             </div>
             
             {/* Profile Avatar */}
             <div 
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 relative overflow-hidden group"
                style={{ 
                  borderColor: currentTheme.border,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  boxShadow: `0 0 20px ${currentTheme.glow}`
                }}
             >
                 <span style={{ color: currentTheme.accent }}>{role[0]}</span>
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </div>
        </div>
      </nav>

      <main className="flex-1 relative flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 relative p-0 flex flex-col min-h-0">
            {/* Controls overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="bg-black/80 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accent }}></span>
                   LIVE GRID
                </div>
                <button 
                    onClick={() => { setLoading(true); generateFestivalData().then(d => { setStages(d); setLoading(false); }) }}
                    className="bg-black/80 backdrop-blur text-[10px] font-bold border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
                >
                    REFRESH
                </button>
            </div>

            <div className="relative flex-1 w-full h-full min-h-0 bg-[#e4f0e6]">
                {loading ? (
                    <div className="flex-1 h-full flex items-center justify-center bg-[#0a0a0f]">
                        <div className="flex flex-col items-center">
                            <div 
                              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
                              style={{ borderColor: `${currentTheme.accent} transparent transparent transparent` }}
                            ></div>
                            <p className="font-mono text-xs tracking-widest animate-pulse" style={{ color: currentTheme.accent }}>
                              CALIBRATING SENSORS...
                            </p>
                        </div>
                    </div>
                ) : (
                    <FestivalMap stages={stages} role={role} />
                )}
            </div>
        </div>

        {/* Floating Chat / Sidebar */}
        <div className={`fixed right-0 top-16 bottom-0 w-full md:w-80 bg-[#0a0a0f]/95 backdrop-blur-md border-l transform transition-transform duration-300 z-40 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
             style={{ borderColor: currentTheme.border }}
        >
            <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-white/5 flex justify-between items-center" style={{ borderColor: currentTheme.border }}>
                    <h3 className="font-bold font-mono text-sm" style={{ color: currentTheme.accent }}>AI OPS ASSISTANT</h3>
                    <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div 
                              className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                                m.role === 'user' ? 'text-black rounded-br-none font-medium' : 'bg-white/10 text-gray-300 rounded-bl-none'
                              }`}
                              style={m.role === 'user' ? { backgroundColor: currentTheme.accent } : {}}
                            >
                                {m.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-black/40" style={{ borderColor: currentTheme.border }}>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors text-white"
                            style={{ caretColor: currentTheme.accent }}
                            placeholder={role === UserRole.PROMOTER ? "Query staff location..." : "Ask about lineup..."}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                            onClick={handleSendMessage}
                            className="px-3 rounded-lg font-bold hover:opacity-90 transition flex items-center justify-center"
                            style={{ backgroundColor: currentTheme.accent, color: '#000' }}
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Chat Toggle Button */}
        {!isChatOpen && (
            <button 
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 font-bold text-xs tracking-widest text-black"
                style={{ backgroundColor: currentTheme.accent, boxShadow: `0 0 20px ${currentTheme.glow}` }}
            >
                AI
            </button>
        )}
      </main>
    </div>
  );
};

export default App;