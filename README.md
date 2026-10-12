# Makketing Identity Hub

Sandbox identity console, visually aligned with [SocialPostAPI](https://socialpostapi.makketing.com).

This is not a live OAuth broker. It does not collect passwords, call social APIs, or issue tokens.

## What it does

- Register apps by https origin only. SocialPostAPI and Makketing start registered. Dark Suite stays out.
- Connect sandbox profiles on X, Instagram, Facebook, TikTok, LinkedIn, YouTube, and Reddit. Snapchat is planned and identity-only, not a connector.
- Grant each app a subset of the scopes that account allowed.
- Disconnecting an account removes its grants. Removing an app revokes its grants.
- Activity log keeps the latest 200 events and can export JSON.
- Embeddable sandbox widget with a shadow root, light and dark themes, and an `identityhub:selection` event.

## Widget

Host `public/identity-hub-widget.js` with the integrating app. It has no dependencies and refuses any mode other than `sandbox`.

```html
<div id="identity-hub"></div>
<script src="identity-hub-widget.js"></script>
<script>
  IdentityHub.mount("#identity-hub", {
    appName: "Your app",
    theme: "light",
    providers: ["x", "instagram", "facebook", "tiktok", "linkedin", "youtube", "reddit"],
    mode: "sandbox",
    onComplete: function (detail) {
      console.log(detail); // { mode: "sandbox", authenticated: false, platforms, appName }
    }
  });
</script>
```
