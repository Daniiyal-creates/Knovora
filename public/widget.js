/*
 * Knovora embed widget.
 * Usage:
 *   <script src="https://YOUR_APP/widget.js" data-knovora-id="PUBLIC_ID" async></script>
 *
 * Injects a floating button that opens the hosted chat page in an iframe.
 * No credentials live here; the chat runs on the Knovora origin inside the iframe.
 */
(function () {
  "use strict";

  function currentScript() {
    if (document.currentScript) return document.currentScript;
    var list = document.querySelectorAll("script[data-knovora-id]");
    return list.length ? list[list.length - 1] : null;
  }

  var script = currentScript();
  if (!script) return;

  var publicId = script.getAttribute("data-knovora-id");
  if (!publicId) {
    console.error("Knovora: missing data-knovora-id on the embed script.");
    return;
  }

  var base = script.getAttribute("data-base-url");
  try {
    if (!base) base = new URL(script.src).origin;
  } catch (e) {
    base = "";
  }
  var position = script.getAttribute("data-position") === "bottom-left" ? "left" : "right";
  var color = script.getAttribute("data-color") || "#4f46e5";

  if (document.getElementById("knovora-widget-root")) return; // avoid double-inject

  var root = document.createElement("div");
  root.id = "knovora-widget-root";

  var side = position === "left" ? "left:20px;" : "right:20px;";

  var panel = document.createElement("div");
  panel.setAttribute("aria-hidden", "true");
  panel.style.cssText =
    "position:fixed;bottom:88px;" +
    side +
    "width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);" +
    "border:none;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.18);" +
    "z-index:2147483647;display:none;background:#fff;";

  var iframe = document.createElement("iframe");
  iframe.title = "Chat";
  iframe.style.cssText = "width:100%;height:100%;border:0;";
  iframe.setAttribute("loading", "lazy");
  // Load lazily on first open to avoid an eager request on every page view.
  panel.appendChild(iframe);

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.style.cssText =
    "position:fixed;bottom:20px;" +
    side +
    "width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;" +
    "box-shadow:0 6px 20px rgba(0,0,0,0.25);z-index:2147483647;background:" +
    color +
    ";display:flex;align-items:center;justify-content:center;";
  button.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" fill="#fff"/></svg>';

  var open = false;
  var loaded = false;
  function toggle() {
    open = !open;
    if (open && !loaded) {
      iframe.src = base + "/chat/" + encodeURIComponent(publicId);
      loaded = true;
    }
    panel.style.display = open ? "block" : "none";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    button.innerHTML = open
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" fill="#fff"/></svg>';
  }

  button.addEventListener("click", toggle);

  root.appendChild(panel);
  root.appendChild(button);

  function mount() {
    document.body.appendChild(root);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
