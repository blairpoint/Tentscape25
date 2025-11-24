
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Stage, Friend, Coordinate, FriendActivity, UserRole } from '../types';

interface FestivalMapProps {
  stages: Stage[];
  role: UserRole;
}

const POIS = {
  TOILET_N: { x: 30, y: 25, label: 'WC' },
  TOILET_S: { x: 70, y: 80, label: 'WC' },
  FOOD_COURT: { x: 85, y: 40, label: 'FOOD' },
  CAMPING: { x: 15, y: 15, label: 'CAMP' },
  ENTRANCE: { x: 50, y: 95, label: 'GATE' },
  MEDIC: { x: 45, y: 45, label: 'MEDIC' }
};

// Map Constants for visuals
const COLORS = {
    WATER: '#a3ccff',
    WATER_STROKE: '#8fbce6',
    LAND: '#e4f0e6', // Google Terrain Light Green
    CONTOUR: '#cfdecb', // Subtle darker green/grey
    FOREST: '#c5e0c7', // Distinct vegetation patches
    ROAD_MAIN: '#ffffff',
    ROAD_STROKE: '#dcdcdc',
    BRIDGE: '#d1d5db',
    TEXT: '#5f6368',
    TEXT_HALO: 'rgba(255,255,255,0.7)'
};

// Deterministic River Function (Horizontal-ish)
const getRiverY = (x: number) => 55 + 10 * Math.sin(x * 0.05) + 5 * Math.cos(x * 0.1);
const BRIDGE_LOC = { x: 50, y: getRiverY(50) };

