import { atom } from "jotai";

export const projectWizardAtom = atom({
  createProject: null, // 'newProject' | 'importProject' | 'templateProject'
  overview: [],
  imagery: [],
  boundary: [],
  plots: [],
  samples: [],
  questions: [],
  rules: []  
});
