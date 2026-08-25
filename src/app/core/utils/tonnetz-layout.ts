import {
  TonnetzNode,
  NoteNode,
  TonnetzGraph,
  RenderableGraph,
} from '../models/note.model';

/**
 * Configuração do layout visual do Tonnetz isométrico
 */
export interface LayoutConfig {
  nodeSpacing: number; // Distância horizontal entre colunas (eixo 0°)
  baseOctave: number; // Oitava base para reprodução MIDI
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeSpacing: 100,
  baseOctave: 4,
};

/**
 * Converte coordenadas da matriz isométrica para o espaço SVG.
 *
 * Os três eixos vetoriais mantêm SEMPRE os mesmos ângulos:
 * ┌───────────────────────────────────────────────────────────┐
 * │  Eixo Horizontal (0°):     x += D          y += 0         │
 * │  Diagonal Descendo (-60°): x += D·cos(60°) y += D·sin(60°)│
 * │  Diagonal Subindo (+60°):  x -= D·cos(60°) y -= D·sin(60°)│
 * └───────────────────────────────────────────────────────────┘
 *
 * Isso cria uma malha triangular perfeita onde TODAS as arestas
 * do mesmo tipo têm exatamente o mesmo ângulo visual.
 *
 * @param coordinate - Coordenadas espaciais {q: col, r: row}
 * @param spacing - Espaçamento entre nós no eixo horizontal
 */
export function gridToCartesian(
  row: number,
  col: number,
  spacing: number
): { x: number; y: number } {
  const COS_60 = Math.cos(Math.PI / 3); // 0.5
  const SIN_60 = Math.sin(Math.PI / 3); // √3/2 ≈ 0.866

  const x = spacing * (col + row * COS_60);
  const y = spacing * row * SIN_60;

  return { x, y };
}

/**
 * Alias para compatibilidade com código existente
 */
function tonnetzToCartesian(
  coordinate: { q: number; r: number },
  spacing: number
): { x: number; y: number } {
  return gridToCartesian(coordinate.r, coordinate.q, spacing);
}

/**
 * Calcula o bounding box de um conjunto de pontos
 */
function calculateBoundingBox(points: { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calcula o deslocamento necessário para centralizar um conjunto de pontos na origem
 */
function calculateCenteringOffset(points: { x: number; y: number }[]): {
  offsetX: number;
  offsetY: number;
} {
  if (points.length === 0) {
    return { offsetX: 0, offsetY: 0 };
  }
  const bbox = calculateBoundingBox(points);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;

  return { offsetX: -centerX, offsetY: -centerY };
}

/**
 * Calcula o espaçamento ideal para preencher um container SVG.
 *
 * Ajusta `spacing` para que a malha ocupe o máximo do viewport,
 * dando sensação de tabuleiro/mapa navegável borda a borda.
 *
 * @param rows - Número de linhas da grade
 * @param cols - Número de colunas da grade
 * @param targetWidth - Largura alvo em pixels SVG
 * @param targetHeight - Altura alvo em pixels SVG
 */
export function calculateFillingSpacing(
  rows: number,
  cols: number,
  targetWidth: number,
  targetHeight: number
): number {
  if (rows < 1 || cols < 1) return DEFAULT_LAYOUT_CONFIG.nodeSpacing;

  const COS_60 = 0.5;
  const SIN_60 = Math.sqrt(3) / 2;

  // Largura total = (cols - 1) + (rows - 1) * cos(60°)
  const gridWidthUnits = cols - 1 + (rows - 1) * COS_60;
  // Altura total = (rows - 1) * sin(60°)
  const gridHeightUnits = (rows - 1) * SIN_60;

  const spacingX = gridWidthUnits > 0 ? targetWidth / gridWidthUnits : Infinity;
  const spacingY =
    gridHeightUnits > 0 ? targetHeight / gridHeightUnits : Infinity;

  // Usar o menor espaçamento para garantir que caiba nos dois eixos
  const result = Math.min(spacingX, spacingY);
  return isFinite(result) && result > 0
    ? result
    : DEFAULT_LAYOUT_CONFIG.nodeSpacing;
}

/**
 * Converte um TonnetzGraph em um RenderableGraph
 *
 * Aplica o layout isométrico com ângulos vetoriais FIXOS (60°),
 * centraliza a malha e adiciona coordenadas visuais.
 *
 * @param graph - Grafo da malha harmônica
 * @param config - Configuração do layout (espaçamento, oitava)
 * @returns Grafo renderizável com coordenadas visuais
 */
export function calculateLayout(
  graph: TonnetzGraph,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): RenderableGraph {
  const { nodeSpacing, baseOctave } = config;

  // Converter coordenadas para cartesianas (ângulos fixos)
  const cartesianPoints = graph.nodes.map((node) =>
    tonnetzToCartesian(node.coordinate, nodeSpacing)
  );

  // Centralizar a malha na origem
  const { offsetX, offsetY } = calculateCenteringOffset(cartesianPoints);

  // Criar nós renderizáveis
  const nodes: NoteNode[] = graph.nodes.map((node, index) => ({
    ...node,
    x: cartesianPoints[index].x + offsetX,
    y: cartesianPoints[index].y + offsetY,
    octave: baseOctave,
  }));

  // Copiar arestas (não precisam de transformação)
  const edges = [...graph.edges];

  return {
    nodes,
    edges,
    rows: graph.rows,
    cols: graph.cols,
  };
}

/**
 * Calcula o viewBox SVG para preencher TODO o container.
 *
 * Retorna um viewBox que cobre a malha inteira com padding mínimo,
 * criando o efeito de tabuleiro expansivo borda a borda.
 *
 * @param nodes - Nós com coordenadas visuais
 * @param padding - Espaçamento adicional ao redor
 */
export function calculateViewBox(nodes: NoteNode[], padding: number = 50): string {
  if (nodes.length === 0) {
    return '0 0 100 100';
  }

  const bbox = calculateBoundingBox(nodes);

  const minX = bbox.minX - padding;
  const minY = bbox.minY - padding;
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  return `${minX} ${minY} ${width} ${height}`;
}

/**
 * Calcula escala apropriada para um viewport específico
 */
export function calculateScale(
  viewBox: string,
  viewportWidth: number,
  viewportHeight: number
): number {
  const [, , width, height] = viewBox.split(' ').map(Number);

  const scaleX = viewportWidth / width;
  const scaleY = viewportHeight / height;

  return Math.min(scaleX, scaleY);
}