export const FestivalMap: React.FC<FestivalMapProps> = ({ stages, role }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Generate Map Features (Terrain, Roads, etc)
  const { riverPath, contours, forests, roadPath, roadPolys } = useMemo(() => {
    const rng = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
    
    // 1. River Path
    const riverPoints: [number, number][] = [];
    for(let x=-5; x<=105; x+=2) {
        riverPoints.push([x, getRiverY(x)]);
    }
    const riverPath = "M " + riverPoints.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");

    // 2. Contour Lines (Elevation) - Javascript line drawings
    const contours: string[] = [];
    for (let level = 0; level < 5; level++) {
        let d = "";
        // Create wavy lines
        for (let x = -10; x <= 110; x+=5) {
            // Noise function approximation
            const yBase = 10 + level * 15;
            const noise = 15 * Math.sin(x * 0.03 + level) + 10 * Math.cos(x * 0.07 + level * 2);
            const y = yBase + noise;
            d += (x === -10 ? "M" : "L") + ` ${x} ${y}`;
        }
        contours.push(d);
    }
    // Add some hill tops
    const hill1 = "M 10 10 Q 25 0 40 10 T 70 10"; // Simple curves
    contours.push(hill1);

    // 3. Forests (Organic blobs)
    const forests: string[] = [];
    const createForest = (cx: number, cy: number, r: number, seed: number) => {
        let d = "";
        const steps = 8;
        for(let i=0; i<=steps; i++) {
            const angle = (i/steps)*Math.PI*2;
            const rad = r * (0.8 + 0.4 * rng(seed+i));
            const x = cx + Math.cos(angle)*rad;
            const y = cy + Math.sin(angle)*rad;
            d += (i===0?"M":"L") + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        return d + " Z";
    };
    
    forests.push(createForest(15, 15, 12, 1)); // Near camp
    forests.push(createForest(85, 20, 10, 2)); // NE
    forests.push(createForest(10, 80, 8, 3)); // SW

    // 4. Roads - Defined as Polylines to calculate exclusion zones
    // Main Artery: Entrance -> Bridge -> Fork -> Camp/Stages
    const roadNodes = [
        POIS.ENTRANCE,
        BRIDGE_LOC,
        { x: 50, y: 40 }, // Fork North of river
        POIS.CAMPING, // Left fork
        { x: 80, y: 30 } // Right fork
    ];

    const roadSegments = [
        [POIS.ENTRANCE, BRIDGE_LOC],
        [BRIDGE_LOC, {x:50, y:40}],
        [{x:50, y:40}, POIS.CAMPING],
        [{x:50, y:40}, {x:80, y:30}] // Towards food/stages
    ];

    // Connect POIs to main road network visually (simple thin lines)
    const roadPathStr = roadSegments.map(seg => 
        `M ${seg[0].x} ${seg[0].y} L ${seg[1].x} ${seg[1].y}`
    ).join(" ");

    return { riverPath, contours, forests, roadPath: roadPathStr, roadPolys: roadSegments };
  }, []);

  // Pathfinding Logic: Get from A to B avoiding River
  const getWaypoints = (start: Coordinate, end: Coordinate): Coordinate[] => {
      const riverYStart = getRiverY(start.x);
      const riverYEnd = getRiverY(end.x);
      const startIsNorth = start.y < riverYStart;
      const endIsNorth = end.y < riverYEnd;

      const path: Coordinate[] = [];
      
      // 1. If crossing river, must go to bridge
      if (startIsNorth !== endIsNorth) {
          // Add random jitter to bridge approach so they don't form a perfect line
          path.push({ x: BRIDGE_LOC.x + (Math.random()-0.5)*4, y: BRIDGE_LOC.y });
      }

      // 2. Add destination
      path.push(end);
      return path;
  };

  // Check if position is valid (not on road, not in river)
  // We actually implement this by pulling them towards destination and pushing away from obstacles in the animation loop
  // But for "spawn", we just pick POIs.

  // Initialize Users based on Role
  useEffect(() => {
    if (stages.length === 0) return;

    const allLocations = [
        ...stages.map(s => ({ ...s.position, id: s.id, type: 'STAGE' })),
        { ...POIS.FOOD_COURT, id: 'food', type: 'POI' },
        { ...POIS.CAMPING, id: 'camp', type: 'POI' },
        { ...POIS.TOILET_N, id: 'wc_n', type: 'POI' },
        { ...POIS.TOILET_S, id: 'wc_s', type: 'POI' }
    ];

    const newFriends: Friend[] = [];

    if (role === UserRole.PROMOTER) {
        // Generate 50 Staff Members
        const jobs = [
            { role: 'SECURITY', color: '#f87171', prefix: 'SEC' }, // Red
            { role: 'MEDIC', color: '#fbbf24', prefix: 'MED' },   // Amber
            { role: 'TECH', color: '#60a5fa', prefix: 'TCH' },    // Blue
            { role: 'BAR', color: '#a78bfa', prefix: 'BAR' },     // Purple
        ] as const;

        for (let i = 0; i < 50; i++) {
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            const startLoc = allLocations[Math.floor(Math.random() * allLocations.length)];
            const endLoc = allLocations[Math.floor(Math.random() * allLocations.length)];
            
            newFriends.push({
                id: `staff-${i}`,
                name: `${job.prefix}-${100+i}`,
                type: 'STAFF',
                role: job.role,
                avatarColor: job.color,
                position: { ...startLoc, x: startLoc.x + (Math.random()-0.5)*5, y: startLoc.y + (Math.random()-0.5)*5 },
                targetPosition: endLoc,
                waypoints: getWaypoints(startLoc, endLoc),
                activity: FriendActivity.WORKING
            });
        }
    } else {
        // Punter Mode: Show friends
        const names = ['Sarah', 'Mike', 'Jess', 'Dave'];
        names.forEach((name, i) => {
            const startLoc = allLocations[i % allLocations.length];
            const endLoc = stages[0].position;
            newFriends.push({
                id: `friend-${i}`,
                name: name,
                type: 'FRIEND',
                avatarColor: '#ccff00', // Lime
                position: { ...startLoc },
                targetPosition: endLoc,
                waypoints: getWaypoints(startLoc, endLoc),
                activity: FriendActivity.WALKING
            });
        });
    }

    setFriends(newFriends);
  }, [stages, role]);

  // Animation Loop
  const animate = useCallback(() => {
    timeRef.current += 1;

    setFriends(prev => prev.map(p => {
        // 1. Handle State Changes (Randomly pick new targets)
        if (p.activity !== FriendActivity.WALKING && Math.random() < 0.005) {
             const allTargets = [
                ...stages.map(s => s.position), 
                POIS.FOOD_COURT, POIS.CAMPING, POIS.TOILET_N, POIS.TOILET_S
             ];
             const nextTarget = allTargets[Math.floor(Math.random() * allTargets.length)];
             
             // Fuzz the target slightly so they don't stack
             const fuzzedTarget = {
                 x: nextTarget.x + (Math.random()-0.5)*6,
                 y: nextTarget.y + (Math.random()-0.5)*6
             };

             return {
                 ...p,
                 activity: FriendActivity.WALKING,
                 targetPosition: fuzzedTarget,
                 waypoints: getWaypoints(p.position, fuzzedTarget)
             };
        }

        // 2. Movement Logic
        let { x, y } = p.position;
        let newWaypoints = p.waypoints || [];
        
        if (p.activity === FriendActivity.WALKING) {
            const target = newWaypoints.length > 0 ? newWaypoints[0] : p.targetPosition;
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Speed varies by role slightly - SLOWED DOWN for realism
            const speed = p.type === 'STAFF' ? 0.03 : 0.02;

            if (dist < 1) {
                // Reached waypoint
                if (newWaypoints.length > 1) {
                    newWaypoints = newWaypoints.slice(1);
                    return { ...p, position: target, waypoints: newWaypoints };
                } else {
                    // Arrived
                    return { 
                        ...p, 
                        position: target, 
                        activity: p.type === 'STAFF' ? FriendActivity.WORKING : FriendActivity.DANCING,
                        waypoints: [] 
                    };
                }
            }
            
            // Move vector
            const mx = (dx/dist) * speed;
            const my = (dy/dist) * speed;
            
            x += mx;
            y += my;
        }

        // 3. Collision Avoidance (Road Repulsion)
        // Simple logic: if very close to a road line, push away slightly orthogonal
        const rY = getRiverY(x);
        // If not on bridge
        if (Math.abs(x - BRIDGE_LOC.x) > 4) {
             if (Math.abs(y - rY) < 2) {
                 // Too close to river, push away
                 y += (y < rY ? -0.1 : 0.1);
             }
        }

        return { ...p, position: { x, y }, waypoints: newWaypoints };
    }));

    requestRef.current = requestAnimationFrame(animate);
  }, [stages]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing">
      
      {/* MAP SVG LAYER */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
        
        <defs>
            <filter id="shadow">
                <feDropShadow dx="0.2" dy="0.2" stdDeviation="0.2" floodOpacity="0.3"/>
            </filter>
        </defs>

        {/* 1. Background (Land) */}
        <rect width="100" height="100" fill={COLORS.LAND} />

        {/* 2. Topography (Contours) */}
        {contours.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={COLORS.CONTOUR} strokeWidth="0.2" />
        ))}

        {/* 3. Forests */}
        {forests.map((d, i) => (
            <path key={`forest-${i}`} d={d} fill={COLORS.FOREST} stroke="none" />
        ))}

        {/* 4. River */}
        <path d={riverPath} fill="none" stroke={COLORS.WATER_STROKE} strokeWidth="2.5" />
        <path d={riverPath} fill="none" stroke={COLORS.WATER} strokeWidth="1.5" />

        {/* 5. Roads (Underlay) */}
        <path d={roadPath} fill="none" stroke={COLORS.ROAD_STROKE} strokeWidth="1.8" strokeLinecap="round" />
        <path d={roadPath} fill="none" stroke={COLORS.ROAD_MAIN} strokeWidth="1.2" strokeLinecap="round" />

        {/* 6. Bridge */}
        <g transform={`translate(${BRIDGE_LOC.x}, ${BRIDGE_LOC.y})`}>
            <rect x="-2" y="-2" width="4" height="4" fill={COLORS.BRIDGE} transform="rotate(0)" />
            <rect x="-2" y="-2.2" width="4" height="0.4" fill="#9ca3af" />
            <rect x="-2" y="1.8" width="4" height="0.4" fill="#9ca3af" />
        </g>

        {/* 7. POI Labels & Icons */}
        {Object.entries(POIS).map(([key, poi]) => (
            <g key={key} transform={`translate(${poi.x}, ${poi.y})`}>
                <circle r="1.5" fill="#fff" stroke="#9ca3af" strokeWidth="0.2" />
                <text y="3" fontSize="1.5" textAnchor="middle" fill={COLORS.TEXT} fontFamily="sans-serif" fontWeight="600" style={{ textShadow: `0 0 2px ${COLORS.TEXT_HALO}` }}>
                    {poi.label}
                </text>
            </g>
        ))}

        {/* 8. Friends / Staff Entities */}
        {friends.map(p => (
            <g key={p.id} transform={`translate(${p.position.x}, ${p.position.y})`}>
                {/* Shadow */}
                <ellipse cx="0" cy="0.5" rx="0.8" ry="0.3" fill="#000" opacity="0.2" />
                
                {/* Body */}
                <circle r={p.type === 'STAFF' ? 0.8 : 1} fill={p.avatarColor} stroke="#fff" strokeWidth="0.2" />
                
                {/* Staff Label (Only if Promoter) */}
                {role === UserRole.PROMOTER && (
                    <text y="-1.5" fontSize="1" textAnchor="middle" fill="#374151" fontWeight="bold">
                        {p.name}
                    </text>
                )}
            </g>
        ))}

        {/* 9. Scale Bar (Bottom Right) */}
        <g transform="translate(85, 95)">
            <path d="M 0 0 L 0 -1 L 10 -1 L 10 0" fill="none" stroke="#5f6368" strokeWidth="0.5" />
            <text x="5" y="-3" textAnchor="middle" fontSize="1