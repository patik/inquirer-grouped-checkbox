#!/usr/bin/env tsx

import groupedCheckbox from '../src/index.js'

async function main() {
    console.log('\n🛒 Grocery Shopping List Demo\n')
    console.log('Use arrow keys to navigate, space to select, enter to confirm.')
    console.log('Try: Tab to jump between groups, Shift+A to select all in group.\n')

    const selected = await groupedCheckbox({
        message: 'What would you like to buy?',
        searchable: true,
        pageSize: 12,
        groups: [
            {
                key: 'fruits',
                label: 'Fruits',
                icon: '🍎',
                choices: [
                    { value: 'apple', name: 'Apple', description: 'Crisp and sweet - $1.50/lb' },
                    { value: 'banana', name: 'Banana', description: 'Rich in potassium - $0.60/lb' },
                    { value: 'orange', name: 'Orange', description: 'Fresh Valencia oranges - $2.00/lb' },
                    { value: 'strawberry', name: 'Strawberry', description: 'Organic strawberries - $4.00/pint' },
                    { value: 'blueberry', name: 'Blueberry', description: 'Antioxidant rich - $5.00/pint' },
                    { value: 'mango', name: 'Mango', description: 'Ripe Alphonso mangoes - $2.50 each', checked: true },
                ],
            },
            {
                key: 'vegetables',
                label: 'Vegetables',
                icon: '🥬',
                choices: [
                    { value: 'carrot', name: 'Carrot', description: 'Fresh organic carrots - $1.00/bunch' },
                    { value: 'broccoli', name: 'Broccoli', description: 'Locally grown - $2.50/head' },
                    { value: 'spinach', name: 'Spinach', description: 'Baby spinach leaves - $3.00/bag' },
                    { value: 'tomato', name: 'Tomato', description: 'Vine-ripened tomatoes - $3.00/lb' },
                    { value: 'cucumber', name: 'Cucumber', description: 'English cucumber - $1.50 each' },
                    {
                        value: 'avocado',
                        name: 'Avocado',
                        description: 'Hass avocados - $2.00 each',
                        disabled: 'Out of season',
                    },
                ],
            },
        ],
    })

    console.log('\n✅ Your shopping list:\n')

    if (selected.fruits.length > 0) {
        console.log('🍎 Fruits:')
        selected.fruits.forEach((fruit) => console.log(`   - ${fruit}`))
    }

    if (selected.vegetables.length > 0) {
        console.log('🥬 Vegetables:')
        selected.vegetables.forEach((veg) => console.log(`   - ${veg}`))
    }

    const total = selected.fruits.length + selected.vegetables.length
    if (total === 0) {
        console.log('   (nothing selected)')
    } else {
        console.log(`\n📦 Total items: ${total}`)
    }

    console.log()
}

main().catch(console.error)
