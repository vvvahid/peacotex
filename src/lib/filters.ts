export type FilterKey = "occasion" | "technique" | "base" | "edge" | "layout" | "colour";
export type Filters = Record<FilterKey, string[]>;

export const EMPTY: Filters = { occasion: [], technique: [], base: [], edge: [], layout: [], colour: [] };
