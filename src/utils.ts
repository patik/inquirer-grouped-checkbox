import { Separator } from '@inquirer/core'
import type { Group, GroupedSelections, GroupHeader, Item, NormalizedChoice, NormalizedGroup } from './types.js'
import { isGroupHeader } from './types.js'

export function normalizeGroups<Value>(groups: ReadonlyArray<Group<Value>>): {
    normalizedGroups: NormalizedGroup<Value>[]
    flatChoices: Item<Value>[]
} {
    const normalizedGroups: NormalizedGroup<Value>[] = []
    const flatChoices: Item<Value>[] = []
    let flatIndex = 0

    groups.forEach((group, groupIndex) => {
        // Insert group header as a navigable item
        const groupHeader: GroupHeader = {
            type: 'group-header',
            groupKey: group.key,
            label: group.label,
            icon: group.icon,
        }
        flatChoices.push(groupHeader)
        const startIndex = flatIndex
        flatIndex++

        const normalizedChoices: NormalizedChoice<Value>[] = []

        group.choices.forEach((choice, indexInGroup) => {
            const normalizedChoice: NormalizedChoice<Value> = {
                value: choice.value,
                name: choice.name ?? String(choice.value),
                description: choice.description,
                short: choice.short ?? choice.name ?? String(choice.value),
                disabled: choice.disabled ?? false,
                checked: choice.checked ?? false,
                groupKey: group.key,
                groupIndex,
                indexInGroup,
            }
            normalizedChoices.push(normalizedChoice)
            flatChoices.push(normalizedChoice)
            flatIndex++
        })

        normalizedGroups.push({
            key: group.key,
            label: group.label,
            icon: group.icon,
            startIndex,
            endIndex: flatIndex - 1,
            choices: normalizedChoices,
        })
    })

    return { normalizedGroups, flatChoices }
}

export function filterBySearch<Value>(
    flatChoices: Item<Value>[],
    groups: NormalizedGroup<Value>[],
    query: string,
): {
    filteredChoices: Item<Value>[]
    filteredGroups: NormalizedGroup<Value>[]
} {
    const lowerQuery = query.toLowerCase()
    const filteredChoices: Item<Value>[] = []
    const filteredGroups: NormalizedGroup<Value>[] = []
    let flatIndex = 0

    for (const group of groups) {
        const matchingChoices: NormalizedChoice<Value>[] = []

        // Use flatChoices (current state) filtered by groupKey, not group.choices (stale)
        const currentGroupChoices = flatChoices.filter(
            (c): c is NormalizedChoice<Value> =>
                !Separator.isSeparator(c) && !isGroupHeader(c) && c.groupKey === group.key,
        )

        for (const choice of currentGroupChoices) {
            if (!query || choice.name.toLowerCase().includes(lowerQuery)) {
                matchingChoices.push(choice)
            }
        }

        if (matchingChoices.length > 0) {
            // Add group header first
            const groupHeader: GroupHeader = {
                type: 'group-header',
                groupKey: group.key,
                label: group.label,
                icon: group.icon,
            }
            filteredChoices.push(groupHeader)
            const startIndex = flatIndex
            flatIndex++

            // Then add matching choices
            for (const choice of matchingChoices) {
                filteredChoices.push(choice)
                flatIndex++
            }

            filteredGroups.push({
                ...group,
                startIndex,
                endIndex: flatIndex - 1,
                choices: matchingChoices,
            })
        }
    }

    return { filteredChoices, filteredGroups }
}

export function getCurrentGroup<Value>(
    cursorIndex: number,
    groups: NormalizedGroup<Value>[],
): NormalizedGroup<Value> | undefined {
    return groups.find((group) => cursorIndex >= group.startIndex && cursorIndex <= group.endIndex)
}

export function getSelectableInGroup<Value>(group: NormalizedGroup<Value>): NormalizedChoice<Value>[] {
    return group.choices.filter((choice) => !choice.disabled)
}

export function toggleGroup<Value>(
    choices: NormalizedChoice<Value>[],
    group: NormalizedGroup<Value>,
    checked: boolean,
): NormalizedChoice<Value>[] {
    return choices.map((choice) => {
        if (choice.groupKey === group.key && !choice.disabled) {
            return {
                ...choice,
                checked,
            }
        }

        return choice
    })
}

export function invertGroup<Value>(
    choices: NormalizedChoice<Value>[],
    group: NormalizedGroup<Value>,
): NormalizedChoice<Value>[] {
    return choices.map((choice) => {
        if (choice.groupKey === group.key && !choice.disabled) {
            return {
                ...choice,
                checked: !choice.checked,
            }
        }

        return choice
    })
}

export function toggleAll<Value>(choices: NormalizedChoice<Value>[], checked: boolean): NormalizedChoice<Value>[] {
    return choices.map((choice) => {
        if (!choice.disabled) {
            return {
                ...choice,
                checked,
            }
        }

        return choice
    })
}

export function invertAll<Value>(choices: NormalizedChoice<Value>[]): NormalizedChoice<Value>[] {
    return choices.map((choice) => {
        if (!choice.disabled) {
            return {
                ...choice,
                checked: !choice.checked,
            }
        }

        return choice
    })
}

export function buildSelections<Value>(
    choices: NormalizedChoice<Value>[],
    groups: NormalizedGroup<Value>[],
): GroupedSelections<Value> {
    const selections: GroupedSelections<Value> = {}

    for (const group of groups) {
        selections[group.key] = []
    }

    for (const choice of choices) {
        if (choice.checked) {
            const groupSelections = selections[choice.groupKey]

            if (groupSelections) {
                groupSelections.push(choice.value)
            }
        }
    }

    return selections
}

export function isSelectableItem<Value>(item: Item<Value>): item is NormalizedChoice<Value> | GroupHeader {
    if (isGroupHeader(item)) {
        return true
    }

    return !Separator.isSeparator(item) && !item.disabled
}

export function findNextSelectableIndex<Value>(items: Item<Value>[], currentIndex: number, direction: 1 | -1): number {
    const length = items.length
    if (length === 0) return -1

    let index = currentIndex + direction
    let iterations = 0

    while (iterations < length) {
        if (index < 0) index = length - 1
        if (index >= length) index = 0

        const item = items[index]
        if (item && isSelectableItem(item)) {
            return index
        }

        index += direction
        iterations++
    }

    return currentIndex
}

export function findFirstSelectableIndex<Value>(items: Item<Value>[]): number {
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item && isSelectableItem(item)) {
            return i
        }
    }
    return 0
}

export function getGroupStats<Value>(group: NormalizedGroup<Value>): { selected: number; total: number } {
    const selectable = getSelectableInGroup(group)
    const selected = selectable.filter((c) => c.checked).length
    return { selected, total: selectable.length }
}
