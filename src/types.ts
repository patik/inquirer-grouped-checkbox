import type { Separator, Theme } from '@inquirer/core'
import type { Prettify } from '@inquirer/type'
import type { GroupedCheckboxTheme } from './theme.js'

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
    choices: Array<Choice<Value>>
}

export interface GroupedCheckboxConfig<Value> {
    message: string
    groups: Array<Group<Value>>
    searchable?: boolean
    pageSize?: number
    required?: boolean
    validate?: (selections: GroupedSelections<Value>) => boolean | string | Promise<boolean | string>
    theme?: PartialTheme

    /** Hide running total of selected items next to each group's name, e.g. "(2/6)". Defaults to false. */
    hideGroupTotals?: boolean

    /** Hide running total of selected items in the message, e.g. "(2/6)". Defaults to false. */
    hideOverallTotal?: boolean
}

export type PartialTheme = Prettify<Partial<Theme<GroupedCheckboxTheme>> & { checkbox?: Partial<GroupedCheckboxTheme> }>

export interface GroupedSelections<Value> {
    [groupKey: string]: Value[]
}

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
    startIndex: number
    endIndex: number
    choices: NormalizedChoice<Value>[]
}

/**
 * Represents a group header in the flattened choice list.
 * Group headers are navigable items that allow users to toggle all items in the group.
 * When the user presses Space on a group header, all non-disabled items in that group are toggled.
 */
export interface GroupHeader {
    /** Discriminator to identify this item as a group header */
    type: 'group-header'
    /** The unique key of the group this header belongs to */
    groupKey: string
    /** The display label for the group */
    label: string
    /** Optional icon displayed before the label */
    icon?: string
}

export type Item<Value> = NormalizedChoice<Value> | Separator | GroupHeader

/**
 * Type guard to check if an item is a GroupHeader.
 * Useful when iterating over Item<Value>[] arrays to distinguish group headers from choices.
 *
 * @param item - The item to check
 * @returns true if the item is a GroupHeader, false otherwise
 */
export function isGroupHeader(item: unknown): item is GroupHeader {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'group-header'
}
