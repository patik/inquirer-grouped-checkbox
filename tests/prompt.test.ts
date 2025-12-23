import { render } from '@inquirer/testing'
import { describe, expect, it } from 'vitest'
import groupedCheckbox, { GroupedSelections } from '../src/index.js'

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

        events.keypress('space') // Select first item
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1'],
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

        events.keypress('space') // Select first item in group 1
        events.keypress('down')
        events.keypress('down') // Move to group 2
        events.keypress('space') // Select first item in group 2
        events.keypress('enter')

        await expect(answer).resolves.toEqual({
            group1: ['1'],
            group2: ['3'],
        })
    })
})
