# inquirer-grouped-checkbox Implementation Plan

A searchable, grouped checkbox prompt for Inquirer.js with per-group and global selection controls.

## Target API

```typescript
import groupedCheckbox from 'inquirer-grouped-checkbox'

const selected = await groupedCheckbox({
    message: 'Select branches to remove',
    groups: [
        {
            key: 'merged',
            label: 'Merged Branches',
            icon: '✅',
            choices: [
                { value: 'feature/old-feature', name: 'feature/old-feature' },
                { value: 'fix/bug-123', name: 'fix/bug-123' },
            ],
        },
        {
            key: 'unmerged',
            label: 'Unmerged Branches',
            icon: '⚠️',
            choices: [
                { value: 'feature/wip', name: 'feature/wip' },
                { value: 'experiment/test', name: 'experiment/test' },
            ],
        },
    ],
    searchable: true,
    pageSize: 20,
})

// Returns: { merged: ['feature/old-feature'], unmerged: ['feature/wip'] }
// Or flat array if preferred: ['feature/old-feature', 'feature/wip']
```

## Features

1. **Grouped display** - Choices organized under labeled headers
2. **Per-group controls** - Select all/none/invert within a single group
3. **Global controls** - Select all/none/invert across all groups
4. **Global search** - Filter choices across all groups simultaneously
5. **Keyboard navigation** - Move between items and groups

## Keyboard Bindings

| Key           | Action                          |
| ------------- | ------------------------------- |
| `↑` / `↓`     | Move cursor up/down             |
| `Space`       | Toggle current item             |
| `Enter`       | Submit selection                |
| `a`           | Toggle all (global)             |
| `i`           | Invert all (global)             |
| `A` (Shift+A) | Toggle all in current group     |
| `I` (Shift+I) | Invert all in current group     |
| `Tab`         | Jump to next group header       |
| `Shift+Tab`   | Jump to previous group header   |
| Alphanumeric  | Search/filter (when searchable) |
| `Backspace`   | Edit search query               |
| `Escape`      | Clear search query              |

## Project Setup

### 1. Initialize the package

```bash
mkdir inquirer-grouped-checkbox
cd inquirer-grouped-checkbox
pnpm init
```

### 2. Package.json configuration

```json
{
    "name": "inquirer-grouped-checkbox",
    "version": "0.1.0",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": {
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            },
            "require": {
                "types": "./dist/index.d.cts",
                "default": "./dist/index.cjs"
            }
        }
    },
    "files": ["dist"],
    "scripts": {
        "build": "tsup",
        "dev": "tsup --watch",
        "test": "vitest",
        "test:once": "vitest run",
        "typecheck": "tsc --noEmit",
        "prepublishOnly": "pnpm build"
    },
    "peerDependencies": {
        "@inquirer/core": ">=10.0.0"
    },
    "dependencies": {
        "@inquirer/core": "^10.0.0",
        "@inquirer/figures": "^1.0.0",
        "yoctocolors-cjs": "^2.0.0"
    },
    "devDependencies": {
        "@inquirer/type": "^3.0.0",
        "@types/node": "^22.0.0",
        "tsup": "^8.0.0",
        "typescript": "^5.0.0",
        "vitest": "^2.0.0"
    }
}
```

### 3. tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
})
```

## Implementation Tasks

### Phase 1: Core Types and Structure

#### Task 1.1: Define types (`src/types.ts`)

```typescript
import type { Separator } from '@inquirer/core'

export interface Choice<Value> {
    value: Value
    name?: string
    description?: string
    short?: string
    disabled?: boolean | string
    checked?: boolean
}

export interface Group<Value> {
    key: string
    label: string
    icon?: string
    choices: ReadonlyArray<Choice<Value> | Separator>
}

export interface GroupedCheckboxConfig<Value> {
    message: string
    groups: ReadonlyArray<Group<Value>>
    searchable?: boolean
    pageSize?: number
    required?: boolean
    validate?: (selections: GroupedSelections<Value>) => boolean | string | Promise<boolean | string>
    theme?: PartialTheme
}

