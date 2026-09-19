import type { SeedSubject } from '../../core/types'

export const SEED_SUBJECTS: SeedSubject[] = [
  {
    name: 'General Science',
    topics: [
      {
        name: 'Physics',
        subtopics: [
          'Mechanics & Motion',
          'Heat, Light & Sound',
          'Electricity & Magnetism',
          'Modern Physics',
        ],
      },
      {
        name: 'Chemistry',
        subtopics: [
          'Elements, Compounds & Mixtures',
          'Acids, Bases & Salts',
          'Metals & Non-metals',
          'Chemistry in Everyday Life',
        ],
      },
      {
        name: 'Biology',
        subtopics: [
          'Human Body & Health',
          'Plant Kingdom',
          'Genetics & Evolution',
          'Diseases & Nutrition',
        ],
      },
      {
        name: 'Science & Technology (Current)',
        subtopics: [
          'Space Technology (ISRO)',
          'Defence Technology',
          'IT & Digital India',
          'Biotechnology',
        ],
      },
    ],
  },
  {
    name: 'Indian History',
    topics: [
      {
        name: 'Ancient India',
        subtopics: [
          'Indus Valley Civilization',
          'Vedic Period',
          'Mauryan & Gupta Empires',
          'Buddhism & Jainism',
        ],
      },
      {
        name: 'Medieval India',
        subtopics: [
          'Delhi Sultanate',
          'Mughal Empire',
          'Bhakti & Sufi Movements',
          'Vijayanagara & Deccan Sultanates',
        ],
      },
      {
        name: 'Modern India',
        subtopics: [
          'Advent of Europeans',
          'Revolt of 1857',
          'Indian National Movement',
          'Post-Independence Consolidation',
        ],
      },
      {
        name: 'Telangana History',
        subtopics: [
          'Kakatiya Dynasty',
          'Qutub Shahi Dynasty',
          'Asaf Jahi (Nizam) Rule',
          'Telangana Armed Struggle (1946-51)',
        ],
      },
    ],
  },
  {
    name: 'Telangana Movement & State Formation',
    topics: [
      { name: 'Andhra-Telangana Merger (1956)' },
      { name: 'Early Statehood Demands (Vishalandhra, Mulki Rules)' },
      { name: 'Telangana Movement Phase-I (1969)' },
      { name: 'Telangana Movement Phase-II (2001-2014)' },
      { name: 'AP Reorganization Act 2014' },
      { name: 'Post-Formation Developments' },
    ],
  },
  {
    name: 'Indian Polity & Constitution',
    topics: [
      {
        name: 'Constitutional Framework',
        subtopics: [
          'Making of the Constitution',
          'Preamble & Salient Features',
          'Fundamental Rights & Duties',
          'Directive Principles',
        ],
      },
      {
        name: 'Union Government',
        subtopics: [
          'President, PM & Council of Ministers',
          'Parliament (Lok Sabha & Rajya Sabha)',
          'Judiciary & Supreme Court',
        ],
      },
      {
        name: 'State Government & Local Bodies',
        subtopics: [
          'Governor & State Legislature',
          'Panchayati Raj (73rd Amendment)',
          'Municipalities (74th Amendment)',
        ],
      },
      {
        name: 'Telangana State Polity',
        subtopics: ['TS Legislature & Secretariat', 'TS Local Governance'],
      },
    ],
  },
  {
    name: 'Geography',
    topics: [
      {
        name: 'Indian Geography',
        subtopics: [
          'Physical Features & Rivers',
          'Climate & Monsoon',
          'Natural Resources & Minerals',
          'Agriculture & Irrigation',
        ],
      },
      {
        name: 'Telangana Geography',
        subtopics: [
          'Physical Features & Plateaus',
          'Rivers (Godavari, Krishna, Musi)',
          'Soils, Forests & Climate',
          'Districts & Administrative Divisions',
        ],
      },
      {
        name: 'World Geography',
        subtopics: ['Continents & Oceans', 'World Climate Zones', 'Natural Resources (World)'],
      },
    ],
  },
  {
    name: 'Indian & Telangana Economy',
    topics: [
      {
        name: 'Indian Economy',
        subtopics: [
          'Economic Planning & NITI Aayog',
          'Budget, Taxation & Fiscal Policy',
          'Banking & Monetary Policy',
          'Poverty, Unemployment & Inclusive Growth',
        ],
      },
      {
        name: 'Telangana Economy',
        subtopics: [
          'State Budget & Revenue',
          'Industries & IT Sector',
          'Irrigation Projects (Kaleshwaram, Mission Kakatiya)',
          'Welfare Schemes (Telangana)',
        ],
      },
    ],
  },
  {
    name: 'Environment & Ecology',
    topics: [
      { name: 'Ecosystems & Biodiversity' },
      { name: 'Climate Change & Global Warming' },
      { name: 'Environmental Protection Laws' },
      { name: 'Telangana Wildlife & Forests' },
    ],
  },
  {
    name: 'Reasoning & Mental Ability',
    topics: [
      {
        name: 'Verbal Reasoning',
        subtopics: [
          'Analogy & Classification',
          'Series Completion',
          'Coding-Decoding',
          'Blood Relations',
        ],
      },
      {
        name: 'Non-Verbal Reasoning',
        subtopics: ['Mirror & Water Images', 'Figure Series & Analogy', 'Paper Folding & Cutting'],
      },
      {
        name: 'Logical & Analytical Reasoning',
        subtopics: ['Syllogisms', 'Puzzles & Seating Arrangement', 'Data Sufficiency'],
      },
    ],
  },
  {
    name: 'Quantitative Aptitude',
    topics: [
      {
        name: 'Arithmetic',
        subtopics: [
          'Number System',
          'Percentage, Profit & Loss',
          'Ratio, Proportion & Averages',
          'Simple & Compound Interest',
        ],
      },
      {
        name: 'Algebra & Geometry',
        subtopics: ['Basic Algebra', 'Mensuration', 'Geometry & Trigonometry'],
      },
      {
        name: 'Data Interpretation',
        subtopics: ['Tables & Graphs', 'Pie Charts & Bar Diagrams', 'Data Sufficiency'],
      },
    ],
  },
  {
    name: 'English Language',
    topics: [
      { name: 'Grammar', subtopics: ['Parts of Speech', 'Tenses & Voice', 'Sentence Correction'] },
      {
        name: 'Vocabulary',
        subtopics: ['Synonyms & Antonyms', 'One-word Substitution', 'Idioms & Phrases'],
      },
      {
        name: 'Comprehension & Writing',
        subtopics: ['Reading Comprehension', 'Cloze Test', 'Para Jumbles'],
      },
    ],
  },
  {
    name: 'Current Affairs & General Knowledge',
    topics: [
      { name: 'National Current Affairs' },
      { name: 'International Current Affairs' },
      { name: 'Telangana State Current Affairs' },
      { name: 'Sports, Awards & Books' },
      { name: 'Government Schemes (Central & State)' },
    ],
  },
  {
    name: 'Computer Awareness',
    topics: [
      { name: 'Fundamentals of Computers' },
      { name: 'MS Office & Internet' },
      { name: 'Cyber Security Basics' },
      { name: 'Digital India Initiatives' },
    ],
  },
]
