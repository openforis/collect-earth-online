import { atom } from 'jotai';

export const chatWidgetAtom = atom({
  enabled: false, // the server has :collect-earth-online.chat/url configured
  open: false,
  loaded: false, // Deep Chat is mounted on first open and kept so the conversation survives closing
});
