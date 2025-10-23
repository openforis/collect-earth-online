import { atom } from "jotai";

export const institutionPageAtom = atom({
  imageryCount: 0,
  usersCount: 0,
  projectList: null,
  isAdmin: false,
  selectedTab: 0,
  modalMessage: null,
  selectedProject: [],
  selectedImagery: [],
  modal: null,
});
