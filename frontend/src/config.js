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
        { id: 'insurance', label: 'Insurance' },
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
      id: 'others',
      label: 'Others',
      subcategories: [
        { id: 'shopping', label: 'Shopping' },
        { id: 'hobbies', label: 'Hobbies' },
        { id: 'offering', label: 'Offering' },
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