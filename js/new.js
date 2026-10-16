const params = new URLSearchParams(location.search);
const type = params.get("type") === "ambagan" ? "ambagan" : "hangout";
const form = byId("group-form");
const nameInput = byId("name");
const holderInput = byId("holder");
const personInput = byId("person");
const addButton = byId("add-person");
const chipsList = byId("chips");
const count = byId("count");
const goalInput = byId("goal");
const message = byId("message");
const people = [];
let messageTimer;

byId("page-title").textContent =
  type === "ambagan" ? "New Ambagan" : "New Hangout";
byId("goal-box").hidden = type !== "ambagan";
holderInput.value = localStorage.getItem("hati-holder") || "";
nameInput.placeholder = type === "ambagan" ? "Class fund" : "Baguio trip";

function say(text) {
  message.textContent = text;
  clearTimeout(messageTimer);
  if (text) {
    messageTimer = setTimeout(function () {
      message.textContent = "";
    }, 7000);
  }
}

function countText() {
  const others = people.length;
  if (type === "ambagan") {
    return others === 0
      ? "You can add names later"
      : others + (others === 1 ? " person" : " people");
  }
  if (others === 0) {
    return "Add at least 1 more person";
  }
  return others + 1 + " people, including you";
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

function readNames(text) {
  return text
    .split(/[\n,]+/)
    .map(function (piece) {
      return capitalizeWords(piece.trim());
    })
    .filter(Boolean);
}

function addNames(text) {
  const holder = capitalizeWords(holderInput.value.trim());
  let problem = "";
  for (const piece of readNames(text)) {
    const taken = people.concat(holder ? [holder] : []).some(function (name) {
      return name.toLowerCase() === piece.toLowerCase();
    });
    if (piece.length > 20) {
      problem = "Keep each name to 20 letters or fewer";
    } else if (taken) {
      problem = piece + " is already added";
    } else if (people.length >= 59) {
      problem = "That is more than 60 people";
      break;
    } else {
      people.push(piece);
    }
  }
  renderPeople();
  say(problem);
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

personInput.addEventListener("input", function () {
  const pieces = readNames(personInput.value);
  if (pieces.length === 0) {
    count.textContent = countText();
    return;
  }
  fill(count, ["Press Enter to add ", bold(pieces.join(", "))]);
});

addButton.addEventListener("click", takeTypedName);
goalInput.addEventListener("input", function () {
  reformat(goalInput);
});

nameInput.addEventListener("blur", function () {
  nameInput.value = capitalizeWords(nameInput.value.trim());
});

holderInput.addEventListener("blur", function () {
  holderInput.value = capitalizeWords(holderInput.value.trim());
});

form.addEventListener("submit", function (event) {
  event.preventDefault();
  if (personInput.value.trim() !== "") {
    addNames(personInput.value);
    personInput.value = "";
  }
  const name = capitalizeWords(nameInput.value.trim());
  const holder = capitalizeWords(holderInput.value.trim());
  if (name === "") {
    say("Give the group a name");
    return;
  }
  if (holder === "") {
    say("Type your name");
    return;
  }
  if (type === "hangout" && people.length < 1) {
    say("Add at least 1 more person");
    return;
  }
  localStorage.setItem("hati-holder", holder);
  const group = {
    id: newId(),
    type: type,
    name: name,
    holder: holder,
    members: type === "hangout" ? [holder].concat(people) : people.slice(),
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
    (type === "hangout" ? "group.html" : "ambagan.html") + "?id=" + group.id;
});

renderPeople();
