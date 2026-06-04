const greeting = document.querySelector("#greeting");
const likeButton = document.querySelector("#likeButton");
const likeCount = document.querySelector("#likeCount");
const sparkleLayer = document.querySelector(".sparkle-layer");
const vouchForm = document.querySelector("#vouchForm");
const vouchName = document.querySelector("#vouchName");
const vouchComment = document.querySelector("#vouchComment");
const vouchSubmit = document.querySelector("#vouchSubmit");
const vouchStatus = document.querySelector("#vouchStatus");
const vouchList = document.querySelector("#vouchList");
const loadMoreVouches = document.querySelector("#loadMoreVouches");

const VOUCHES_API_URL = "https://script.google.com/macros/s/AKfycbzpHm4AZizt7Sh3dNKGuFdyhqT4u0Cf3VCe_tc3Z5N3EX_QFMVPuVZrRZdSJwio0JIl/exec";
const VOUCH_LIMIT = 5;
const LOAD_MORE_DELAY_MS = 1200;
const VOUCH_COOLDOWN_MS = 60 * 60 * 1000;
const VOUCH_COOLDOWN_KEY = "celineProfileLastVouchAt";
let likes = 0;
let vouchOffset = 0;
let isLoadingVouches = false;
let canLoadMoreVouches = true;

function setGreeting() {
  const hour = new Date().getHours();
  let message = "Hello!";

  if (hour < 12) {
    message = "Good morning!";
  } else if (hour < 18) {
    message = "Good afternoon!";
  } else {
    message = "Good evening!";
  }

  greeting.textContent = message;
}

function isVouchesApiConfigured() {
  return VOUCHES_API_URL.startsWith("https://");
}

function setVouchStatus(message, isError = false) {
  vouchStatus.textContent = message;
  vouchStatus.style.color = isError ? "#b03d5c" : "#8d6171";
}

function getRemainingCooldown() {
  const lastVouchAt = Number(localStorage.getItem(VOUCH_COOLDOWN_KEY) || 0);
  const remaining = VOUCH_COOLDOWN_MS - (Date.now() - lastVouchAt);

  return Math.max(0, remaining);
}

function formatCooldown(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function updateVouchCooldownState() {
  const remaining = getRemainingCooldown();
  const isCoolingDown = remaining > 0;

  vouchSubmit.disabled = isCoolingDown;

  if (isCoolingDown) {
    setVouchStatus(`You can vouch again in ${formatCooldown(remaining)}.`);
  } else if (vouchStatus.textContent.startsWith("You can vouch again")) {
    setVouchStatus("");
  }
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function createVouchCard(vouch) {
  const card = document.createElement("article");
  const avatar = document.createElement("span");
  const body = document.createElement("div");
  const header = document.createElement("div");
  const name = document.createElement("strong");
  const time = document.createElement("time");
  const comment = document.createElement("p");
  const displayName = vouch.name || "Anonymous";

  card.className = "vouch-card";
  avatar.className = "vouch-avatar";
  body.className = "vouch-card-body";
  header.className = "vouch-card-header";
  avatar.textContent = displayName.trim().charAt(0).toUpperCase() || "A";
  avatar.setAttribute("aria-hidden", "true");
  name.textContent = displayName;
  time.dateTime = vouch.created_at || "";
  time.textContent = formatDate(vouch.created_at);
  comment.textContent = vouch.comment || "";

  header.append(name, time);
  body.append(header, comment);
  card.append(avatar, body);

  return card;
}

function renderEmptyVouches() {
  const empty = document.createElement("p");
  empty.className = "empty-vouches";
  empty.textContent = "No vouches yet. Be the first to leave one.";
  vouchList.appendChild(empty);
}

async function loadVouches(reset = false) {
  if (isLoadingVouches || (!reset && !canLoadMoreVouches)) {
    return;
  }

  if (!isVouchesApiConfigured()) {
    renderEmptyVouches();
    setVouchStatus("Add your Google Apps Script URL in script.js to turn on vouches.", true);
    return;
  }

  isLoadingVouches = true;
  canLoadMoreVouches = false;
  loadMoreVouches.disabled = true;
  loadMoreVouches.textContent = reset ? "Loading vouches..." : "Loading...";

  if (reset) {
    vouchOffset = 0;
    vouchList.innerHTML = "";
  }

  try {
    const url = new URL(VOUCHES_API_URL);
    url.searchParams.set("limit", VOUCH_LIMIT);
    url.searchParams.set("offset", vouchOffset);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to load vouches.");
    }

    const data = await response.json();
    const vouches = Array.isArray(data.vouches) ? data.vouches : [];

    if (reset) {
      vouchList.innerHTML = "";
    }

    if (vouches.length === 0 && vouchOffset === 0) {
      renderEmptyVouches();
    } else {
      const fragment = document.createDocumentFragment();
      vouches.forEach((vouch) => fragment.appendChild(createVouchCard(vouch)));
      vouchList.appendChild(fragment);
    }

    vouchOffset += vouches.length;
    loadMoreVouches.hidden = !data.hasMore;
  } catch (error) {
    setVouchStatus(error.message, true);
  } finally {
    isLoadingVouches = false;
    loadMoreVouches.textContent = "Load more";

    window.setTimeout(() => {
      canLoadMoreVouches = true;
      loadMoreVouches.disabled = false;
    }, LOAD_MORE_DELAY_MS);
  }
}

async function submitVouch(event) {
  event.preventDefault();

  const remaining = getRemainingCooldown();

  if (remaining > 0) {
    setVouchStatus(`You can vouch again in ${formatCooldown(remaining)}.`, true);
    return;
  }

  if (!isVouchesApiConfigured()) {
    setVouchStatus("Add your Google Apps Script URL in script.js before submitting.", true);
    return;
  }

  const name = vouchName.value.trim();
  const comment = vouchComment.value.trim();

  if (!name || !comment) {
    setVouchStatus("Please add your name and comment.", true);
    return;
  }

  vouchSubmit.disabled = true;
  setVouchStatus("Sending your vouch...");

  try {
    const response = await fetch(VOUCHES_API_URL, {
      method: "POST",
      body: JSON.stringify({ name, comment })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to send vouch.");
    }

    localStorage.setItem(VOUCH_COOLDOWN_KEY, Date.now().toString());
    vouchForm.reset();
    setVouchStatus("Thanks for the sweet vouch!");
    await loadVouches(true);
    updateVouchCooldownState();
  } catch (error) {
    vouchSubmit.disabled = false;
    setVouchStatus(error.message, true);
  }
}

function addSparkle(x, y) {
  const sparkle = document.createElement("span");
  sparkle.className = "click-sparkle";
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;

  sparkleLayer.appendChild(sparkle);

  window.setTimeout(() => {
    sparkle.remove();
  }, 720);
}

likeButton.addEventListener("click", (event) => {
  likes += 1;
  likeCount.textContent = likes;
  addSparkle(event.clientX, event.clientY);
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#likeButton")) {
    return;
  }

  addSparkle(event.clientX, event.clientY);
});

vouchForm.addEventListener("submit", submitVouch);
loadMoreVouches.addEventListener("click", () => loadVouches());

setGreeting();
loadVouches(true);
updateVouchCooldownState();
window.setInterval(updateVouchCooldownState, 30000);
