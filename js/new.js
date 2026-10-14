const params = new URLSearchParams(location.search);
const type = params.get("type") === "ambagan" ? "ambagan" : "hangout";
const form = document.getElementById("group-form");
const nameInput = document.getElementById("name");
const personInput = document.getElementById("person");
const addButton = document.getElementById("add-person");
const chipsList = document.getElementById("chips");
const count = document.getElementById("count");
const goalInput = document.getElementById("goal");
const message = document.getElementById("message");
const people = [];

document.getElementById("page-title").textContent =
  type === "ambagan" ? "New Ambagan" : "New Hangout";
document.getElementById("goal-box").hidden = type !== "ambagan";

function countText() {
  const total = people.length;
  if (type === "ambagan") {
    return total === 0
      ? "You can add names later"
      : total + (total === 1 ? " person" : " people");
  }
  if (total === 0) {
    return "Add at least 2 people";
  }
  if (total === 1) {
    return "1 person, add one more";
  }
  return total + " people";
}

function renderPeople() {
  chipsList.replaceChildren();
  people.forEach(function (name, index) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const remove = document.createElement("button");
    label.textContent = name;
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove " + name);
    remove.addEventListener("click", function () {
      people.splice(index, 1);
      renderPeople();
    });
    item.append(label, remove);
    chipsList.append(item);
  });
  count.textContent = countText();
}

function addNames(text) {
  let problem = "";
  const pieces = text
    .split(/[\n,]+/)
    .map(function (piece) {
      return capitalizeWords(piece.trim());
    })
    .filter(Boolean);
  for (const piece of pieces) {
    if (piece.length > 20) {
      problem = "Keep each name to 20 letters or fewer";
      continue;
    }
    if (
      people.some(function (name) {
        return name.toLowerCase() === piece.toLowerCase();
      })
    ) {
      problem = piece + " is already added";
      continue;
    }
    if (people.length >= 60) {
      problem = "That is more than 60 people";
      break;
    }
    people.push(piece);
  }
  renderPeople();
  message.textContent = problem;
}

function takeTypedName() {
  addNames(personInput.value);
  personInput.value = "";
  personInput.focus();
}

personInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    takeTypedName();
  }
});

personInput.addEventListener("paste", function (event) {
  event.preventDefault();
  addNames(event.clipboardData.getData("text"));
});

addButton.addEventListener("click", takeTypedName);
goalInput.addEventListener("input", function () {
  nameInput.addEventListener("blur", function () {
    nameInput.value = capitalizeWords(nameInput.value.trim());
  });
  reformat(goalInput);
});

form.addEventListener("submit", function (event) {
  event.preventDefault();
  if (personInput.value.trim() !== "") {
    addNames(personInput.value);
    personInput.value = "";
  }
  const name = capitalizeWords(nameInput.value.trim());
  if (name === "") {
    message.textContent = "Give the group a name";
    return;
  }
  if (type === "hangout" && people.length < 2) {
    message.textContent = "Add at least 2 people";
    return;
  }
  const group = {
    id: newId(),
    type: type,
    name: name,
    members: people.slice(),
    history: [{ text: "Group created", at: new Date().toISOString() }],
  };
  if (type === "hangout") {
    group.bills = [];
    group.payments = [];
  } else {
    group.contributions = [];
    group.spendings = [];
    group.goal = toCentavos(goalInput.value) || null;
  }
  addGroup(group);
  location.href =
    type === "hangout" ? "group.html?id=" + group.id : "index.html";
});

renderPeople();

personInput.addEventListener("input", function () {
  const pieces = personInput.value
    .split(/[\n,]+/)
    .map(function (piece) {
      return capitalizeWords(piece.trim());
    })
    .filter(Boolean);
  if (pieces.length === 0) {
    count.textContent = countText();
    return;
  }
  fill(count, ["Press Enter to add ", bold(pieces.join(", "))]);
});
