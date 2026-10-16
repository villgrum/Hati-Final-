const groupId = new URLSearchParams(location.search).get("id");
const group = findGroup(groupId);
const tabNames = ["overview", "bills", "settle", "history"];
let before = JSON.stringify(group);

function record(text, mode) {
  const previous = before;
  group.history.push({ text: text, at: new Date().toISOString() });
  updateGroup(group);
  before = JSON.stringify(group);
  render();
  if (mode === "quiet") {
    return;
  }
  offerUndo(
    text,
    function () {
      restoreFields(group, previous);
      record("Reversed: " + text, "quiet");
    },
    mode === "restore" ? "Put it back" : "Undo",
  );
}

function undoPayment(payment) {
  group.payments = group.payments.filter(function (item) {
    return item.id !== payment.id;
  });
  record(
    payment.from +
      "'s payment of " +
      formatCentavos(payment.amount) +
      " to " +
      payment.to +
      " was cancelled",
    "restore",
  );
}

let noticeTimer;

function notify(text) {
  const notice = byId("notice");
  notice.textContent = text;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () {
    notice.textContent = "";
  }, 7000);
}

function removeBill(bill) {
  if (group.payments.length > 0) {
    notify("Cancel the payments in Settle up first, then remove the bill");
    return;
  }
  group.bills = group.bills.filter(function (item) {
    return item.id !== bill.id;
  });
  record(
    bill.what +
      ", " +
      formatCentavos(bill.amount) +
      " paid by " +
      bill.payer +
      " was removed",
    "restore",
  );
}

function statusNode(row, plan, hasBills) {
  const status = node("span", "status");
  if (!hasBills) {
    status.textContent = "Nothing to settle yet";
    return status;
  }
  if (row.balance === 0) {
    status.classList.add("done");
    status.textContent = "Settled";
    return status;
  }
  const owes = row.balance < 0;
  const steps = plan.filter(function (step) {
    return owes ? step.from === row.name : step.to === row.name;
  });
  const headline = node("span", "headline");
  fill(headline, [
    owes ? "Needs to pay " : "Waiting for ",
    bold(formatCentavos(Math.abs(row.balance))),
  ]);
  status.classList.add(owes ? "owes" : "waits");
  status.append(headline);
  steps.forEach(function (step) {
    const line = node("span", "line");
    const parts = [owes ? "to " : "from ", bold(owes ? step.to : step.from)];
    if (steps.length > 1) {
      parts.push(" ", bold(formatCentavos(step.amount)));
    }
    fill(line, parts);
    status.append(line);
  });
  return status;
}

function drawStandings(rows, plan, hasBills) {
  const list = byId("stand");
  list.replaceChildren();
  rows.forEach(function (row) {
    const item = node("li");
    const person = node("div", "person");
    const nameLine = node("span", "name-line");
    const figures = node("span", "paid-share");
    const paid = node("span");
    const share = node("span");
    nameLine.append(bold(row.name));
    if (row.name === group.holder) {
      nameLine.append(node("span", "role small", "Holder"));
    }
    fill(paid, ["Paid ", bold(formatCentavos(row.paid))]);
    fill(share, ["Share ", bold(formatCentavos(row.share))]);
    figures.append(paid, share);
    person.append(nameLine, figures);
    item.append(person, statusNode(row, plan, hasBills));
    list.append(item);
  });
}

function settledParts(sums, hasBills) {
  if (sums.total) {
    return [
      bold(formatCentavos(sums.settled)),
      " of ",
      bold(formatCentavos(sums.total)),
      " paid back",
    ];
  }
  return [hasBills ? "Everyone is even" : "Add the first bill to get started"];
}

function drawOverview(rows, plan, sums, hasBills) {
  const count = group.bills.length;
  const percent = sums.total
    ? Math.round((sums.settled / sums.total) * 1000) / 10
    : 0;
  byId("spent").textContent = hasBills
    ? formatCentavos(sums.spent) +
      " spent on " +
      count +
      (count === 1 ? " bill" : " bills")
    : "No bills yet";
  fill(byId("settled"), settledParts(sums, hasBills));
  byId("meter").setAttribute("aria-label", percent + " percent paid back");
  setTimeout(function () {
    byId("meter-fill").style.setProperty("--w", percent + "%");
  }, 150);
  drawStandings(rows, plan, hasBills);
  const suggest = byId("suggest");
  suggest.hidden = !hasBills;
  if (hasBills) {
    fill(suggest, [
      "Suggestion for the next bill: ",
      bold(nextPayerOf(rows).name),
      ", who has covered the least so far",
    ]);
  }
}

function splitParts(bill) {
  const count = bill.sharers.length;
  if (count === 1) {
    return ["Only ", bold(bill.sharers[0]), " shared it"];
  }
  return [
    "Split " + count + " ways, ",
    bold(formatCentavos(Math.floor(bill.amount / count))),
    " each",
  ];
}

