/*
 * Identity Hub sign-in widget.
 *
 *   <div id="identity-hub"></div>
 *   <script src="https://HUB/widget.js" data-client-id="ihub_pk_..."
 *           data-redirect-uri="https://your.app/callback" data-scope="profile" async></script>
 *
 * Renders the sign-in methods the app chose in Identity Hub (fetched live, so
 * changing them there needs no change here). Every method opens the hub's own
 * page: passwords are only ever typed on the hub, never on the host site.
 *
 * Before leaving, the widget stores a random `state` in the cookie
 * `ihub_state` on the host site. The app's callback must check that the
 * `state` query parameter equals that cookie before exchanging the code.
 */
(function () {
  "use strict";

  var ICONS = {
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

  function css(theme) {
    var dark = theme === "dark";
    var c = dark
      ? {
          bg: "#161618",
          fg: "#f5f5f7",
          muted: "#a1a1a6",
          line: "rgba(255,255,255,.14)",
          hover: "rgba(255,255,255,.07)",
        }
      : { bg: "#ffffff", fg: "#111111", muted: "#6e6e73", line: "#e8e8ed", hover: "#f5f5f7" };
    return [
      ":host{all:initial;display:block;font-family:'Inter Variable',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".card{box-sizing:border-box;max-width:380px;background:" +
        c.bg +
        ";color:" +
        c.fg +
        ";border:1px solid " +
        c.line +
        ";border-radius:20px;padding:24px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 28px rgba(0,0,0,.06)}",
      "h2{margin:0;font-size:20px;line-height:1.25;font-weight:650;letter-spacing:-.02em}",
      ".methods{display:grid;gap:8px;margin-top:18px}",
      "button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;min-height:44px;padding:0 16px;border:1px solid " +
        c.line +
        ";border-radius:999px;font-size:15px;font-weight:600;color:" +
        c.fg +
        ";cursor:pointer}",
      "button:hover{background:" + c.hover + "}",
      "button:focus-visible{outline:3px solid #0071e3;outline-offset:2px}",
      "svg{width:20px;height:20px;flex:none}",
      ".foot{margin:16px 0 0;font-size:12px;color:" + c.muted + "}",
      ".note{margin:12px 0 0;font-size:13px;color:" + c.muted + "}",
    ].join("");
  }

  function randomState() {
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    var text = "";
    for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function start(options, method) {
    var state = randomState();
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = "ihub_state=" + state + "; Path=/; Max-Age=600; SameSite=Lax" + secure;
    var params = new URLSearchParams({
      client_id: options.clientId,
      redirect_uri: options.redirectUri,
      scope: options.scope || "profile",
      state: state,
      method: method,
    });
    window.top.location.assign(options.hub + "/authorize?" + params.toString());
  }

  function render(root, config, options) {
    while (root.firstChild) root.removeChild(root.firstChild);
    // A constructed stylesheet is not inline CSS, so a strict CSP on the host
    // page (style-src without 'unsafe-inline') does not block it.
    var style = null;
    if (
      "adoptedStyleSheets" in root &&
      typeof CSSStyleSheet !== "undefined" &&
      "replaceSync" in CSSStyleSheet.prototype
    ) {
      var sheet = new CSSStyleSheet();
      sheet.replaceSync(css(config.theme));
      root.adoptedStyleSheets = [sheet];
    } else {
      style = document.createElement("style");
      style.textContent = css(config.theme);
    }
    var card = document.createElement("div");
    card.className = "card";
    var title = document.createElement("h2");
    title.textContent = "Sign in to " + config.name;
    card.appendChild(title);
    var list = document.createElement("div");
    list.className = "methods";
    config.methods.forEach(function (method) {
      var button = document.createElement("button");
      button.type = "button";
      button.appendChild(icon(method.id));
      button.appendChild(document.createTextNode("Continue with " + method.label));
      button.addEventListener("click", function () {
        if (options.preview) return;
        start(options, method.id);
      });
      list.appendChild(button);
    });
    card.appendChild(list);
    if (config.methods.length === 0) {
      var none = document.createElement("p");
      none.className = "note";
      none.textContent = "No sign-in method is turned on.";
      card.appendChild(none);
    }
    var foot = document.createElement("p");
    foot.className = "foot";
    foot.textContent = "Secured by Identity Hub";
    card.appendChild(foot);
    if (style) root.appendChild(style);
    root.appendChild(card);
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
        if (!options.redirectUri) options.redirectUri = config.redirect_uris[0];
        render(root, config, options);
      })
      .catch(function (error) {
        console.error(error);
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
