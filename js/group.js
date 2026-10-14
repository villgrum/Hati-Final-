const groupId = new URLSearchParams(location.search).get("id");
const group = findGroup(groupId);
const tabNames = ["overview", "bills", "settle", "history"];

function record(text) {
  group.history.push({ text: text, at: new Date().toISOString() });
  updateGroup(group);
  render();
}

function markPaid(step) {
  group.payments.push({
    id: newId(),
    from: step.from,
    to: step.to,
    amount: step.amount,
  });
  record(
    step.from +
      "'s payment of " +
      formatCentavos(step.amount) +
      " to " +
      step.to +
      " was marked as paid",
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
      " was undone",
  );
}

function removeBill(bill) {
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
    const figures = node("span", "figures");
    fill(figures, [
      "Paid ",
      bold(formatCentavos(row.paid)),
      ", share ",
      bold(formatCentavos(row.share)),
    ]);
    person.append(bold(row.name), figures);
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
      fill(paidBy, ["Paid by ", bold(bill.payer)]);
      fill(split, splitParts(bill));
      main.append(
        bold(capitalizeFirst(bill.what)),
        node("span", "tag", bill.category),
        paidBy,
        split,
      );
      side.append(
        node("strong", "amount", formatCentavos(bill.amount)),
        node("span", "when", dayLabel(new Date(bill.date + "T00:00:00"))),
        removeControl(function () {
          removeBill(bill);
        }),
      );
      item.append(main, side);
      list.append(item);
    });
}

function drawSettle(plan, sums, hasBills) {
  const list = byId("plan-list");
  const paidList = byId("paid-list");
  list.replaceChildren();
  paidList.replaceChildren();
  fill(byId("settle-sub"), settledParts(sums, hasBills));
  plan.forEach(function (step) {
    const item = node("li");
    const who = node("span");
    const button = node("button", "button ghost small", "Mark as paid");
    button.type = "button";
    button.addEventListener("click", function () {
      markPaid(step);
    });
    fill(who, [bold(step.from), " pays ", bold(step.to)]);
    item.append(
      who,
      node("strong", "amount", formatCentavos(step.amount)),
      button,
    );
    list.append(item);
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
      const undo = node("button", "quiet-action", "Undo");
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
}

function render() {
  const rows = standingsOf(group);
  const plan = planOf(rows);
  const sums = totalsOf(group, rows);
  const hasBills = group.bills.length > 0;
  byId("group").hidden = false;
  document.title = "Hati, " + group.name;
  byId("title").textContent = group.name;
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
