export type Theme = 'light' | 'dark';

export const THEME_KEY = 'watchhub-admin-theme';

export const applyTheme = (theme: Theme) => {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  localStorage.setItem(THEME_KEY, theme);
};

export const readStoredTheme = (): Theme => (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');

export const THEME_BOOTSTRAP = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;
