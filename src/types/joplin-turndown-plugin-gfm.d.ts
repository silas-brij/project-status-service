declare module '@joplin/turndown-plugin-gfm' {
  import type TurndownService from 'turndown'

  /** Tables, strikethrough, task-list checkboxes and highlighted code blocks. */
  export const gfm: TurndownService.Plugin
}
