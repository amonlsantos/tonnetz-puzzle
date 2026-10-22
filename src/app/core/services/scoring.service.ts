import { Injectable } from '@angular/core';
import { Level, DIFFICULTY_SLACK } from '../models/graph.model';

/**
 * Pontua um desafio vencido em estrelas (1–3) com base na eficiência:
 *
 *   - 3 estrelas: jogou de forma ótima (movimentos + erros == caminho mínimo)
 *   - 2 estrelas: dentro de uma pequena folga dependente da dificuldade
 *   - 1 estrela:  acima da folga (mas ainda dentro do limite de movimentos)
 *
 * Erros de nota no modo instrumento não consomem movimento, mas entram na
 * eficiência: cada erro equivale a um movimento extra na pontuação.
 */
@Injectable({
  providedIn: 'root',
})
export class ScoringService {
  computeStars(level: Level, movesCount: number, errorsCount = 0): 1 | 2 | 3 {
    const distance = level.shortestPathLength;
    const effectiveMoves = movesCount + errorsCount;
    if (effectiveMoves <= distance) {
      return 3;
    }
    if (effectiveMoves <= distance + DIFFICULTY_SLACK[level.difficulty]) {
      return 2;
    }
    return 1;
  }
}
