const groupId = new URLSearchParams(location.search).get("id");
const group = findGroup(groupId);
const tabNames = ["summary", "people", "spending", "history"];
let editingGoal = false;
let editingSchedule = false;
let openPerson = null;
let noticeTimer;

function sumOf(items) {
  return items.reduce(function (sum, item) {
    return sum + item.amount;
  }, 0);
}

function givenBy(name) {
  return sumOf(
    group.contributions.filter(function (item) {
      return item.name === name;
    }),
  );
}

function dateLabel(item) {
  return dayLabel(new Date(item.date + "T00:00:00"));
}

function notify(text) {
  const notice = byId("notice");
  notice.textContent = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () {
    notice.textContent = "";
  }, 4000);
}

function record(text) {
  group.history.push({ text: text, at: new Date().toISOString() });
  updateGroup(group);
  render();
}

function duesOf(name) {
  const given = givenBy(name);
  if (!group.schedule) {
    return { given: given, count: 0, due: 0, owed: 0, ahead: 0 };
  }
  const count = dueCountThrough(group.schedule, todayIso());
  const due = count * group.schedule.amount;
  return {
    given: given,
    count: count,
    due: due,
    owed: Math.max(0, due - given),
    ahead: Math.max(0, given - due),
  };
}

function removePayment(item) {
  if (sumOf(group.contributions) - item.amount < sumOf(group.spendings)) {
    notify("Remove some spending first, the fund would go below zero");
    return;
  }
  group.contributions = group.contributions.filter(function (entry) {
    return entry.id !== item.id;
  });
  record(
    item.name + "'s payment of " + formatCentavos(item.amount) + " was removed",
  );
}

function removeSpending(item) {
  group.spendings = group.spendings.filter(function (entry) {
    return entry.id !== item.id;
  });
  record(
    formatCentavos(item.amount) + " spent on " + item.what + " was removed",
  );
}

function removeGoal() {
  group.goal = null;
  editingGoal = false;
  record("The goal was removed");
}

function removeSchedule() {
  group.schedule = null;
  record("The payment schedule was removed");
}

function nextDayText(date, today) {
  const iso = date.toLocaleDateString("en-CA");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === today) {
    return "Today";
  }
  if (iso === tomorrow.toLocaleDateString("en-CA")) {
    return "Tomorrow";
  }
  return (
    weekdayNames[date.getDay()] +
    ", " +
    date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
  );
}

function drawGoalRow(collected) {
  const goal = group.goal;
  const text = byId("goal-text");
  const reached = Boolean(goal) && collected >= goal;
  byId("goal-row").hidden = editingGoal;
  byId("goal-form").hidden = !editingGoal;
  byId("goal-edit").textContent = goal ? "Edit goal" : "Set a goal";
  text.className = reached ? "done" : "";
  if (!goal) {
    text.textContent = "No goal set";
  } else if (reached) {
    fill(text, [bold("Goal reached")]);
  } else {
    fill(text, [bold(formatCentavos(goal - collected)), " to go"]);
  }
  byId("goal-remove-slot").replaceChildren();
  if (goal) {
    byId("goal-remove-slot").append(removeAction("Remove goal", removeGoal));
  }
}

function drawScheduleBox() {
  const schedule = group.schedule;
  byId("schedule-view").hidden = !schedule || editingSchedule;
  byId("schedule-add").hidden = Boolean(schedule) || editingSchedule;
  byId("schedule-hint").hidden = Boolean(schedule) || editingSchedule;
  byId("schedule-form").hidden = !editingSchedule;
  if (!schedule) {
    return;
  }
  const names = weekOrder
    .filter(function (day) {
      return schedule.days.includes(day);
    })
    .map(function (day) {
      return weekdayNames[day];
    });
  const today = todayIso();
  const next = nextPaymentDate(
    schedule,
    schedule.start > today ? schedule.start : today,
  );
  fill(byId("schedule-text"), [
    "Every ",
    bold(andList(names)),
    ", ",
    bold(formatCentavos(schedule.amount)),
    " each",
  ]);
  fill(byId("next-day"), [
    "Next payment day: ",
    bold(nextDayText(next, today)),
  ]);
  byId("schedule-remove-slot").replaceChildren(
    removeAction("Remove schedule", removeSchedule),
  );
}

