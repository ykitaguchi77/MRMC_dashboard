export const FACILITIES = [
  "大阪大学",
  "施設B",
  "施設C",
  "施設D",
  "施設E",
  "施設F",
  "施設G",
  "施設H",
  "施設I",
] as const;

export type Facility = (typeof FACILITIES)[number];
