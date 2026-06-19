"use strict";

// Minimal, dependency-free Stream Deck property inspector. It binds elements
// marked with `data-setting` (optionally `data-global`) to action / global
// settings over the property-inspector websocket. No third-party scripts run on
// this page, so the (optional) auth token is never exposed to remote code.

let ws = null;
let uuid = "";
let actionUuid = "";
let actionSettings = {};
let globalSettings = {};

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function hydrate() {
  document.querySelectorAll("[data-setting]").forEach((el) => {
    if (el === document.activeElement) return;
    const key = el.getAttribute("data-setting");
    const store = el.hasAttribute("data-global") ? globalSettings : actionSettings;
    if (Object.prototype.hasOwnProperty.call(store, key)) {
      el.value = store[key] == null ? "" : String(store[key]);
    }
  });
}

function wire() {
  document.querySelectorAll("[data-setting]").forEach((el) => {
    el.addEventListener("change", () => {
      const key = el.getAttribute("data-setting");
      const value = el.value;
      if (el.hasAttribute("data-global")) {
        globalSettings = { ...globalSettings, [key]: value };
        send({ event: "setGlobalSettings", context: uuid, payload: globalSettings });
      } else {
        actionSettings = { ...actionSettings, [key]: value };
        // `action` (manifest UUID) is required by the SDK so the edited
        // action instance's settings persist correctly.
        send({ event: "setSettings", action: actionUuid, context: uuid, payload: actionSettings });
      }
    });
  });
}

window.connectElgatoStreamDeckSocket = (port, inUuid, registerEvent, _info, actionInfo) => {
  uuid = inUuid;
  try {
    const info = JSON.parse(actionInfo) || {};
    actionUuid = info.action || "";
    actionSettings = (info.payload || {}).settings || {};
  } catch {
    actionSettings = {};
  }

  ws = new WebSocket(`ws://127.0.0.1:${port}`);
  ws.onopen = () => {
    send({ event: registerEvent, uuid });
    send({ event: "getGlobalSettings", context: uuid });
    hydrate();
  };
  ws.onmessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (msg.event === "didReceiveGlobalSettings") {
      globalSettings = (msg.payload || {}).settings || {};
      hydrate();
    } else if (msg.event === "didReceiveSettings") {
      actionSettings = (msg.payload || {}).settings || {};
      hydrate();
    }
  };

  wire();
};
