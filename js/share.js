function buildSharePanel(groupId, type) {
  const panel = node("form", "share-panel");
  const head = node("div", "panel-head");
  const close = node("button", "quiet-action", "Close");
  const nameLabel = node("label", "field", "Your name");
  const nameInput = node("input");
  const linkLabel = node("label", "field", "Link to send");
  const row = node("div", "link-row");
  const output = node("input");
  const copy = node("button", "button small", "Copy");
  const modeNote = node("p", "helper");
  const state = node("p", "helper");
  const radios = [];

  panel.id = "share-panel";
  panel.hidden = true;
  panel.noValidate = true;
  state.id = "sync-state";
  nameLabel.htmlFor = "holder-name";
  linkLabel.htmlFor = "share-link";
  nameInput.type = "text";
  nameInput.id = "holder-name";
  nameInput.maxLength = 20;
  nameInput.autocomplete = "off";
  nameInput.placeholder = "Ana";
  nameInput.value = localStorage.getItem("hati-holder") || "";
  output.type = "text";
  output.id = "share-link";
  output.readOnly = true;
  close.type = "button";
  copy.type = "button";
  head.append(node("h2", "section-title", "Share a view-only link"), close);
  panel.append(
    head,
    node("p", "", "Friends can look and change nothing"),
    nameLabel,
    nameInput,
  );

  function showMode(value) {
    radios.forEach(function (radio) {
      radio.checked = radio.value === value;
    });
    const found = shareModes.find(function (mode) {
      return mode.value === value;
    });
    modeNote.textContent = found && type === "ambagan" ? found.note : "";
  }

  if (type === "ambagan") {
    const modes = node("div", "people");
    shareModes.forEach(function (mode) {
      const chip = node("label", "chip");
      const radio = node("input");
      radio.type = "radio";
      radio.name = "share-mode";
      radio.value = mode.value;
      radio.addEventListener("change", function () {
        patchRemote(groupId, { mode: mode.value });
        showMode(mode.value);
        syncGroup(groupId);
      });
      radios.push(radio);
      chip.append(radio, document.createTextNode(mode.label));
      modes.append(chip);
    });
    panel.append(node("label", "field", "What friends see"), modes, modeNote);
  }

  row.append(output, copy);
  panel.append(linkLabel, row, state);

  panel.open = async function () {
    const holder = capitalizeWords(nameInput.value.trim());
    const known = findGroup(groupId).remote;
    const fallback = type === "ambagan" ? "totals" : "everyone";
    state.textContent = "Creating your link";
    try {
      const remote = await ensureRemote(
        groupId,
        known ? known.mode : fallback,
        holder,
      );
      output.value = viewLink(remote.id);
      showMode(remote.mode);
      state.textContent =
        "The link stays the same, friends see changes when they refresh";
    } catch (error) {
      state.textContent = "Could not create the link: " + error.message;
    }
  };

  panel.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  nameInput.addEventListener("input", function () {
    const holder = capitalizeWords(nameInput.value.trim());
    localStorage.setItem("hati-holder", holder);
    if (findGroup(groupId).remote) {
      patchRemote(groupId, { holder: holder });
      syncGroup(groupId);
    }
  });

  close.addEventListener("click", function () {
    panel.hidden = true;
  });

  copy.addEventListener("click", function () {
    output.select();
    navigator.clipboard
      .writeText(output.value)
      .then(function () {
        copy.textContent = "Copied";
        setTimeout(function () {
          copy.textContent = "Copy";
        }, 2000);
      })
      .catch(function () {});
  });

  return panel;
}

function addShare(groupId, type) {
  const actions = node("div", "top-actions");
  const button = node("button", "button ghost small", "Share");
  const panel = buildSharePanel(groupId, type);
  const add = byId("add-bill");
  button.type = "button";
  button.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      panel.open();
    }
  });
  if (add) {
    actions.append(add);
  }
  actions.append(button);
  document.querySelector(".group-top").append(actions);
  byId("note").after(panel);
}

function hideTab(name) {
  document.querySelector('#tabs button[data-tab="' + name + '"]').hidden = true;
}

function buildLookup(group) {
  const form = node("form", "lookup");
  const label = node("label", "field", "Find my name");
  const input = node("input");
  const result = node("ul", "people-list");
  label.htmlFor = "lookup-name";
  input.type = "text";
  input.id = "lookup-name";
  input.autocomplete = "off";
  input.placeholder = "Ana";
  form.noValidate = true;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
  input.addEventListener("input", function () {
    const typed = input.value.trim().toLowerCase();
    const name = group.members.find(function (member) {
      return member.toLowerCase() === typed;
    });
    result.replaceChildren();
    if (name) {
      result.append(personRow(name));
    } else if (typed) {
      result.append(node("li", "", "No one with that name"));
    }
  });
  byId("people-list").hidden = true;
  byId("no-people").hidden = true;
  form.append(
    label,
    input,
    node("p", "helper", "Anyone with this link can look up any name"),
    result,
  );
  byId("tab-people").prepend(form);
}

function applyReadOnly(group) {
  const role = document.querySelector(".role");
  const note = byId("note");
  const copy = node("p", "role-note");
  const label = dayLabel(group.at);
  const when = /^[A-Z][a-z]+$/.test(label) ? label.toLowerCase() : label;
  document.body.classList.add("readonly");
  role.textContent = "View only";
  role.classList.add("view");
  if (group.holder) {
    fill(note, [
      "Held by ",
      bold(group.holder),
      ", ask ",
      group.holder,
      " to change anything",
    ]);
  } else {
    note.textContent = "Ask the holder to change anything";
  }
  copy.textContent =
    "Last updated " + when + ", reload the page to see changes";
  note.after(copy);
  if (group.type !== "ambagan") {
    return;
  }
  byId("payments-title").hidden = true;
  byId("payment-list").hidden = true;
  if (!group.schedule) {
    byId("schedule-add").closest(".panel").hidden = true;
  }
  if (group.mode === "totals") {
    hideTab("people");
    hideTab("history");
  }
  if (group.mode === "lookup") {
    hideTab("history");
    buildLookup(group);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const group = findGroup(id);
  if (id === "shared" && !group && params.get("g")) {
    location.replace("view.html?g=" + params.get("g"));
    return;
  }
  if (!group) {
    return;
  }
  if (id === "shared") {
    applyReadOnly(group);
  } else {
    addShare(id, group.type);
  }
});
