import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// jsdom applies no stylesheet, so the rules in src/assets/style.css are read
// as text. Read from disk (Vitest runs from the project root): Vitest empties
// a CSS import, ?raw included.
export const STYLE = readFileSync(join(process.cwd(), 'src', 'assets', 'style.css'), 'utf8')

export type Rule = { selector: string; body: string }

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every innermost `selector { declarations }` block. A rule inside an @media
 * block comes out with its own selector; a Tailwind `@utility name { }` comes
 * out as `.name`, the class it makes.
 */
export const rules = (css: string = STYLE): Rule[] =>
  Array.from(stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g), (m) => ({
    selector: m[1]!.trim().replace(/\s+/g, ' ').replace(/^@utility\s+/, '.'),
    body: m[2]!.replace(/\s+/g, ' ').trim(),
  }))

export const selectorsOf = (rule: Rule) => rule.selector.split(',').map((s) => s.trim())

/** The values `property` is given in every rule that names `selector`. */
export const declared = (selector: string, property: string, css: string = STYLE) =>
  rules(css)
    .filter((r) => selectorsOf(r).includes(selector))
    .map((r) => r.body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1]?.trim())
    .filter((v): v is string => !!v)

/** The text inside each `@media (prefers-reduced-motion: reduce) { ... }` block. */
export const reducedMotionBlocks = (css: string = STYLE): string[] => {
  const source = stripComments(css)
  const blocks: string[] = []
  const opener = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g
  for (let m = opener.exec(source); m; m = opener.exec(source)) {
    let depth = 1
    let i = opener.lastIndex
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
    }
    blocks.push(source.slice(opener.lastIndex, i - 1))
  }
  return blocks
}

/** Whether `selector` has `property: none` under prefers-reduced-motion. */
export const offUnderReducedMotion = (selector: string, property: 'animation' | 'transition') =>
  reducedMotionBlocks().some((block) => declared(selector, property, block).includes('none'))

/** The rules outside the reduced-motion blocks that set an animation or a transition. */
export const movingRules = (): Rule[] => {
  let rest = stripComments(STYLE)
  for (const block of reducedMotionBlocks()) rest = rest.replace(block, '')
  return rules(rest).filter((r) => /(?:^|;)\s*(animation|transition)\s*:\s*(?!none)/.test(r.body))
}
