"use strict";

const STORAGE_KEY = "chat-app-conversations-v1";

const contacts = [
  { id: "maya", name: "Maya Chen", colors: ["#e8e3ff", "#594b9d"], unread: 2 },
  { id: "leo", name: "Leo Martinez", colors: ["#ffe9dc", "#a45b35"], unread: 0 },
  { id: "amara", name: "Amara Okafor", colors: ["#ddf3e8", "#32775a"], unread: 1 },
  { id: "noah", name: "Noah Williams", colors: ["#deedff", "#3b659e"], unread: 0 },
  { id: "sofia", name: "Sofia Rossi", colors: ["#ffe4ec", "#a64f70"], unread: 0 },
  { id: "ethan", name: "Ethan Park", colors: ["#fff1c9", "#8d7027"], unread: 0 },
];

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 24, 0, 0);
  return date.toISOString();
};

const initialConversations = {
  maya: [
    { sender: "them", text: "Hey! Have you had a chance to look at the little place I sent over?", timestamp: hoursAgo(28) },
    { sender: "me", text: "I did — the light in that kitchen is so good. I think it could be the one ✨", timestamp: hoursAgo(27.5) },
    { sender: "them", text: "Right? And it's close to the park too. Want to go see it this weekend?", timestamp: hoursAgo(1.7) },
    { sender: "them", text: "Saturday afternoon works for me if you're free!", timestamp: hoursAgo(1.5) },
  ],
  leo: [
    { sender: "them", text: "The photos from the coast turned out better than I expected.", timestamp: daysAgo(1, 13) },
    { sender: "me", text: "Send me your favorites when you get a chance!", timestamp: daysAgo(1, 13.2) },
    { sender: "them", text: "Just made an album. The sunset ones are my favorite 🌅", timestamp: hoursAgo(4) },
  ],
  amara: [
    { sender: "me", text: "I'm bringing the board games on Friday. Any requests?", timestamp: daysAgo(2, 17) },
    { sender: "them", text: "Yes! Let's finally try that co-op one you showed me.", timestamp: daysAgo(2, 17.3) },
    { sender: "them", text: "I'll make snacks. See you Friday!", timestamp: hoursAgo(3) },
  ],
  noah: [
    { sender: "them", text: "Thanks for the book recommendation — already halfway through it.", timestamp: daysAgo(3, 10) },
    { sender: "me", text: "That's fast! The second half gets even better.", timestamp: daysAgo(3, 10.1) },
  ],
  sofia: [
    { sender: "me", text: "Made it home safe. Thank you for such a lovely dinner!", timestamp: daysAgo(4, 20) },
    { sender: "them", text: "I'm so glad! Let's do it again soon 💛", timestamp: daysAgo(4, 20.2) },
  ],
  ethan: [
    { sender: "them", text: "Are we still on for the trail next Sunday?", timestamp: daysAgo(6, 9) },
    { sender: "me", text: "Absolutely. I'll check the weather and send you a plan.", timestamp: daysAgo(6, 9.1) },
  ],
};

const elements = {
  app: document.querySelector(".app-shell"),
  contactList: document.querySelector("#contact-list"),
  contactSearch: document.querySelector("#contact-search"),
  contactCount: document.querySelector("#conversation-count"),
  searchEmpty: document.querySelector("#search-empty"),
  storageStatus: document.querySelector("#storage-status"),
  emptyState: document.querySelector("#empty-state"),
  chatView: document.querySelector("#chat-view"),
  chatPerson: document.querySelector("#chat-person"),
  messages: document.querySelector("#messages"),
  chatEmpty: document.querySelector("#chat-empty"),
  clearChat: document.querySelector("#clear-chat"),
  backButton: document.querySelector("#back-to-contacts"),
  browseContacts: document.querySelector("#browse-contacts"),
  messageForm: document.querySelector("#message-form"),
  messageInput: document.querySelector("#message-input"),
};

const state = loadState();
let activeContactId = null;

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function contactById(id) {
  return contacts.find((contact) => contact.id === id);
}

function isValidMessage(message) {
  return message &&
    (message.sender === "me" || message.sender === "them") &&
    typeof message.text === "string" &&
    typeof message.timestamp === "string" &&
    !Number.isNaN(Date.parse(message.timestamp));
}

function setStorageStatus(message, isError = false) {
  elements.storageStatus.textContent = message;
  elements.storageStatus.parentElement.classList.toggle("storage-error", isError);
}

