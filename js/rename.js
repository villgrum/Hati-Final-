function renameAll(group, map) {
  const swap = function (name) {
    return Object.prototype.hasOwnProperty.call(map, name) ? map[name] : name;
  };
  group.members = group.members.map(swap);
  if (group.holder) {
    group.holder = swap(group.holder);
  }
  (group.bills || []).forEach(function (bill) {
    bill.payer = swap(bill.payer);
    bill.sharers = bill.sharers.map(swap);
  });
  (group.payments || []).forEach(function (payment) {
    payment.from = swap(payment.from);
    payment.to = swap(payment.to);
  });
  (group.contributions || []).forEach(function (item) {
    item.name = swap(item.name);
  });
}

function labeled(text, value, max) {
  const label = node("label", "field", text);
  const input = node("input");
  input.type = "text";
  input.value = value;
  input.maxLength = max;
  input.autocomplete = "off";
  label.append(input);
  return { label: label, input: input };
}

function nameProblem(name, finals) {
  const lower = finals.map(function (item) {
    return item.toLowerCase();
  });
  if (name === "") {
    return "The group needs a name";
  }
  if (
    finals.some(function (item) {
      return item === "";
    })
  ) {
    return "Names cannot be empty";
  }
  if (
    finals.some(function (item) {
      return item.length > 20;
    })
  ) {
    return "Keep each name to 20 letters or fewer";
  }
  if (new Set(lower).size !== lower.length) {
    return "Each name must be different";
  }
  return "";
}

function deleteGroup(say) {
  const stored = findGroup(group.id);
  const finish = function () {
    saveGroups(
      loadGroups().filter(function (item) {
        return item.id !== group.id;
      }),
    );
    location.href = "index.html";
  };
  if (!stored || !stored.remote) {
    finish();
    return;
  }
  callRpc("delete_group", {
    p_id: stored.remote.id,
    p_secret: stored.remote.secret,
  })
    .then(finish)
    .catch(function (error) {
      if (error.message === "not allowed") {
        finish();
      } else {
        say("Could not delete: " + error.message);
      }
    });
}

function buildEditForm(close) {
  const form = node("form", "edit-form");
  const title = labeled("Name of the group", group.name, 40);
  const you = group.holder ? labeled("Your name", group.holder, 20) : null;
  const rows = node("div", "people-inputs");
  const message = node("p", "status-line");
  const actions = node("div", "form-actions");
  const save = node("button", "button small", "Save changes");
  const zone = node("div", "danger-zone");
  let timer;
  const say = function (text) {
    message.textContent = text;
    clearTimeout(timer);
    timer = setTimeout(function () {
      message.textContent = "";
    }, 7000);
  };
  const fields = group.members
    .filter(function (name) {
      return name !== group.holder;
    })
    .map(function (name) {
      const input = node("input");
      input.type = "text";
      input.value = name;
      input.maxLength = 20;
      input.autocomplete = "off";
      input.setAttribute("aria-label", "Name of " + name);
      rows.append(input);
      return { from: name, input: input };
    });
  save.type = "submit";
  actions.append(save);
  zone.append(
    node(
      "p",
      "helper",
      "Deleting removes this group from this device and breaks the link your friends have",
    ),
    removeAction(
      "Delete group",
      function () {
        deleteGroup(say);
      },
      "Yes, delete",
    ),
  );
  const head = node("div", "panel-head");
  const closeButton = node("button", "quiet-action", "Close");
  closeButton.type = "button";
  closeButton.addEventListener("click", close);
  head.append(node("h2", "section-title", "Edit group"), closeButton);
  form.append(head, title.label);
  if (you) {
    form.append(you.label);
  }
  if (fields.length) {
    form.append(node("p", "field-title", "People"), rows);
  }
  form.append(actions, message, zone);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = capitalizeWords(title.input.value.trim());
    const edits = fields.map(function (field) {
      return {
        from: field.from,
        to: capitalizeWords(field.input.value.trim()),
      };
    });
    if (you) {
      edits.push({
        from: group.holder,
        to: capitalizeWords(you.input.value.trim()),
      });
    }
    const problem = nameProblem(
      name,
      edits.map(function (edit) {
        return edit.to;
      }),
    );
    if (problem) {
      say(problem);
      return;
    }
    const map = {};
    const notes = [];
    edits.forEach(function (edit) {
      if (edit.from !== edit.to) {
        map[edit.from] = edit.to;
        notes.push(edit.from + " was renamed " + edit.to);
      }
    });
    if (name !== group.name) {
      notes.unshift("The group was renamed " + name);
      group.name = name;
    }
    if (notes.length === 0) {
      close();
      return;
    }
    renameAll(group, map);
    close();
    record(
      notes.length === 1 ? notes[0] : notes.length + " names were corrected",
    );
  });
  return form;
}

document.addEventListener("DOMContentLoaded", function () {
  const actions = document.querySelector(".top-actions");
  const shared = new URLSearchParams(location.search).get("id") === "shared";
  if (!actions || !group || shared) {
    return;
  }
  const button = node("button", "quiet-action", "Edit group");
  const box = node("div", "edit-panel");
  const close = function () {
    box.hidden = true;
    box.replaceChildren();
  };
  button.type = "button";
  box.hidden = true;
  button.addEventListener("click", function () {
    if (box.hidden) {
      box.replaceChildren(buildEditForm(close));
      box.hidden = false;
    } else {
      close();
    }
  });
  new MutationObserver(function () {
    button.setAttribute("aria-expanded", String(!box.hidden));
  }).observe(box, { attributes: true, attributeFilter: ["hidden"] });
  actions.append(button);
  byId("note").after(box);
});
