import { Injectable } from '@angular/core';
import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import {
  TonnetzGraph,
  NoteNode,
  NoteEdge,
  RenderableGraph,
} from '../models/note.model';
import { TonnetzIntervals, TONNETZ_PRESETS } from '../models/tonnetz-coordinate.model';
import { buildTonnetzGraph, generateNodeId, parseNodeId } from '../utils/tonnetz-coordinate-builder';
import { calculateLayout, calculateViewBox, LayoutConfig } from '../utils/tonnetz-layout';

/**
 * Dimensões padrão da malha isométrica
 */
export const DEFAULT_GRID_ROWS = 6;
export const DEFAULT_GRID_COLS = 10;

@Injectable({
  providedIn: 'root',
})
export class GraphEngineService {
  private graph: Graph;
  private nodeMap: Map<string, NoteNode> = new Map();
  private currentRootPitchClass: number = 0;
  private currentIntervals: TonnetzIntervals = TONNETZ_PRESETS['classic'];
  private currentRows: number = DEFAULT_GRID_ROWS;
  private currentCols: number = DEFAULT_GRID_COLS;

  constructor() {
    this.graph = new Graph({ type: 'undirected' });
    this.initializeGraph();
  }

  /**
   * Inicializa o grafo com configuração padrão
   */
  private initializeGraph(): void {
    this.rebuildGraph(
      this.currentRootPitchClass,
      this.currentIntervals,
      this.currentRows,
      this.currentCols
    );
  }

  /**
   * Reconstrói a malha harmônica com nova raiz, intervalos e/ou dimensões.
   *
   * Cada nó é identificado pela COORDENADA ESPACIAL (node_r{r}_c{c}),
   * permitindo múltiplas instâncias da mesma pitch class na tela.
   */
  rebuildGraph(
    rootPitchClass: number = 0,
    intervals: TonnetzIntervals = TONNETZ_PRESETS['classic'],
    rows: number = DEFAULT_GRID_ROWS,
    cols: number = DEFAULT_GRID_COLS
  ): void {
    // Limpar grafo anterior
    this.graph.clear();
    this.nodeMap.clear();

    // Salvar configuração atual
    this.currentRootPitchClass = rootPitchClass;
    this.currentIntervals = intervals;
    this.currentRows = Math.max(1, rows);
    this.currentCols = Math.max(1, cols);

    // Construir nova malha isométrica
    const tonnetzData: TonnetzGraph = buildTonnetzGraph(
      this.currentRows,
      this.currentCols,
      rootPitchClass,
      intervals
    );

    // Calcular layout visual (ângulos vetoriais fixos)
    const layoutConfig: LayoutConfig = { nodeSpacing: 100, baseOctave: 4 };
    const renderableGraph: RenderableGraph = calculateLayout(
      tonnetzData,
      layoutConfig
    );

    // Adicionar nós ao Graphology
    renderableGraph.nodes.forEach(node => {
      this.graph.addNode(node.id, {
        name: node.name,
        labelPt: node.labelPt,
        pitchClass: node.pitchClass,
        octave: node.octave,
        row: node.row,
        col: node.col,
        isRoot: node.isRoot,
        coordinate: node.coordinate,
        x: node.x,
        y: node.y,
      });
      this.nodeMap.set(node.id, node);
    });

    // Adicionar arestas ao Graphology (três eixos vetoriais)
    renderableGraph.edges.forEach(edge => {
      if (!this.graph.hasEdge(edge.from, edge.to)) {
        this.graph.addEdge(edge.from, edge.to, {
          type: edge.type,
          interval: edge.interval,
        });
      }
    });
  }

  /**
   * Retorna a configuração atual do Tonnetz
   */
  getCurrentConfig(): {
    rootPitchClass: number;
    intervals: TonnetzIntervals;
    rows: number;
    cols: number;
  } {
    return {
      rootPitchClass: this.currentRootPitchClass,
      intervals: { ...this.currentIntervals },
      rows: this.currentRows,
      cols: this.currentCols,
    };
  }

  /**
   * Altera a nota raiz do Tonnetz (mantém dimensões da grade)
   */
  setRootNote(pitchClass: number): void {
    this.rebuildGraph(pitchClass, this.currentIntervals, this.currentRows, this.currentCols);
  }

  /**
   * Altera os intervalos do Tonnetz (mantém raiz e dimensões)
   */
  setIntervals(intervals: TonnetzIntervals): void {
    this.rebuildGraph(this.currentRootPitchClass, intervals, this.currentRows, this.currentCols);
  }