function loadState() {
  const fallback = {
    conversations: structuredClone(initialConversations),
    unread: Object.fromEntries(contacts.map((contact) => [contact.id, contact.unread])),
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || !parsed.conversations || typeof parsed.conversations !== "object") {
      setStorageStatus("Saved data was invalid; using demo data", true);
      return fallback;
    }

    const conversations = {};
    let hasInvalidData = false;
    for (const contact of contacts) {
      const savedMessages = parsed.conversations[contact.id];
      conversations[contact.id] = Array.isArray(savedMessages) && savedMessages.every(isValidMessage)
        ? savedMessages
        : structuredClone(initialConversations[contact.id]);
      if (!Array.isArray(savedMessages) || !savedMessages.every(isValidMessage)) hasInvalidData = true;
    }

    const unread = {};
    for (const contact of contacts) {
      const count = parsed.unread && parsed.unread[contact.id];
      unread[contact.id] = Number.isSafeInteger(count) && count >= 0 ? count : contact.unread;
      if (!Number.isSafeInteger(count) || count < 0) hasInvalidData = true;
    }

    if (hasInvalidData) setStorageStatus("Some saved data was invalid; using demo data", true);
    return { conversations, unread };
  } catch {
    setStorageStatus("Saved data unavailable; using demo data", true);
    return fallback;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStorageStatus("Saved on this device");
  } catch {
    setStorageStatus("Not saved — browser storage unavailable", true);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }

  const isThisYear = date.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat(undefined, isThisYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function makeAvatar(contact, extraClass = "") {
  const avatar = document.createElement("span");
  avatar.className = `avatar${extraClass ? ` ${extraClass}` : ""}`;
  avatar.textContent = initials(contact.name);
  avatar.setAttribute("aria-hidden", "true");
  avatar.style.setProperty("--avatar-bg", contact.colors[0]);
  avatar.style.setProperty("--avatar-ink", contact.colors[1]);
  return avatar;
}

function latestMessage(contactId) {
  const conversation = state.conversations[contactId];
  return conversation[conversation.length - 1] || null;
}

function renderContacts() {
  const query = elements.contactSearch.value.trim().toLocaleLowerCase();
  const matchingContacts = contacts.filter((contact) => contact.name.toLocaleLowerCase().includes(query));
  elements.contactList.replaceChildren();
  elements.contactCount.textContent = String(contacts.length);
  elements.searchEmpty.hidden = matchingContacts.length > 0;

  for (const contact of matchingContacts) {
    const latest = latestMessage(contact.id);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "contact-button";
    button.type = "button";
    button.setAttribute("aria-current", activeContactId === contact.id ? "true" : "false");
    button.addEventListener("click", () => selectContact(contact.id));
    button.append(makeAvatar(contact));

    const copy = document.createElement("span");
    copy.className = "contact-copy";
    const topLine = document.createElement("span");
    topLine.className = "contact-topline";
    const name = document.createElement("span");
    name.className = "contact-name";
    name.textContent = contact.name;
    topLine.append(name);

    if (latest) {
      const time = document.createElement("time");
      time.className = "contact-time";
      time.dateTime = latest.timestamp;
      time.textContent = formatTime(latest.timestamp);
      topLine.append(time);
    }

    const bottomLine = document.createElement("span");
    bottomLine.className = "contact-bottomline";
    const preview = document.createElement("span");
    preview.className = "contact-preview";
    preview.textContent = latest ? latest.text.replace(/\s+/g, " ").trim() : "No messages yet";
    bottomLine.append(preview);

    if (state.unread[contact.id] > 0) {
      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = String(state.unread[contact.id]);
      badge.setAttribute("aria-label", `${state.unread[contact.id]} unread messages`);
      bottomLine.append(badge);
    }

    copy.append(topLine, bottomLine);
    button.append(copy);
    item.append(button);
    elements.contactList.append(item);
  }
}

function renderChat() {
  const contact = contactById(activeContactId);
  elements.emptyState.hidden = Boolean(contact);
  elements.chatView.hidden = !contact;
  if (!contact) {
    elements.chatPerson.replaceChildren();
    elements.messages.replaceChildren();
    return;
  }

  elements.chatPerson.replaceChildren();
  elements.chatPerson.append(makeAvatar(contact));
  const details = document.createElement("div");
  const name = document.createElement("p");
  name.className = "chat-person-name";
  name.textContent = contact.name;
  const note = document.createElement("p");
  note.className = "chat-person-note";
  note.textContent = "Your conversation";
  details.append(name, note);
  elements.chatPerson.append(details);

  const conversation = state.conversations[contact.id];
  elements.messages.replaceChildren();
  elements.chatEmpty.hidden = conversation.length > 0;

  for (const message of conversation) {
    const sent = message.sender === "me";
    const row = document.createElement("div");
    row.className = `message-row${sent ? " sent" : ""}`;
    if (!sent) row.append(makeAvatar(contact, "message-avatar"));

    const content = document.createElement("div");
    content.className = "message-content";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message.text;
    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = message.timestamp;
    time.textContent = formatTime(message.timestamp);
    content.append(bubble, time);
    row.append(content);
    elements.messages.append(row);
  }

  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function selectContact(contactId) {
  activeContactId = contactId;
  state.unread[contactId] = 0;
  saveState();
  renderContacts();
  renderChat();
  elements.app.classList.add("chat-open");
  elements.messageInput.focus({ preventScroll: true });
}

function showContacts() {
  elements.app.classList.remove("chat-open");
  elements.contactSearch.focus({ preventScroll: true });
}

function sendMessage() {
  const text = elements.messageInput.value;
  if (!activeContactId || !text.trim()) return;

  state.conversations[activeContactId].push({
    sender: "me",
    text,
    timestamp: new Date().toISOString(),
  });
  saveState();
  renderContacts();
  renderChat();
  elements.messageInput.value = "";
  elements.messageInput.focus({ preventScroll: true });
}

elements.contactSearch.addEventListener("input", renderContacts);
elements.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
elements.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});
elements.clearChat.addEventListener("click", () => {
  if (!activeContactId) return;
  const contact = contactById(activeContactId);
  if (!window.confirm(`Clear your conversation with ${contact.name}? This can't be undone.`)) return;
  state.conversations[activeContactId] = [];
  state.unread[activeContactId] = 0;
  saveState();
  renderContacts();
  renderChat();
});
elements.backButton.addEventListener("click", showContacts);
elements.browseContacts.addEventListener("click", showContacts);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.contactSearch.focus();
  }
  if (event.key === "Escape" && elements.app.classList.contains("chat-open")) {
    showContacts();
  }
});

renderContacts();
renderChat();
