import { atom } from 'jotai';
import { getPreference } from '../utils/preferences';

export const CHAT_HIDDEN_PREFERENCE = "chat:hidden";

export const chatWidgetAtom = atom({
  enabled: false, // the server has :collect-earth-online.chat/url configured
  hidden: getPreference(CHAT_HIDDEN_PREFERENCE) === "true", // set by the navbar's Show/Hide chatbot button
  open: false,
  loaded: false, // Deep Chat is mounted on first open and kept so the conversation survives closing
});