function drawSummary() {
  const collected = sumOf(group.contributions);
  const spent = sumOf(group.spendings);
  const left = collected - spent;
  const goal = group.goal;
  const percent = goal
    ? Math.min(100, Math.round((collected / goal) * 1000) / 10)
    : 0;
  const spentPercent = collected
    ? Math.min(100, Math.round((spent / collected) * 100))
    : 0;
  const total = group.members.length;
  const dues = group.members.map(duesOf);
  byId("collected").textContent = goal
    ? formatCentavos(collected) + " of " + formatCentavos(goal) + " collected"
    : formatCentavos(collected) + " collected";
  byId("meter").hidden = !goal;
  byId("meter").setAttribute("aria-label", percent + " percent of the goal");
  byId("givers").hidden = total === 0;
  byId("owed-line").hidden = true;
  if (group.schedule && total > 0) {
    const upToDate = dues.filter(function (item) {
      return item.owed === 0;
    }).length;
    const owed = dues.reduce(function (sum, item) {
      return sum + item.owed;
    }, 0);
    fill(byId("givers"), [
      bold(String(upToDate)),
      " of ",
      bold(String(total)),
      " are up to date",
    ]);
    byId("owed-line").hidden = owed === 0;
    fill(byId("owed-line"), [bold(formatCentavos(owed)), " still owed so far"]);
  } else {
    const given = group.members.filter(function (name) {
      return givenBy(name) > 0;
    }).length;
    fill(byId("givers"), [
      bold(String(given)),
      " of ",
      bold(String(total)),
      " have given",
    ]);
  }
  byId("spent-total").textContent = formatCentavos(spent);
  byId("left-total").textContent = formatCentavos(left);
  byId("fund-bar").hidden = collected === 0;
  byId("fund-note").hidden = collected === 0;
  byId("fund-bar").style.setProperty("--spent", spentPercent);
  byId("fund-bar").style.setProperty("--left", 100 - spentPercent);
  byId("fund-note").textContent =
    left === 0 ? "Nothing left in the fund" : spentPercent + " percent spent";
  setTimeout(function () {
    byId("meter-fill").style.setProperty("--w", percent + "%");
  }, 150);
  drawGoalRow(collected);
  drawScheduleBox();
}

function stateNode(dues) {
  const state = node("span", "state");
  if (dues.count === 0) {
    state.textContent = "Nothing due yet";
  } else if (dues.owed > 0) {
    const days = Math.ceil(dues.owed / group.schedule.amount);
    state.classList.add("owed");
    fill(state, [
      "Owes ",
      bold(formatCentavos(dues.owed)),
      " for ",
      bold(String(days)),
      days === 1 ? " payment day" : " payment days",
    ]);
  } else if (dues.ahead > 0) {
    state.classList.add("done");
    fill(state, ["Paid ahead ", bold(formatCentavos(dues.ahead))]);
  } else {
    state.classList.add("done");
    state.textContent = "Up to date";
  }
  return state;
}

function payForm(name, dues) {
  const form = node("form", "inline-pay");
  const money = node("div", "money");
  const input = node("input");
  const save = node("button", "button small", "Save");
  input.type = "text";
  input.id = "inline-amount";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.placeholder = "200";
  if (dues.owed) {
    input.value = formatPesoText(String(dues.owed / 100));
  }
  input.addEventListener("input", function () {
    reformat(input);
  });
  save.type = "submit";
  form.noValidate = true;
  money.append(node("span", "", "₱"), input);
  form.append(money, save);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const amount = toCentavos(input.value);
    if (amount === 0) {
      notify("Enter how much was given");
      return;
    }
    group.contributions.push({
      id: newId(),
      name: name,
      amount: amount,
      date: todayIso(),
    });
    openPerson = null;
    record(name + " gave " + formatCentavos(amount));
  });
  return form;
}

