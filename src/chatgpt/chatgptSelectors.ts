export const CHATGPT_SELECTORS = {
  conversation: 'main',
  message: '[data-message-author-role]',
  title: 'main h1, main [data-testid="conversation-title"]',
  excludedContent: [
    'button',
    '[role="button"]',
    '[role="menu"]',
    '[aria-hidden="true"]',
    '[hidden]',
    'nav',
    'aside',
    'script',
    'style',
  ].join(','),
} as const
