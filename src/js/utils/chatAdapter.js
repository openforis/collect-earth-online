// Converts between Deep Chat's formats and CEO's /chat proxy ({question} or question+files -> {answer, links}).

export const CHAT_ENDPOINT = "/chat";
export const CHAT_STATUS_ENDPOINT = "/chat-status";
export const CHAT_ERROR_MESSAGE = "Sorry, the assistant can't answer right now. Please try again later.";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // same limit as chat.clj
export const IMAGE_TOO_LARGE_MESSAGE = "Only images up to 5 MB can be attached.";

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

// Deep Chat sends the typed text as a {"role": "user", "text": "..."} string field.
const messageText = (value) => {
  try {
    const { text } = JSON.parse(value) ?? {};
    return typeof text === "string" ? text : "";
  } catch {
    return value;
  }
};

const isFormData = (body) => typeof FormData !== "undefined" && body instanceof FormData;

const formRequestBody = (form) => {
  const values = [...form.values()];
  const question = values.filter((v) => typeof v === "string").map(messageText).filter(Boolean).join("\n");
  const request = new FormData();
  values.filter((v) => typeof v !== "string").forEach((file) => request.append("files", file, file.name));
  request.append("question", question);
  return request;
};

export const toChatRequestBody = (body) =>
  isFormData(body)
    ? formRequestBody(body)
    : { question: (body?.messages ?? []).slice(-1)[0]?.text ?? "" };

export const toChatMessages = (response) => {
  if (typeof response?.answer !== "string") return { error: response?.message || CHAT_ERROR_MESSAGE };
  const messages = [
    ...(response.answer.trim() ? [{ text: response.answer }] : []),
    ...(Array.isArray(response.links) ? response.links : []).map((link) => ({ html: linkCardHtml(link) })),
  ];
  return messages.length ? messages : { error: CHAT_ERROR_MESSAGE };
};

const hasOversizedImage = (payload) =>
  isFormData(payload) && payload.getAll("files").some((file) => file.size > MAX_IMAGE_BYTES);

const requestOptions = (payload) => ({
  method: "POST",
  credentials: "same-origin",
  headers: isFormData(payload)
    ? { Accept: "application/json" }
    : { Accept: "application/json", "Content-Type": "application/json" },
  body: isFormData(payload) ? payload : JSON.stringify(payload),
});

// Deep Chat connect.handler; users only ever see the proxy's messages or CHAT_ERROR_MESSAGE.
export const askAssistant = (body, signals, fetchImpl = globalThis.fetch) => {
  const payload = toChatRequestBody(body);
  return hasOversizedImage(payload)
    ? signals.onResponse({ error: IMAGE_TOO_LARGE_MESSAGE })
    : fetchImpl(CHAT_ENDPOINT, requestOptions(payload))
      .then((response) => response.json()
        .catch(() => null)
        .then((data) => toChatMessages(response.ok ? data : { message: data?.message })))
      .catch(() => ({ error: CHAT_ERROR_MESSAGE }))
      .then((messages) => signals.onResponse(messages));
};
