const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

function andList(items) {
  if (items.length <= 1) {
    return items.join("");
  }
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function dueCountThrough(schedule, endIso) {
  const end = new Date(endIso + "T00:00:00");
  const day = new Date(schedule.start + "T00:00:00");
  let count = 0;
  while (day <= end) {
    if (schedule.days.includes(day.getDay())) {
      count += 1;
    }
    day.setDate(day.getDate() + 1);
  }
  return count;
}

function nextPaymentDate(schedule, fromIso) {
  const day = new Date(fromIso + "T00:00:00");
  for (let step = 0; step < 7; step += 1) {
    if (schedule.days.includes(day.getDay())) {
      return new Date(day);
    }
    day.setDate(day.getDate() + 1);
  }
  return null;
}

function removeAction(label, onConfirm) {
  const wrap = node("div", "remove-control");
  const ask = node("button", "danger-button", label);
  const yes = node("button", "danger-button solid", "Yes, remove");
  const keep = node("button", "quiet-action", "Keep");
  [ask, yes, keep].forEach(function (button) {
    button.type = "button";
  });
  ask.addEventListener("click", function () {
    wrap.replaceChildren(yes, keep);
  });
  keep.addEventListener("click", function () {
    wrap.replaceChildren(ask);
  });
  yes.addEventListener("click", onConfirm);
  wrap.append(ask);
  return wrap;
}
