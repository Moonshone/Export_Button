export const PROJECT_SELECTORS = {
  area: '[data-testid="project-page"], [data-project-id], main [aria-label*="Projekt" i], main [data-testid*="project" i]',
  title: '[data-testid="project-title"], [data-project-title], h1',
  chatContainer: '[data-testid="project-chats"], [data-project-chats], [aria-label*="Projekt-Chats" i]',
  chatLink: 'a[href*="/c/"]',
  instructions: '[data-testid="project-instructions"], [data-project-instructions], [aria-label*="Projektanweis" i]',
  file: '[data-testid*="file" i], [data-project-file], a[download]',
} as const

export const PROJECT_URL_PATTERN = /^\/g\/g-p-[^/]+(?:\/|$)|^\/project\/([^/]+)(?:\/|$)/
export const CHAT_URL_PATTERN = /^\/c\/([A-Za-z0-9_-]+)(?:[/?#]|$)/
