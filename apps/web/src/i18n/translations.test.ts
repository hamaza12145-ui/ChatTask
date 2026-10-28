import { translations, Locale } from './translations';

describe('Internationalization / Translations Test Suite', () => {
  it('should have complete English and Urdu translation keys matching', () => {
    const enKeys = Object.keys(translations.en).sort();
    const urKeys = Object.keys(translations.ur).sort();

    expect(enKeys).toEqual(urKeys);
  });

  it('should contain essential navigation and task labels', () => {
    expect(translations.en.chats).toBe('Chats');
    expect(translations.en.tasks).toBe('Tasks');
    expect(translations.en.reports).toBe('Reports');
    expect(translations.en.create_task).toBe('Create Task');
    expect(translations.en.my_tasks).toBe('My Tasks');

    expect(translations.ur.chats).toBe('چیٹس');
    expect(translations.ur.tasks).toBe('ٹاسکس');
    expect(translations.ur.reports).toBe('رپورٹس');
  });
});
