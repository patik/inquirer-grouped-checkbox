import {
    createPrompt,
    isBackspaceKey,
    isDownKey,
    isEnterKey,
    isSpaceKey,
    isTabKey,
    isUpKey,
    makeTheme,
    useKeypress,
    useMemo,
    usePagination,
    usePrefix,
    useRef,
    useState,
    type KeypressEvent,
    type Status,
} from '@inquirer/core'
import { styleText } from 'node:util'
import { defaultTheme, type GroupedCheckboxTheme } from './theme.js'
import type { GroupedCheckboxConfig, GroupedSelections, Item, NormalizedChoice } from './types.js'
import { Separator } from './types.js'
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
    shift?: boolean
    sequence?: string
}

const groupedCheckbox = createPrompt(
    <Value>(config: GroupedCheckboxConfig<Value>, done: (value: GroupedSelections<Value>) => void) => {
        const { normalizedGroups: initialGroups, flatChoices: initialChoices } = useMemo(
            () => normalizeGroups(config.groups),
            [config.groups],
        )

        const [status, setStatus] = useState<Status>('idle')
        const [choices, setChoices] = useState<NormalizedChoice<Value>[]>(
            initialChoices.filter((item): item is NormalizedChoice<Value> => !Separator.isSeparator(item)),
        )
        const [searchQuery, setSearchQuery] = useState('')
        const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
        const [cursorIndex, setCursorIndex] = useState(0)

        const theme = makeTheme<GroupedCheckboxTheme>(defaultTheme, config.theme?.checkbox)
        const prefix = usePrefix({ status, theme })

        const { filteredChoices, filteredGroups } = useMemo(
            () => filterBySearch(choices, initialGroups, searchQuery),
            [choices, initialGroups, searchQuery],
        )

        // Use ref to track current cursor for keypress handler
        const cursorRef = useRef(cursorIndex)
        cursorRef.current = cursorIndex

        const choicesRef = useRef(choices)
        choicesRef.current = choices

        const searchRef = useRef(searchQuery)
        searchRef.current = searchQuery

        const filteredChoicesRef = useRef(filteredChoices)
        filteredChoicesRef.current = filteredChoices

        const currentGroup = useMemo(() => getCurrentGroup(cursorIndex, filteredGroups), [cursorIndex, filteredGroups])

        const currentGroupRef = useRef(currentGroup)
        currentGroupRef.current = currentGroup

        useKeypress((event) => {
            const key = event as ExtendedKey
            if (status !== 'idle') return

            setErrorMessage(undefined)

            if (isEnterKey(key)) {
                const selections = buildSelections(choicesRef.current, initialGroups)

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

            if (isUpKey(key)) {
                const newIndex = findNextSelectableIndex(filteredChoices, cursorRef.current, -1)
                setCursorIndex(newIndex)
                return
            }

            if (isDownKey(key)) {
                const newIndex = findNextSelectableIndex(filteredChoices, cursorRef.current, 1)
                setCursorIndex(newIndex)
                return
            }

            if (isSpaceKey(key)) {
                const currentItem = filteredChoices[cursorRef.current]
                if (currentItem && isSelectableItem(currentItem)) {
                    const newChoices = choicesRef.current.map((choice) => {
                        if (choice.value === currentItem.value && choice.groupKey === currentItem.groupKey) {
                            return { ...choice, checked: !choice.checked }
                        }
                        return choice
                    })
                    setChoices(newChoices)
                }
                return
            }

            // Search input (when searchable) - handle first to capture alphanumeric keys
            if (config.searchable) {
                if (isBackspaceKey(key)) {
                    setSearchQuery(searchRef.current.slice(0, -1))
                    setCursorIndex(0)
                    return
                }

                if (key.name === 'escape') {
                    setSearchQuery('')
                    setCursorIndex(findFirstSelectableIndex(choicesRef.current))
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
                    setSearchQuery(searchRef.current + key.sequence)
                    setCursorIndex(0)
                    return
                }
            }

            // Global toggle all: Ctrl+A (or 'a' when not searchable) - operates on filtered/visible choices only
            if ((key.name === 'a' && key.ctrl) || (key.name === 'a' && !key.shift && !config.searchable)) {
                const visibleChoices = filteredChoicesRef.current.filter(
                    (c): c is NormalizedChoice<Value> => !Separator.isSeparator(c) && !c.disabled,
                )
                const allVisibleChecked = visibleChoices.every((c) => c.checked)
                const visibleValues = new Set(visibleChoices.map((c) => c.value))
                setChoices(
                    choicesRef.current.map((choice) => {
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
                const visibleChoices = filteredChoicesRef.current.filter(
                    (c): c is NormalizedChoice<Value> => !Separator.isSeparator(c) && !c.disabled,
                )
                const visibleValues = new Set(visibleChoices.map((c) => c.value))
                setChoices(
                    choicesRef.current.map((choice) => {
                        if (!choice.disabled && visibleValues.has(choice.value)) {
                            return { ...choice, checked: !choice.checked }
                        }
                        return choice
                    }),
                )
                return
            }

            // Per-group toggle: 'A' (Shift+A) - operates on filtered/visible choices only
            if (key.name === 'a' && key.shift && currentGroupRef.current) {
                const group = currentGroupRef.current
                // Get visible choices in this group (filtered by search)
                const visibleGroupChoices = filteredChoicesRef.current.filter(
                    (c): c is NormalizedChoice<Value> =>
                        !Separator.isSeparator(c) && c.groupKey === group.key && !c.disabled,
                )
                const allVisibleChecked = visibleGroupChoices.every((c) => c.checked)
                const visibleValues = new Set(visibleGroupChoices.map((c) => c.value))
                // Toggle only the visible choices
                setChoices(
                    choicesRef.current.map((choice) => {
                        if (choice.groupKey === group.key && !choice.disabled && visibleValues.has(choice.value)) {
                            return { ...choice, checked: !allVisibleChecked }
                        }
                        return choice
                    }),
                )
                return
            }

            // Per-group invert: 'I' (Shift+I) - operates on filtered/visible choices only
            if (key.name === 'i' && key.shift && currentGroupRef.current) {
                const group = currentGroupRef.current
                // Get visible choices in this group (filtered by search)
                const visibleGroupChoices = filteredChoicesRef.current.filter(
                    (c): c is NormalizedChoice<Value> =>
                        !Separator.isSeparator(c) && c.groupKey === group.key && !c.disabled,
                )
                const visibleValues = new Set(visibleGroupChoices.map((c) => c.value))
                // Invert only the visible choices
                setChoices(
                    choicesRef.current.map((choice) => {
                        if (choice.groupKey === group.key && !choice.disabled && visibleValues.has(choice.value)) {
                            return { ...choice, checked: !choice.checked }
                        }
                        return choice
                    }),
                )
                return
            }

            // Tab: jump to next group
            if (isTabKey(key) && !key.shift) {
                if (currentGroupRef.current && filteredGroups.length > 1) {
                    const currentGroupIdx = filteredGroups.findIndex((g) => g.key === currentGroupRef.current!.key)
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
                if (currentGroupRef.current && filteredGroups.length > 1) {
                    const currentGroupIdx = filteredGroups.findIndex((g) => g.key === currentGroupRef.current!.key)
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
            renderItem: ({ item, index, isActive }) => {
                if (Separator.isSeparator(item)) {
                    return ` ${item.separator}`
                }

                // Check if this is the first item in a group (render header)
                const group = filteredGroups.find((g) => g.startIndex === index)
                let header = ''
                if (group) {
                    const stats = getGroupStats(group)
                    const statsText = styleText('dim', ` (${stats.selected}/${stats.total})`)
                    header = `\n${theme.style.groupHeader(group.label, group.icon)}${statsText}\n`
                }

                const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked
                const cursor = isActive ? theme.icon.cursor : ' '
                const color = item.checked ? theme.style.highlight : (text: string) => text
                const name = item.disabled
                    ? theme.style.disabledChoice(
                          `${item.name}${typeof item.disabled === 'string' ? ` (${item.disabled})` : ''}`,
                      )
                    : color(item.name)

                let line = `${header}${cursor} ${checkbox} ${name}`

                if (item.description && isActive) {
                    line += `\n   ${theme.style.description(item.description)}`
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
                'space: select',
                `${toggleKey}: toggle all`,
                `${invertKey}: invert`,
                config.searchable ? 'type to search' : '',
            ]
                .filter(Boolean)
                .join(', ')
            output += `\n${styleText('dim', `(${helpText})`)}`
        }

        if (errorMessage) {
            output += `\n${styleText('red', errorMessage)}`
        }

        return output
    },
)

export default groupedCheckbox
export type { GroupedCheckboxTheme } from './theme.js'
export type {
    Choice,
    Group,
    GroupedCheckboxConfig,
    GroupedSelections,
    NormalizedChoice,
    NormalizedGroup,
} from './types.js'
export { Separator }
