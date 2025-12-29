# inquirer-grouped-checkbox

A searchable, grouped checkbox prompt for [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) with per-group and global selection controls.

![Demo gif](https://github.com/user-attachments/assets/1031f00a-e859-4b66-9c5a-8b4654bb4e7c)

![npm version](https://img.shields.io/npm/v/inquirer-grouped-checkbox)
![license](https://img.shields.io/npm/l/inquirer-grouped-checkbox)

## Features

- **Grouped display** - Organize choices under labeled headers with optional icons
- **Selectable group headers** - Toggle all items in a group by selecting the group header
- **Global controls** - Select all/none across all groups (a/i or Ctrl+A/Ctrl+I when searchable)
- **Real-time search** - Filter choices across all groups simultaneously
- **Keyboard navigation** - Navigate between items and jump between groups with Tab
- **Selection stats** - See how many items are selected in each group and overall
- **Theming support** - Customize icons and colors

## Installation

```bash
pnpm add inquirer-grouped-checkbox
```

## Usage

```typescript
import groupedCheckbox from 'inquirer-grouped-checkbox'

const selected = await groupedCheckbox({
    message: 'Select items to process',
    groups: [
        {
            key: 'fruits',
            label: 'Fruits',
            icon: '🍎',
            choices: [
                { value: 'apple', name: 'Apple' },
                { value: 'banana', name: 'Banana' },
                { value: 'orange', name: 'Orange' },
            ],
        },
        {
            key: 'vegetables',
            label: 'Vegetables',
            icon: '🥬',
            choices: [
                { value: 'carrot', name: 'Carrot' },
                { value: 'broccoli', name: 'Broccoli' },
                { value: 'spinach', name: 'Spinach' },
            ],
        },
    ],
    searchable: true,
    pageSize: 15,
})

console.log(selected)
// Output: { fruits: ['apple', 'banana'], vegetables: ['carrot'] }
```

## API

### `groupedCheckbox(config)`

Returns a `Promise` that resolves to an object with group keys mapping to arrays of selected values.

#### Config Options

| Option             | Type       | Default    | Description                                                   |
| ------------------ | ---------- | ---------- | ------------------------------------------------------------- |
| `message`          | `string`   | _required_ | The question to display                                       |
| `groups`           | `Group[]`  | _required_ | Array of groups containing choices                            |
| `searchable`       | `boolean`  | `false`    | Enable real-time filtering                                    |
| `pageSize`         | `number`   | `15`       | Number of items to display at once                            |
| `required`         | `boolean`  | `false`    | Require at least one selection                                |
| `validate`         | `function` | -          | Custom validation function                                    |
| `theme`            | `object`   | -          | Theme customization                                           |
| `hideOverallTotal` | `boolean`  | `false`    | Hide the running total that appears next to the message       |
| `hideGroupTotals`  | `boolean`  | `false`    | Hide the running total that appears next to each group's name |

#### Group Object

| Property  | Type       | Description                                             |
| --------- | ---------- | ------------------------------------------------------- |
| `key`     | `string`   | Unique identifier for the group (used in result object) |
| `label`   | `string`   | Display name for the group header                       |
| `icon`    | `string`   | Optional icon to show before the label                  |
| `choices` | `Choice[]` | Array of choices in this group                          |

#### Choice Object

| Property      | Type                | Description                                            |
| ------------- | ------------------- | ------------------------------------------------------ |
| `value`       | `any`               | The value returned when selected                       |
| `name`        | `string`            | Display text (defaults to `value` if not provided)     |
| `description` | `string`            | Additional description shown when item is focused      |
| `short`       | `string`            | Short display text for the answer (defaults to `name`) |
| `checked`     | `boolean`           | Whether the item is pre-selected                       |
| `disabled`    | `boolean \| string` | Disable selection (string shows reason)                |

## Keyboard Shortcuts

| Key         | Action                                    |
| ----------- | ----------------------------------------- |
| `↑` / `↓`   | Move cursor up/down                       |
| `Space`     | Toggle current item or all items in group |
| `Enter`     | Submit selection                          |
| `Tab`       | Jump to next group                        |
| `Shift+Tab` | Jump to previous group                    |
| `a`         | Toggle all visible (when not searchable)  |
| `i`         | Invert all visible (when not searchable)  |
| `Ctrl+A`    | Toggle all visible (when searchable)      |
| `Ctrl+I`    | Invert all visible (when searchable)      |
| `Escape`    | Clear search query                        |
| `Backspace` | Delete last search character              |

When `searchable: true`, typing alphanumeric characters filters the choices in real-time.

Group headers are navigable and display a checkbox. Pressing `Space` on a group header toggles all non-disabled items within that group. The header shows the selection count (e.g., `(2/5)`) and its checkbox reflects whether all items in the group are selected.

## Examples

### With Validation

```typescript
const selected = await groupedCheckbox({
    message: 'Select at least 2 items',
    groups: [
        /* ... */
    ],
    validate: (selections) => {
        const total = Object.values(selections).flat().length
        if (total < 2) {
            return 'Please select at least 2 items'
        }
        return true
    },
})
```

### With Pre-selected Items

```typescript
const selected = await groupedCheckbox({
    message: 'Select items',
    groups: [
        {
            key: 'defaults',
            label: 'Recommended',
            choices: [
                { value: 'option1', name: 'Option 1', checked: true },
                { value: 'option2', name: 'Option 2', checked: true },
                { value: 'option3', name: 'Option 3' },
            ],
        },
    ],
})
```

### With Disabled Items

```typescript
const selected = await groupedCheckbox({
    message: 'Select available items',
    groups: [
        {
            key: 'items',
            label: 'Items',
            choices: [
                { value: 'available', name: 'Available Item' },
                { value: 'unavailable', name: 'Unavailable', disabled: 'Out of stock' },
            ],
        },
    ],
})
```

### With Descriptions

```typescript
const selected = await groupedCheckbox({
    message: 'Select a plan',
    groups: [
        {
            key: 'plans',
            label: 'Plans',
            choices: [
                {
                    value: 'basic',
                    name: 'Basic Plan',
                    description: '$9/month - 10GB storage, email support',
                },
                {
                    value: 'pro',
                    name: 'Pro Plan',
                    description: '$29/month - 100GB storage, priority support',
                },
            ],
        },
    ],
})
```

### Without Running Total

```typescript
const selected = await groupedCheckbox({
    message: 'Select items',
    hideOverallTotal: true, // Hide the (2/6) total from the message
    hideGroupTotals: true, // Hide the (1/3) total from the group name
    groups: [
        /* ... */
    ],
})
```

## Theming

You can customize the appearance by passing a theme object:

```typescript
const selected = await groupedCheckbox({
    message: 'Select items',
    groups: [
        /* ... */
    ],
    theme: {
        checkbox: {
            icon: {
                checked: '[x]',
                unchecked: '[ ]',
                cursor: '>',
            },
            style: {
                highlight: (text) => `\x1b[36m${text}\x1b[0m`, // cyan
                groupHeader: (text, icon) => `\x1b[1m${icon ? `${icon} ` : ''}${text}\x1b[0m`,
            },
            helpMode: 'always', // 'always' | 'never' | 'auto'
        },
    },
})
```

## TypeScript

Full TypeScript support is included. You can type your values:

```typescript
import groupedCheckbox, { type GroupedSelections } from 'inquirer-grouped-checkbox'

type FruitOrVegetable = 'apple' | 'banana' | 'carrot' | 'broccoli'

const selected: GroupedSelections<FruitOrVegetable> = await groupedCheckbox({
    message: 'Select items',
    groups: [
        {
            key: 'fruits',
            label: 'Fruits',
            choices: [
                { value: 'apple' as const, name: 'Apple' },
                { value: 'banana' as const, name: 'Banana' },
            ],
        },
        {
            key: 'vegetables',
            label: 'Vegetables',
            choices: [
                { value: 'carrot' as const, name: 'Carrot' },
                { value: 'broccoli' as const, name: 'Broccoli' },
            ],
        },
    ],
})
```

## License

See `LICENSE` file
