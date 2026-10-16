(function () {
  const viewer = new URLSearchParams(location.search).get("id") === "shared";
  const remoteId = new URLSearchParams(location.search).get("g");
  if (!viewer || !group || !remoteId) {
    console.warn("Updates are off", viewer, Boolean(group), remoteId);
    return;
  }
  const watched = "main li, main .big-line, main .fund-top strong, main .sub";
  const toast = document.createElement("div");
  const arrow = document.createElement("span");
  const message = document.createElement("span");
  const action = document.createElement("button");
  let target = null;
  let waiting = false;
  let busy = false;
  let ticking = false;

  toast.className = "toast";
  toast.hidden = true;
  toast.setAttribute("role", "status");
  action.type = "button";
  toast.append(arrow, message, action);
  document.body.append(toast);

  function stamp() {
    const lines = document.querySelectorAll("#copy-note");
    lines.forEach(function (extra, index) {
      if (index > 0) {
        extra.remove();
      }
    });
    let line = lines[0] || document.querySelector("p.role-note:not(#note)");
    if (!line) {
      line = document.createElement("p");
      line.className = "role-note";
      document.getElementById("note").after(line);
    }
    line.id = "copy-note";
    const source = group.updatedAt || group.at;
    const label = source ? dayLabel(source) : "recently";
    const when = /^[A-Z][a-z]+$/.test(label) ? label.toLowerCase() : label;
    const time = new Date().toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    });
    fill(line, ["Updated ", bold(when), ", checked at ", bold(time)]);
  }

  const seen = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        const element = entry.target;
        seen.unobserve(element);
        setTimeout(function () {
          const box = element.getBoundingClientRect();
          if (box.top >= innerHeight || box.bottom <= 0) {
            seen.observe(element);
            return;
          }
          element.classList.add("fading");
          evaluate();
          setTimeout(function () {
            element.classList.remove("fresh", "fading");
          }, 1800);
        }, 2000);
      });
    },
    { threshold: 0.6 },
  );

  function snapshot() {
    return new Set(
      Array.from(document.querySelectorAll(watched)).map(function (element) {
        return element.textContent.trim();
      }),
    );
  }

  function markFresh(before) {
    document.querySelectorAll(watched).forEach(function (element) {
      if (
        !before.has(element.textContent.trim()) &&
        !element.classList.contains("fresh")
      ) {
        element.classList.add("fresh");
        seen.observe(element);
      }
    });
  }

  function show(text, buttonText, direction, element) {
    message.textContent = text;
    action.textContent = buttonText;
    arrow.hidden = !direction;
    arrow.className = "chev " + direction;
    toast.className = "toast";
    toast.hidden = false;
    target = element;
  }

  function evaluate() {
    document.querySelectorAll("#tabs button").forEach(function (button) {
      const section = document.getElementById("tab-" + button.dataset.tab);
      button.classList.toggle(
        "has-new",
        section.hidden && Boolean(section.querySelector(".fresh:not(.fading)")),
      );
    });
    if (waiting) {
      return;
    }
    const above = [];
    const below = [];
    document
      .querySelectorAll(".fresh:not(.fading)")
      .forEach(function (element) {
        if (element.offsetParent === null) {
          return;
        }
        const box = element.getBoundingClientRect();
        if (box.bottom < 0) {
          above.push(element);
        } else if (box.top > innerHeight) {
          below.push(element);
        }
      });
    const other = document.querySelector("#tabs button.has-new");
    if (below.length) {
      show(
        below.length +
          (below.length === 1 ? " change below" : " changes below"),
        "Show me",
        "down",
        below[0],
      );
    } else if (above.length) {
      show(
        above.length +
          (above.length === 1 ? " change above" : " changes above"),
        "Show me",
        "up",
        above[above.length - 1],
      );
    } else if (other) {
      show("New in " + other.textContent.trim(), "Open", "", other);
    } else {
      toast.hidden = true;
    }
  }

  function restoreNote() {
    const note = document.getElementById("note");
    if (group.holder) {
      fill(note, [
        "Held by ",
        bold(group.holder),
        ", ask ",
        group.holder,
        " to change anything",
      ]);
    } else {
      note.textContent = "Ask the holder to change anything";
    }
    stamp();
  }

  async function check() {
    if (waiting || busy) {
      return;
    }
    try {
      const version = await callRpc("get_version", { p_id: remoteId });
      stamp();
      if (version > group.version) {
        waiting = true;
        message.textContent = "New changes";
        action.textContent = "Update";
        arrow.hidden = true;
        toast.className = "toast update";
        toast.hidden = false;
      }
    } catch (error) {
      console.error("Update check failed", error);
    }
  }

  async function refresh() {
    busy = true;
    action.disabled = true;
    try {
      const result = await callRpc("get_group", { p_id: remoteId });
      const next = result.data;
      next.version = result.version;
      next.updatedAt = result.updated_at;
      next.remoteId = remoteId;
      sessionStorage.setItem("hati-view", JSON.stringify(next));
      if (next.mode !== group.mode) {
        location.reload();
        return;
      }
      const before = snapshot();
      Object.keys(group).forEach(function (key) {
        delete group[key];
      });
      Object.assign(group, next, { id: "shared" });
      render();
      restoreNote();
      waiting = false;
      markFresh(before);
      evaluate();
    } catch (error) {
      message.textContent = "Could not update, try again";
      console.error("Update failed", error);
    } finally {
      busy = false;
      action.disabled = false;
    }
  }

  action.addEventListener("click", function () {
    if (waiting) {
      refresh();
    } else if (target && target.matches("#tabs button")) {
      location.hash = target.dataset.tab;
    } else if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  window.addEventListener("scroll", function () {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      evaluate();
    });
  });

  window.addEventListener("hashchange", function () {
    setTimeout(evaluate, 200);
  });

  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
  setInterval(check, 15000);
  document.addEventListener("DOMContentLoaded", function () {
    stamp();
    check();
  });
})();
