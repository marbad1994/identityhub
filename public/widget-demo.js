/* Standalone visual prototype. No production auth, cookies, storage, or API calls. */
(() => {
  "use strict";

  const paths = {
    check: '<path d="m5 12 4 4L19 6"/>',
    restart: '<path d="M3 10a9 9 0 1 1 1.5 7M3 4v6h6"/>',
    desktop: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
    sliders:
      '<path d="M4 7h7m6 0h3M4 17h3m6 0h7"/><circle cx="14" cy="7" r="3"/><circle cx="10" cy="17" r="3"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    cursor: '<path d="m4 3 7 18 3-7 7-3L4 3Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    fingerprint:
      '<path d="M4 12a8 8 0 0 1 16 0m-13 0a5 5 0 0 1 10 0c0 4-.5 7-2 9M10 20c2-3 2-5 2-8m-5 3c0 3-1 5-2 6m15-6c0 2-.3 4-.8 6"/>',
    "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    "arrow-left": '<path d="M20 12H4m6-6-6 6 6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    warning:
      '<path d="M12 8v5m0 4h.01M10 4 2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2 2 0 0 0-4 0Z"/>',
    x: '<path fill="currentColor" stroke="none" d="M14.23 10.16 22.98 0h-2.07l-7.59 8.82L7.25 0H.26l9.17 13.34L.26 24h2.07l8.02-9.32L16.75 24h6.99l-9.51-13.84Zm-2.84 3.3-.93-1.33L3.08 1.56h3.18l5.97 8.53.93 1.33 7.75 11.09h-3.18l-6.34-9.05Z"/>',
    tiktok:
      '<path fill="currentColor" stroke="none" d="M16.6 3c.4 2.6 1.9 4.3 4.4 4.6v2.6c-1.5 0-2.9-.5-4.1-1.3v6.4c0 4.1-3 6.7-6.6 6.7A6.3 6.3 0 0 1 4 15.6c0-3.5 2.8-6.3 6.4-6.3.4 0 .8 0 1.2.1v2.8a3.7 3.7 0 0 0-1.2-.2 3.5 3.5 0 0 0-3.6 3.6 3.5 3.5 0 0 0 5.8 2.6 3.4 3.4 0 0 0 1.2-2.7V3h2.8Z"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.shield}</svg>`;
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const fillIcons = (root = document) =>
    root.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });
  const query = new URLSearchParams(location.search);
  const providerName = (id) => (id === "x" ? "X" : id === "tiktok" ? "TikTok" : "Email");
  const identity =
    '<div class="identity-row"><span class="avatar">AM</span><div><strong>Alex Morgan</strong><small>alex@example.com · Demo account</small></div></div>';

  if (query.has("provider")) {
    // The popup is entirely local. It never loads a provider or asks for credentials.
    document.getElementById("playground").hidden = true;
    const page = document.getElementById("provider-demo");
    page.hidden = false;
    page.className = "provider-page";
    const provider = query.get("provider") === "tiktok" ? "tiktok" : "x";
    document.title = `${providerName(provider)} · Simulated sign-in`;
    if (["light", "dark"].includes(query.get("theme")))
      document.documentElement.dataset.theme = query.get("theme");
    page.innerHTML = `<div class="provider-shell"><p class="provider-banner">IDENTITYHUB PLAYGROUND · SIMULATED PROVIDER</p><section class="provider-card"><div class="provider-logo">${icon(provider)}</div><h1 class="card-heading">Continue with ${providerName(provider)}</h1><p class="card-copy">Try the popup experience with an example account.</p>${identity}<p class="provider-disclaimer">This is a design demo, not ${providerName(provider)}. Continuing simulates sign-in, closes this window, and lets you review access in the preview.</p><button type="button" class="method-button primary-button" id="provider-continue">Continue as Alex ${icon("arrow-right")}</button><button type="button" class="method-button" id="provider-cancel">Cancel sign-in</button><p class="success-note" id="provider-message" role="status">No password needed. No account is connected.</p></section></div>`;
    const send = (status) => {
      if (!window.opener) {
        document.getElementById("provider-message").textContent =
          "Open this step from the widget playground to try the popup.";
        return;
      }
      window.opener.postMessage(
        { source: "identityhub-widget-demo", nonce: query.get("nonce"), status },
        location.origin,
      );
      window.close();
    };
    document.getElementById("provider-continue").onclick = () => send("approved");
    document.getElementById("provider-cancel").onclick = () => send("cancelled");
    if (query.get("scenario") === "closed") setTimeout(() => window.close(), 1400);
    return;
  }

  fillIcons();
  const card = document.getElementById("auth-card");
  const appInput = document.getElementById("app-name");
  const scenario = document.getElementById("scenario");
  let stage = "choose";
  let method = "x";
  let popup = null;
  let nonce = "";
  let poll = 0;
  let timer = 0;
  let optionalPosting = false;
  let bypassError = false;
  let errorTitle = "Sign-in interrupted";
  let errorCopy = "The connection was interrupted. You can try again without leaving this page.";
  const appName = () => escape(appInput.value.trim() || "Your app");
  const announce = (text) => {
    document.getElementById("announcement").textContent = text;
  };
  const button = (label, action, variant = "", glyph = "") =>
    `<button type="button" class="method-button ${variant}" data-action="${action}">${glyph ? icon(glyph) : ""}${label}</button>`;
  const back = () =>
    `<button class="back-button" data-action="back" type="button">${icon("arrow-left")} Back to sign-in</button>`;
  const heading = (title, copy) =>
    `<h2 class="card-heading" id="flow-heading" tabindex="-1">${title}</h2><p class="card-copy">${copy}</p>`;
  const orb = (glyph, isError = false) =>
    `<div class="status-orb ${isError ? "error" : ""}">${icon(glyph)}</div>`;

  function cleanup() {
    clearInterval(poll);
    clearTimeout(timer);
    poll = 0;
    timer = 0;
    if (popup && !popup.closed) popup.close();
    popup = null;
    nonce = "";
  }

  function render(focus = true) {
    const step = ["permissions", "denied"].includes(stage)
      ? 2
      : ["success", "dashboard"].includes(stage)
        ? 3
        : 1;
    document.querySelectorAll("[data-step]").forEach((el) => {
      const number = Number(el.dataset.step);
      el.classList.toggle("current", number === step);
      el.classList.toggle("done", number < step);
      if (number === step) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
    let body = "";
    if (stage === "choose") {
      body = `<div class="app-monogram">${escape((appInput.value.trim() || "Y").slice(0, 1).toLowerCase())}.</div>${heading(`Welcome to ${appName()}`, "Sign in your way. We'll take it from here.")}<div class="method-list">${button("Continue with X", "x", "", "x")}${button("Continue with TikTok", "tiktok", "", "tiktok")}</div><div class="divider">or use email</div>${button("Continue with email", "email", "primary-button", "mail")}<p class="signup-copy">New here? <button class="text-button" type="button" data-action="signup">Create an account</button></p><div class="privacy-note"><span>${icon("shield")}</span><p><strong>Your identity. Your choice.</strong>Review what you share before an app gets access.</p></div>`;
    } else if (stage === "email" || stage === "signup") {
      const signup = stage === "signup";
      body = `${back()}${heading(signup ? "A fresh start." : "Good to see you.", signup ? `Create your demo account for ${appName()}.` : `Continue to ${appName()} with email.`)}<form class="demo-form" id="email-form">${signup ? '<label>Your name<input value="Alex Morgan" readonly autocomplete="off" /></label>' : ""}<label>Email address<input type="email" value="alex@example.com" readonly autocomplete="off" /></label><label>Password<input type="password" value="demo-preview-only" readonly autocomplete="off" /></label>${signup ? "" : '<div class="form-link"><button type="button" data-action="forgot" class="text-button">Forgot password?</button></div>'}<p class="form-hint">Example details only. These fields are read-only, and nothing is submitted or sent.</p><button type="submit" class="method-button primary-button">${signup ? "Create demo account" : "Sign in to demo"}${icon("arrow-right")}</button></form><p class="signup-copy">${signup ? 'Already have an account? <button type="button" data-action="email" class="text-button">Sign in</button>' : 'New here? <button type="button" data-action="signup" class="text-button">Create an account</button>'}</p>`;
    } else if (stage === "reset") {
      body = `${back()}${orb("mail")}${heading("A little help getting in.", "In the live app, a reset link is sent to your email address.")}<div class="waiting-details"><strong>alex@example.com</strong>This preview doesn't send email or change a password.</div>${button("Back to email sign-in", "email", "primary-button")}`;
    } else if (stage === "waiting" || stage === "email-wait") {
      body = `<div class="status-orb"><span class="spinner" aria-hidden="true"></span></div>${heading(stage === "email-wait" ? "Signing you in…" : `Continue in ${providerName(method)}`, stage === "email-wait" ? "Preparing your demo access review." : "A demo sign-in window has opened. This preview will update when you're done.")}<div class="waiting-details"><strong>Your place is saved.</strong>${stage === "email-wait" ? "No credentials are being checked or stored." : "The popup closes automatically after you continue."}</div>${button("Cancel sign-in", "cancel")}`;
    } else if (stage === "fallback") {
      body = `${back()}${orb("desktop")}${heading("Let's continue here.", "Your browser blocked the demo popup. You can try the same experience right here.")}${identity}${button("Continue as Alex", "inline-approve", "primary-button")}`;
    } else if (stage === "permissions") {
      body = `${heading("You're in control.", `${appName()} would like access to your account.`)}${identity}<div class="permission"><span>${icon("user")}</span><p>Basic profile<small>Your name, email, and profile picture.</small></p><span class="required">Required</span></div><label class="permission optional"><span>${icon("sliders")}</span><p>Publish on your behalf<small>Optional. Let the app create posts using your connected account.</small></p><input id="posting-permission" type="checkbox" ${optionalPosting ? "checked" : ""} aria-label="Allow publishing on your behalf" /></label><p class="form-hint">This is a simulated permission review. You can decline and return to sign-in.</p><div class="permission-actions">${button(`Allow &amp; continue to ${appName()}`, "allow", "accent-button", "arrow-right")}<button type="button" class="text-button" data-action="deny">Don't allow</button></div>`;
    } else if (stage === "success") {
      body = `${orb("check")}${heading("You're all set, Alex.", `Your demo sign-in to ${appName()} is complete.`)}<div class="success-detail"><span>Signed in with</span><strong>${providerName(method)}</strong></div><div class="success-detail"><span>Shared access</span><strong>${optionalPosting ? "Profile + publishing" : "Basic profile only"}</strong></div><div class="success-detail"><span>Account</span><strong>alex@example.com</strong></div><div class="success-actions">${button(`Continue to ${appName()}`, "dashboard", "accent-button", "arrow-right")}</div><p class="success-note">Demo complete. No real account was connected.</p>`;
    } else if (stage === "dashboard") {
      body = `<div class="app-monogram">${escape((appInput.value.trim() || "M").slice(0, 1).toLowerCase())}.</div>${heading(`Welcome to ${appName()}.`, "This is where your app takes over.")}${identity}<div class="dashboard-demo"><h3>Make something great.</h3><p>Your visitor has returned to the app, signed in and ready to go. This is a simulated destination.</p></div><div class="success-actions">${button("Try another sign-in", "restart", "primary-button")}</div>`;
    } else if (stage === "denied") {
      body = `${orb("shield")}${heading("Your choice is respected.", `${appName()} wasn't given access. You can return and choose a different method.`)}${button("Back to sign-in", "restart", "primary-button")}<p class="success-note">No information was shared.</p>`;
    } else {
      body = `${orb("warning", true)}${heading(escape(errorTitle), escape(errorCopy))}<div class="method-list">${button("Try again", "retry", "primary-button", "restart")}${button("Choose another method", "restart")}</div><p class="success-note">This is a simulated interruption. Your details are safe.</p>`;
    }
    card.innerHTML = `<div class="card-topline"><span>${icon("lock")} Sign in with IdentityHub</span><span class="card-demo-tag">DEMO</span></div><div class="card-main">${body}</div><div class="card-footer">${icon("fingerprint")}<span>Powered by <strong>IdentityHub</strong></span><span aria-hidden="true">·</span><span>You choose what you share</span></div>`;
    if (focus) document.getElementById("flow-heading")?.focus({ preventScroll: true });
  }

  function reset() {
    cleanup();
    stage = "choose";
    optionalPosting = false;
    bypassError = false;
    render();
    announce("Demo restarted. Choose a sign-in method.");
  }

  function showError(title, copy) {
    cleanup();
    errorTitle = title;
    errorCopy = copy;
    stage = "error";
    render();
    announce(title);
  }

  function approved() {
    cleanup();
    if (scenario.value === "error" && !bypassError) {
      showError(
        "Let's try that again.",
        "The demo connection was interrupted. Retry to see how sign-in recovers, or choose another method.",
      );
      return;
    }
    stage = "permissions";
    render();
    announce("Sign-in complete. Review the app's requested access.");
  }

  function startProvider(id, retry = false) {
    cleanup();
    method = id;
    bypassError = retry;
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const url = new URL(location.pathname, location.origin);
    url.search = new URLSearchParams({
      provider: id,
      nonce,
      theme: document.documentElement.dataset.theme,
      scenario: retry ? "success" : scenario.value,
    }).toString();
    stage = "waiting";
    // Open synchronously in the click handler so browsers recognize a user gesture.
    popup = window.open(url.href, "identityhub-widget-demo", "popup,width=500,height=670");
    if (!popup) {
      stage = "fallback";
      render();
      announce("Popup blocked. Continue the simulated sign-in in the preview.");
      return;
    }
    render();
    announce(`${providerName(id)} demo popup opened.`);
    poll = window.setInterval(() => {
      if (popup?.closed)
        showError(
          "The sign-in window closed.",
          "You haven't finished signing in. Open the window again or choose a different method.",
        );
    }, 450);
    timer = window.setTimeout(
      () => showError("Your demo session timed out.", "Open a fresh sign-in window to try again."),
      120000,
    );
  }

  window.addEventListener("message", (event) => {
    if (stage !== "waiting" || !popup || event.origin !== location.origin || event.source !== popup)
      return;
    if (event.data?.source !== "identityhub-widget-demo" || event.data.nonce !== nonce) return;
    if (event.data.status === "approved") approved();
    else if (event.data.status === "cancelled")
      showError(
        "Sign-in cancelled.",
        "You cancelled in the demo provider window. Try again whenever you're ready.",
      );
  });

  card.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "x" || action === "tiktok") return startProvider(action);
    if (["restart", "back", "cancel"].includes(action)) return reset();
    if (action === "retry") {
      if (method !== "email") return startProvider(method, true);
      bypassError = true;
      stage = "email";
    } else if (action === "email" || action === "signup") {
      method = "email";
      stage = action;
    } else if (action === "forgot") stage = "reset";
    else if (action === "inline-approve") return approved();
    else if (action === "allow") {
      optionalPosting = Boolean(document.getElementById("posting-permission")?.checked);
      stage = "success";
      announce("Demo sign-in successful. Continue to the example app.");
    } else if (action === "deny") stage = "denied";
    else if (action === "dashboard") stage = "dashboard";
    render();
  });

  card.addEventListener("change", (event) => {
    if (event.target.id === "posting-permission") optionalPosting = event.target.checked;
  });
  card.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.id !== "email-form") return;
    stage = "email-wait";
    render();
    timer = window.setTimeout(approved, 700);
  });
  document.getElementById("restart").onclick = reset;
  scenario.addEventListener("change", reset);
  appInput.addEventListener("input", () => render(false));
  document.querySelectorAll("[data-theme-choice]").forEach((button) =>
    button.addEventListener("click", () => {
      document.documentElement.dataset.theme = button.dataset.themeChoice;
      document
        .querySelectorAll("[data-theme-choice]")
        .forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    }),
  );
  document.querySelectorAll("[data-accent-choice]").forEach((button) =>
    button.addEventListener("click", () => {
      document.documentElement.dataset.accent = button.dataset.accentChoice;
      document
        .querySelectorAll("[data-accent-choice]")
        .forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
      document.getElementById("accent-label").textContent = {
        sage: "Sage",
        blue: "Ocean",
        violet: "Iris",
      }[button.dataset.accentChoice];
    }),
  );
  document.querySelectorAll("[data-device]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .getElementById("preview-canvas")
        .classList.toggle("mobile", button.dataset.device === "mobile");
      document
        .querySelectorAll("[data-device]")
        .forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    }),
  );
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ["waiting", "fallback"].includes(stage)) reset();
  });
  window.addEventListener("beforeunload", cleanup);
  render(false);
})();
