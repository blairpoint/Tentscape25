
export enum UserRole {
  PUNTER = 'PUNTER',
  PROMOTER = 'PROMOTER',
  NONE = 'NONE'
}

export interface Coordinate {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

export interface Stage {
  id: string;
  name: string;
  type: 'MAIN' | 'TENT' | 'OUTDOOR';
  position: Coordinate;
  currentDJ: string;
  nextDJ: string;
  endTime: string; // HH:MM format
  vibe: string;
}

export enum FriendActivity {
  DANCING = 'DANCING',
  WALKING = 'WALKING',
  TOILET = 'TOILET',
  EATING = 'EATING',
  CAMPING = 'CAMPING',
  WORKING = 'WORKING',
  PATROLLING = 'PATROLLING'
}

export interface Friend {
  id: string;
  name: string;
  type: 'FRIEND' | 'STAFF';
  role?: 'SECURITY' | 'MEDIC' | 'TECH' | 'BAR';
  position: Coordinate;
  targetPosition: Coordinate;
  waypoints?: Coordinate[];
  activity: FriendActivity;
  targetId?: string;
  avatarColor: string;
}

export interface FestivalData {
  name: string;
  stages: Stage[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}