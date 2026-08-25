export interface Level {
  id: string;
  name: string;
  description: string;
  startNodeId: string;
  goal: LevelGoal;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LevelGoal {
  type: 'reachNode' | 'collectNodes' | 'playChord';
  targetNodeIds: string[];
  maxMoves?: number;
  requiredChord?: string[];
}

export interface GameState {
  currentLevel: Level | null;
  currentPath: string[];
  movesCount: number;
  isComplete: boolean;
}