function drawBills() {
  const list = byId("bill-list");
  list.replaceChildren();
  byId("no-bills").hidden = group.bills.length > 0;
  group.bills
    .slice()
    .reverse()
    .forEach(function (bill) {
      const item = node("li", "bill");
      const main = node("div", "bill-main");
      const paidBy = node("span", "bill-line");
      const split = node("span", "bill-line");
      const side = node("div", "bill-side");
      const actions = node("div", "bill-actions");
      const edit = node("a", "quiet-action", "Edit");
      edit.href = "bill.html?id=" + group.id + "&bill=" + bill.id;
      fill(paidBy, ["Paid by ", bold(bill.payer)]);
      fill(split, splitParts(bill));
      main.append(
        bold(titleCase(bill.what)),
        node("span", "tag", bill.category),
        paidBy,
        split,
      );
      actions.append(
        edit,
        removeControl(function () {
          removeBill(bill);
        }),
      );
      side.append(
        node("strong", "amount", formatCentavos(bill.amount)),
        node("span", "when", dayLabel(new Date(bill.date + "T00:00:00"))),
        actions,
      );
      item.append(main, side);
      list.append(item);
    });
}

let openStep = null;

function markPaid(step, amount) {
  group.payments.push({
    id: newId(),
    from: step.from,
    to: step.to,
    amount: amount,
  });
  const rest = step.amount - amount;
  const suffix =
    rest > 0 ? ", " + formatCentavos(rest) + " is still to be paid" : "";
  record(
    step.from + " paid " + step.to + " " + formatCentavos(amount) + suffix,
  );
}

function paidBetween(from, to) {
  return group.payments
    .filter(function (payment) {
      return payment.from === from && payment.to === to;
    })
    .reduce(function (sum, payment) {
      return sum + payment.amount;
    }, 0);
}

function partForm(step) {
  const form = node("form", "inline-pay");
  const money = node("div", "money");
  const input = node("input");
  const save = node("button", "button small", "Save");
  input.type = "text";
  input.id = "part-amount";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.value = formatPesoText(String(step.amount / 100));
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
      notify("Enter how much was paid");
      return;
    }
    if (amount > step.amount) {
      notify(
        "That is more than the " +
          formatCentavos(step.amount) +
          " still to be paid",
      );
      return;
    }
    openStep = null;
    markPaid(step, amount);
  });
  return form;
}

function orderedSteps(plan) {
  function lastPayment(step) {
    let found = -1;
    group.payments.forEach(function (payment, index) {
      if (payment.from === step.from && payment.to === step.to) {
        found = index;
      }
    });
    return found;
  }
  return plan.slice().sort(function (a, b) {
    return lastPayment(b) - lastPayment(a);
  });
}

function stepRow(step) {
  const item = node("li");
  const who = node("div", "step-who");
  const sentence = node("span");
  const actions = node("div", "step-actions");
  const key = step.from + ">" + step.to;
  const open = openStep === key;
  const full = node("button", "button ghost small", "Paid in full");
  const part = node("button", "quiet-action", open ? "Cancel" : "Part paid");
  const earlier = paidBetween(step.from, step.to);
  full.type = "button";
  part.type = "button";
  full.addEventListener("click", function () {
    openStep = null;
    markPaid(step, step.amount);
  });
  part.addEventListener("click", function () {
    openStep = open ? null : key;
    render();
  });
  fill(sentence, [bold(step.from), " pays ", bold(step.to)]);
  who.append(sentence);
  if (earlier > 0) {
    const note = node("span", "step-note");
    fill(note, [bold(formatCentavos(earlier)), " paid so far"]);
    who.append(note);
  }
  actions.append(full, part);
  item.append(
    who,
    node("strong", "amount", formatCentavos(step.amount)),
    actions,
  );
  if (open) {
    item.append(partForm(step));
  }
  return item;
}

function drawSettle(plan, sums, hasBills) {
  const list = byId("plan-list");
  const paidList = byId("paid-list");
  list.replaceChildren();
  paidList.replaceChildren();
  fill(byId("settle-sub"), settledParts(sums, hasBills));
  orderedSteps(plan).forEach(function (step) {
    list.append(stepRow(step));
  });
  const empty = byId("plan-empty");
  empty.hidden = plan.length > 0;
  empty.textContent = hasBills
    ? "Everyone is even"
    : "Add a bill to see who pays whom";
  byId("total-amount").textContent = formatCentavos(sums.remaining);
  byId("paid-title").hidden = group.payments.length === 0;
  group.payments
    .slice()
    .reverse()
    .forEach(function (payment) {
      const item = node("li");
      const who = node("span");
      const side = node("div", "bill-side");
      const undo = node("button", "quiet-action", "Cancel payment");
      undo.type = "button";
      undo.addEventListener("click", function () {
        undoPayment(payment);
      });
      fill(who, [bold(payment.from), " paid ", bold(payment.to)]);
      side.append(
        node("strong", "amount", formatCentavos(payment.amount)),
        undo,
      );
      item.append(who, side);
      paidList.append(item);
    });
  const field = byId("part-amount");
  if (field) {
    field.focus();
  }
}

function render() {
  const rows = standingsOf(group);
  const plan = planOf(rows);
  const sums = totalsOf(group, rows);
  const hasBills = group.bills.length > 0;
  byId("group").hidden = false;
  document.title = group.name + " - Hati";
  setGroupTitle(group.name);
  byId("add-bill").href = "bill.html?id=" + group.id;
  byId("note").textContent =
    group.members.length + " people, only you can change anything";
  drawOverview(rows, plan, sums, hasBills);
  drawBills();
  drawSettle(plan, sums, hasBills);
  drawHistory(group);
  showTab(tabNames);
}

bindTabs(tabNames);

if (!group) {
  byId("missing").hidden = false;
} else if (group.type === "ambagan") {
  location.replace("ambagan.html?id=" + groupId);
} else {
  render();
}