export interface GroupedSelections<Value> {
    [groupKey: string]: Value[]
}

// Internal normalized types
export interface NormalizedChoice<Value> {
    value: Value
    name: string
    description?: string
    short: string
    disabled: boolean | string
    checked: boolean
    groupKey: string
    groupIndex: number
    indexInGroup: number
}

export interface NormalizedGroup<Value> {
    key: string
    label: string
    icon?: string
    startIndex: number // Index in flat list where this group starts
    endIndex: number // Index in flat list where this group ends
    choices: NormalizedChoice<Value>[]
}
```

#### Task 1.2: Define theme (`src/theme.ts`)

```typescript
import type { Theme } from '@inquirer/core'
import figures from '@inquirer/figures'

export interface GroupedCheckboxTheme {
    icon: {
        checked: string
        unchecked: string
        cursor: string
        groupExpanded: string
        groupCollapsed: string
    }
    style: {
        disabledChoice: (text: string) => string
        groupHeader: (text: string, icon?: string) => string
        searchQuery: (text: string) => string
        highlight: (text: string) => string
        description: (text: string) => string
    }
    helpMode: 'always' | 'never' | 'auto'
}

export const defaultTheme: GroupedCheckboxTheme = {
    icon: {
        checked: figures.circleFilled,
        unchecked: figures.circle,
        cursor: figures.pointer,
        groupExpanded: '▼',
        groupCollapsed: '▶',
    },
    style: {
        disabledChoice: (text) => dim(text),
        groupHeader: (text, icon) => bold(icon ? `${icon} ${text}` : text),
        searchQuery: (text) => cyan(text),
        highlight: (text) => cyan(text),
        description: (text) => dim(text),
    },
    helpMode: 'auto',
}
```

### Phase 2: Core Logic

#### Task 2.1: Normalization utilities (`src/utils.ts`)

```typescript
/**
 * Convert user-provided groups/choices into normalized internal format
 * - Assigns each choice a groupKey, groupIndex, indexInGroup
 * - Computes startIndex/endIndex for each group
 * - Handles Separator instances
 */
export function normalizeGroups<Value>(groups: ReadonlyArray<Group<Value>>): {
    normalizedGroups: NormalizedGroup<Value>[]
    flatChoices: Array<NormalizedChoice<Value> | Separator>
}

/**
 * Filter choices by search query (case-insensitive substring match)
 * Returns filtered flat list and updated group boundaries
 */
export function filterBySearch<Value>(
    flatChoices: Array<NormalizedChoice<Value> | Separator>,
    groups: NormalizedGroup<Value>[],
    query: string
): {
    filteredChoices: Array<NormalizedChoice<Value> | Separator>
    filteredGroups: NormalizedGroup<Value>[]
}

/**
 * Find which group the cursor is currently in
 */
export function getCurrentGroup<Value>(
    cursorIndex: number,
    groups: NormalizedGroup<Value>[]
): NormalizedGroup<Value> | null

/**
 * Get all selectable choices in a group (excluding disabled and separators)
 */
export function getSelectableInGroup<Value>(group: NormalizedGroup<Value>): NormalizedChoice<Value>[]

/**
 * Toggle all selectable items in a group
 */
export function toggleGroup<Value>(
    choices: NormalizedChoice<Value>[],
    group: NormalizedGroup<Value>,
    checked: boolean
): NormalizedChoice<Value>[]

/**
 * Invert selection in a group
 */
export function invertGroup<Value>(
    choices: NormalizedChoice<Value>[],
    group: NormalizedGroup<Value>
): NormalizedChoice<Value>[]
```

#### Task 2.2: Main prompt implementation (`src/index.ts`)

```typescript
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  useRef,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isEnterKey,
  isBackspaceKey,
  makeTheme,
  Separator,
} from '@inquirer/core'

