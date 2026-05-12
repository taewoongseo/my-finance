import { authFetch, API_URL } from './auth';

// ── Accounts ──────────────────────────────────────────────────────────────
export const getAccounts = async (getToken) => {
  try {
    const res = await authFetch(`${API_URL}/data/accounts`, getToken);
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
};

export const saveAccounts = async (accounts, getToken) => {
  try {
    await authFetch(`${API_URL}/data/accounts`, getToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: accounts }),
    });
  } catch (e) { console.error('saveAccounts failed', e); }
};

export const saveAccount = async (account, getToken) => {
  const accounts = await getAccounts(getToken);
  if (accounts.find(a => a.id === account.id)) return accounts;
  const updated = [...accounts, account];
  await saveAccounts(updated, getToken);
  return updated;
};

export const deleteAccount = async (accountId, getToken) => {
  const accounts = await getAccounts(getToken);
  const updated = accounts.filter(a => a.id !== accountId);
  await saveAccounts(updated, getToken);
  return updated;
};

export const updateAccount = async (id, fields, getToken) => {
  const accounts = await getAccounts(getToken);
  const updated = accounts.map(a => a.id === id ? { ...a, ...fields } : a);
  await saveAccounts(updated, getToken);
  return updated;
};

// ── Month data ─────────────────────────────────────────────────────────────
export const getMonthData = async (monthKey, getToken) => {
  try {
    const all = await getAllMonths(getToken);
    return all[monthKey] || null;
  } catch { return null; }
};

export const saveMonthData = async (monthKey, data, getToken) => {
  try {
    await authFetch(`${API_URL}/data/months`, getToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month_key: monthKey, data: { ...data, savedAt: new Date().toISOString() } }),
    });
  } catch (e) { console.error('saveMonthData failed', e); }
};

export const getAllMonths = async (getToken) => {
  try {
    const res = await authFetch(`${API_URL}/data/months`, getToken);
    const json = await res.json();
    return json.data || {};
  } catch { return {}; }
};

export const deleteMonthData = async (monthKey, getToken) => {
  try {
    await authFetch(`${API_URL}/data/months/${monthKey}`, getToken, { method: 'DELETE' });
  } catch (e) { console.error('deleteMonthData failed', e); }
};

// ── Savings accounts ───────────────────────────────────────────────────────
export const getSavingsAccounts = async (getToken) => {
  try {
    const res = await authFetch(`${API_URL}/data/savings_accounts`, getToken);
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
};

export const saveSavingsAccount = async (account, getToken) => {
  const accounts = await getSavingsAccounts(getToken);
  if (accounts.find(a => a.id === account.id)) return accounts;
  const updated = [...accounts, account];
  await authFetch(`${API_URL}/data/savings_accounts`, getToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: updated }),
  });
  return updated;
};

export const deleteSavingsAccount = async (id, getToken) => {
  const accounts = await getSavingsAccounts(getToken);
  const updated = accounts.filter(a => a.id !== id);
  await authFetch(`${API_URL}/data/savings_accounts`, getToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: updated }),
  });
  return updated;
};

// ── Income ─────────────────────────────────────────────────────────────────
export const getMonthIncome = async (month, getToken) => {
  try {
    const res = await authFetch(`${API_URL}/data/income`, getToken);
    const json = await res.json();
    const all = json.data || {};
    return all[month] || { directDeposit: 0, other: [] };
  } catch { return { directDeposit: 0, other: [] }; }
};

export const saveMonthIncome = async (month, income, getToken) => {
  try {
    const res = await authFetch(`${API_URL}/data/income`, getToken);
    const json = await res.json();
    const all = json.data || {};
    all[month] = income;
    await authFetch(`${API_URL}/data/income`, getToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: all }),
    });
  } catch (e) { console.error('saveMonthIncome failed', e); }
};
