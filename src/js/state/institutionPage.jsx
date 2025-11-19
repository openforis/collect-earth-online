import { atom } from 'jotai';

export const institutionPageAtom = atom({
  projectList: [],
  imageryList: [],
  usersList: [],
  isAdmin: false,
  selectedTab: "projects",
  modalMessage: null,
  modal: null,
  institutionDetails: {}
});