function personRow(name) {
  const item = node("li");
  const person = node("div", "person");
  const figures = node("span", "figures");
  const dues = duesOf(name);
  const open = openPerson === name;
  const toggle = node(
    "button",
    open ? "quiet-action" : "button ghost small",
    open ? "Cancel" : "Record payment",
  );
  toggle.type = "button";
  toggle.addEventListener("click", function () {
    openPerson = open ? null : name;
    drawPeople();
  });
  if (group.schedule && dues.count > 0) {
    fill(figures, [
      "Given ",
      bold(formatCentavos(dues.given)),
      " of ",
      bold(formatCentavos(dues.due)),
      " due",
    ]);
  } else {
    fill(
      figures,
      dues.given > 0
        ? ["Given ", bold(formatCentavos(dues.given))]
        : ["Nothing yet"],
    );
  }
  person.append(bold(name), figures);
  if (group.schedule) {
    person.append(stateNode(dues));
  }
  item.append(person, toggle);
  if (open) {
    item.append(payForm(name, dues));
  }
  return item;
}

function drawPeople() {
  const list = byId("people-list");
  const payments = byId("payment-list");
  list.replaceChildren();
  payments.replaceChildren();
  byId("no-people").hidden = group.members.length > 0;
  group.members.forEach(function (name) {
    list.append(personRow(name));
  });
  const field = byId("inline-amount");
  if (field) {
    field.focus();
  }
  byId("payments-title").hidden = group.contributions.length === 0;
  group.contributions
    .slice(-10)
    .reverse()
    .forEach(function (entry) {
      const item = node("li");
      const main = node("div", "bill-main");
      const side = node("div", "bill-side");
      main.append(
        bold(entry.name),
        node("span", "bill-line", dateLabel(entry)),
      );
      side.append(
        node("strong", "amount", formatCentavos(entry.amount)),
        removeAction("Remove", function () {
          removePayment(entry);
        }),
      );
      item.append(main, side);
      payments.append(item);
    });
}

function drawSpending() {
  const list = byId("spend-list");
  list.replaceChildren();
  byId("no-spending").hidden = group.spendings.length > 0;
  group.spendings
    .slice()
    .reverse()
    .forEach(function (entry) {
      const item = node("li");
      const main = node("div", "bill-main");
      const side = node("div", "bill-side");
      main.append(
        bold(capitalizeFirst(entry.what)),
        node("span", "bill-line", dateLabel(entry)),
      );
      side.append(
        node("strong", "amount", formatCentavos(entry.amount)),
        removeAction("Remove", function () {
          removeSpending(entry);
        }),
      );
      item.append(main, side);
      list.append(item);
    });
}

function render() {
  byId("group").hidden = false;
  document.title = "Hati, " + group.name;
  byId("title").textContent = group.name;
  byId("note").textContent =
    (group.members.length || "No") + " people, only you can change anything";
  drawSummary();
  drawPeople();
  drawSpending();
  drawHistory(group);
  showTab(tabNames);
}

function startGoalEdit() {
  editingGoal = true;
  byId("goal").value = group.goal
    ? formatPesoText(String(group.goal / 100))
    : "";
  drawGoalRow(sumOf(group.contributions));
  byId("goal").focus();
}

byId("goal-edit").addEventListener("click", startGoalEdit);

byId("goal-cancel").addEventListener("click", function () {
  editingGoal = false;
  drawGoalRow(sumOf(group.contributions));
});

byId("goal-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const amount = toCentavos(byId("goal").value);
  if (amount === 0) {
    notify("Enter the goal amount");
    return;
  }
  group.goal = amount;
  editingGoal = false;
  record("The goal was set to " + formatCentavos(amount));
});

