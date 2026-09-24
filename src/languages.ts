// Complete language library for the Translate tool.
// Covers every country's official/major languages plus ALL Indian
// scheduled + regional languages, grouped by region and script.
// The tool also lets you TYPE any language, so nothing here limits you.

export interface LanguageGroup {
  region: string
  script: string
  languages: string[]
}

export interface Language {
  name: string
  region: string
  script: string
}

const GROUPS: LanguageGroup[] = [
  /* ---------- INDIA — all 22 scheduled + regional languages ---------- */
  { region: 'India', script: 'Devanagari', languages: [
    'Hindi', 'Marathi', 'Nepali', 'Sanskrit', 'Bhojpuri', 'Magahi', 'Awadhi',
    'Chhattisgarhi', 'Haryanvi', 'Rajasthani', 'Marwari', 'Mewari', 'Garhwali',
    'Kumaoni', 'Dogri', 'Konkani', 'Maithili', 'Bodo', 'Kurmali', 'Sadri (Nagpuri)',
    'Angika', 'Bundeli', 'Bagheli', 'Braj', 'Malvi', 'Nimadi', 'Ahirani', 'Varhadi',
    'Khandeshi', 'Bhili', 'Gondi', 'Halbi', 'Kurukh (Kurux)', 'Kuri', 'Bhagoria',
  ] },
  { region: 'India', script: 'Bengali', languages: [
    'Bengali', 'Assamese', 'Bishnupriya Manipuri', 'Kamrupi', 'Goalpariya',
    'Rajbanshi', 'Surjapuri',
  ] },
  { region: 'India', script: 'Gurmukhi', languages: ['Punjabi'] },
  { region: 'India', script: 'Gujarati', languages: ['Gujarati', 'Kutchi'] },
  { region: 'India', script: 'Tamil', languages: ['Tamil'] },
  { region: 'India', script: 'Telugu', languages: ['Telugu'] },
  { region: 'India', script: 'Kannada', languages: ['Kannada', 'Tulu', 'Kodava'] },
  { region: 'India', script: 'Malayalam', languages: ['Malayalam', 'Beary'] },
  { region: 'India', script: 'Odia', languages: ['Odia (Oriya)', 'Sambalpuri'] },
  { region: 'India', script: 'Urdu / Perso-Arabic', languages: [
    'Urdu', 'Kashmiri', 'Sindhi', 'Kangri (Shahmukhi)',
  ] },
  { region: 'India', script: 'Meitei Mayek', languages: ['Manipuri (Meitei)'] },
  { region: 'India', script: 'Ol Chiki', languages: ['Santali'] },
  { region: 'India', script: 'Latin & other local scripts', languages: [
    'Mizo (Lushai)', 'Khasi', 'Garo', 'Ao', 'Angami', 'Sema (Sumi)', 'Lotha',
    'Konyak', 'Tangkhul', 'Phom', 'Chang', 'Wancho', 'Nocte', 'Tangsa', 'Adi',
    'Apatani', 'Nyishi', 'Galo', 'Mishmi (Idu)', 'Karbi', 'Dimasa', 'Rabha',
    'Tiwa (Lalung)', 'Kokborok (Tripuri)', 'Jaintia', 'Pnar', 'War', 'Ho',
    'Mundari', 'Kharia', 'Juang', 'Savara (Sora)', 'Kui', 'Kuvi', 'Bhumij',
    'Malto', 'Kisan', 'Korwa', 'Bonda', 'Koya', 'Gadaba', 'Sauri', 'Pardhi',
  ] },

  /* ---------- AFRICA ---------- */
  { region: 'Africa', script: 'Latin', languages: [
    'Swahili', 'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Xhosa', 'Afrikaans', 'Somali',
    'Sesotho', 'Tswana (Setswana)', 'Shona', 'Ndebele', 'Tsonga (Xitsonga)',
    'Venda (Tshivenda)', 'Swati (siSwati)', 'Chewa (Chichewa)', 'Tumbuka',
    'Bemba', 'Lozi', 'Kikongo (Kongo)', 'Lingala', 'Tshiluba (Luba-Kasai)',
    'Kinyarwanda', 'Kirundi', 'Ganda (Luganda)', 'Sango', 'Wolof', 'Fula (Fulani)',
    'Bambara', 'Mandinka', 'Dyula', 'Malinke', 'Soninke', 'Mossi (Moore)',
    'Ewe', 'Fon', 'Akan (Twi)', 'Ga', 'Dagbani', 'Fante', 'Gikuyu (Kikuyu)',
    'Dholuo (Luo)', 'Luhya', 'Kamba', 'Meru', 'Maasai', 'Kalenjin', 'Sukuma',
    'Nyamwezi', 'Chaga', 'Haya', 'Nyanja', 'Makua', 'Yao', 'Chokwe', 'Umbundu',
    'Kimbundu', 'Ovambo', 'Herero', 'Kwanyama',
    'Malagasy', 'Seychellois Creole', 'Mauritian Creole', 'Cape Verdean Creole',
    'Krio (Sierra Leone)', 'Guinea-Bissau Creole', 'Pulaar', 'Kanuri', 'Tigre',
    'Fang', 'Vili', 'Pedi (Sepedi)',
  ] },
  { region: 'Africa', script: 'Semitic (Geʼez / Arabic)', languages: [
    'Amharic', 'Tigrinya', 'Hausa (Ajami)', 'Berber (Tamazight)', 'Kabyle',
    'Shilha (Tachelhit)', 'Riffian', 'Tuareg (Tamashek)',
  ] },

  /* ---------- MIDDLE EAST & CENTRAL ASIA ---------- */
  { region: 'Middle East & Central Asia', script: 'Arabic', languages: [
    'Arabic', 'Egyptian Arabic', 'Levantine Arabic', 'Iraqi Arabic', 'Gulf Arabic',
    'Moroccan Arabic', 'Persian (Farsi)', 'Dari', 'Tajik', 'Pashto',
    'Kurdish (Sorani)', 'Uyghur', 'Balochi', 'Luri', 'Gilaki', 'Mazanderani',
    'Assyrian (Neo-Aramaic)',
  ] },
  { region: 'Middle East & Central Asia', script: 'Cyrillic', languages: [
    'Kazakh', 'Kyrgyz', 'Turkmen', 'Uzbek (Cyrillic)', 'Bashkir', 'Tatar',
    'Chechen', 'Ossetian', 'Ingush', 'Avar', 'Lezgian', 'Kabardian (Circassian)',
    'Karachay-Balkar', 'Dargwa', 'Kumyk', 'Nogai', 'Yakut (Sakha)', 'Buryat',
    'Altai', 'Khakas', 'Tuvan', 'Kalmyk', 'Mari', 'Komi', 'Udmurt', 'Erzya',
    'Moksha', 'Chuvash', 'Meadow Mari',
  ] },
  { region: 'Middle East & Central Asia', script: 'Latin & other', languages: [
    'Turkish', 'Azerbaijani', 'Uzbek (Latin)', 'Kurdish (Kurmanji)', 'Zazaki',
    'Georgian', 'Armenian', 'Hebrew', 'Yiddish', 'Mongolian (Cyrillic)',
    'Mongolian (Traditional)', 'Laz', 'Abkhaz',
  ] },

  /* ---------- EUROPE ---------- */
  { region: 'Europe', script: 'Latin', languages: [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
    'Polish', 'Czech', 'Slovak', 'Romanian', 'Hungarian', 'Croatian', 'Slovenian',
    'Bosnian', 'Montenegrin', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
    'Icelandic', 'Estonian', 'Latvian', 'Lithuanian', 'Irish', 'Welsh',
    'Scottish Gaelic', 'Manx', 'Cornish', 'Breton', 'Catalan', 'Galician',
    'Basque', 'Occitan', 'Romansh', 'Sardinian', 'Sicilian', 'Neapolitan',
    'Piedmontese', 'Lombard', 'Venetian', 'Friulian', 'Ladin', 'Maltese',
    'Luxembourgish', 'Faroese', 'Northern Sami', 'Lule Sami', 'Southern Sami',
    'Inari Sami', 'Skolt Sami', 'Karelian', 'Veps', 'Võro', 'Livonian',
    'Romani', 'Silesian', 'Kashubian', 'Sorbian (Upper & Lower)', 'Yiddish (Latin)',
    'Albanian', 'Rusyn (Latin)', 'Gagauz (Latin)', 'Crimean Tatar (Latin)',
  ] },
  { region: 'Europe', script: 'Cyrillic', languages: [
    'Russian', 'Ukrainian', 'Belarusian', 'Bulgarian', 'Macedonian',
    'Serbian (Cyrillic)', 'Serbian (Latin)', 'Rusyn', 'Gagauz (Cyrillic)',
  ] },
  { region: 'Europe', script: 'Greek', languages: ['Greek', 'Cypriot Greek'] },

  /* ---------- EAST & SOUTHEAST ASIA ---------- */
  { region: 'East & Southeast Asia', script: 'CJK', languages: [
    'Chinese (Simplified)', 'Chinese (Traditional)', 'Cantonese', 'Hokkien (Minnan)',
    'Hakka', 'Shanghainese (Wu)', 'Teochew', 'Japanese', 'Korean', 'Zhuang',
  ] },
  { region: 'East & Southeast Asia', script: 'Southeast Asian scripts', languages: [
    'Thai', 'Lao', 'Khmer', 'Burmese', 'Tibetan', 'Dzongkha', 'Shan',
    'Karen', 'Mon', 'Tai Lue', 'Jawi (Malay Arabic script)',
  ] },
  { region: 'East & Southeast Asia', script: 'Latin', languages: [
    'Vietnamese', 'Indonesian', 'Malay', 'Filipino (Tagalog)', 'Cebuano',
    'Ilocano', 'Hiligaynon', 'Kapampangan', 'Pangasinan', 'Waray', 'Bicolano',
    'Maranao', 'Maguindanao', 'Tausug', 'Chavacano', 'Javanese', 'Sundanese',
    'Madurese', 'Balinese', 'Minangkabau', 'Buginese', 'Makassarese', 'Acehnese',
    'Batak (Toba)', 'Banjar', 'Tetum', 'Bikol', 'Iban', 'Kadazan-Dusun',
  ] },
  { region: 'East & Southeast Asia', script: 'Other scripts', languages: [
    'Sinhala', 'Divehi (Maldivian)', 'Ainu',
  ] },

  /* ---------- AMERICAS ---------- */
  { region: 'Americas', script: 'Latin & native scripts', languages: [
    'English', 'Spanish', 'French', 'Portuguese', 'Dutch', 'Haitian Creole',
    'Quechua', 'Aymara', 'Guaraní', 'Nahuatl', 'Yucatec Maya', 'Kʼicheʼ',
    'Kaqchikel', 'Mam', 'Tzotzil', 'Tzeltal', 'Mixtec', 'Zapotec', 'Otomi',
    'Purépecha', 'Mapudungun (Mapuche)', 'Kichwa', 'Wayuu', 'Warao', 'Pemon',
    'Yanomami', 'Sranan Tongo', 'Papiamento', 'Jamaican Patois', 'Belizean Kriol',
    'Greenlandic (Kalaallisut)', 'Inuktitut', 'Cree', 'Ojibwe', 'Navajo',
    'Cherokee', 'Choctaw', 'Lakota', 'Hopi', 'Blackfoot', 'Mi\'kmaq',
    'Miskito', 'Kuna', 'Emberá', 'Yaruro', 'Shipibo',
    'Asháninka', 'Wichi', 'Qʼeqchiʼ', 'Chʼortiʼ', 'Garifuna', 'Palenquero',
  ] },

  /* ---------- OCEANIA & PACIFIC ---------- */
  { region: 'Oceania & Pacific', script: 'Latin', languages: [
    'English', 'French', 'Fijian', 'Hindi (Fiji)', 'Samoan', 'Tongan',
    'Māori', 'Hawaiian', 'Tahitian', 'Rapa Nui', 'Tok Pisin', 'Hiri Motu',
    'Bislama', 'Marshallese', 'Palauan', 'Nauruan', 'Tuvaluan', 'Kiribati (Gilbertese)',
    'Niuean', 'Pohnpeian', 'Kosraean', 'Chuukese', 'Yapese', 'Carolinian',
    'Islander (Māori)', 'Chamorro', 'Rotuman', 'Banaban', 'Ambonese Malay',
  ] },

  /* ---------- CLASSICAL & CONSTRUCTED ---------- */
  { region: 'Classical & constructed', script: 'Various', languages: [
    'Latin', 'Ancient Greek', 'Classical Arabic', 'Esperanto', 'Interlingua',
    'Ido', 'Lojban', 'Toki Pona', 'Volapük', 'Novial', 'Klingon',
    'Sindarin (Elvish)', 'Quenya (Elvish)', 'High Valyrian', 'Dothraki',
  ] },
]

export const LANGUAGES: Language[] = [
  ...new Map(GROUPS.flatMap((g) => g.languages.map((name) => ({ name, region: g.region, script: g.script }))).map((l) => [l.name, l])).values(),
]

export const POPULAR_LANGUAGES: string[] = [
  'English',
  'Spanish',
  'French',
  'German',
  'Hindi',
  'Chinese (Simplified)',
  'Arabic',
  'Portuguese',
  'Japanese',
  'Russian',
  'Italian',
  'Bengali',
  'Telugu',
  'Tamil',
  'Marathi',
  'Kannada',
  'Malayalam',
  'Urdu',
  'Gujarati',
  'Punjabi',
]

export const AUTO_LANGUAGE = 'Auto-detect (→ English)'