/*
 * Identity Hub sign-in widget.
 *
 *   <div id="identity-hub"></div>
 *   <script src="https://HUB/widget.js" data-client-id="ihub_pk_..."
 *           data-redirect-uri="https://your.app/callback" data-scope="profile" async></script>
 *
 * Renders one Sign in button. Opening it shows the sign-in methods the app
 * chose in Identity Hub (fetched live, so changing them there needs no change
 * here) plus email sign-up. The modal path opens hub credential pages in a
 * frame: passwords are only ever typed on the hub, never on the host site.
 * Allow and Deny run in a top-level hub window. presentation "popup" keeps
 * the older window.open path. When the person is done, this page goes to the
 * app's redirect URI with `code` and `state`.
 *
 * The widget stores a random `state` in the cookie `ihub_state` on the host
 * site. The app's callback must check that the `state` query parameter equals
 * that cookie before exchanging the code.
 */
(function () {
  "use strict";

  var ICONS = {
    google:
      "M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22ZM6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59ZM12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59c.79-2.36 3-4.12 5.6-4.12Z",
    twitter:
      "M14.23 10.16 22.98 0h-2.07l-7.59 8.82L7.25 0H.26l9.17 13.34L.26 24h2.07l8.02-9.32L16.75 24h6.99l-9.51-13.84Zm-2.84 3.3-.93-1.33L3.08 1.56h3.18l5.97 8.53.93 1.33 7.75 11.09h-3.18l-6.34-9.05Z",
    instagram:
      "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1 .1-1.6.2-2 .4-.4.2-.7.4-1 .7-.3.3-.5.6-.7 1-.2.4-.3 1-.4 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1 .2 1.6.4 2 .2.4.4.7.7 1 .3.3.6.5 1 .7.4.2 1 .3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1-.1 1.6-.2 2-.4.4-.2.7-.4 1-.7.3-.3.5-.6.7-1 .2-.4.3-1 .4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1-.2-1.6-.4-2-.2-.4-.4-.7-.7-1-.3-.3-.6-.5-1-.7-.4-.2-1-.3-2-.4-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm6.2-2.2a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z",
    facebook:
      "M14.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H18V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9V11H9v3h2.9v8h2.6Z",
    tiktok:
      "M16.6 3c.4 2.6 1.9 4.3 4.4 4.6v2.6c-1.5 0-2.9-.5-4.1-1.3v6.4c0 4.1-3 6.7-6.6 6.7A6.3 6.3 0 0 1 4 15.6c0-3.5 2.8-6.3 6.4-6.3.4 0 .8 0 1.2.1v2.8a3.7 3.7 0 0 0-1.2-.2 3.5 3.5 0 0 0-3.6 3.6 3.5 3.5 0 0 0 5.8 2.6 3.4 3.4 0 0 0 1.2-2.7V3h2.8Z",
    linkedin:
      "M5.7 8.7a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4.2 20.5V10h3.1v10.5H4.2Zm5.1 0V10h3v1.4h.1c.4-.8 1.5-1.6 3-1.6 3.2 0 3.8 2.1 3.8 4.8v5.9h-3.1v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7v5.3H9.3Z",
    youtube:
      "M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1.1 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .4-4.8 29 29 0 0 0-.4-4.8ZM10.2 15.2V8.8L15.6 12l-5.4 3.2Z",
    reddit:
      "M12 3.2a1.5 1.5 0 0 0-1.5 1.6c0 .3.1.6.2.8L6.4 7.1a2 2 0 1 0 .2 1.1l4.2-1.4c.4.2.8.3 1.2.3s.8-.1 1.2-.3l4.2 1.4a2 2 0 1 0 .2-1.1L13.3 5.6c.1-.2.2-.5.2-.8A1.5 1.5 0 0 0 12 3.2Zm-4.4 8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm8.8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM8.2 16.6c.2.3.6.4 1 .4.8 0 1.5-.4 2.1-.8.2-.1.5-.1.7 0 .6.4 1.3.8 2.1.8.4 0 .8-.1 1-.4.3-.3.7-.3 1 0s.3.7 0 1c-.4.5-1.1.8-2 .8-1 0-1.8-.5-2.4-1.1a3.4 3.4 0 0 1-2.4 1.1c-.9 0-1.6-.3-2-.8-.3-.3-.3-.7 0-1 .3-.3.7-.3.9 0Z",
  };
  // Lucide "ghost" and "mail", stroked.
  var STROKED = {
    shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6",
    lock: "M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3M12 14v3",
    fingerprint:
      "M4 12a8 8 0 0 1 16 0M7 12a5 5 0 0 1 10 0c0 4-.5 7-2 9M10 20c2-3 2-5 2-8M7 15c0 3-1 5-2 6M20 15c0 2-.3 4-.8 6",
    snapchat:
      "M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",
    password:
      "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  };

  function icon(id) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (STROKED[id]) {
      path.setAttribute("d", STROKED[id]);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    } else {
      path.setAttribute("d", ICONS[id] || "");
      path.setAttribute("fill", "currentColor");
    }
    svg.appendChild(path);
    return svg;
  }

  function css(theme, accent, suppliedPalette) {
    var dark = theme === "dark";
    var palette = {
      sage: dark ? ["#b9d6b9", "#2a3f30", "#16281c"] : ["#315d4c", "#e9f2e9", "#fff"],
      blue: dark ? ["#a9cfe9", "#223d50", "#142735"] : ["#285b87", "#e9f1f8", "#fff"],
      violet: dark ? ["#d0bfeb", "#392e4c", "#292037"] : ["#66508d", "#f0ecf7", "#fff"],
    };
    var chosen = Object.prototype.hasOwnProperty.call(palette, accent)
      ? palette[accent]
      : palette.sage;
    // The API and builder share a contrast-aware palette. Only RGB hex values
    // reach CSS, including for externally supplied mount configurations.
    if (
      suppliedPalette &&
      [suppliedPalette.accent, suppliedPalette.soft, suppliedPalette.onAccent].every(
        function (color) {
          return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
        },
      )
    ) {
      chosen = [suppliedPalette.accent, suppliedPalette.soft, suppliedPalette.onAccent];
    }
    return `
      :host{all:initial;display:block;font-family:'Inter Variable',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        --bg:${dark ? "#1a2520" : "#fff"};--fg:${dark ? "#f0f4ef" : "#1a2925"};--muted:${dark ? "#b0bdb4" : "#5c6b63"};
        --line:${dark ? "#34453b" : "#e1e7e2"};--control:${dark ? "#718779" : "#a4afa8"};--soft:${dark ? "#233129" : "#f3f6f3"};
        --accent:${chosen[0]};--accent-soft:${chosen[1]};--on-accent:${chosen[2]};color-scheme:${dark ? "dark" : "light"}}
      *,*::before,*::after{box-sizing:border-box} [hidden]{display:none!important}
      .wrap{display:block;max-width:404px;width:100%;font-size:14px;line-height:1.5;color:var(--fg)}
      button{font:inherit;cursor:pointer} button:disabled{cursor:wait;opacity:.55}
      .launcher{display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:0 20px;border:1px solid var(--fg);border-radius:9px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:600}
      button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
      .panel{margin-top:12px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 24px 64px -24px #203b3433,0 4px 16px #203b3408}
      .topline{display:flex;align-items:center;gap:7px;padding:20px 26px 0;font-size:11px;color:var(--muted)}.topline svg{width:14px;height:14px}
      .content{padding:26px}.monogram{width:52px;height:52px;display:grid;place-items:center;margin:0 auto 22px;border-radius:14px;border:1px solid var(--line);background:var(--accent-soft);color:var(--accent);font-size:30px;font-weight:650;letter-spacing:-1.5px}
      .monogram svg{width:28px;height:28px}.monogram.logo{background:transparent;border:0;border-radius:0}.monogram.logo img{width:100%;height:100%;object-fit:contain}
      .title{margin:0;text-align:center;font-size:25px;line-height:1.25;font-weight:600;letter-spacing:-.8px;overflow-wrap:anywhere}.subtitle{margin:11px 0 24px;text-align:center;font-size:13px;line-height:1.7;color:var(--muted)}
      .methods{display:grid;gap:10px}.method{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;min-height:48px;padding:11px 15px;border:1px solid var(--control);border-radius:9px;font-size:14px;font-weight:600;color:var(--fg);background:var(--bg);transition:background .18s,border-color .18s}
      .method:hover{background:var(--soft);border-color:var(--accent)}.method.primary{background:var(--fg);border-color:var(--fg);color:var(--bg)}.method.primary:hover{opacity:.9}
      svg{width:19px;height:19px;flex:none}.divider{display:flex;align-items:center;gap:12px;margin:18px 0;font-size:11px;color:var(--muted)}.divider::before,.divider::after{content:"";height:1px;background:var(--line);flex:1}
      .signup{margin:14px 0 0;text-align:center;font-size:13px;color:var(--muted)}.text-button{border:0;background:transparent;color:var(--accent);min-height:44px;font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
      .privacy{display:flex;align-items:flex-start;gap:10px;padding:14px;margin-top:22px;border-radius:9px;background:var(--soft)}.privacy svg{width:17px;height:17px;color:var(--accent);margin-top:2px}.privacy p{margin:0;color:var(--muted);font-size:11px;line-height:1.7}.privacy strong{display:block;color:var(--fg);font-size:12px;font-weight:600}
      .foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;margin:0;padding:15px 18px;border-top:1px solid var(--line);background:var(--soft);color:var(--muted);font-size:10px}.foot svg{width:14px;height:14px}.foot span{white-space:nowrap}.foot strong{color:var(--fg);font-weight:650}
      .note{font-size:12px;color:var(--muted);line-height:1.7;margin:14px 0 0}.status{border:1px solid var(--line);padding:12px;border-radius:9px;background:var(--soft);margin-top:14px}.status .note{margin:0}.status button{display:block;margin-top:6px}
      @media(max-width:380px){.content{padding:23px}.title{font-size:23px}}
      @media(prefers-reduced-motion:reduce){*{transition:none!important}}
    `;
  }

  function randomState() {
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    var text = "";
    for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function openPopup(url) {
    var width = 520;
    var height = 720;
    var left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    var top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    return window.open(
      url,
      "identity-hub-signin",
      "popup,width=" + width + ",height=" + height + ",left=" + left + ",top=" + top,
    );
  }

  /** Poll the hub until the popup finishes; the hub keeps the result under the relay id. */
  function waitForRelay(options, relay, popup, onDone) {
    var deadline = Date.now() + 15 * 60 * 1000;
    var stopped = false;
    var timer = 0;
    var closedAt = 0;
    var notified = false;
    function poll() {
      if (stopped) return;
      if (Date.now() > deadline) {
        options.onStatus("Sign-in timed out. You can try again.", true);
        stopped = true;
        return;
      }
      if (popup.closed && !closedAt) closedAt = Date.now();
      // COOP can make an active provider window appear closed. Keep polling,
      // but let the visitor restart rather than leave a frozen sign-in card.
      if (closedAt && Date.now() - closedAt > 5000 && !notified) {
        notified = true;
        options.onStatus(
          "The sign-in window has not returned. You can try again or choose another method.",
          true,
        );
      }
      fetch(options.hub + "/api/v1/relay/" + relay, { credentials: "omit", cache: "no-store" })
        .then(function (response) {
          return response.json();
        })
        .then(function (body) {
          if (stopped) return;
          if (body.status === "done" && body.location) {
            stopped = true;
            onDone(body.location);
          } else timer = setTimeout(poll, 1000);
        })
        .catch(function () {
          if (!stopped) timer = setTimeout(poll, 2000);
        });
    }
    poll();
    return function () {
      stopped = true;
      clearTimeout(timer);
    };
  }

  function rememberState(state) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = "ihub_state=" + state + "; Path=/; Max-Age=900; SameSite=Lax" + secure;
  }

  /** Same-origin path the hub accepts as return_to. `method` skips the chooser. */
  function authorizePath(options, method, relay, state) {
    var params = new URLSearchParams({
      client_id: options.clientId,
      redirect_uri: options.redirectUri,
      scope: options.scope || "profile",
      state: state,
      method: method,
    });
    if (relay) params.set("relay", relay);
    return "/authorize?" + params.toString();
  }

  /** A relay on the top window makes /authorize close instead of redirecting to the app. */
  function withoutRelay(path) {
    var query = path.indexOf("?");
    if (query === -1) return path;
    var params = new URLSearchParams(path.slice(query + 1));
    params.delete("relay");
    var rest = params.toString();
    return rest ? path.slice(0, query) + "?" + rest : path.slice(0, query);
  }

  function installStyles(root, text) {
    if (
      "adoptedStyleSheets" in root &&
      typeof CSSStyleSheet !== "undefined" &&
      "replaceSync" in CSSStyleSheet.prototype
    ) {
      var sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      root.adoptedStyleSheets = [sheet];
      return;
    }
    var style = document.createElement("style");
    style.textContent = text;
    root.appendChild(style);
  }

  function frameUrl(options, page, method, relay, state) {
    var next = authorizePath(options, method, relay, state);
    var params = new URLSearchParams({
      embed: "1",
      parent_origin: location.origin,
      return_to: next,
    });
    return options.hub + page + "?" + params.toString();
  }

  function modalCss() {
    return [
      ":host{all:initial}",
      ".backdrop{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.45)}",
      ".dialog{display:flex;flex-direction:column;width:min(432px,100%);height:min(780px,calc(100dvh - 32px));overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--bg);color:var(--fg);font-family:Inter,Segoe UI,sans-serif;box-shadow:0 24px 80px #0003}",
      ".bar{display:flex;flex:none;align-items:center;justify-content:flex-end;height:44px}",
      ".close{min-width:64px;min-height:44px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:12px;font-weight:600;cursor:pointer}",
      ".body{display:flex;flex:1;flex-direction:column;min-height:0}",
      "iframe{flex:1;width:100%;border:0}",
      ".fallback{display:flex;flex:1;flex-direction:column;justify-content:center;gap:16px;padding:24px}",
      ".fallback p{margin:0;font-size:16px;line-height:1.5}",
      ".go{min-height:48px;border:0;border-radius:9px;background:var(--accent);color:var(--on-accent);font:inherit;font-size:14px;font-weight:600;cursor:pointer}",
      "@media (max-width:639px){.backdrop{padding:0}.dialog{width:100%;height:100dvh;border-radius:0}.bar{height:calc(44px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top)}}",
    ].join("");
  }

  function acceptLocation(options, location) {
    var target = new URL(location);
    var expected = new URL(options.redirectUri);
    if (target.origin !== expected.origin || target.pathname !== expected.pathname) return false;
    window.top.location.assign(location);
    return true;
  }

  function openModal(options, frameSrc, relay, continuePath, invoker) {
    if (window.__ihubModal) window.__ihubModal.close();
    var host = document.createElement("div");
    var root = host.attachShadow({ mode: "open" });
    installStyles(root, css(options.theme, options.accent, options.palette) + modalCss());
    var backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    var dialog = document.createElement("div");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Sign in with Identity Hub");
    var bar = document.createElement("div");
    bar.className = "bar";
    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close";
    closeButton.textContent = "Close";
    bar.appendChild(closeButton);
    var body = document.createElement("div");
    body.className = "body";
    var iframe = document.createElement("iframe");
    iframe.title = "Sign in with Identity Hub";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
    );
    iframe.referrerPolicy = "no-referrer";
    iframe.src = frameSrc;
    body.appendChild(iframe);
    dialog.appendChild(bar);
    dialog.appendChild(body);
    backdrop.appendChild(dialog);
    root.appendChild(backdrop);

    var stashed = [];
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child.hasAttribute("inert")) return;
      child.setAttribute("inert", "");
      stashed.push(child);
    });
    document.body.appendChild(host);
    closeButton.focus();

    var stopped = false;
    var settled = false;
    var closed = false;
    var deadline = Date.now() + 15 * 60 * 1000;
    var pollTimer = 0;
    var handshake = setTimeout(function () {
      beacon();
      showFallback("This page blocked the sign-in frame.", true);
    }, 8000);

    function beacon() {
      try {
        navigator.sendBeacon(
          options.hub + "/api/auth/embed-report",
          new Blob([JSON.stringify({ reason: "handshake-timeout" })], { type: "text/plain" }),
        );
      } catch (error) {
        // The timeout still shows the button when the beacon cannot leave.
      }
    }

    function stopPoll() {
      stopped = true;
      clearTimeout(pollTimer);
    }

    function readRelay() {
      return fetch(options.hub + "/api/v1/relay/" + encodeURIComponent(relay), {
        credentials: "omit",
        cache: "no-store",
      }).then(function (response) {
        return response.json();
      });
    }

    function poll(delay) {
      if (stopped) return;
      pollTimer = setTimeout(function () {
        if (stopped) return;
        if (Date.now() > deadline) {
          showFallback("Sign-in timed out.", false);
          return;
        }
        readRelay()
          .then(function (payload) {
            if (stopped) return;
            if (payload && payload.status === "done" && payload.location) {
              stopPoll();
              acceptLocation(options, payload.location);
              return;
            }
            poll(1000);
          })
          .catch(function () {
            poll(2000);
          });
      }, delay);
    }

    function showFallback(message, withButton) {
      if (settled) return;
      settled = true;
      clearTimeout(handshake);
      while (body.firstChild) body.removeChild(body.firstChild);
      var panel = document.createElement("div");
      panel.className = "fallback";
      var text = document.createElement("p");
      text.textContent = message;
      panel.appendChild(text);
      if (withButton) {
        var go = document.createElement("button");
        go.type = "button";
        go.className = "go";
        go.textContent = "Continue on Identity Hub";
        go.addEventListener("click", function () {
          window.top.location.assign(options.hub + withoutRelay(continuePath));
        });
        panel.appendChild(go);
      }
      body.appendChild(panel);
    }

    function onMessage(event) {
      if (event.origin !== options.hub) return;
      if (!iframe.contentWindow || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || data.source !== "identity-hub" || data.v !== 1) return;
      if (data.type === "ready") {
        clearTimeout(handshake);
        return;
      }
      if (data.type === "done") {
        readRelay()
          .then(function (payload) {
            if (payload && payload.status === "done" && payload.location)
              acceptLocation(options, payload.location);
          })
          .catch(function () {});
        return;
      }
      if (data.type === "dismiss") {
        closeModal();
        return;
      }
      if (data.type === "cookies-blocked") {
        showFallback("This browser will not keep a sign-in in the frame.", true);
        return;
      }
      if (data.type === "popup-blocked") {
        showFallback("The sign-in window was blocked.", true);
        return;
      }
      if (data.type === "reset-sent") {
        stopPoll();
        showFallback(
          "The link opens in a new tab. This sign-in will not finish. After you change the password, start again from the site.",
          false,
        );
      }
    }

    function closeModal() {
      if (closed) return;
      closed = true;
      stopPoll();
      clearTimeout(handshake);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
      readRelay()
        .then(function (payload) {
          if (payload && payload.status === "done" && payload.location)
            acceptLocation(options, payload.location);
        })
        .catch(function () {});
      stashed.forEach(function (child) {
        child.removeAttribute("inert");
      });
      host.remove();
      if (window.__ihubModal && window.__ihubModal.host === host) window.__ihubModal = null;
      if (invoker) {
        try {
          invoker.focus();
        } catch (error) {
          // The button may already be gone.
        }
      }
    }

    function onKey(event) {
      if (event.key === "Escape") closeModal();
    }

    backdrop.addEventListener("pointerdown", function (event) {
      if (event.target === backdrop) closeModal();
    });
    closeButton.addEventListener("click", closeModal);
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    poll(1000);
    window.__ihubModal = { host: host, close: closeModal };
  }

  function launch(options, url, relay) {
    if (options.cancel) options.cancel();
    // Must run inside the click handler, before any await, or browsers block it.
    var popup = openPopup(url);
    if (!popup) {
      var fallback = new URL(url);
      fallback.searchParams.delete("relay");
      if (fallback.searchParams.has("return_to"))
        fallback.searchParams.set(
          "return_to",
          withoutRelay(fallback.searchParams.get("return_to")),
        );
      window.top.location.assign(fallback.href);
      return;
    }
    if (!relay) return;
    options.onStatus(
      "Finish signing in in the popup window. This page will update automatically.",
      false,
    );
    var stop = waitForRelay(options, relay, popup, function (location) {
      // Only ever follow a result that goes to this app's own redirect URI.
      var target;
      try {
        target = new URL(location);
      } catch {
        options.onStatus("The sign-in result was not valid. Please try again.", true);
        return;
      }
      var expected = new URL(options.redirectUri);
      if (target.origin !== expected.origin || target.pathname !== expected.pathname) {
        options.onStatus("The sign-in result did not match this app. Please try again.", true);
        return;
      }
      try {
        popup.close();
      } catch {
        // The popup may already be gone.
      }
      window.top.location.assign(location);
    });
    options.cancel = function () {
      stop();
      try {
        popup.close();
      } catch {
        /* Already closed. */
      }
      options.onStatus("", false);
    };
  }

  function start(options, method, invoker) {
    if (options.preview) return;
    var state = randomState();
    rememberState(state);
    var relay = randomState();
    var next = authorizePath(options, method, relay, state);
    if (options.presentation === "popup") {
      launch(options, options.hub + next, relay);
      return;
    }
    openModal(options, frameUrl(options, "/login", method, relay, state), relay, next, invoker);
  }

  /** Email sign-up stays on the hub. After the address is confirmed, consent continues. */
  function startSignup(options, invoker) {
    if (options.preview) return;
    var state = randomState();
    rememberState(state);
    var relay = randomState();
    var next = authorizePath(options, "password", relay, state);
    if (options.presentation === "popup") {
      launch(options, options.hub + "/signup?return_to=" + encodeURIComponent(next), relay);
      return;
    }
    openModal(
      options,
      frameUrl(options, "/signup", "password", relay, state),
      relay,
      next,
      invoker,
    );
  }

  function render(root, config, options) {
    if (root._ihubCancel) root._ihubCancel();
    options.theme = config.theme;
    options.accent = config.accent;
    options.palette = config.palette;
    while (root.firstChild) root.removeChild(root.firstChild);
    // A constructed stylesheet is not inline CSS, so a strict CSP on the host
    // page (style-src without 'unsafe-inline') does not block it.
    installStyles(root, css(config.theme, config.accent, config.palette));
    var wrap = document.createElement("div");
    wrap.className = "wrap";
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "launcher";
    launcher.textContent = "Sign in";
    launcher.setAttribute("aria-haspopup", "true");
    launcher.setAttribute("aria-expanded", "false");
    var panel = document.createElement("div");
    panel.className = "panel";
    panel.hidden = true;
    panel.id = "ihub-methods-" + randomState().slice(0, 8);
    launcher.setAttribute("aria-controls", panel.id);
    var title = document.createElement("h2");
    title.className = "title";
    title.id = panel.id + "-title";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", title.id);
    title.textContent = "Welcome to " + config.name;
    var top = document.createElement("div");
    top.className = "topline";
    top.appendChild(icon("lock"));
    top.appendChild(document.createTextNode("Sign in with IdentityHub"));
    panel.appendChild(top);
    var content = document.createElement("div");
    content.className = "content";
    var monogram = document.createElement("div");
    monogram.className = "monogram";
    monogram.setAttribute("aria-hidden", "true");
    monogram.textContent = (Array.from(config.name.trim())[0] || "a").toLowerCase() + ".";
    var selectedBrand = config.brand || { kind: "initials" };
    if (
      selectedBrand.kind === "icon" &&
      typeof selectedBrand.path === "string" &&
      selectedBrand.path.length <= 1000
    ) {
      monogram.textContent = "";
      var mark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      mark.setAttribute("viewBox", "0 0 24 24");
      mark.setAttribute("fill", "none");
      mark.setAttribute("stroke", "currentColor");
      mark.setAttribute("stroke-width", "1.6");
      mark.setAttribute("stroke-linecap", "round");
      mark.setAttribute("stroke-linejoin", "round");
      var markPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      markPath.setAttribute("d", selectedBrand.path);
      mark.appendChild(markPath);
      monogram.appendChild(mark);
    } else if (
      selectedBrand.kind === "logo" &&
      typeof selectedBrand.dataUrl === "string" &&
      selectedBrand.dataUrl.length <= 174786 &&
      /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(selectedBrand.dataUrl)
    ) {
      monogram.textContent = "";
      monogram.classList.add("logo");
      var logo = document.createElement("img");
      logo.alt = "";
      logo.src = selectedBrand.dataUrl;
      logo.addEventListener("error", function () {
        monogram.classList.remove("logo");
        monogram.textContent = (Array.from(config.name.trim())[0] || "a").toLowerCase() + ".";
      });
      monogram.appendChild(logo);
    }
    if (selectedBrand.kind !== "none") content.appendChild(monogram);
    content.appendChild(title);
    var subtitle = document.createElement("p");
    subtitle.className = "subtitle";
    subtitle.textContent = "Sign in your way. We'll take it from here.";
    content.appendChild(subtitle);
    var list = document.createElement("div");
    list.className = "methods";
    var social = config.methods.filter(function (method) {
      return method.id !== "password";
    });
    var email = config.methods.some(function (method) {
      return method.id === "password";
    });
    social.forEach(function (method) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "method";
      button.appendChild(icon(method.id));
      button.appendChild(document.createTextNode("Continue with " + method.label));
      button.addEventListener("click", function () {
        if (options.preview) return;
        start(options, method.id, button);
      });
      list.appendChild(button);
    });
    content.appendChild(list);
    if (email) {
      if (social.length) {
        var divider = document.createElement("div");
        divider.className = "divider";
        divider.textContent = "or use email";
        content.appendChild(divider);
      }
      var emailButton = document.createElement("button");
      emailButton.type = "button";
      emailButton.className = "method primary";
      emailButton.appendChild(icon("password"));
      emailButton.appendChild(document.createTextNode("Continue with email"));
      emailButton.addEventListener("click", function () {
        start(options, "password", emailButton);
      });
      content.appendChild(emailButton);
      var signupLine = document.createElement("p");
      signupLine.className = "signup";
      signupLine.appendChild(document.createTextNode("New here? "));
      var signup = document.createElement("button");
      signup.type = "button";
      signup.className = "text-button";
      signup.textContent = "Create an account";
      signup.addEventListener("click", function () {
        startSignup(options, signup);
      });
      signupLine.appendChild(signup);
      content.appendChild(signupLine);
    }
    if (config.methods.length === 0) {
      var none = document.createElement("p");
      none.className = "note";
      none.textContent = "No sign-in method is turned on.";
      content.appendChild(none);
    }
    var status = document.createElement("div");
    status.className = "status";
    status.hidden = true;
    status.setAttribute("role", "status");
    var statusText = document.createElement("p");
    statusText.className = "note";
    status.appendChild(statusText);
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "text-button";
    cancel.textContent = "Cancel sign-in";
    cancel.addEventListener("click", function () {
      if (options.cancel) options.cancel();
    });
    status.appendChild(cancel);
    options.onStatus = function (message, retry) {
      status.hidden = !message;
      statusText.textContent = message;
      cancel.textContent = retry ? "Dismiss and choose a method" : "Cancel sign-in";
    };
    root._ihubCancel = function () {
      if (options.cancel) options.cancel();
    };
    content.appendChild(status);
    var privacy = document.createElement("div");
    privacy.className = "privacy";
    privacy.appendChild(icon("shield"));
    var privacyText = document.createElement("p");
    var privacyTitle = document.createElement("strong");
    privacyTitle.textContent = "Your identity. Your choice.";
    privacyText.appendChild(privacyTitle);
    privacyText.appendChild(
      document.createTextNode("Review what you share before an app gets access."),
    );
    privacy.appendChild(privacyText);
    content.appendChild(privacy);
    panel.appendChild(content);
    var foot = document.createElement("div");
    foot.className = "foot";
    foot.appendChild(icon("fingerprint"));
    var brand = document.createElement("span");
    brand.textContent = "Powered by IdentityHub";
    foot.appendChild(brand);
    var separator = document.createElement("span");
    separator.textContent = "·";
    separator.setAttribute("aria-hidden", "true");
    foot.appendChild(separator);
    var trust = document.createElement("span");
    trust.textContent = "You choose what you share";
    foot.appendChild(trust);
    panel.appendChild(foot);
    // The builder preview starts open so the chosen methods and email sign-up
    // are visible. Embedded widgets stay closed until Sign in is clicked.
    var open = Boolean(options.preview);
    function setOpen(next) {
      open = next;
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", open ? "true" : "false");
    }
    setOpen(open);
    launcher.addEventListener("click", function () {
      setOpen(!open);
    });
    wrap.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        launcher.focus();
      }
    });
    if (root._ihubOutside) document.removeEventListener("pointerdown", root._ihubOutside);
    root._ihubOutside = function (event) {
      if (!open) return;
      if (event.composedPath().indexOf(wrap) === -1) setOpen(false);
    };
    document.addEventListener("pointerdown", root._ihubOutside);
    wrap.appendChild(launcher);
    wrap.appendChild(panel);
    root.appendChild(wrap);
  }

  /**
   * IdentityHub.mount(element, { hub, clientId, redirectUri, scope, config?, preview? })
   * `config` skips the network fetch (used by the live preview in the hub).
   */
  function mount(element, options) {
    var root = element.shadowRoot || element.attachShadow({ mode: "open" });
    if (options.config) {
      render(root, options.config, options);
      return Promise.resolve();
    }
    return fetch(options.hub + "/api/v1/widget/" + encodeURIComponent(options.clientId), {
      credentials: "omit",
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Identity Hub: unknown client_id");
        return response.json();
      })
      .then(function (config) {
        // A previously copied IP-address snippet should open authentication
        // on the configured host, which owns the hub's session cookie.
        if (config.hub_origin) options.hub = new URL(config.hub_origin).origin;
        if (!options.redirectUri) options.redirectUri = config.redirect_uris[0];
        options.presentation = config.presentation === "popup" ? "popup" : "modal";
        render(root, config, options);
      })
      .catch(function (error) {
        console.error(error);
        var message = document.createElement("p");
        message.setAttribute("role", "alert");
        message.textContent =
          "Sign-in is temporarily unavailable. Please reload this page to try again.";
        root.appendChild(message);
      });
  }

  window.IdentityHub = { mount: mount };

  var script = document.currentScript;
  if (script && script.dataset.clientId) {
    var hub = new URL(script.src).origin;
    var target = document.querySelector(script.dataset.target || "#identity-hub");
    if (!target) {
      target = document.createElement("div");
      script.parentNode.insertBefore(target, script);
    }
    mount(target, {
      hub: hub,
      clientId: script.dataset.clientId,
      redirectUri: script.dataset.redirectUri,
      scope: script.dataset.scope,
    });
  }
})();
