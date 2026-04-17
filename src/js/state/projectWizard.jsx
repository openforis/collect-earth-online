import { atom } from "jotai";

export const projectWizardAtom = atom({
  projectSource: null, // 'newProject' | 'importProject' | 'templateProject'
  overview: {projectName: '',
             projectDescription: '',
             projectType: null, // 'simplified' | 'regular'
             learningMaterial: '',
             visibility: null, // 'public' | 'users' | 'institution' | 'private'
             projectOptions: {
               gee: false,
               extraPlotColumns: false,
               plotConfidence: false,
               autoGeo: false
             }},
  imagery: [],
  boundary: [],
  plots: [],
  samples: [],
  questions: [],
  rules: []  
});
