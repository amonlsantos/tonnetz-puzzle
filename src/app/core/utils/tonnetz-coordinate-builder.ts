import {
  TonnetzCoordinate,
  TonnetzIntervals,
  validateIntervals,
} from '../models/tonnetz-coordinate.model';
import {
  TonnetzNode,
  TonnetzEdge,
  TonnetzGraph,
  EdgeType,
} from '../models/note.model';

/**
 * Definição das 12 classes de altura cromáticas
 */
interface NoteDefinition {
  name: string;
  labelPt: string;
  pitchClass: number;
}

const CHROMATIC_NOTES: NoteDefinition[] = [
  { name: 'C', labelPt: 'Dó', pitchClass: 0 },
  { name: 'C#', labelPt: 'Dó#', pitchClass: 1 },
  { name: 'D', labelPt: 'Ré', pitchClass: 2 },
  { name: 'D#', labelPt: 'Ré#', pitchClass: 3 },
  { name: 'E', labelPt: 'Mi', pitchClass: 4 },
  { name: 'F', labelPt: 'Fá', pitchClass: 5 },
  { name: 'F#', labelPt: 'Fá#', pitchClass: 6 },
  { name: 'G', labelPt: 'Sol', pitchClass: 7 },
  { name: 'G#', labelPt: 'Sol#', pitchClass: 8 },
  { name: 'A', labelPt: 'Lá', pitchClass: 9 },
  { name: 'A#', labelPt: 'Lá#', pitchClass: 10 },
  { name: 'B', labelPt: 'Si', pitchClass: 11 },
];

/**
 * Obtém informação de uma nota a partir de sua classe de altura
 */
function getNoteDefinition(pitchClass: number): NoteDefinition {
  const normalized = ((pitchClass % 12) + 12) % 12;
  return CHROMATIC_NOTES[normalized];
}

/**
 * Calcula a classe de altura para uma posição da matriz isométrica.
 *
 * Os três eixos vetoriais são derivados de DOIS intervalos independentes:
 *   - Coluna (eixo horizontal 0°):     interval1 + interval2  (ex: 3+4=7 → quinta justa)
 *   - Linha  (eixo diagonal -60°):     interval1              (ex: 3    → terça menor)
 *   - Diagonal subindo (+60°):         interval2              (ex: 4    → terça maior)
 *
 * @param rootPitchClass - Classe de altura da nota raiz (0-11)
 * @param row - Linha na matriz isométrica
 * @param col - Coluna na matriz isométrica
 * @param intervals - Configuração de intervalos do Tonnetz
 */
export function calculatePitchClass(
  rootPitchClass: number,
  row: number,
  col: number,
  intervals: TonnetzIntervals
): number {
  const { interval1, interval2 } = intervals;

  const horizontalStep = interval1 + interval2; // Quinta justa (classic: 7)
  const downRightStep = interval1; // Terça menor (classic: 3)
  // Diagonal subindo (+60°) = interval2 (classic: 4)
  // Verificação: mover (row-1, col+1) → -downRightStep + horizontalStep = +interval2 ✓

  const pitchClass =
    rootPitchClass + row * downRightStep + col * horizontalStep;

  return ((pitchClass % 12) + 12) % 12;
}

/**
 * Gera ID único baseado na COORDENADA ESPACIAL (não na nota).
 *
 * Permite que múltiplos nós compartilhem a mesma pitchClass
 * sem conflito de estado — cada célula é um nó independente.
 *
 * @example generateNodeId(2, 4) → 'node_r2_c4'
 */
export function generateNodeId(row: number, col: number): string {
  return `node_r${row}_c${col}`;
}

/**
 * Extrai coordenadas espaciais de um ID de nó
 */
export function parseNodeId(
  nodeId: string
): { row: number; col: number } | null {
  const match = nodeId.match(/^node_r(-?\d+)_c(-?\d+)$/);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
}

/**
 * Mapeia tipo de aresta aos três eixos vetoriais fixos
 */
function getEdgeTypeMapping(intervals: TonnetzIntervals): Record<
  EdgeType,
  number
> {
  return {
    minorThird: intervals.interval1, // Eixo -60° (descendo à direita)
    majorThird: intervals.interval2, // Eixo +60° (subindo à direita)
    perfectFifth: intervals.interval1 + intervals.interval2, // Eixo 0° (horizontal)
  };
}

