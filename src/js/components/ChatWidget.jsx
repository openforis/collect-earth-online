import React, { Suspense, lazy, memo, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import "../../css/chat-widget.css";
import { CHAT_HIDDEN_PREFERENCE, chatWidgetAtom } from "../state/chatWidget";
import { CHAT_ERROR_MESSAGE, CHAT_STATUS_ENDPOINT, askAssistant } from "../utils/chatAdapter";
import { setPreference } from "../utils/preferences";

// Deep Chat is large, so it only loads the first time the chat is opened.
const DeepChat = lazy(() => import("deep-chat-react").then((m) => ({ default: m.DeepChat })));

// Deep Chat renders in a shadow root that page CSS can't reach.
const SHADOW_CSS = `
  img { max-width: 100%; height: auto; }
  a { color: #1F7067; }
  .ceo-chat-link { display: flex; max-width: 280px; overflow: hidden; color: inherit; text-decoration: none;
    background: #fff; border: 1px solid #E1E1E1; border-radius: 8px; }
  .ceo-chat-link:hover, .ceo-chat-link:focus { border-color: #1F7067; }
  .ceo-chat-link-image { width: 80px; flex-shrink: 0; object-fit: cover; background: #E9F1F0; }
  .ceo-chat-link-text { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; font-size: 13px; line-height: 1.35; }
  .ceo-chat-link-text strong { color: #1F7067; }
  .ceo-chat-link-text small { color: #767575; }
`;

const CHAT_STYLE = {
  width: "100%",
  height: "100%",
  border: "none",
  borderRadius: 0,
  fontFamily: "'Public Sans', sans-serif", // any non-default font stops Deep Chat loading Google Fonts
  fontSize: "0.95rem",
};

const MESSAGE_STYLES = {
  default: {
    user: { bubble: { backgroundColor: "#1F7067", color: "#fff" } },
    ai: { bubble: { backgroundColor: "#E9F1F0", color: "#212529" } },
  },
  html: { shared: { bubble: { backgroundColor: "transparent", padding: 0 } } },
};

// Options are constants: Deep Chat resets the conversation whenever it re-renders.
const IMAGE_UPLOADS = { files: { acceptedFormats: ".png,.jpg,.jpeg,.gif,.webp", maxNumberOfFiles: 2 } };
const CONNECT = { handler: askAssistant };
const ERROR_MESSAGES = { displayServiceErrorMessages: true, overrides: { default: CHAT_ERROR_MESSAGE } };
const INTRO_MESSAGE = { text: "Hi! Ask me anything about using Collect Earth Online. You can also attach a screenshot." };
const TEXT_INPUT = { placeholder: { text: "Ask a question…" } };

const focusInput = (chat) => chat?.focusInput?.();

// Memoised so opening and closing the panel never re-renders Deep Chat.
const ChatConversation = memo(({ chatRef }) => (
  <Suspense fallback={<p className="ceo-chat-loading">Loading…</p>}>
    <DeepChat
      ref={chatRef}
      auxiliaryStyle={SHADOW_CSS}
      connect={CONNECT}
      dragAndDrop
      errorMessages={ERROR_MESSAGES}
      images={IMAGE_UPLOADS}
      introMessage={INTRO_MESSAGE}
      messageStyles={MESSAGE_STYLES}
      onComponentRender={focusInput}
      style={CHAT_STYLE}
      textInput={TEXT_INPUT}
    />
  </Suspense>
));

const ChatIcon = () => (
  <svg aria-hidden="true" fill="currentColor" height="26" viewBox="0 0 24 24" width="26">
    <path d="M12 3C6.48 3 2 6.92 2 11.75c0 2.48 1.18 4.72 3.08 6.31-.17 1.27-.73 2.62-1.86 3.69a.5.5 0 0 0 .37.86c2.03-.06 3.64-.83 4.78-1.68 1.13.33 2.35.52 3.63.52 5.52 0 10-3.92 10-8.75S17.52 3 12 3Zm-4.5 10a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
  </svg>
);

const CloseIcon = ({ size = 22 }) => (
  <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24" width={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// Floating help chat; placement="raised" lifts it above bars pinned to the bottom of the page.
const ChatWidget = ({ placement }) => {
  const [{ enabled, hidden, open, loaded }, setState] = useAtom(chatWidgetAtom);
  const launcherRef = useRef(null);
  const chatRef = useRef(null);

  const setEnabled = (isEnabled) => setState((s) => ({ ...s, enabled: isEnabled }));
  const openChat = () => setState((s) => ({ ...s, open: true, loaded: true }));
  const closeChat = () => {
    setState((s) => ({ ...s, open: false }));
    launcherRef.current?.focus();
  };

  useEffect(() => {
    fetch(CHAT_STATUS_ENDPOINT)
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => setEnabled(data?.enabled === true))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && closeChat();
    if (open) document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (open) focusInput(chatRef.current);
  }, [open]);

  const className = ["ceo-chat", placement === "raised" && "ceo-chat--raised", open && "ceo-chat--open"]
    .filter(Boolean)
    .join(" ");

  return enabled && (
    <div className={className} hidden={hidden}>
      <section aria-label="CEO Assistant" className="ceo-chat-panel" hidden={!open} id="ceo-chat-panel" role="dialog">
        <header className="ceo-chat-header">
          <div>
            <h2>CEO Assistant</h2>
            <p>Answers from the Collect Earth Online docs and blog</p>
          </div>
          <button aria-label="Close chat" className="ceo-chat-close" onClick={closeChat} type="button">
            <CloseIcon size={20} />
          </button>
        </header>
        <div className="ceo-chat-body">
          {loaded && <ChatConversation chatRef={chatRef} />}
        </div>
      </section>
      <button
        ref={launcherRef}
        aria-controls="ceo-chat-panel"
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Open chat"}
        className="ceo-chat-launcher"
        onClick={open ? closeChat : openChat}
        type="button"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
};

// Navbar item that shows or hides the chat bubble on every page.
export const ChatToggleNavItem = () => {
  const [{ enabled, hidden }, setState] = useAtom(chatWidgetAtom);
  const toggle = () => {
    setPreference(CHAT_HIDDEN_PREFERENCE, !hidden);
    setState((s) => ({ ...s, hidden: !hidden, open: false }));
  };

  return enabled && (
    <li className="nav-item">
      <button className="nav-link border-0 bg-transparent" onClick={toggle} type="button">
        {hidden ? "Show chatbot" : "Hide chatbot"}
      </button>
    </li>
  );
};

export default ChatWidget;
