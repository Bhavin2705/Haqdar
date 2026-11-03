/**
 * @file questions.js
 * Question definitions for Haqdar eligibility checker.
 * Follows PRD FR-1, FR-2, FR-4 and DESIGN.md section 6.
 */

export const STATES_AND_UTS = Object.freeze([
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]);

export const QUESTION_GROUPS = Object.freeze([
  {
    id: 'about_you',
    title: 'About you',
    stepNumber: 1,
    questions: [
      {
        id: 'age_band',
        label: 'What is your age?',
        helper: 'Schemes have specific minimum and maximum age criteria.',
        type: 'radio',
        hasNotSure: false, // PRD FR-2: No "Not sure" for age band
        options: [
          { value: 'under_18', label: 'Under 18' },
          { value: '18_to_59', label: '18 to 59' },
          { value: '60_and_over', label: '60 and over' },
        ],
      },
      {
        id: 'gender',
        label: 'What is your gender?',
        helper: 'Some welfare schemes are designed specifically for women.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ],
      },
      {
        id: 'state',
        label: 'Which State or Union Territory do you live in?',
        helper: 'Used to check central and state jurisdiction.',
        type: 'select',
        hasNotSure: false, // PRD FR-2: No "Not sure" for state
        options: STATES_AND_UTS.map((s) => ({ value: s, label: s })),
      },
    ],
  },
  {
    id: 'household',
    title: 'Household',
    stepNumber: 2,
    questions: [
      {
        id: 'area',
        label: 'Do you live in a rural or urban area?',
        helper: 'Many schemes apply specifically to rural or urban households.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 'rural', label: 'Rural' },
          { value: 'urban', label: 'Urban' },
        ],
      },
      {
        id: 'caste',
        label: 'What is your social or caste category?',
        helper: 'Select the category as recorded on your government certificates.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 'General', label: 'General' },
          { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
          { value: 'OBC', label: 'OBC (Other Backward Classes)' },
          { value: 'SC', label: 'SC (Scheduled Caste)' },
          { value: 'ST', label: 'ST (Scheduled Tribe)' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ],
      },
      {
        id: 'family_size',
        label: 'How many members are in your family?',
        helper: 'Including yourself, living together in the household (1 to 10).',
        type: 'stepper',
        min: 1,
        max: 10,
        defaultValue: 1,
        hasNotSure: true,
      },
      {
        id: 'income',
        label: 'What is your annual household income?',
        helper: 'Combined earnings of all family members in your household.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 100000, label: 'Up to ₹1,00,000' },
          { value: 250000, label: '₹1,00,001 to ₹2,50,000' },
          { value: 800000, label: '₹2,50,001 to ₹8,00,000' },
          { value: 1500000, label: 'Above ₹8,00,000' },
        ],
      },
    ],
  },
  {
    id: 'land_and_work',
    title: 'Land and work',
    stepNumber: 3,
    questions: [
      {
        id: 'occupation',
        label: 'What is your primary occupation group?',
        helper: 'Select your main source of work or income.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 'farmer', label: 'Farmer / Cultivator' },
          { value: 'labourer', label: 'Daily wage labourer / Agricultural worker' },
          { value: 'salaried', label: 'Salaried employee' },
          { value: 'self_employed', label: 'Self-employed or small business' },
          { value: 'not_working', label: 'Not currently working' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'land',
        label: 'Does any household member own agricultural land?',
        helper: 'Cultivable land registered under any member of the family.',
        type: 'radio',
        hasNotSure: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
    ],
  },
]);

/**
 * All question items in flat list for easy lookup.
 */
export const ALL_QUESTIONS = Object.freeze(
  QUESTION_GROUPS.flatMap((g) => g.questions)
);

/**
 * Map of question by ID for quick access.
 */
export const QUESTION_MAP = Object.freeze(
  new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
);
