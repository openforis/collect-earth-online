import { atom } from "jotai";


export const projectSourceAtom = atom(null);
export const currentStepAtom = atom("overview");
export const projectOverviewAtom = atom (
  {projectName: '',
   projectDescription: '',
   projectType: null, // 'simplified' | 'regular'
   learningMaterial: '',
   visibility: null, // 'public' | 'users' | 'institution' | 'private'
   projectOptions: {
   gee: false,
   extraPlotColumns: false,
   plotConfidence: false,
   autoGeo: false}});

export const projectImageryListAtom = atom([]);

export const boundaryAtom = atom({});
export const plotsAtom = atom({});
export const samplesAtom = atom([]);
export const questionsAtom = atom([]);
export const rulesAtom = atom([]);
