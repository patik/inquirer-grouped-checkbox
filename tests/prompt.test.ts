import { render } from '@inquirer/testing'
import { describe, expect, it } from 'vitest'
import groupedCheckbox from '../src/index.js'
import type { GroupedSelections } from '../src/types.js'

describe('groupedCheckbox', () => {
    it('should render groups with choices', async () => {
        const { answer, events, getScreen } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', name: 'Item 1' },
                        { value: '2', name: 'Item 2' },
                    ],
                },
                {
                    key: 'group2',
                    label: 'Group 2',
                    choices: [{ value: '3', name: 'Item 3' }],
                },
            ],
        })

        expect(getScreen()).toContain('Select items')
        expect(getScreen()).toContain('Group 1')
        expect(getScreen()).toContain('Item 1')

        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: [],
            group2: [],
        })
    })

    it('should select items with space key', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', name: 'Item 1' },
                        { value: '2', name: 'Item 2' },
                    ],
                },
            ],
        })

        events.keypress('down') // Move past group header to first choice
        events.keypress('space') // Select first item
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1'],
        })
    })

    it('should toggle all items in group when selecting group header', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', name: 'Item 1' },
                        { value: '2', name: 'Item 2' },
                    ],
                },
            ],
        })

        // Cursor starts on group header
        events.keypress('space') // Toggle all items in group
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1', '2'],
        })
    })

    it('should toggle partially selected group to fully selected', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', name: 'Item 1', checked: true },
                        { value: '2', name: 'Item 2', checked: false },
                        { value: '3', name: 'Item 3', checked: false },
                    ],
                },
            ],
        })

        // Cursor starts on group header, toggle should select all since not all are checked
        events.keypress('space')
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1', '2', '3'],
        })
    })

    it('should do nothing when toggling group header with all disabled items', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', name: 'Item 1', disabled: true },
                        { value: '2', name: 'Item 2', disabled: true },
                    ],
                },
            ],
        })

        // Cursor starts on group header, but all items are disabled so toggle should do nothing
        events.keypress('space')
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: [],
        })
    })

    it('should navigate with arrow keys', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1' }, { value: '2' }],
                },
            ],
        })

        events.keypress('down') // Move past header to first item
        events.keypress('down') // Move to second item
        events.keypress('space') // Select second item
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['2'],
        })
    })

    it('should toggle all with "a" key', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1' }, { value: '2' }],
                },
                {
                    key: 'group2',
                    label: 'Group 2',
                    choices: [{ value: '3' }],
                },
            ],
        })

        events.keypress('down') // Move past header
        events.keypress('a') // Select all
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1', '2'],
            group2: ['3'],
        })
    })

    it('should invert selection with "i" key', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', checked: true },
                        { value: '2', checked: false },
                    ],
                },
            ],
        })

        events.keypress('down') // Move past header
        events.keypress('i') // Invert
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['2'],
        })
    })

    it('should respect pre-selected items', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [
                        { value: '1', checked: true },
                        { value: '2', checked: false },
                    ],
                },
            ],
        })

        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1'],
        })
    })

    it('should not select disabled items', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1', disabled: true }, { value: '2' }],
                },
            ],
        })

        events.keypress('down') // Move past header
        events.keypress('a') // Try to select all
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['2'], // Only non-disabled item
        })
    })

    it('should filter items when searchable', async () => {
        const { answer, events, getScreen } = await render(groupedCheckbox, {
            message: 'Select items',
            searchable: true,
            groups: [
                {
                    key: 'group1',
                    label: 'Fruits',
                    choices: [
                        { value: 'apple', name: 'Apple' },
                        { value: 'banana', name: 'Banana' },
                    ],
                },
            ],
        })

        // Use type() for search input
        events.type('app')

        // Should only show Apple
        expect(getScreen()).toContain('Apple')
        expect(getScreen()).not.toContain('Banana')

        events.keypress('space') // Select Apple
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['apple'],
        })
    })

    it('should show error when required but nothing selected', async () => {
        const { events, getScreen } = await render(groupedCheckbox, {
            message: 'Select items',
            required: true,
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1' }],
                },
            ],
        })

        events.keypress('enter')

        expect(getScreen()).toContain('At least one selection is required')
    })

    it('should support custom validation', async () => {
        const { events, getScreen } = await render(groupedCheckbox, {
            message: 'Select items',
            validate: (selections: GroupedSelections<string>) => {
                const total = Object.values(selections).flat().length
                if (total < 2) {
                    return 'Please select at least 2 items'
                }
                return true
            },
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1' }, { value: '2' }],
                },
            ],
        })

        events.keypress('down') // Move past header
        events.keypress('space') // Select one item
        events.keypress('enter')

        expect(getScreen()).toContain('Please select at least 2 items')
    })

    it('should show group icons', async () => {
        const { getScreen } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Fruits',
                    icon: '🍎',
                    choices: [{ value: '1' }],
                },
            ],
        })

        expect(getScreen()).toContain('🍎')
        expect(getScreen()).toContain('Fruits')
    })

    it('should select across multiple groups', async () => {
        const { answer, events } = await render(groupedCheckbox, {
            message: 'Select items',
            groups: [
                {
                    key: 'group1',
                    label: 'Group 1',
                    choices: [{ value: '1' }, { value: '2' }],
                },
                {
                    key: 'group2',
                    label: 'Group 2',
                    choices: [{ value: '3' }],
                },
            ],
        })

        events.keypress('down') // Move past group 1 header to first item
        events.keypress('space') // Select first item in group 1
        events.keypress('down') // Move to second item
        events.keypress('down') // Move to group 2 header
        events.keypress('down') // Move to first item in group 2
        events.keypress('space') // Select first item in group 2
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1'],
            group2: ['3'],
        })
    })

    describe('filtered selection controls', () => {
        it('should toggle group via header when filtered', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
                    {
                        key: 'fruits',
                        label: 'Fruits',
                        choices: [
                            { value: 'apple', name: 'Apple' },
                            { value: 'apricot', name: 'Apricot' },
                            { value: 'banana', name: 'Banana' },
                        ],
                    },
                ],
            })

            // Filter to show only 'ap' items (Apple, Apricot)
            events.type('ap')

            // Cursor is on group header, space toggles filtered items
            events.keypress('space')
            events.keypress('enter')

            // Only Apple and Apricot should be selected, not Banana
            await expect(answer).resolves.toEqual({
                fruits: ['apple', 'apricot'],
            })
        })

        it('should do nothing when toggling group header with no filtered matches', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
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
                            { value: 'spinach', name: 'Spinach' },
                        ],
                    },
                ],
            })

            // Filter to show only items containing 'carr' (only Carrot matches)
            events.type('carr')

            // Cursor is on vegetables group header (fruits group is hidden)
            // Toggling should select the filtered items
            events.keypress('space')
            events.keypress('enter')

            // Only Carrot should be selected
            await expect(answer).resolves.toEqual({
                fruits: [],
                vegetables: ['carrot'],
            })
        })

        it('should toggle only filtered items globally with Ctrl+A', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
                    {
                        key: 'fruits',
                        label: 'Fruits',
                        choices: [
                            { value: 'apple', name: 'Apple' },
                            { value: 'cherry', name: 'Cherry' },
                        ],
                    },
                    {
                        key: 'vegetables',
                        label: 'Vegetables',
                        choices: [
                            { value: 'spinach', name: 'Spinach' },
                            { value: 'corn', name: 'Corn' },
                        ],
                    },
                ],
            })

            // Filter to show only items containing 'ch' (Cherry, Spinach)
            events.type('ch')

            // Move past header first
            events.keypress('down')

            // Ctrl+A to select all filtered items
            events.keypress({ name: 'a', ctrl: true })
            events.keypress('enter')

            // Cherry and Spinach contain 'ch', Apple and Corn do not
            await expect(answer).resolves.toEqual({
                fruits: ['cherry'],
                vegetables: ['spinach'],
            })
        })

        it('should invert only filtered items globally with Ctrl+I', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
                    {
                        key: 'fruits',
                        label: 'Fruits',
                        choices: [
                            { value: 'apple', name: 'Apple', checked: true },
                            { value: 'cherry', name: 'Cherry', checked: false },
                        ],
                    },
                    {
                        key: 'vegetables',
                        label: 'Vegetables',
                        choices: [
                            { value: 'spinach', name: 'Spinach', checked: true },
                            { value: 'corn', name: 'Corn', checked: true },
                        ],
                    },
                ],
            })

            // Filter to show only items containing 'ch' (Cherry, Spinach)
            events.type('ch')

            // Move past header first
            events.keypress('down')

            // Ctrl+I to invert all filtered items
            events.keypress({ name: 'i', ctrl: true })
            events.keypress('enter')

            // Apple: was checked, stays checked (not filtered)
            // Cherry: was unchecked, now checked
            // Spinach: was checked, now unchecked
            // Corn: was checked, stays checked (not filtered)
            await expect(answer).resolves.toEqual({
                fruits: ['apple', 'cherry'],
                vegetables: ['corn'],
            })
        })

        it('should preserve filtered selection after clearing search', async () => {
            const { answer, events, getScreen } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
                    {
                        key: 'fruits',
                        label: 'Fruits',
                        choices: [
                            { value: 'apple', name: 'Apple' },
                            { value: 'banana', name: 'Banana' },
                            { value: 'cherry', name: 'Cherry' },
                        ],
                    },
                ],
            })

            // Filter and select
            events.type('ap')
            events.keypress('down') // Move past header
            events.keypress('space') // Select Apple

            // Clear search with Escape
            events.keypress('escape')

            // All items should be visible again
            expect(getScreen()).toContain('Apple')
            expect(getScreen()).toContain('Banana')
            expect(getScreen()).toContain('Cherry')

            events.keypress('enter')

            // Apple should still be selected
            await expect(answer).resolves.toEqual({
                fruits: ['apple'],
            })
        })
    })

    describe('Tab navigation', () => {
        it('should jump between groups with Tab', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                groups: [
                    {
                        key: 'group1',
                        label: 'Group 1',
                        choices: [{ value: '1' }, { value: '2' }],
                    },
                    {
                        key: 'group2',
                        label: 'Group 2',
                        choices: [{ value: '3' }, { value: '4' }],
                    },
                ],
            })

            // Start at group 1 header
            events.keypress('down') // Move to first item in group 1
            events.keypress('space') // Select '1'
            events.keypress('tab') // Jump to group 2 header
            events.keypress('down') // Move to first item in group 2
            events.keypress('space') // Select '3'
            events.keypress('enter')

            await expect(answer).resolves.toEqual({
                group1: ['1'],
                group2: ['3'],
            })
        })

        it('should jump between groups with Shift+Tab', async () => {
            const { answer, events } = await render(groupedCheckbox, {
                message: 'Select items',
                groups: [
                    {
                        key: 'group1',
                        label: 'Group 1',
                        choices: [{ value: '1' }],
                    },
                    {
                        key: 'group2',
                        label: 'Group 2',
                        choices: [{ value: '2' }],
                    },
                ],
            })

            events.keypress('tab') // Jump to group 2 header
            events.keypress('down') // Move to first item in group 2
            events.keypress('space') // Select '2'
            events.keypress({ name: 'tab', shift: true }) // Jump back to group 1 header
            events.keypress('down') // Move to first item in group 1
            events.keypress('space') // Select '1'
            events.keypress('enter')

            await expect(answer).resolves.toEqual({
                group1: ['1'],
                group2: ['2'],
            })
        })

        it('should Tab navigate in searchable mode without typing tab', async () => {
            const { answer, events, getScreen } = await render(groupedCheckbox, {
                message: 'Select items',
                searchable: true,
                groups: [
                    {
                        key: 'fruits',
                        label: 'Fruits',
                        choices: [{ value: 'apple', name: 'Apple' }],
                    },
                    {
                        key: 'vegetables',
                        label: 'Vegetables',
                        choices: [{ value: 'carrot', name: 'Carrot' }],
                    },
                ],
            })

            events.keypress('tab') // Should jump to vegetables header
            events.keypress('down') // Move to first item (carrot)
            events.keypress('space') // Select carrot
            events.keypress('enter')

            // Search should be empty (tab wasn't typed)
            expect(getScreen()).not.toContain('[tab]')

            await expect(answer).resolves.toEqual({
                fruits: [],
                vegetables: ['carrot'],
            })
        })
    })
})
