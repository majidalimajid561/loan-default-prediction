/* =========================================================
   RiskLens — frontend logic for the FastAPI loan-risk model
   ========================================================= */

// ---- CONFIG: change this if your API runs somewhere else ----
const API_URL = "http://127.0.0.1:8000/prediction";
const THRESHOLD = 0.4;          // must match the backend (prob >= 0.40 => default)
const REQUEST_TIMEOUT_MS = 15000;
const HISTORY_KEY = "risklens_history";
const HISTORY_MAX = 5;

// ---- Elements ----
const form = document.getElementById("loanForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const sampleBtn = document.getElementById("fillSample");
const retryBtn = document.getElementById("retryBtn");

const resultCard = document.getElementById("resultCard");
const gaugeFill = document.getElementById("gaugeFill");
const probValue = document.getElementById("probValue");

const incomeEl = document.getElementById("person_income");
const amountEl = document.getElementById("loan_amnt");
const ratioEl = document.getElementById("loan_percent_income");
const ratioPill = document.getElementById("ratioPill");

const historyCard = document.getElementById("historyCard");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");

const apiStatus = document.getElementById("apiStatus");
const apiStatusText = document.getElementById("apiStatusText");

document.getElementById("year").textContent = new Date().getFullYear();

// ---- Field rules (mirror the Pydantic model) ----
const INT_FIELDS = ["person_age", "person_emp_length", "cb_person_cred_hist_length"];
const FLOAT_FIELDS = ["person_income", "loan_amnt", "loan_int_rate"];
const SELECT_FIELDS = ["person_home_ownership", "loan_intent", "loan_grade"];

const LABELS = {
  person_age: "Age",
  person_income: "Annual income",
  person_home_ownership: "Home ownership",
  person_emp_length: "Employment length",
  loan_intent: "Loan purpose",
  loan_grade: "Loan grade",
  loan_amnt: "Loan amount",
  loan_int_rate: "Interest rate",
  cb_person_default_on_file: "Past default",
  cb_person_cred_hist_length: "Credit history length",
};

// ---- Helpers ----
const money = (n) => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n, d = 1) => (n * 100).toFixed(d) + "%";

function setState(state) {
  resultCard.dataset.state = state;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
  submitBtn.querySelector(".btn-label").textContent = isLoading ? "Analysing…" : "Assess risk";
}

// ---- Loan-to-income (auto) ----
function updateRatio() {
  const income = parseFloat(incomeEl.value);
  const amount = parseFloat(amountEl.value);

  if (income > 0 && amount > 0) {
    const ratio = amount / income;
    ratioEl.value = ratio.toFixed(2);
    ratioPill.textContent = (ratio * 100).toFixed(0) + "% of income";
    ratioPill.dataset.level = ratio < 0.2 ? "low" : ratio < 0.35 ? "mid" : "high";
  } else {
    ratioEl.value = "";
    ratioPill.textContent = "—";
    delete ratioPill.dataset.level;
  }
}
incomeEl.addEventListener("input", updateRatio);
amountEl.addEventListener("input", updateRatio);

// ---- Validation ----
function showError(name, message) {
  const holder = form.querySelector(`.error[data-for="${name}"]`);
  const field = holder?.closest(".field");
  if (holder) holder.textContent = message || "";
  if (field) field.classList.toggle("has-error", Boolean(message));
}

function clearErrors() {
  form.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  form.querySelectorAll(".field.has-error").forEach((f) => f.classList.remove("has-error"));
}

