// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const widgetCode = readFileSync(path.resolve(__dirname, "../public/widget.js"), "utf8");

function loadWidget() {
  new Function(widgetCode)();
}

describe("widget.js", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects a button and lazily opens an iframe to the hosted chat", () => {
    const s = document.createElement("script");
    s.setAttribute("data-knovora-id", "pub123");
    s.setAttribute("data-base-url", "https://app.test");
    document.head.appendChild(s);

    loadWidget();

    const root = document.getElementById("knovora-widget-root");
    expect(root).toBeTruthy();

    const button = root!.querySelector("button")!;
    expect(button).toBeTruthy();

    // iframe should not load until the widget is opened
    const iframeBefore = root!.querySelector("iframe") as HTMLIFrameElement;
    expect(iframeBefore.getAttribute("src")).toBeNull();

    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

    const iframeAfter = root!.querySelector("iframe") as HTMLIFrameElement;
    expect(iframeAfter.src).toContain("https://app.test/chat/pub123");
  });

  it("does nothing when data-knovora-id is missing", () => {
    loadWidget();
    expect(document.getElementById("knovora-widget-root")).toBeNull();
  });

  it("does not double-inject", () => {
    const s = document.createElement("script");
    s.setAttribute("data-knovora-id", "pub123");
    s.setAttribute("data-base-url", "https://app.test");
    document.head.appendChild(s);
    loadWidget();
    loadWidget();
    expect(document.querySelectorAll("#knovora-widget-root").length).toBe(1);
  });
});