export default createPrompt<GroupedSelections<Value>, GroupedCheckboxConfig<Value>>(
  (config, done) => {
    // === STATE ===
    const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
    const [cursorIndex, setCursorIndex] = useState(0)
    const [choices, setChoices] = useState(() => /* normalized choices */)
    const [searchQuery, setSearchQuery] = useState('')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const theme = makeTheme(defaultTheme, config.theme)
    const prefix = usePrefix({ status, theme })

    // === DERIVED STATE ===
    const { filteredChoices, filteredGroups } = useMemo(
      () => filterBySearch(choices, groups, searchQuery),
      [choices, searchQuery]
    )

    const currentGroup = useMemo(
      () => getCurrentGroup(cursorIndex, filteredGroups),
      [cursorIndex, filteredGroups]
    )

    // === KEYPRESS HANDLER ===
    useKeypress((key, readline) => {
      if (isEnterKey(key)) {
        // Validate and submit
        const selections = buildSelections(choices, groups)
        if (config.validate) {
          const result = config.validate(selections)
          if (result !== true) {
            setErrorMessage(typeof result === 'string' ? result : 'Invalid selection')
            return
          }
        }
        setStatus('done')
        done(selections)
        return
      }

      if (isUpKey(key)) {
        setCursorIndex(prev => Math.max(0, prev - 1))
        return
      }

      if (isDownKey(key)) {
        setCursorIndex(prev => Math.min(filteredChoices.length - 1, prev + 1))
        return
      }

      if (isSpaceKey(key)) {
        // Toggle current item
        toggleItem(cursorIndex)
        return
      }

      // Global toggle all: 'a'
      if (key.name === 'a' && !key.shift) {
        toggleAllGlobal()
        return
      }

      // Global invert: 'i'
      if (key.name === 'i' && !key.shift) {
        invertAllGlobal()
        return
      }

      // Per-group toggle: 'A' (Shift+A)
      if (key.name === 'a' && key.shift && currentGroup) {
        toggleAllInGroup(currentGroup)
        return
      }

      // Per-group invert: 'I' (Shift+I)
      if (key.name === 'i' && key.shift && currentGroup) {
        invertAllInGroup(currentGroup)
        return
      }

      // Tab: jump to next group
      if (key.name === 'tab' && !key.shift) {
        jumpToNextGroup()
        return
      }

      // Shift+Tab: jump to previous group
      if (key.name === 'tab' && key.shift) {
        jumpToPreviousGroup()
        return
      }

      // Search input (when searchable)
      if (config.searchable) {
        if (isBackspaceKey(key)) {
          setSearchQuery(prev => prev.slice(0, -1))
          return
        }

        if (key.name === 'escape') {
          setSearchQuery('')
          return
        }

        // Alphanumeric input
        if (key.sequence && /^[a-zA-Z0-9\-_./]$/.test(key.sequence)) {
          setSearchQuery(prev => prev + key.sequence)
          return
        }
      }
    })

    // === RENDERING ===
    const page = usePagination({
      items: filteredChoices,
      active: cursorIndex,
      pageSize: config.pageSize ?? 15,
      renderItem: ({ item, index, isActive }) => {
        if (item instanceof Separator) {
          return ` ${item.separator}`
        }

        // Check if this is the first item in a group (render header)
        const isGroupStart = filteredGroups.some(g => g.startIndex === index)
        let header = ''
        if (isGroupStart) {
          const group = filteredGroups.find(g => g.startIndex === index)!
          header = `\n${theme.style.groupHeader(group.label, group.icon)}\n`
        }

        const checkbox = item.checked
          ? theme.icon.checked
          : theme.icon.unchecked
        const cursor = isActive ? theme.icon.cursor : ' '
        const name = item.disabled
          ? theme.style.disabledChoice(item.name)
          : item.name

        return `${header}${cursor} ${checkbox} ${name}`
      },
    })

    // Build final output
    let output = `${prefix} ${config.message}`

    if (config.searchable && searchQuery) {
      output += ` ${theme.style.searchQuery(`[${searchQuery}]`)}`
    }

    output += '\n' + page

    // Help text
    if (theme.helpMode === 'always' || (theme.helpMode === 'auto' && status === 'idle')) {
      output += `\n${dim('(Space to select, Enter to submit, a/i toggle all, A/I toggle group)')}`
    }

    if (errorMessage) {
      output += `\n${red(errorMessage)}`
    }

    return output
  }
)
```

### Phase 3: Group Header Rendering

#### Task 3.1: Enhanced group headers with inline stats

Show selection count for each group:

```
✅ Merged Branches (3/5 selected) [A to select all]
   ◉ feature/old-feature
   ◯ feature/another
   ◉ fix/bug-123
   ...

