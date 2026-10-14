const groupList = document.getElementById("group-list");
const emptyMessage = document.getElementById("empty-groups");

function totalOf(items) {
  return items.reduce(function (sum, item) {
    return sum + item.amount;
  }, 0);
}

function lastChange(group) {
  return group.history[group.history.length - 1].at;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function updatedText(iso) {
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000,
  );
  if (days <= 0) {
    return "Updated today";
  }
  if (days === 1) {
    return "Updated yesterday";
  }
  if (days < 7) {
    return "Updated " + days + " days ago";
  }
  return (
    "Updated " +
    new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    })
  );
}

function figureOf(group) {
  const figure = document.createElement("span");
  const note = document.createElement("span");
  figure.className = "figure";
  if (group.type === "ambagan") {
    note.textContent = group.goal
      ? "of " + formatCentavos(group.goal) + " collected"
      : "collected";
    figure.append(bold(formatCentavos(totalOf(group.contributions))), note);
  } else if (group.bills.length > 0) {
    note.textContent = "spent";
    figure.append(bold(formatCentavos(totalOf(group.bills))), note);
  } else {
    note.textContent = "No bills yet";
    figure.append(note);
  }
  return figure;
}

function peopleText(group) {
  const count = group.members.length;
  if (count === 0) {
    return "";
  }
  return count + (count === 1 ? " person" : " people");
}

function makeRow(group) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const name = document.createElement("span");
  const line = document.createElement("span");
  const tag = document.createElement("span");
  const people = document.createElement("span");
  const updated = document.createElement("span");
  link.href = "group.html?id=" + group.id;
  name.className = "name";
  name.textContent = group.name;
  line.className = "sub-line";
  tag.className = "type " + group.type;
  tag.textContent = group.type === "ambagan" ? "Ambagan" : "Hangout";
  people.textContent = peopleText(group);
  line.append(tag, people);
  updated.className = "updated";
  updated.textContent = updatedText(lastChange(group));
  link.append(name, line, figureOf(group), updated);
  item.append(link);
  return item;
}

const groups = loadGroups().sort(function (a, b) {
  return new Date(lastChange(b)) - new Date(lastChange(a));
});
emptyMessage.hidden = groups.length > 0;
groups.forEach(function (group) {
  groupList.append(makeRow(group));
});
