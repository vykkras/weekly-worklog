export const PEOPLE = ['Victor', 'Daineris', 'Yeniffer', 'Jessica'] as const;
export type Person = typeof PEOPLE[number] | '';
