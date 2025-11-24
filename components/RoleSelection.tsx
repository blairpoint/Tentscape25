
import React from 'react';
import { UserRole } from '../types';

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const roles = [
    {
      id: UserRole.PUNTER,
      title: 'Punter',
      desc: 'Buy tickets, find your friends, and hit the dancefloor.',
      icon: '🤘',
      color: 'text-festival-accent border-festival-accent/50'
    },
    {
      id: UserRole.PROMOTER,
      title: 'Promoter',
      desc: 'Oversee the entire event map, security, and crowd flow.',
      icon: '🎫',
      color: 'text-cyan-400 border-cyan-400/50'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-black text-center mb-4 tracking-tighter text-white">
          TentScape
        </h1>
        <p className="text-center text-gray-400 mb-12 text-lg">
          Select your identity to access the grid.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className={`group relative bg-[#13131f] border border-white/10 p-10 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300 ${role.id === UserRole.PUNTER ? 'grayscale-0' : 'grayscale-0'}`}>
                {role.icon}
              </div>
              
              <h3 className={`text-2xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${role.id === UserRole.PUNTER ? 'from-lime-400 to-lime-200' : 'from-cyan-400 to-cyan-200'}`}>
                {role.title}
              </h3>
              
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs z-10">
                {role.desc}
              </p>
              
              <div className={`absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none transition-colors duration-300 ${role.id === UserRole.PUNTER ? 'group-hover:border-lime-400/30' : 'group-hover:border-cyan-400/30'}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};