  /**
   * Altera as dimensões da grade (mantém raiz e intervalos)
   */
  setGridSize(rows: number, cols: number): void {
    this.rebuildGraph(this.currentRootPitchClass, this.currentIntervals, rows, cols);
  }

  /**
   * Calcula o caminho mais curto entre dois nós espaciais
   */
  getShortestPath(startNodeId: string, targetNodeId: string): string[] {
    if (!this.graph.hasNode(startNodeId) || !this.graph.hasNode(targetNodeId)) {
      return [];
    }

    try {
      const path = bidirectional(this.graph, startNodeId, targetNodeId);
      return path || [];
    } catch (error) {
      console.error('Error finding shortest path:', error);
      return [];
    }
  }

  /**
   * Retorna os vizinhos de um nó (até 6 na malha hexagonal)
   */
  getNeighbors(nodeId: string): string[] {
    if (!this.graph.hasNode(nodeId)) {
      return [];
    }
    return this.graph.neighbors(nodeId);
  }

  /**
   * Verifica se dois nós são vizinhos diretos (adjacência local).
   *
   * Usado pela navegação do jogo: o clique interage com a POSIÇÃO LOCAL,
   * então só é possível avançar para nós fisicamente adjacentes no tabuleiro.
   */
  areNeighbors(nodeA: string, nodeB: string): boolean {
    if (!this.graph.hasNode(nodeA) || !this.graph.hasNode(nodeB)) {
      return false;
    }
    return this.graph.hasEdge(nodeA, nodeB);
  }

  /**
   * Retorna um nó específico pelo ID espacial
   */
  getNode(nodeId: string): NoteNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Busca nós por pitch class (múltiplas instâncias possíveis)
   */
  getNodesByPitchClass(pitchClass: number): NoteNode[] {
    return Array.from(this.nodeMap.values()).filter(
      n => n.pitchClass === ((pitchClass % 12) + 12) % 12
    );
  }

  /**
   * Gera o ID espacial para uma coordenada da grade
   */
  nodeIdAt(row: number, col: number): string | null {
    if (row < 0 || row >= this.currentRows || col < 0 || col >= this.currentCols) {
      return null;
    }
    const id = generateNodeId(row, col);
    return this.nodeMap.has(id) ? id : null;
  }

  /**
   * Faz parse de um ID espacial em coordenadas
   */
  parseNodeId(nodeId: string): { row: number; col: number } | null {
    return parseNodeId(nodeId);
  }

  /**
   * Retorna todos os nós da malha
   */
  getAllNodes(): NoteNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Retorna todas as arestas
   */
  getAllEdges(): NoteEdge[] {
    const edges: NoteEdge[] = [];

    this.graph.forEachEdge((edge, attributes, source, target) => {
      edges.push({
        from: source,
        to: target,
        type: attributes['type'],
        interval: attributes['interval'],
      });
    });

    return edges;
  }

  /**
   * Retorna o tipo de uma aresta
   */
  getEdgeType(fromNodeId: string, toNodeId: string): string | null {
    if (!this.graph.hasEdge(fromNodeId, toNodeId)) {
      return null;
    }
    const edgeAttributes = this.graph.getEdgeAttributes(fromNodeId, toNodeId);
    return edgeAttributes['type'] || null;
  }

  /**
   * Retorna o intervalo de uma aresta em semitons
   */
  getEdgeInterval(fromNodeId: string, toNodeId: string): number | null {
    if (!this.graph.hasEdge(fromNodeId, toNodeId)) {
      return null;
    }
    const edgeAttributes = this.graph.getEdgeAttributes(fromNodeId, toNodeId);
    return edgeAttributes['interval'] || null;
  }

  /**
   * Verifica se existe aresta entre dois nós
   */
  hasEdge(fromNodeId: string, toNodeId: string): boolean {
    return this.graph.hasEdge(fromNodeId, toNodeId);
  }

  /**
   * Retorna a instância do grafo Graphology
   */
  getGraphInstance(): Graph {
    return this.graph;
  }

  /**
   * Calcula o viewBox que preenche TODO o container com a malha
   */
  getViewBox(padding: number = 50): string {
    const nodes = this.getAllNodes();
    return calculateViewBox(nodes, padding);
  }

  /**
   * Retorna as dimensões atuais da grade
   */
  getGridDimensions(): { rows: number; cols: number } {
    return { rows: this.currentRows, cols: this.currentCols };
  }

  /**
   * Retorna as instâncias da nota raiz (múltiplas na malha)
   */
  getRootNodes(): NoteNode[] {
    return this.getAllNodes().filter(node => node.isRoot);
  }
}