function validate() {
  clearErrors();
  let firstBad = null;
  const fail = (name, msg) => {
    showError(name, msg);
    if (!firstBad) firstBad = form.elements[name] instanceof RadioNodeList ? document.getElementById("default_n") : form.elements[name];
  };

  [...INT_FIELDS, ...FLOAT_FIELDS].forEach((name) => {
    const el = form.elements[name];
    const raw = el.value.trim();
    if (raw === "") return fail(name, `${LABELS[name]} is required.`);

    const val = Number(raw);
    if (Number.isNaN(val)) return fail(name, "Enter a valid number.");
    if (INT_FIELDS.includes(name) && !Number.isInteger(val)) return fail(name, "Use a whole number.");
    if (el.min !== "" && val < Number(el.min)) return fail(name, `Must be at least ${el.min}.`);
    if (el.max !== "" && val > Number(el.max)) return fail(name, `Must be ${el.max} or less.`);
  });

  SELECT_FIELDS.forEach((name) => {
    if (!form.elements[name].value) fail(name, `Please choose ${LABELS[name].toLowerCase()}.`);
  });

  if (!form.elements["cb_person_default_on_file"].value) {
    fail("cb_person_default_on_file", "Select Yes or No.");
  }

  if (firstBad) firstBad.focus?.();
  return !firstBad;
}

// clear a field's error as the user fixes it
form.addEventListener("input", (e) => {
  if (e.target.name) showError(e.target.name, "");
});
form.addEventListener("change", (e) => {
  if (e.target.name) showError(e.target.name, "");
});

// ---- Build payload exactly as the Pydantic model expects ----
function buildPayload() {
  const income = parseFloat(incomeEl.value);
  const amount = parseFloat(amountEl.value);

  return {
    person_age: parseInt(form.elements.person_age.value, 10),
    person_income: income,
    person_home_ownership: form.elements.person_home_ownership.value,
    person_emp_length: parseInt(form.elements.person_emp_length.value, 10),
    loan_intent: form.elements.loan_intent.value,
    loan_grade: form.elements.loan_grade.value,
    loan_amnt: amount,
    loan_int_rate: parseFloat(form.elements.loan_int_rate.value),
    loan_percent_income: Number((amount / income).toFixed(2)),
    cb_person_default_on_file: form.elements.cb_person_default_on_file.value,
    cb_person_cred_hist_length: parseInt(form.elements.cb_person_cred_hist_length.value, 10),
  };
}

