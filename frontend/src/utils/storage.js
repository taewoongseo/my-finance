const ACCOUNTS_KEY = 'myfinance_accounts';
const MONTHS_KEY = 'myfinance_months';

// ── Accounts ──────────────────────────────
export const getAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
  } catch { return []; }
};

export const saveAccount = (account) => {
  const accounts = getAccounts();
  const exists = accounts.find(a => a.id === account.id);
  if (exists) return accounts;
  const updated = [...accounts, account];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteAccount = (accountId) => {
  const updated = getAccounts().filter(a => a.id !== accountId);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
};

// ── Month data ────────────────────────────
export const getMonthData = (monthKey) => {
  try {
    const all = JSON.parse(localStorage.getItem(MONTHS_KEY)) || {};
    return all[monthKey] || null;
  } catch { return null; }
};

export const saveMonthData = (monthKey, data) => {
  try {
    const all = JSON.parse(localStorage.getItem(MONTHS_KEY)) || {};
    all[monthKey] = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(MONTHS_KEY, JSON.stringify(all));
  } catch (e) { console.error('Save failed', e); }
};

export const getAllMonths = () => {
  try {
    return JSON.parse(localStorage.getItem(MONTHS_KEY)) || {};
  } catch { return {}; }
};