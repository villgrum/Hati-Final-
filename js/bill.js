const id = new URLSearchParams(location.search).get("id");
const group = findGroup(id);

if (!group || group.type !== "hangout") {
  location.replace("index.html");
}

const form = document.getElementById("bill-form");
const whatInput = document.getElementById("what");
const category = document.getElementById("category");
const customBox = document.getElementById("custom-box");
const custom = document.getElementById("custom");
const amountInput = document.getElementById("amount");
const payer = document.getElementById("payer");
const peopleBox = document.getElementById("people");
const shareLine = document.getElementById("share-line");
const dateInput = document.getElementById("when");
const message = document.getElementById("message");
const checkboxes = [];

document.getElementById("back").href = "group.html?id=" + id;

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

const today = new Date().toLocaleDateString("en-CA");
dateInput.value = today;
dateInput.max = today;

whatInput.addEventListener("blur", function () {
  whatInput.value = capitalizeFirst(whatInput.value.trim());
});

custom.addEventListener("blur", function () {
  custom.value = capitalizeFirst(custom.value.trim());
});

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

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const what = capitalizeFirst(whatInput.value.trim());
  const amount = toCentavos(amountInput.value);
  const chosen = sharers();
  const label =
    category.value === "Other"
      ? capitalizeFirst(custom.value.trim())
      : category.value;
  if (what === "") {
    message.textContent = "Say what it was for";
    return;
  }
  if (label === "") {
    message.textContent = "Type the category";
    return;
  }
  if (amount === 0) {
    message.textContent = "Enter how much it cost";
    return;
  }
  if (chosen.length === 0) {
    message.textContent = "Pick at least one person who shared it";
    return;
  }
  group.bills.push({
    id: newId(),
    what: what,
    category: label,
    amount: amount,
    payer: payer.value,
    sharers: chosen,
    date: dateInput.value,
  });
  group.history.push({
    text: payer.value + " added " + what + ", " + formatCentavos(amount),
    at: new Date().toISOString(),
  });
  updateGroup(group);
  flushSync(id).finally(function () {
    location.href = "group.html?id=" + id;
  });
});
