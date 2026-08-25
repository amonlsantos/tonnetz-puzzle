import { TonnetzCoordinate } from './tonnetz-coordinate.model';

/**
 * Informação musical de uma nota
 * Independente de sua representação visual
 */
export interface MusicalNote {
  pitchClass: number; // 0-11
  name: string; // C, C#, D, etc.
  labelPt: string; // Dó, Dó#, Ré, etc.
}

/**
 * Nó do Tonnetz com coordenadas espaciais (matriz isométrica)
 *
 * IMPORTANTE: O ID primário é a COORDENADA ESPACIAL (node_r2_c4),
 * não a nota musical. Isso permite que múltiplos nós compartilhem
 * a mesma pitchClass na tela sem conflito de estado.
 */
export interface TonnetzNode {
  id: string; // Identificador espacial: "node_r{row}_c{col}"
  row: number; // Linha na matriz isométrica (eixo -60°, terças menores)
  col: number; // Coluna na matriz isométrica (eixo 0°, quintas justas)
  pitchClass: number; // Classe de altura (0-11) — atributo, não chave
  name: string; // Nome da nota (ex: 'C', 'F#')
  labelPt: string; // Label em português
  coordinate: TonnetzCoordinate; // Posição axial no espaço harmônico
  isRoot: boolean; // Se é instância da nota raiz
}

/**
 * Nó com informação visual calculada
 * Usado para renderização
 */
export interface NoteNode extends TonnetzNode {
  x: number; // Coordenada visual X (SVG)
  y: number; // Coordenada visual Y (SVG)
  octave: number; // Oitava base para reprodução MIDI
}

/**
 * Tipos de aresta mapeados aos três eixos vetoriais fixos:
 *
 *   perfectFifth  → Eixo Horizontal (0°):    C → G → D → A ...
 *   majorThird    → Diagonal Subindo (+60°): C → E → G# ...
 *   minorThird    → Diagonal Descendo (-60°): C → Eb → F# ...
 */
export type EdgeType = 'perfectFifth' | 'majorThird' | 'minorThird';

/**
 * Ângulo vetorial fixo de cada tipo de aresta (graus)
 */
export const EDGE_ANGLES: Record<EdgeType, number> = {
  perfectFifth: 0,
  majorThird: -60, // SVG: y cresce para baixo, então subir = negativo
  minorThird: 60,
};

/**
 * Cor da legenda por tipo de aresta
 */
export const EDGE_COLORS: Record<EdgeType, string> = {
  perfectFifth: '#06b6d4',
  majorThird: '#f59e0b',
  minorThird: '#10b981',
};

/**
 * Aresta direcional do Tonnetz
 * Conecta dois nós espacialmente adjacentes via um eixo vetorial
 */
export interface TonnetzEdge {
  from: string;
  to: string;
  type: EdgeType;
  interval: number; // Intervalo em semitons
}

export interface NoteEdge extends TonnetzEdge {}

/**
 * Grafo do Tonnetz (malha isométrica completa)
 */
export interface TonnetzGraph {
  nodes: TonnetzNode[];
  edges: TonnetzEdge[];
  rows: number; // Dimensões da grade
  cols: number;
}

/**
 * Grafo renderizável com coordenadas visuais
 */
export interface RenderableGraph extends TonnetzGraph {
  nodes: NoteNode[];
  edges: NoteEdge[];
}
