import { createI18n } from 'vue-i18n'
import de from './locales/de.json'

export const i18n = createI18n({
  locale: 'de',
  fallbackLocale: 'de',
  messages: { de },
})
