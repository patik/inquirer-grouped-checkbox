import {
    createPrompt,
    isBackspaceKey,
    isDownKey,
    isEnterKey,
    isSpaceKey,
    isTabKey,
    isUpKey,
    makeTheme,
    Separator,
    useKeypress,
    useMemo,
    usePagination,
    usePrefix,
    useState,
    type KeypressEvent,
    type Status,
} from '@inquirer/core'
import type { Context } from '@inquirer/type'
import { styleText } from 'node:util'
import { defaultTheme, type GroupedCheckboxTheme } from './theme.js'
import type { GroupedCheckboxConfig, GroupedSelections, Item, NormalizedChoice } from './types.js'
import { isGroupHeader } from './types.js'
import {
    buildSelections,
    filterBySearch,
    findFirstSelectableIndex,
    findNextSelectableIndex,
    getCurrentGroup,
    getGroupStats,
    isSelectableItem,
    normalizeGroups,
} from './utils.js'

interface ExtendedKey extends KeypressEvent {
    sequence?: string
}

const groupedCheckbox: <Value>(
    config: GroupedCheckboxConfig<Value>,
    context?: Context,
) => Promise<GroupedSelections<Value>> = createPrompt(
    <Value>(config: GroupedCheckboxConfig<Value>, done: (value: GroupedSelections<Value>) => void) => {
        const { normalizedGroups: initialGroups, flatChoices: initialChoices } = useMemo(
            () => normalizeGroups(config.groups),
            [config.groups],
        )

        const [status, setStatus] = useState<Status>('idle')
        const [choices, setChoices] = useState<NormalizedChoice<Value>[]>(
            initialChoices.filter(
                (item): item is NormalizedChoice<Value> => !Separator.isSeparator(item) && !isGroupHeader(item),
            ),
        )
        const [searchQuery, setSearchQuery] = useState('')
        const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
        const [cursorIndex, setCursorIndex] = useState(0)

        const theme = makeTheme<GroupedCheckboxTheme>(defaultTheme, config.theme?.checkbox)
        const prefix = usePrefix({ status, theme })

        // Alternative navigation keybindings (vim/emacs, opt-in via INQUIRER_KEYBINDINGS).
        // Vim's bare `j`/`k` are search input while searching, so that binding is dropped
        // there. Emacs' Ctrl+N/Ctrl+P can never be search input (the search branch below
        // ignores Ctrl-modified keys), so it stays active in both modes.
        const keybindings = config.searchable
            ? theme.keybindings.filter((binding) => binding !== 'vim')
            : theme.keybindings

        const { filteredChoices, filteredGroups } = useMemo(
            () => filterBySearch(choices, initialGroups, searchQuery),
            [choices, initialGroups, searchQuery],
        )

        const currentGroup = useMemo(() => getCurrentGroup(cursorIndex, filteredGroups), [cursorIndex, filteredGroups])

        useKeypress((event) => {
            const key = event as ExtendedKey
            if (status !== 'idle') return

            setErrorMessage(undefined)

            if (isEnterKey(key)) {
                const selections = buildSelections(choices, initialGroups)

                if (config.required) {
                    const hasSelection = Object.values(selections).some((arr) => arr.length > 0)
                    if (!hasSelection) {
                        setErrorMessage('At least one selection is required')
                        return
                    }
                }

                if (config.validate) {
                    const result = config.validate(selections)
                    if (result instanceof Promise) {
                        setStatus('loading')
                        result.then((validation) => {
                            if (validation === true) {
                                setStatus('done')
                                done(selections)
                            } else {
                                setStatus('idle')
                                setErrorMessage(typeof validation === 'string' ? validation : 'Invalid selection')
                            }
                        })
                        return
                    }
                    if (result !== true) {
                        setErrorMessage(typeof result === 'string' ? result : 'Invalid selection')
                        return
                    }
                }

                setStatus('done')
                done(selections)
                return
            }

            if (isUpKey(key, keybindings)) {
                const newIndex = findNextSelectableIndex(filteredChoices, cursorIndex, -1)
                setCursorIndex(newIndex)
                return
            }

            if (isDownKey(key, keybindings)) {
                const newIndex = findNextSelectableIndex(filteredChoices, cursorIndex, 1)
                setCursorIndex(newIndex)
                return
            }

            if (isSpaceKey(key)) {
                const currentItem = filteredChoices[cursorIndex]
                if (!currentItem) return

                // Handle group header toggle
                if (isGroupHeader(currentItem)) {
                    const group = filteredGroups.find((g) => g.key === currentItem.groupKey)
                    if (group) {
                        // Get visible choices in this group (filtered by search)
                        const visibleGroupChoices = filteredChoices.filter(
                            (c): c is NormalizedChoice<Value> =>
                                !Separator.isSeparator(c) &&
                                !isGroupHeader(c) &&
                                c.groupKey === group.key &&
                                !c.disabled,
                        )
                        // If there are no visible, enabled choices in this group, do nothing
                        if (visibleGroupChoices.length === 0) {
                            return
                        }
                        const allVisibleChecked = visibleGroupChoices.every((c) => c.checked)
                        const visibleValues = new Set(visibleGroupChoices.map((c) => c.value))
                        // Toggle only the visible choices
                        setChoices((current) =>
                            current.map((choice) => {
                                if (
                                    choice.groupKey === group.key &&
                                    !choice.disabled &&
                                    visibleValues.has(choice.value)
                                ) {
                                    return { ...choice, checked: !allVisibleChecked }
                                }
                                return choice
                            }),
                        )
                    }
                    return
                }

                // Handle regular choice toggle
                if (isSelectableItem(currentItem)) {
                    setChoices((current) =>
                        current.map((choice) => {
                            if (choice.value === currentItem.value && choice.groupKey === currentItem.groupKey) {
                                return { ...choice, checked: !choice.checked }
                            }
                            return choice
                        }),
                    )
                }
                return
            }

            // Search input (when searchable) - handle first to capture alphanumeric keys
            if (config.searchable) {
                if (isBackspaceKey(key)) {
                    setSearchQuery((current) => current.slice(0, -1))
                    setCursorIndex(0)
                    return
                }

                if (key.name === 'escape') {
                    setSearchQuery('')
                    setCursorIndex(findFirstSelectableIndex(choices))
                    return
                }

                // Alphanumeric input (except when Ctrl/Shift is held for shortcuts, or Tab)
                if (
                    key.sequence &&
                    !key.ctrl &&
                    !key.shift &&
                    !isTabKey(key) &&
                    /^[a-zA-Z0-9\-_./\s]$/.test(key.sequence)
                ) {
                    const { sequence } = key
                    setSearchQuery((current) => current + sequence)
                    setCursorIndex(0)
                    return
                }
            }

            // Global toggle all: Ctrl+A (or 'a' when not searchable) - operates on filtered/visible choices only
            if ((key.name === 'a' && key.ctrl) || (key.name === 'a' && !key.shift && !config.searchable)) {
                const visibleChoices = filteredChoices.filter(
                    (c): c is NormalizedChoice<Value> => !Separator.isSeparator(c) && !isGroupHeader(c) && !c.disabled,
                )
                const allVisibleChecked = visibleChoices.every((c) => c.checked)
                const visibleValues = new Set(visibleChoices.map((c) => c.value))
                setChoices((current) =>
                    current.map((choice) => {
                        if (!choice.disabled && visibleValues.has(choice.value)) {
                            return { ...choice, checked: !allVisibleChecked }
                        }
                        return choice
                    }),
                )
                return
            }

            // Global invert: Ctrl+I (or 'i' when not searchable) - operates on filtered/visible choices only
            if ((key.name === 'i' && key.ctrl) || (key.name === 'i' && !key.shift && !config.searchable)) {
                const visibleChoices = filteredChoices.filter(
                    (c): c is NormalizedChoice<Value> => !Separator.isSeparator(c) && !isGroupHeader(c) && !c.disabled,
                )
                const visibleValues = new Set(visibleChoices.map((c) => c.value))
                setChoices((current) =>
                    current.map((choice) => {
                        if (!choice.disabled && visibleValues.has(choice.value)) {
                            return { ...choice, checked: !choice.checked }
                        }
                        return choice
                    }),
                )
                return
            }

            // Tab: jump to next group
            if (isTabKey(key) && !key.shift) {
                if (currentGroup && filteredGroups.length > 1) {
                    const currentGroupIdx = filteredGroups.findIndex((g) => g.key === currentGroup!.key)
                    const nextGroupIdx = (currentGroupIdx + 1) % filteredGroups.length
                    const nextGroup = filteredGroups[nextGroupIdx]
                    if (nextGroup) {
                        setCursorIndex(nextGroup.startIndex)
                    }
                }
                return
            }

            // Shift+Tab: jump to previous group
            if (isTabKey(key) && key.shift) {
                if (currentGroup && filteredGroups.length > 1) {
                    const currentGroupIdx = filteredGroups.findIndex((g) => g.key === currentGroup!.key)
                    const prevGroupIdx = currentGroupIdx === 0 ? filteredGroups.length - 1 : currentGroupIdx - 1
                    const prevGroup = filteredGroups[prevGroupIdx]
                    if (prevGroup) {
                        setCursorIndex(prevGroup.startIndex)
                    }
                }
                return
            }
        })

        const page = usePagination<Item<Value>>({
            items: filteredChoices,
            active: cursorIndex,
            pageSize: config.pageSize ?? 15,
            renderItem: ({ item, isActive }) => {
                if (Separator.isSeparator(item)) {
                    return ` ${item.separator}`
                }

                // Handle group header rendering
                if (isGroupHeader(item)) {
                    const group = filteredGroups.find((g) => g.key === item.groupKey)
                    const stats = group ? getGroupStats(group) : { selected: 0, total: 0 }
                    const allChecked = stats.total > 0 && stats.selected === stats.total
                    const checkbox = allChecked ? theme.icon.checked : theme.icon.unchecked
                    const cursor = isActive ? theme.icon.cursor : ' '
                    const headerText = theme.style.groupHeader(item.label, item.icon)
                    const statsText = config.hideGroupTotals
                        ? ''
                        : styleText('dim', ` (${stats.selected}/${stats.total})`)

                    return `${cursor} ${checkbox} ${headerText}${statsText}`
                }

                const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked
                const cursor = isActive ? theme.icon.cursor : ' '
                const color = item.checked ? theme.style.highlight : (text: string) => text
                const name = item.disabled
                    ? theme.style.disabledChoice(
                          `${item.name}${typeof item.disabled === 'string' ? ` (${item.disabled})` : ''}`,
                      )
                    : color(item.name)

                let line = `  ${cursor} ${checkbox} ${name}`

                if (item.description && isActive) {
                    line += `\n     ${theme.style.description(item.description)}`
                }

                return line
            },
        })

        // Build final output
        let message = config.message

        if (status === 'done') {
            const selections = buildSelections(choices, initialGroups)
            const totalSelected = Object.values(selections).reduce((sum, arr) => sum + arr.length, 0)
            message += styleText('cyan', ` ${totalSelected} item${totalSelected !== 1 ? 's' : ''} selected`)
            return `${prefix} ${message}`
        }

        // Add running total to message if not hidden
        if (!config.hideOverallTotal) {
            const totalSelected = choices.filter((c) => c.checked).length
            const totalItems = choices.filter((c) => !c.disabled).length
            message += styleText('dim', ` (${totalSelected}/${totalItems})`)
        }

        let output = `${prefix} ${message}`

        if (config.searchable && searchQuery) {
            output += ` ${theme.style.searchQuery(`[${searchQuery}]`)}`
        }

        if (filteredChoices.length === 0) {
            output += `\n${styleText('dim', '  No matches found')}`
        } else {
            output += `\n${page}`
        }

        // Help text
        if (theme.helpMode === 'always' || (theme.helpMode === 'auto' && status === 'idle')) {
            const toggleKey = config.searchable ? 'ctrl+a' : 'a'
            const invertKey = config.searchable ? 'ctrl+i' : 'i'
            const helpText = [
                'Select: space',
                `Toggle all: ${toggleKey}`,
                `Invert: ${invertKey}`,
                config.searchable ? 'Type to search' : '',
            ]
                .filter(Boolean)
                .join(' • ')
            output += `\n\n${styleText('dim', `(${helpText})`)}`
        }

        if (errorMessage) {
            output += `\n${styleText('red', errorMessage)}`
        }

        return output
    },
)

export default groupedCheckbox
export type { GroupedCheckboxTheme } from './theme.js'
export { isGroupHeader } from './types.js'
export type {
    Choice,
    Group,
    GroupedCheckboxConfig,
    GroupedSelections,
    GroupHeader,
    NormalizedChoice,
    NormalizedGroup,
} from './types.js'
