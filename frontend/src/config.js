export const ACCOUNT_TYPES = [
    'Credit Card',
    'Checking',
    'Savings',
    'Venmo/Cash App',
    'Other',
  ];
  
  export const CATEGORY_HIERARCHY = [
    {
      id: 'housing',
      label: 'Housing',
      subcategories: [
        { id: 'rent', label: 'Rent' },
        { id: 'insurance', label: 'Home Insurance' },
      ],
    },
    {
      id: 'food',
      label: 'Food',
      subcategories: [
        { id: 'groceries', label: 'Groceries' },
        { id: 'dine_out', label: 'Dine out' },
        { id: 'drinks_snacks', label: 'Drinks/snacks' },
      ],
    },
    {
      id: 'transportation',
      label: 'Transportation',
      subcategories: [
        { id: 'uber_lyft', label: 'Uber/Lyft' },
        { id: 'metro_ferry', label: 'Metro/Ferry' },
        { id: 'flights_travel', label: 'Flights/Travel' },
      ],
    },
    {
      id: 'utilities',
      label: 'Utilities',
      subcategories: [
        { id: 'energy', label: 'Energy/Electricity' },
        { id: 'wifi', label: 'Wifi' },
        { id: 'phone', label: 'Phone' },
        { id: 'household', label: 'Household misc.' },
        { id: 'subscription', label: 'Subscription' },
      ],
    },
    {
      id: 'personal',
      label: 'Personal',
      subcategories: [
        { id: 'shopping', label: 'Shopping' },
        { id: 'hobbies', label: 'Hobbies' },
        { id: 'wellness', label: 'Wellness' },
      ],
    },
    {
      id: 'giving',
      label: 'Giving',
      subcategories: [
        { id: 'offering', label: 'Offering' },
        { id: 'gift', label: 'Gift' },
      ],
    },
    {
      id: 'other',
      label: 'Other',
      subcategories: [
        { id: 'misc', label: 'Misc. Spending' },
        { id: 'bank_fees', label: 'Bank fees' },
      ],
    },
  ];
  
  export const ALL_SUBCATEGORIES = CATEGORY_HIERARCHY.flatMap(c =>
    c.subcategories.map(s => ({ ...s, parentId: c.id, parentLabel: c.label }))
  );
  
  export const TRANSFER_KEYWORDS = [
    'payment thank you',
    'online transfer',
    'mobile payment',
    'zelle',
    'wire transfer',
    'ach transfer',
    'account transfer',
  ];
  
  export const CONFIDENCE_THRESHOLD = 75;

  export const CATEGORY_COLORS = {
    housing:        '#c8f04a',
    food:           '#ff8a7a',
    transportation: '#7ab8ff',
    utilities:      '#f0c248',
    personal:       '#b08cf2',
    giving:         '#f29ec2',
    other:          '#9aa0a6',
  };

  export const ACCOUNT_TINTS = {
    'Credit Card':    { dot: '#b08cf2', soft: 'rgba(176,140,242,0.10)', border: 'rgba(176,140,242,0.20)' },
    'Checking':       { dot: '#7ab8ff', soft: 'rgba(122,184,255,0.10)', border: 'rgba(122,184,255,0.20)' },
    'Savings':        { dot: '#7fe0b6', soft: 'rgba(127,224,182,0.10)', border: 'rgba(127,224,182,0.20)' },
    'Venmo/Cash App': { dot: '#f0c248', soft: 'rgba(240,194,72,0.10)',  border: 'rgba(240,194,72,0.20)'  },
    'Other':          { dot: '#888',    soft: 'rgba(140,140,140,0.10)', border: 'rgba(140,140,140,0.20)' },
  };