export const FOLDER_STRUCTURE = [
  {
    key: 'at-home',
    label: 'At-Home Practice',
    icon: '🏠',
    children: [],
  },
  {
    key: 'official',
    label: 'Official Practice',
    icon: '🎯',
    children: [],
  },
  {
    key: 'choreo',
    label: 'Choreo Segments',
    icon: '🎬',
    children: [
      { key: 'choreo-intro', label: 'Intro' },
      { key: 'choreo-saap', label: 'Saap' },
      { key: 'choreo-dhammal', label: 'Dhammal' },
      { key: 'choreo-khunda', label: 'Khunda' },
      { key: 'choreo-jhum-transition', label: 'Jhum Transition' },
      { key: 'choreo-jhummar', label: 'Jhummar' },
      { key: 'choreo-gen-seg', label: 'Gen Seg' },
      { key: 'choreo-luddi', label: 'Luddi' },
      { key: 'choreo-ending', label: 'Ending' },
    ],
  },
]

// Flatten all folder keys (leaf nodes only) for the folder select dropdown
export function getAllFolders() {
  const folders = []
  for (const f of FOLDER_STRUCTURE) {
    if (f.children && f.children.length > 0) {
      for (const child of f.children) {
        folders.push({ key: child.key, label: `${f.label} / ${child.label}` })
      }
    } else {
      folders.push({ key: f.key, label: f.label })
    }
  }
  return folders
}

export const DEFAULT_MEMBERS = Array.from({ length: 12 }, (_, i) => `Member ${i + 1}`)

export const EXPENSE_CATEGORIES = [
  'Competition',
  'Costumes',
  'Props',
  'Travel',
  'Food',
  'Venue',
  'Other',
]

export const CATEGORY_COLORS = {
  Competition: '#cc0000',
  Costumes: '#9333ea',
  Props: '#2563eb',
  Travel: '#0891b2',
  Food: '#16a34a',
  Venue: '#ca8a04',
  Other: '#6b7280',
}
