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
import { zebraGenerator } from './zebra.ts'

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
}

export const GENERATED_MODULES = Object.keys(GENERATORS) as ModuleId[]
