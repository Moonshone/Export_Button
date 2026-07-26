export const PROJECT_SELECTORS = {
  area: '[data-testid="project-page"], [data-project-id], main [aria-label*="Projekt" i], main [data-testid*="project" i]',
  title: '[data-testid="project-title"], [data-project-title], h1',
  projectComposer: 'input[placeholder*="Chat in" i], textarea[placeholder*="Chat in" i], [contenteditable="true"][data-placeholder*="Chat in" i], [contenteditable="true"][aria-label*="Chat in" i]',
  tabList: '[role="tablist"]',
  tab: '[role="tab"]',
  chatContainer: '[data-testid="project-chats"], [data-project-chats], [aria-label*="Projekt-Chats" i], [role="tabpanel"]',
  chatLink: 'a[href*="/g/g-p-"][href*="/c/"], [role="link"][href*="/g/g-p-"][href*="/c/"], a[href^="/c/"], [role="link"][href^="/c/"]',
  instructions: '[data-testid="project-instructions"], [data-project-instructions], [aria-label*="Projektanweis" i]',
  file: '[data-testid*="file" i], [data-project-file], a[download]',
} as const

export const PROJECT_URL_PATTERN = /^\/g\/g-p-[A-Za-z0-9_-]+(?:\/project)?\/?$|^\/project\/([^/]+)(?:\/|$)/
