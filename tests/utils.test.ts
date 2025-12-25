import { describe, expect, it } from 'vitest'
import type { Group, NormalizedChoice, NormalizedGroup } from '../src/types.js'
import { Separator } from '../src/types.js'
import {
    buildSelections,
    filterBySearch,
    findFirstSelectableIndex,
    findNextSelectableIndex,
    getCurrentGroup,
    getGroupStats,
    invertAll,
    invertGroup,
    isSelectableItem,
    normalizeGroups,
    toggleAll,
    toggleGroup,
} from '../src/utils.js'

describe('normalizeGroups', () => {
    it('should normalize groups and create flat choices', () => {
        const groups: Group<string>[] = [
            {
                key: 'group1',
                label: 'Group 1',
                choices: [
                    { value: 'a', name: 'Choice A' },
                    { value: 'b', name: 'Choice B', checked: true },
                ],
            },
            {
                key: 'group2',
                label: 'Group 2',
                icon: '🚀',
                choices: [{ value: 'c' }],
            },
        ]

        const { normalizedGroups, flatChoices } = normalizeGroups(groups)

        expect(normalizedGroups).toHaveLength(2)
        expect(flatChoices).toHaveLength(3)

        // Check first group
        expect(normalizedGroups[0]).toMatchObject({
            key: 'group1',
            label: 'Group 1',
            startIndex: 0,
            endIndex: 1,
        })

        // Check second group
        expect(normalizedGroups[1]).toMatchObject({
            key: 'group2',
            label: 'Group 2',
            icon: '🚀',
            startIndex: 2,
            endIndex: 2,
        })

        // Check normalized choices
        expect(flatChoices[0]).toMatchObject({
            value: 'a',
            name: 'Choice A',
            groupKey: 'group1',
            groupIndex: 0,
            indexInGroup: 0,
            checked: false,
        })

        expect(flatChoices[1]).toMatchObject({
            value: 'b',
            name: 'Choice B',
            checked: true,
        })

        expect(flatChoices[2]).toMatchObject({
            value: 'c',
            name: 'c', // Should use value as name when name is not provided
            groupKey: 'group2',
        })
    })

    it('should handle disabled choices', () => {
        const groups: Group<string>[] = [
            {
                key: 'group1',
                label: 'Group 1',
                choices: [
                    { value: 'a', disabled: true },
                    { value: 'b', disabled: 'Not available' },
                ],
            },
        ]

        const { flatChoices } = normalizeGroups(groups)

        expect(flatChoices[0]).toMatchObject({ disabled: true })
        expect(flatChoices[1]).toMatchObject({ disabled: 'Not available' })
    })
})

