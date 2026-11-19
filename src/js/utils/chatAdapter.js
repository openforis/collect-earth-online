// Converts between Deep Chat's formats and CEO's /chat proxy ({question} -> {answer, links}).

export const CHAT_ENDPOINT = "/chat";
export const CHAT_STATUS_ENDPOINT = "/chat-status";
export const CHAT_ERROR_MESSAGE = "Sorry, the assistant can't answer right now. Please try again later.";

// Preview card for a source link; the chat API sanitizes these fields.
export const linkCardHtml = ({ url, title, description, image }) => {
  const host = new URL(url).hostname;
  return [
    `<a class="ceo-chat-link" href="${url}" target="_blank" rel="noopener noreferrer">`,
    image ? `<img class="ceo-chat-link-image" src="${image}" alt="" loading="lazy">` : "",
    '<span class="ceo-chat-link-text">',
    `<strong>${title || host}</strong>`,
    description ? `<span>${description}</span>` : "",
    `<small>${host}</small>`,
    "</span></a>",
  ].join("");
};

export const toChatRequestBody = (body) => ({ question: (body?.messages ?? []).slice(-1)[0]?.text ?? "" });

export const toChatMessages = (response) => {
  if (typeof response?.answer !== "string") return { error: response?.message || CHAT_ERROR_MESSAGE };
  const messages = [
    ...(response.answer.trim() ? [{ text: response.answer }] : []),
    ...(Array.isArray(response.links) ? response.links : []).map((link) => ({ html: linkCardHtml(link) })),
  ];
  return messages.length ? messages : { error: CHAT_ERROR_MESSAGE };
};

// Deep Chat connect.handler; users only ever see the proxy's messages or CHAT_ERROR_MESSAGE.
export const askAssistant = (body, signals, fetchImpl = globalThis.fetch) =>
  fetchImpl(CHAT_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(toChatRequestBody(body)),
  })
    .then((response) => response.json()
      .catch(() => null)
      .then((data) => toChatMessages(response.ok ? data : { message: data?.message })))
    .catch(() => ({ error: CHAT_ERROR_MESSAGE }))
    .then((messages) => signals.onResponse(messages));
