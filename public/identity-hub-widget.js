/* Identity Hub by Makketing — standalone sandbox widget. No OAuth or tokens. */
(function (global) {
  "use strict";
  var supported = {
    x: "X",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    reddit: "Reddit",
  };

  function css(theme) {
    var dark = theme === "dark";
    var bg = dark ? "#161618" : "#ffffff";
    var fg = dark ? "#f5f5f7" : "#111111";
    var muted = dark ? "#a1a1a6" : "#6e6e73";
    var line = dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)";
    var soft = dark ? "rgba(255,255,255,.06)" : "#f5f5f7";
    var cta = dark ? "#f5f5f7" : "#111111";
    var ctaFg = dark ? "#111111" : "#ffffff";
    return (
      ":host{display:block;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:" +
      fg +
      "}" +
      ".card{background:" +
      bg +
      ";border:1px solid " +
      line +
      ";border-radius:20px;padding:22px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 28px rgba(0,0,0,.06)}" +
      ".kicker{margin:0;font-size:12px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:" +
      muted +
      "}" +
      "h2{margin:6px 0 0;font-size:22px;line-height:1.2;letter-spacing:-.03em;font-weight:650}" +
      ".lead{margin:8px 0 0;color:" +
      muted +
      ";font-size:14px;line-height:1.45}" +
      "fieldset{border:0;margin:16px 0 0;padding:0;display:grid;gap:8px}" +
      "legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}" +
      "label{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 12px;border-radius:12px;background:" +
      soft +
      ";font-size:15px;font-weight:550;cursor:pointer}" +
      "input{width:18px;height:18px;accent-color:" +
      cta +
      "}" +
      "button{margin-top:16px;width:100%;min-height:44px;border:0;border-radius:999px;background:" +
      cta +
      ";color:" +
      ctaFg +
      ";font:600 15px/1 inherit;cursor:pointer}" +
      "button:disabled{opacity:.4;cursor:default}" +
      ".result{min-height:1.2em;margin:12px 0 0;font-size:14px;line-height:1.45}" +
      "small{display:block;margin-top:14px;color:" +
      muted +
      ";font-size:12px}"
    );
  }

  function mount(target, options) {
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) throw new Error("IdentityHub: target not found");
    var opt = Object.assign(
      { appName: "Your app", theme: "light", providers: Object.keys(supported), mode: "sandbox" },
      options || {},
    );
    if (opt.mode !== "sandbox" && opt.mode !== "live") {
      throw new Error("IdentityHub mode must be sandbox or live.");
    }
    if (opt.mode === "live" && !opt.clientId) {
      throw new Error("Live mode requires a clientId from the Identity Hub workspace.");
    }
    var ids = (opt.providers || []).filter(function (id) {
      return Object.prototype.hasOwnProperty.call(supported, id);
    });
    if (!ids.length) ids = Object.keys(supported);
    var appName = String(opt.appName || "Your app").slice(0, 40);

    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.replaceChildren();
    var style = document.createElement("style");
    style.textContent = css(opt.theme === "dark" ? "dark" : "light");
    var card = document.createElement("div");
    card.className = "card";
    var kicker = document.createElement("p");
    kicker.className = "kicker";
    kicker.textContent = "Identity Hub";
    var title = document.createElement("h2");
    title.textContent = appName;
    var lead = document.createElement("p");
    lead.className = "lead";
    lead.textContent =
      opt.mode === "live"
        ? "Choose the platforms this app should request. You will confirm the connection on Identity Hub."
        : "Choose sandbox accounts to request. No login token is issued.";
    var fieldset = document.createElement("fieldset");
    var legend = document.createElement("legend");
    legend.textContent = "Platforms";
    fieldset.append(legend);
    var selected = new Set(ids);
    ids.forEach(function (id) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.addEventListener("change", function () {
        if (input.checked) selected.add(id);
        else selected.delete(id);
        submit.disabled = selected.size === 0;
      });
      label.append(input, document.createTextNode(supported[id]));
      fieldset.append(label);
    });
    var submit = document.createElement("button");
    submit.type = "button";
    submit.textContent = opt.mode === "live" ? "Continue to Identity Hub" : "Continue in sandbox";
    var result = document.createElement("p");
    result.className = "result";
    result.setAttribute("role", "status");
    var foot = document.createElement("small");
    foot.textContent =
      opt.mode === "live"
        ? "Powered by Makketing · You approve the connection before any access token is issued."
        : "Powered by Makketing · Sandbox only. No login token is issued.";
    card.append(kicker, title, lead, fieldset, submit, result, foot);
    root.append(style, card);

    submit.addEventListener("click", function () {
      if (opt.mode === "live") {
        var base = String(opt.hubOrigin || window.location.origin).replace(/\/$/, "");
        var next = new URL(base + "/connect");
        next.searchParams.set("client_id", String(opt.clientId));
        if (opt.redirectUri) next.searchParams.set("redirect_uri", String(opt.redirectUri));
        next.searchParams.set("providers", ids.filter(function (id) { return selected.has(id); }).join(","));
        window.location.assign(next.toString());
        return;
      }
      var platforms = ids.filter(function (id) {
        return selected.has(id);
      });
      var detail = { mode: "sandbox", authenticated: false, platforms: platforms, appName: appName };
      var names = platforms.map(function (id) {
        return supported[id];
      });
      result.textContent =
        "Demo selection complete: " + names.join(", ") + ". No accounts were authenticated.";
      host.dispatchEvent(new CustomEvent("identityhub:selection", { detail: detail, bubbles: true }));
      if (typeof opt.onComplete === "function") opt.onComplete(detail);
    });

    return {
      destroy: function () {
        root.replaceChildren();
      },
    };
  }

  global.IdentityHub = { mount: mount };
})(window);
