const params = new URLSearchParams(location.search);
const id = params.get("id");
const group = findGroup(id);
const editing = group
  ? group.bills.find(function (bill) {
      return bill.id === params.get("bill");
    })
  : undefined;

if (!group || group.type !== "hangout" || (params.get("bill") && !editing)) {
  location.replace("index.html");
}

const form = byId("bill-form");
const whatInput = byId("what");
const category = byId("category");
const customBox = byId("custom-box");
const custom = byId("custom");
const amountInput = byId("amount");
const payer = byId("payer");
const peopleBox = byId("people");
const shareLine = byId("share-line");
const dateInput = byId("when");
const message = byId("message");
const checkboxes = [];
const today = new Date().toLocaleDateString("en-CA");
let messageTimer;

byId("back").href = "group.html?id=" + id + (editing ? "#bills" : "");

function say(text) {
  message.textContent = text;
  clearTimeout(messageTimer);
  if (text) {
    messageTimer = setTimeout(function () {
      message.textContent = "";
    }, 7000);
  }
}

const choose = document.createElement("option");
choose.value = "";
choose.textContent = "Choose who paid";
choose.disabled = true;
choose.selected = true;
payer.append(choose);

group.members.forEach(function (name) {
  const option = document.createElement("option");
  const chip = document.createElement("label");
  const box = document.createElement("input");
  option.textContent = name;
  payer.append(option);
  box.type = "checkbox";
  box.checked = true;
  box.value = name;
  chip.className = "chip";
  chip.append(box, document.createTextNode(name));
  peopleBox.append(chip);
  checkboxes.push(box);
});

function sharers() {
  return checkboxes
    .filter(function (box) {
      return box.checked;
    })
    .map(function (box) {
      return box.value;
    });
}

function showShare() {
  const total = toCentavos(amountInput.value);
  const count = sharers().length;
  if (total === 0 || count === 0) {
    shareLine.textContent = "Each person's share will show here";
    return;
  }
  const base = Math.floor(total / count);
  const leftover = total - base * count;
  const parts = ["Each person's share: ", bold(formatCentavos(base))];
  if (leftover > 0) {
    parts.push(
      ", the leftover " + formatCentavos(leftover) + " goes to whoever paid",
    );
  }
  fill(shareLine, parts);
}

function prefill(bill) {
  const known = Array.from(category.options).some(function (option) {
    return option.value === bill.category;
  });
  whatInput.value = bill.what;
  category.value = known ? bill.category : "Other";
  customBox.hidden = known;
  custom.value = known ? "" : bill.category;
  amountInput.value = formatPesoText(String(bill.amount / 100));
  payer.value = bill.payer;
  checkboxes.forEach(function (box) {
    box.checked = bill.sharers.includes(box.value);
  });
  dateInput.value = bill.date;
  showShare();
}

dateInput.value = today;
dateInput.max = today;

if (editing) {
  byId("page-title").textContent = "Edit a bill";
  byId("save").textContent = "Save changes";
  if (group.payments.length > 0) {
    byId("blocked").textContent =
      "Undo the payments in Settle up first, then edit this bill";
    form.hidden = true;
  } else {
    prefill(editing);
  }
}

amountInput.addEventListener("input", function () {
  reformat(amountInput);
  showShare();
});

checkboxes.forEach(function (box) {
  box.addEventListener("change", showShare);
});

category.addEventListener("change", function () {
  customBox.hidden = category.value !== "Other";
  if (!customBox.hidden) {
    custom.focus();
  }
});

whatInput.addEventListener("blur", function () {
  whatInput.value = titleCase(whatInput.value.trim());
});

custom.addEventListener("blur", function () {
  custom.value = titleCase(custom.value.trim());
});

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const what = titleCase(whatInput.value.trim());
  const amount = toCentavos(amountInput.value);
  const chosen = sharers();
  const label =
    category.value === "Other"
      ? titleCase(custom.value.trim())
      : category.value;
  if (what === "") {
    say("Say what it was for");
    return;
  }
  if (category.value === "") {
    say("Choose a category");
    return;
  }
  if (label === "") {
    say("Type the category");
    return;
  }
  if (amount === 0) {
    say("Enter how much it cost");
    return;
  }
  if (payer.value === "") {
    say("Choose who paid");
    return;
  }
  if (chosen.length === 0) {
    say("Pick at least one person who shared it");
    return;
  }
  const fields = {
    what: what,
    category: label,
    amount: amount,
    payer: payer.value,
    sharers: chosen,
    date: dateInput.value,
  };
  let text;
  if (editing) {
    const change =
      editing.amount !== amount
        ? " from " +
          formatCentavos(editing.amount) +
          " to " +
          formatCentavos(amount)
        : "";
    text = payer.value + " changed " + what + change;
    Object.assign(editing, fields);
  } else {
    text = payer.value + " added " + what + ", " + formatCentavos(amount);
    group.bills.push(Object.assign({ id: newId() }, fields));
  }
  group.history.push({ text: text, at: new Date().toISOString() });
  updateGroup(group);
  flushSync(id).finally(function () {
    location.href = "group.html?id=" + id + (editing ? "#bills" : "");
  });
});
