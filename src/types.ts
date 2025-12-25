import type { Theme } from '@inquirer/core'
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
    choices: ReadonlyArray<Choice<Value>>
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

export interface GroupHeader {
    type: 'group-header'
    groupKey: string
    label: string
    icon?: string
}

export type Item<Value> = NormalizedChoice<Value> | Separator | GroupHeader

export function isGroupHeader(item: unknown): item is GroupHeader {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'group-header'
}

export class Separator {
    readonly separator: string

    constructor(separator = '────────────────────') {
        this.separator = separator
    }

    static isSeparator(item: unknown): item is Separator {
        return item instanceof Separator
    }
}
