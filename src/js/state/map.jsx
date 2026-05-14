import { atom } from 'jotai';

// The source-of-truth for what the map COULD show
export const mapImageryLibraryAtom = atom([]); 

// The IDs of what the map IS showing (Base layer + any overlays)
export const activeMapLayerIdsAtom = atom(new Set());
