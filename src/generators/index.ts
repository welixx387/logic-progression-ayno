import type { ModuleId } from '../types.ts'
import { analogiesGenerator } from './analogies.ts'
import { combinatoricsGenerator } from './combinatorics.ts'
import { knightsGenerator } from './knights.ts'
import { lettersGenerator } from './letters.ts'
import { matricesGenerator } from './matrices.ts'
import { oddGenerator } from './odd.ts'
import { orderGenerator } from './order.ts'
import { sequencesGenerator } from './sequences.ts'
import { syllogismsGenerator } from './syllogisms.ts'
import { symbolsGenerator } from './symbols.ts'
import { timeGenerator } from './time.ts'
import type { ModuleGenerator } from './util.ts'
import { LOGIC_PUZZLE_GENERATORS } from './logic-puzzles.ts'
import { LOGIC_REASONING_GENERATORS } from './logic-reasoning.ts'
import { MEMORY_NUMBER_GENERATORS } from './memory-numbers.ts'
import { MEMORY_SCENE_GENERATORS } from './memory-scenes.ts'
import { MEMORY_WORD_GENERATORS } from './memory-words.ts'
import { gamesGenerator } from './games.ts'
import { planningGenerator } from './planning.ts'
import { decisionsGenerator } from './decisions.ts'
import { opponentGenerator } from './opponent.ts'
import { tablesGenerator } from './tables.ts'
import { percentGenerator } from './percent.ts'
import { probabilityGenerator } from './probability.ts'
import { statsGenerator } from './stats.ts'
import { emotionsGenerator } from './emotions.ts'
import { recognizeGenerator } from './recognize.ts'
import { regulationGenerator } from './regulation.ts'
import { empathyGenerator } from './empathy.ts'
import { zebraGenerator } from './zebra.ts'
import { algebraGenerator } from './algebra.ts'
import { geometryGenerator } from './geometry.ts'
import { physicsGenerator } from './physics.ts'
import { chemistryGenerator } from './chemistry.ts'
import { biologyGenerator } from './biology.ts'
import { informaticsGenerator } from './informatics.ts'
import { russianGenerator } from './russian.ts'
import { literatureGenerator } from './literature.ts'
import { englishGenerator } from './english.ts'
import { historyGenerator } from './history.ts'
import { socialGenerator } from './social.ts'
import { geographyGenerator } from './geography.ts'
import { safetyGenerator } from './safety.ts'

/** Все темы, задания которых создаются программой. «Нестандартные задачи» написаны вручную. */
export const GENERATORS: Partial<Record<ModuleId, ModuleGenerator>> = {
  sequences: sequencesGenerator,
  letters: lettersGenerator,
  odd: oddGenerator,
  analogies: analogiesGenerator,
  syllogisms: syllogismsGenerator,
  order: orderGenerator,
  knights: knightsGenerator,
  symbols: symbolsGenerator,
  matrices: matricesGenerator,
  time: timeGenerator,
  combinatorics: combinatoricsGenerator,
  zebra: zebraGenerator,
  games: gamesGenerator,
  planning: planningGenerator,
  decisions: decisionsGenerator,
  opponent: opponentGenerator,
  tables: tablesGenerator,
  percent: percentGenerator,
  probability: probabilityGenerator,
  stats: statsGenerator,
  emotions: emotionsGenerator,
  recognize: recognizeGenerator,
  regulation: regulationGenerator,
  empathy: empathyGenerator,
  algebra: algebraGenerator,
  geometry: geometryGenerator,
  physics: physicsGenerator,
  chemistry: chemistryGenerator,
  biology: biologyGenerator,
  informatics: informaticsGenerator,
  russian: russianGenerator,
  literature: literatureGenerator,
  english: englishGenerator,
  history: historyGenerator,
  social: socialGenerator,
  geography: geographyGenerator,
  safety: safetyGenerator,
}

/** Темы, генераторы которых собраны списками (по несколько тем в файле). */
export const LISTED_GENERATORS: ModuleGenerator[] = [
  ...LOGIC_REASONING_GENERATORS,
  ...LOGIC_PUZZLE_GENERATORS,
  ...MEMORY_NUMBER_GENERATORS, ...MEMORY_WORD_GENERATORS, ...MEMORY_SCENE_GENERATORS]
for (const g of LISTED_GENERATORS) GENERATORS[g.module] = g

export const GENERATED_MODULES = Object.keys(GENERATORS) as ModuleId[]
