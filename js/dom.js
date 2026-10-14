function bold(text) {
  const element = document.createElement("strong");
  element.textContent = text;
  return element;
}

function fill(element, parts) {
  element.replaceChildren(
    ...parts.map(function (part) {
      return typeof part === "string" ? document.createTextNode(part) : part;
    }),
  );
}

function capitalizeWords(text) {
  return text.replace(/(^|\s)(\p{L})/gu, function (match, space, letter) {
    return space + letter.toUpperCase();
  });
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dayLabel(value) {
  const date = new Date(value);
  const start = function (day) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate());
  };
  const days = Math.round((start(new Date()) - start(date)) / 86400000);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return days + " days ago";
  }
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function emphasize(text, names) {
  const escaped = names.map(function (name) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const namePart = escaped.length ? "|\\b(?:" + escaped.join("|") + ")\\b" : "";
  const pattern = new RegExp("(₱[\\d,]+(?:\\.\\d{2})?" + namePart + ")", "g");
  return text.split(pattern).map(function (piece, index) {
    return index % 2 === 1 ? bold(piece) : piece;
  });
}

function byId(name) {
  return document.getElementById(name);
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function removeControl(onConfirm) {
  const wrap = node("div", "remove-control");
  const ask = node("button", "danger-button", "Remove");
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

function showTab(names) {
  const name = names.includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : names[0];
  names.forEach(function (tab) {
    byId("tab-" + tab).hidden = tab !== name;
  });
  document.querySelectorAll("#tabs button").forEach(function (button) {
    if (button.dataset.tab === name) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function bindTabs(names) {
  document.querySelectorAll("#tabs button").forEach(function (button) {
    button.addEventListener("click", function () {
      location.hash = button.dataset.tab;
    });
  });
  window.addEventListener("hashchange", function () {
    showTab(names);
  });
}

function drawHistory(group) {
  const list = byId("feed");
  list.replaceChildren();
  group.history
    .slice()
    .reverse()
    .forEach(function (entry) {
      const item = node("li");
      const text = node("span");
      fill(text, emphasize(entry.text, group.members));
      item.append(text, node("span", "time", dayLabel(entry.at)));
      list.append(item);
    });
}
