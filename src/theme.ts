import figures from '@inquirer/figures'
import { styleText } from 'node:util'

export interface GroupedCheckboxTheme {
    icon: {
        checked: string
        unchecked: string
        cursor: string
    }
    style: {
        disabledChoice: (text: string) => string
        groupHeader: (text: string, icon?: string) => string
        searchQuery: (text: string) => string
        highlight: (text: string) => string
        description: (text: string) => string
    }
    helpMode: 'always' | 'never' | 'auto'
}

export const defaultTheme: GroupedCheckboxTheme = {
    icon: {
        checked: figures.circleFilled,
        unchecked: figures.circle,
        cursor: figures.pointer,
    },
    style: {
        disabledChoice: (text: string) => styleText('dim', text),
        groupHeader: (text: string, icon?: string) => styleText('bold', icon ? `${icon} ${text}` : text),
        searchQuery: (text: string) => styleText('cyan', text),
        highlight: (text: string) => styleText('cyan', text),
        description: (text: string) => styleText('dim', text),
    },
    helpMode: 'auto',
}