describe('filterBySearch', () => {
    const createTestData = () => {
        const groups: Group<string>[] = [
            {
                key: 'fruits',
                label: 'Fruits',
                choices: [
                    { value: 'apple', name: 'Apple' },
                    { value: 'banana', name: 'Banana' },
                ],
            },
            {
                key: 'vegetables',
                label: 'Vegetables',
                choices: [
                    { value: 'carrot', name: 'Carrot' },
                    { value: 'broccoli', name: 'Broccoli' },
                ],
            },
        ]
        return normalizeGroups(groups)
    }

    it('should return all choices when query is empty', () => {
        const { normalizedGroups, flatChoices } = createTestData()
        const { filteredChoices, filteredGroups } = filterBySearch(flatChoices, normalizedGroups, '')

        expect(filteredChoices).toHaveLength(4)
        expect(filteredGroups).toHaveLength(2)
    })

    it('should filter choices by name (case-insensitive)', () => {
        const { normalizedGroups, flatChoices } = createTestData()
        const { filteredChoices, filteredGroups } = filterBySearch(flatChoices, normalizedGroups, 'app')

        expect(filteredChoices).toHaveLength(1)
        expect(filteredGroups).toHaveLength(1)
        expect(filteredChoices[0]).toMatchObject({ value: 'apple' })
    })

    it('should filter across multiple groups', () => {
        const { normalizedGroups, flatChoices } = createTestData()
        const { filteredChoices, filteredGroups } = filterBySearch(flatChoices, normalizedGroups, 'a')

        // Apple, Banana, Carrot all contain 'a'
        expect(filteredChoices).toHaveLength(3)
        expect(filteredGroups).toHaveLength(2)
    })

    it('should return empty when no matches', () => {
        const { normalizedGroups, flatChoices } = createTestData()
        const { filteredChoices, filteredGroups } = filterBySearch(flatChoices, normalizedGroups, 'xyz')

        expect(filteredChoices).toHaveLength(0)
        expect(filteredGroups).toHaveLength(0)
    })

    it('should update startIndex and endIndex for filtered groups', () => {
        const { normalizedGroups, flatChoices } = createTestData()
        const { filteredGroups } = filterBySearch(flatChoices, normalizedGroups, 'a')

        // Fruits group: Apple, Banana (indices 0, 1)
        // Vegetables group: Carrot (index 2)
        expect(filteredGroups[0]).toMatchObject({ startIndex: 0, endIndex: 1 })
        expect(filteredGroups[1]).toMatchObject({ startIndex: 2, endIndex: 2 })
    })

    it('should use current checked state from flatChoices when no search query', () => {
        const { normalizedGroups, flatChoices } = createTestData()

        // Modify the checked state of some choices (simulating user interaction)
        const modifiedChoices = flatChoices.map((choice) => {
            if (!Separator.isSeparator(choice) && choice.value === 'apple') {
                return { ...choice, checked: true }
            }
            if (!Separator.isSeparator(choice) && choice.value === 'carrot') {
                return { ...choice, checked: true }
            }
            return choice
        })

        // Filter with no query
        const { filteredGroups } = filterBySearch(modifiedChoices, normalizedGroups, '')

        // Check that the groups have the updated checked state
        const fruitsGroup = filteredGroups[0]
        const appleChoice = fruitsGroup?.choices.find((c) => c.value === 'apple')
        expect(appleChoice?.checked).toBe(true)

        const vegetablesGroup = filteredGroups[1]
        const carrotChoice = vegetablesGroup?.choices.find((c) => c.value === 'carrot')
        expect(carrotChoice?.checked).toBe(true)

        // Verify other choices remain unchecked
        const bananaChoice = fruitsGroup?.choices.find((c) => c.value === 'banana')
        expect(bananaChoice?.checked).toBe(false)
    })

    it('should use current checked state from flatChoices when filtering with query', () => {
        const { normalizedGroups, flatChoices } = createTestData()

        // Modify the checked state
        const modifiedChoices = flatChoices.map((choice) => {
            if (!Separator.isSeparator(choice) && choice.value === 'apple') {
                return { ...choice, checked: true }
            }
            if (!Separator.isSeparator(choice) && choice.value === 'banana') {
                return { ...choice, checked: true }
            }
            return choice
        })

        // Filter to show only items containing 'a'
        const { filteredGroups } = filterBySearch(modifiedChoices, normalizedGroups, 'a')

        // All filtered choices should have their current checked state
        const fruitsGroup = filteredGroups[0]
        const appleChoice = fruitsGroup?.choices.find((c) => c.value === 'apple')
        expect(appleChoice?.checked).toBe(true)

        const bananaChoice = fruitsGroup?.choices.find((c) => c.value === 'banana')
        expect(bananaChoice?.checked).toBe(true)

        const vegetablesGroup = filteredGroups[1]
        const carrotChoice = vegetablesGroup?.choices.find((c) => c.value === 'carrot')
        expect(carrotChoice?.checked).toBe(false) // Not checked in modified choices
    })

    it('should update group stats correctly after selection changes', () => {
        const { normalizedGroups, flatChoices } = createTestData()

        // Initially, nothing is selected
        const { filteredGroups: initialGroups } = filterBySearch(flatChoices, normalizedGroups, '')
        const initialStats = getGroupStats(initialGroups[0]!)
        expect(initialStats.selected).toBe(0)
        expect(initialStats.total).toBe(2) // Apple and Banana

        // Select some items
        const modifiedChoices = flatChoices.map((choice) => {
            if (!Separator.isSeparator(choice) && choice.value === 'apple') {
                return { ...choice, checked: true }
            }
            return choice
        })

        // Filter again with no query
        const { filteredGroups: updatedGroups } = filterBySearch(modifiedChoices, normalizedGroups, '')
        const updatedStats = getGroupStats(updatedGroups[0]!)
        expect(updatedStats.selected).toBe(1) // Apple is now selected
        expect(updatedStats.total).toBe(2) // Still 2 total
    })
})

describe('getCurrentGroup', () => {
    it('should find the group containing the cursor', () => {
        const groups: NormalizedGroup<string>[] = [
            { key: 'a', label: 'A', startIndex: 0, endIndex: 2, choices: [] },
            { key: 'b', label: 'B', startIndex: 3, endIndex: 5, choices: [] },
        ]

        expect(getCurrentGroup(0, groups)?.key).toBe('a')
        expect(getCurrentGroup(2, groups)?.key).toBe('a')
        expect(getCurrentGroup(3, groups)?.key).toBe('b')
        expect(getCurrentGroup(5, groups)?.key).toBe('b')
    })

    it('should return undefined when cursor is out of bounds', () => {
        const groups: NormalizedGroup<string>[] = [{ key: 'a', label: 'A', startIndex: 0, endIndex: 2, choices: [] }]

        expect(getCurrentGroup(10, groups)).toBeUndefined()
    })
})

describe('toggleGroup', () => {
    it('should toggle all selectable choices in a group', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: true,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: false,
                checked: false,
                groupKey: 'g2',
                groupIndex: 1,
                indexInGroup: 0,
            },
        ]
        const group: NormalizedGroup<string> = {
            key: 'g1',
            label: 'G1',
            startIndex: 0,
            endIndex: 1,
            choices: choices.slice(0, 2),
        }

        const result = toggleGroup(choices, group, true)

        expect(result[0]?.checked).toBe(true)
        expect(result[1]?.checked).toBe(true)
        expect(result[2]?.checked).toBe(false) // Should not change other groups
    })

    it('should not toggle disabled choices', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
        ]
        const group: NormalizedGroup<string> = { key: 'g1', label: 'G1', startIndex: 0, endIndex: 1, choices }

        const result = toggleGroup(choices, group, true)

        expect(result[0]?.checked).toBe(false) // Disabled, should not change
        expect(result[1]?.checked).toBe(true)
    })
})