function startScheduleEdit() {
  const schedule = group.schedule;
  editingSchedule = true;
  document.querySelectorAll("#schedule-days input").forEach(function (box) {
    box.checked =
      Boolean(schedule) && schedule.days.includes(Number(box.value));
  });
  byId("schedule-amount").value = schedule
    ? formatPesoText(String(schedule.amount / 100))
    : "";
  byId("schedule-start").value = schedule ? schedule.start : todayIso();
  drawScheduleBox();
}

byId("schedule-add").addEventListener("click", startScheduleEdit);
byId("schedule-change").addEventListener("click", startScheduleEdit);

byId("schedule-cancel").addEventListener("click", function () {
  editingSchedule = false;
  drawScheduleBox();
});

byId("schedule-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const days = Array.from(document.querySelectorAll("#schedule-days input"))
    .filter(function (box) {
      return box.checked;
    })
    .map(function (box) {
      return Number(box.value);
    });
  const amount = toCentavos(byId("schedule-amount").value);
  if (days.length === 0) {
    notify("Pick at least one day");
    return;
  }
  if (amount === 0) {
    notify("Enter how much each person gives");
    return;
  }
  const names = weekOrder
    .filter(function (day) {
      return days.includes(day);
    })
    .map(function (day) {
      return weekdayNames[day];
    });
  group.schedule = {
    days: days,
    amount: amount,
    start: byId("schedule-start").value || todayIso(),
  };
  editingSchedule = false;
  record(
    "The schedule was set to every " +
      andList(names) +
      ", " +
      formatCentavos(amount) +
      " each",
  );
});

byId("person-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const input = byId("person");
  const added = [];
  let problem = "";
  input.value
    .split(/[\n,]+/)
    .map(function (piece) {
      return capitalizeWords(piece.trim());
    })
    .filter(Boolean)
    .forEach(function (name) {
      const exists = group.members.concat(added).some(function (other) {
        return other.toLowerCase() === name.toLowerCase();
      });
      if (name.length > 20) {
        problem = "Keep each name to 20 letters or fewer";
      } else if (exists) {
        problem = name + " is already added";
      } else if (group.members.length + added.length >= 60) {
        problem = "That is more than 60 people";
      } else {
        added.push(name);
      }
    });
  if (added.length) {
    group.members.push(...added);
    input.value = "";
    record(
      added.length === 1
        ? added[0] + " was added"
        : added.length + " people were added",
    );
  } else if (!problem) {
    problem = "Type a name first";
  }
  if (problem) {
    notify(problem);
  }
});

byId("spend-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const what = capitalizeFirst(byId("spend-what").value.trim());
  const amount = toCentavos(byId("spend-amount").value);
  const left = sumOf(group.contributions) - sumOf(group.spendings);
  if (what === "") {
    notify("Say what it was for");
    return;
  }
  if (amount === 0) {
    notify("Enter how much it cost");
    return;
  }
  if (amount > left) {
    notify(
      "That is more than the " + formatCentavos(left) + " left in the fund",
    );
    return;
  }
  group.spendings.push({
    id: newId(),
    what: what,
    amount: amount,
    date: byId("spend-date").value,
  });
  byId("spend-what").value = "";
  byId("spend-amount").value = "";
  record(formatCentavos(amount) + " was spent on " + what);
});

["spend-amount", "goal", "schedule-amount"].forEach(function (name) {
  byId(name).addEventListener("input", function () {
    reformat(byId(name));
  });
});

byId("spend-what").addEventListener("blur", function () {
  byId("spend-what").value = capitalizeFirst(byId("spend-what").value.trim());
});

byId("spend-date").value = todayIso();
byId("spend-date").max = todayIso();

bindTabs(tabNames);

if (!group) {
  byId("missing").hidden = false;
} else if (group.type !== "ambagan") {
  location.replace("group.html?id=" + groupId);
} else {
  render();
}