/**
 * Constrói a malha harmônica isométrica (Tonnetz tradicional).
 *
 * Gera uma grade bidimensional (rows × cols) onde as 12 notas da escala
 * cromática se REPETEM periodicamente, criando um plano contínuo.
 *
 * Cada nó é identificado pela COORDENADA ESPACIAL (node_r{r}_c{c}),
 * permitindo múltiplas instâncias da mesma nota na tela.
 *
 * Estrutura vetorial fixa dos eixos:
 * ┌─────────────────────────────────────────────────────┐
 * │  Eixo Horizontal (0°):    Quintas Justas  C-G-D-A   │
 * │  Diagonal Subindo (+60°): Terças Maiores  C-E-G#    │
 * │  Diagonal Descendo (-60°):Terças Menores  C-Eb-F#   │
 * └─────────────────────────────────────────────────────┘
 *
 * @param rows - Número de linhas da grade (ex: 6)
 * @param cols - Número de colunas da grade (ex: 10)
 * @param rootPitchClass - Classe de altura da nota raiz (0-11)
 * @param intervals - Configuração de intervalos do Tonnetz
 * @returns Grafo completo da malha harmônica
 */
export function buildTonnetzGraph(
  rows: number = 6,
  cols: number = 10,
  rootPitchClass: number = 0,
  intervals: TonnetzIntervals = { interval1: 3, interval2: 4, interval3: 5 }
): TonnetzGraph {
  // Validar entrada
  if (!validateIntervals(intervals)) {
    throw new Error(`Invalid intervals configuration: ${JSON.stringify(intervals)}`);
  }

  if (rows < 1 || cols < 1) {
    throw new Error(`Grid dimensions must be >= 1, got ${rows}×${cols}`);
  }

  const normalizedRoot = ((rootPitchClass % 12) + 12) % 12;
  const nodes: TonnetzNode[] = [];
  const edges: TonnetzEdge[] = [];

  const edgeIntervals = getEdgeTypeMapping(intervals);

  // ═══════════════════════════════════════════════════════
  // FASE 1: Gerar nós da grade (matriz isométrica completa)
  // ═══════════════════════════════════════════════════════
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pitchClass = calculatePitchClass(
        normalizedRoot,
        row,
        col,
        intervals
      );
      const noteDef = getNoteDefinition(pitchClass);
      const id = generateNodeId(row, col);

      const coordinate: TonnetzCoordinate = { q: col, r: row };

      const node: TonnetzNode = {
        id,
        row,
        col,
        pitchClass,
        name: noteDef.name,
        labelPt: noteDef.labelPt,
        coordinate,
        isRoot: pitchClass === normalizedRoot,
      };

      nodes.push(node);
    }
  }

  // ═══════════════════════════════════════════════════════
  // FASE 2: Conectar vizinhos nos TRÊS eixos vetoriais fixos
  //
  // Para cada nó, adiciona arestas APENAS nas direções "positivas"
  // (direita, baixo-direita, cima-direita) para evitar duplicação.
  // ═══════════════════════════════════════════════════════
  function addEdge(fromId: string, toId: string, type: EdgeType): void {
    edges.push({
      from: fromId,
      to: toId,
      type,
      interval: edgeIntervals[type],
    });
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const currentId = generateNodeId(row, col);

      // EIXO HORIZONTAL (0°): Quinta Justa → vizinho à direita
      if (col + 1 < cols) {
        addEdge(currentId, generateNodeId(row, col + 1), 'perfectFifth');
      }

      // EIXO DIAGONAL DESCENDO (-60°): Terça Menor → vizinho abaixo-direita
      if (row + 1 < rows) {
        addEdge(currentId, generateNodeId(row + 1, col), 'minorThird');
      }

      // EIXO DIAGONAL SUBINDO (+60°): Terça Maior → vizinho acima-direita
      if (row > 0 && col + 1 < cols) {
        addEdge(currentId, generateNodeId(row - 1, col + 1), 'majorThird');
      }
    }
  }

  return { nodes, edges, rows, cols };
}

/**
 * Obtém o nome legível de um tipo de aresta
 */
export function getEdgeTypeName(edgeType: EdgeType): string {
  switch (edgeType) {
    case 'perfectFifth':
      return 'quinta justa';
    case 'majorThird':
      return 'terça maior';
    case 'minorThird':
      return 'terça menor';
  }
}