⚠️ Unmerged Branches (0/2 selected) [A to select all]
   ◯ feature/wip
   ◯ experiment/test
```

#### Task 3.2: Collapsible groups (optional enhancement)

Allow groups to be collapsed/expanded with a keybinding.

### Phase 4: Search Integration

#### Task 4.1: Search state management

-   Track `searchQuery` state
-   Filter choices in real-time
-   Preserve selection state when filtering (selected items not matching search remain selected but hidden)
-   Show "No matches" message when search yields no results

#### Task 4.2: Search UI

```
? Select branches to remove [fea]

✅ Merged Branches (1/2 visible)
   ◯ feature/old-feature

⚠️ Unmerged Branches (1/1 visible)
 ❯ ◯ feature/wip
```

### Phase 5: Testing

#### Task 5.1: Unit tests for utilities

-   `normalizeGroups()` - various input formats
-   `filterBySearch()` - search matching, empty results
-   `getCurrentGroup()` - cursor position to group mapping
-   `toggleGroup()` / `invertGroup()` - selection logic

#### Task 5.2: Integration tests

Use `@inquirer/testing` to simulate user interactions:

```typescript
import { render } from '@inquirer/testing'
import groupedCheckbox from '../src'

test('selects items across groups', async () => {
    const { answer, events, getScreen } = await render(groupedCheckbox, {
        message: 'Select items',
        groups: [
            { key: 'a', label: 'Group A', choices: [{ value: '1' }, { value: '2' }] },
            { key: 'b', label: 'Group B', choices: [{ value: '3' }] },
        ],
    })

    events.keypress('space') // Select first item
    events.keypress('down')
    events.keypress('down')
    events.keypress('down')
    events.keypress('space') // Select item in second group
    events.keypress('enter')

    await expect(answer).resolves.toEqual({
        a: ['1'],
        b: ['3'],
    })
})
```

### Phase 6: Documentation

#### Task 6.1: README.md

-   Installation
-   Basic usage
-   API reference
-   Keyboard shortcuts
-   Theming
-   Examples

#### Task 6.2: TypeScript declarations

Ensure all exports have proper JSDoc comments.

## File Structure

```
inquirer-grouped-checkbox/
├── src/
│   ├── index.ts          # Main prompt export
│   ├── types.ts          # TypeScript interfaces
│   ├── theme.ts          # Default theme and theme types
│   └── utils.ts          # Helper functions
├── tests/
│   ├── utils.test.ts     # Unit tests
│   └── prompt.test.ts    # Integration tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Implementation Order

1. [ ] Project setup (package.json, tsconfig, tsup)
2. [ ] Types definition
3. [ ] Theme definition
4. [ ] Normalization utilities
5. [ ] Basic prompt without search (groups + navigation + selection)
6. [ ] Per-group controls (A/I)
7. [ ] Global controls (a/i)
8. [ ] Search/filter functionality
9. [ ] Group header stats
10. [ ] Unit tests
11. [ ] Integration tests
12. [ ] README documentation
13. [ ] Publish to npm

## Open Questions

1. **Return format**: Should the result be `{ groupKey: values[] }` or a flat array? Consider supporting both via config option.

2. **Empty groups**: Hide groups with no visible items when searching, or show them with "(no matches)" message?

3. **Pre-selection**: Support `default` config to pre-select items? How to specify (by value, by group+index)?

4. **Required per group**: Should there be a way to require at least one selection per group?

## References

-   [@inquirer/checkbox source](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/checkbox/src/index.ts)
-   [@inquirer/core documentation](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/core/README.md)
-   [inquirer-checkbox-plus-plus](https://github.com/behnamazimi/inquirer-checkbox-plus-plus)