describe('invertGroup', () => {
    it('should invert selection of all selectable choices in a group', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: true,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
        ]
        const group: NormalizedGroup<string> = { key: 'g1', label: 'G1', startIndex: 0, endIndex: 1, choices }

        const result = invertGroup(choices, group)

        expect(result[0]?.checked).toBe(false)
        expect(result[1]?.checked).toBe(true)
    })
})

describe('toggleAll', () => {
    it('should toggle all selectable choices', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: false,
                checked: true,
                groupKey: 'g2',
                groupIndex: 1,
                indexInGroup: 0,
            },
        ]

        const result = toggleAll(choices, true)

        expect(result[0]?.checked).toBe(true)
        expect(result[1]?.checked).toBe(false) // Disabled
        expect(result[2]?.checked).toBe(true)
    })
})

describe('invertAll', () => {
    it('should invert all selectable choices', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: true,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
        ]

        const result = invertAll(choices)

        expect(result[0]?.checked).toBe(false)
        expect(result[1]?.checked).toBe(true)
    })
})

describe('buildSelections', () => {
    it('should build selections grouped by group key', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: true,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: false,
                checked: true,
                groupKey: 'g2',
                groupIndex: 1,
                indexInGroup: 0,
            },
        ]
        const groups: NormalizedGroup<string>[] = [
            { key: 'g1', label: 'G1', startIndex: 0, endIndex: 1, choices: choices.slice(0, 2) },
            { key: 'g2', label: 'G2', startIndex: 2, endIndex: 2, choices: choices.slice(2) },
        ]

        const result = buildSelections(choices, groups)

        expect(result).toEqual({
            g1: ['a'],
            g2: ['c'],
        })
    })

    it('should return empty arrays for groups with no selections', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
        ]
        const groups: NormalizedGroup<string>[] = [{ key: 'g1', label: 'G1', startIndex: 0, endIndex: 0, choices }]

        const result = buildSelections(choices, groups)

        expect(result).toEqual({ g1: [] })
    })
})

describe('isSelectableItem', () => {
    it('should return true for enabled choices', () => {
        const choice: NormalizedChoice<string> = {
            value: 'a',
            name: 'A',
            short: 'A',
            disabled: false,
            checked: false,
            groupKey: 'g1',
            groupIndex: 0,
            indexInGroup: 0,
        }
        expect(isSelectableItem(choice)).toBe(true)
    })

    it('should return false for disabled choices', () => {
        const choice: NormalizedChoice<string> = {
            value: 'a',
            name: 'A',
            short: 'A',
            disabled: true,
            checked: false,
            groupKey: 'g1',
            groupIndex: 0,
            indexInGroup: 0,
        }
        expect(isSelectableItem(choice)).toBe(false)
    })

    it('should return false for separators', () => {
        const separator = new Separator()
        expect(isSelectableItem(separator)).toBe(false)
    })
})

describe('findNextSelectableIndex', () => {
    it('should find next selectable item going down', () => {
        const items: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 2,
            },
        ]

        expect(findNextSelectableIndex(items, 0, 1)).toBe(2) // Skip disabled
    })

    it('should find next selectable item going up', () => {
        const items: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 2,
            },
        ]

        expect(findNextSelectableIndex(items, 2, -1)).toBe(0) // Skip disabled
    })

    it('should wrap around at boundaries', () => {
        const items: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
        ]

        expect(findNextSelectableIndex(items, 1, 1)).toBe(0) // Wrap to start
        expect(findNextSelectableIndex(items, 0, -1)).toBe(1) // Wrap to end
    })
})

describe('findFirstSelectableIndex', () => {
    it('should find first selectable item', () => {
        const items: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
        ]

        expect(findFirstSelectableIndex(items)).toBe(1)
    })

    it('should return 0 when no selectable items', () => {
        const items: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
        ]

        expect(findFirstSelectableIndex(items)).toBe(0)
    })
})

describe('getGroupStats', () => {
    it('should return correct selected and total counts', () => {
        const choices: NormalizedChoice<string>[] = [
            {
                value: 'a',
                name: 'A',
                short: 'A',
                disabled: false,
                checked: true,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 0,
            },
            {
                value: 'b',
                name: 'B',
                short: 'B',
                disabled: false,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 1,
            },
            {
                value: 'c',
                name: 'C',
                short: 'C',
                disabled: true,
                checked: false,
                groupKey: 'g1',
                groupIndex: 0,
                indexInGroup: 2,
            },
        ]
        const group: NormalizedGroup<string> = { key: 'g1', label: 'G1', startIndex: 0, endIndex: 2, choices }

        const stats = getGroupStats(group)

        expect(stats.selected).toBe(1)
        expect(stats.total).toBe(2) // Excludes disabled
    })
})