// ---- API call ----
async function requestPrediction(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        if (Array.isArray(body.detail)) {
          detail = body.detail
            .map((d) => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`)
            .join("; ");
        } else if (body.detail) {
          detail = String(body.detail);
        }
      } catch (_) { /* body not JSON */ }

      const err = new Error(detail || `Server responded with status ${res.status}.`);
      err.kind = res.status === 422 ? "validation" : "server";
      throw err;
    }
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("The request took too long. Check that the API is running and try again.");
      e.kind = "timeout";
      throw e;
    }
    if (err instanceof TypeError) {
      const e = new Error(
        "Could not reach the API. Make sure FastAPI is running at " + API_URL +
        " and that CORS is enabled for this page."
      );
      e.kind = "network";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Render result ----
function animateNumber(el, to, duration = 1100) {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (to * eased).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderResult(data, payload) {
  // probability from the API is expected as 0-1; tolerate 0-100 just in case
  let prob = Number(data.probability);
  if (!Number.isFinite(prob)) throw new Error("The API response did not include a valid probability.");
  if (prob > 1) prob = prob / 100;
  prob = Math.min(Math.max(prob, 0), 1);

  const isDefault = data.status
    ? String(data.status).toLowerCase() === "default"
    : prob >= THRESHOLD;

  resultCard.dataset.verdict = isDefault ? "default" : "safe";

  const badge = document.getElementById("verdictBadge");
  const title = document.getElementById("verdictTitle");
  const text = document.getElementById("verdictText");

  if (isDefault) {
    badge.textContent = "High risk";
    title.textContent = "Likely to default";
    text.textContent =
      "The model estimates a default probability above the 40% threshold. This application should be reviewed carefully before approval.";
  } else {
    badge.textContent = "Safe";
    title.textContent = "Low default risk";
    text.textContent =
      "The model estimates a default probability below the 40% threshold. This application looks like a safe candidate for approval.";
  }

  document.getElementById("sumAmount").textContent = money(payload.loan_amnt);
  document.getElementById("sumRatio").textContent = pct(payload.loan_percent_income, 0);
  document.getElementById("sumGrade").textContent = payload.loan_grade;
  document.getElementById("sumRate").textContent = payload.loan_int_rate.toFixed(1) + "%";

  setState("result");

  // animate gauge + number (reset first so it replays)
  gaugeFill.style.transition = "none";
  gaugeFill.style.strokeDasharray = "0 100";
  void gaugeFill.getBoundingClientRect();
  gaugeFill.style.transition = "";
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDasharray = `${(prob * 100).toFixed(2)} 100`;
  });
  animateNumber(probValue, prob * 100);

  addHistory({
    time: Date.now(),
    prob,
    isDefault,
    amount: payload.loan_amnt,
    intent: payload.loan_intent,
  });
}

function renderError(err) {
  const titles = {
    network: "API not reachable",
    timeout: "Request timed out",
    validation: "The API rejected the input",
    server: "Server error",
  };
  document.getElementById("errorTitle").textContent = titles[err.kind] || "Something went wrong";
  document.getElementById("errorMessage").textContent = err.message;
  setState("error");
}

// ---- History (stored in the browser) ----
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (_) {
    return [];
  }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) { /* storage blocked */ }
}

let history = loadHistory();

function intentLabel(v) {
  const map = {
    EDUCATION: "Education", MEDICAL: "Medical", VENTURE: "Venture",
    PERSONAL: "Personal", DEBTCONSOLIDATION: "Debt consolidation", HOMEIMPROVEMENT: "Home improvement",
  };
  return map[v] || v;
}

function renderHistory() {
  historyList.innerHTML = "";
  historyCard.hidden = history.length === 0;

  history.forEach((item) => {
    const li = document.createElement("li");
    const when = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const meta = document.createElement("div");
    meta.className = "meta";
    const b = document.createElement("b");
    b.textContent = `${money(item.amount)} · ${pct(item.prob)}`;
    const s = document.createElement("span");
    s.textContent = `${intentLabel(item.intent)} · ${when}`;
    meta.append(b, s);

    const tag = document.createElement("span");
    tag.className = "tag " + (item.isDefault ? "tag--default" : "tag--safe");
    tag.textContent = item.isDefault ? "Default" : "Safe";

    li.append(meta, tag);
    historyList.appendChild(li);
  });
}

function addHistory(entry) {
  history = [entry, ...history].slice(0, HISTORY_MAX);
  saveHistory(history);
  renderHistory();
}

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory();
});

// ---- Submit ----
async function handleSubmit(e) {
  e?.preventDefault();
  if (!validate()) return;

  const payload = buildPayload();
  setLoading(true);
  setState("loading");

  if (window.matchMedia("(max-width: 960px)").matches) {
    resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  try {
    const data = await requestPrediction(payload);
    renderResult(data, payload);
    setApiStatus(true);
  } catch (err) {
    if (err.kind === "network" || err.kind === "timeout") setApiStatus(false);
    renderError(err);
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", handleSubmit);
retryBtn.addEventListener("click", () => handleSubmit());

// ---- Reset & sample ----
resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  updateRatio();
  setState("idle");
});

sampleBtn.addEventListener("click", () => {
  const sample = {
    person_age: 27,
    person_income: 48000,
    person_home_ownership: "RENT",
    person_emp_length: 3,
    loan_intent: "PERSONAL",
    loan_grade: "C",
    loan_amnt: 12000,
    loan_int_rate: 12.5,
    cb_person_default_on_file: "N",
    cb_person_cred_hist_length: 4,
  };
  Object.entries(sample).forEach(([name, value]) => {
    if (name === "cb_person_default_on_file") {
      form.querySelector(`input[name="${name}"][value="${value}"]`).checked = true;
    } else {
      form.elements[name].value = value;
    }
  });
  clearErrors();
  updateRatio();
});

// ---- API status indicator ----
function setApiStatus(online) {
  apiStatus.dataset.state = online ? "online" : "offline";
  apiStatusText.textContent = online ? "API online" : "API offline";
}

async function pingApi() {
  // Any HTTP response from the server (even 405 for GET on a POST route) means it is up.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    await fetch(API_URL, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    setApiStatus(true);
  } catch (_) {
    setApiStatus(false);
  }
}

// ---- Init ----
renderHistory();
pingApi();
setInterval(pingApi, 30000);