const shareModes = [
  {
    value: "totals",
    label: "Totals only",
    note: "Friends see only the totals, no names",
  },
  {
    value: "lookup",
    label: "Find my name",
    note: "Friends see the totals and can look up a name, anyone with the link can look up any name",
  },
  {
    value: "everyone",
    label: "Everyone's status",
    note: "Friends see everyone's status",
  },
];

let syncTimer;
let syncing = false;
let syncAgain = false;
let conflicts = 0;

function secretToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function callRpc(name, args) {
  const headers = { "Content-Type": "application/json", apikey: supabaseKey };
  if (supabaseKey.startsWith("eyJ")) {
    headers.Authorization = "Bearer " + supabaseKey;
  }
  const response = await fetch(supabaseUrl + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(args),
  });
  const body = await response.json().catch(function () {
    return null;
  });
  if (!response.ok) {
    throw new Error(body && body.message ? body.message : "request failed");
  }
  return body;
}

function setSyncState(text) {
  const element = document.getElementById("sync-state");
  if (element) {
    element.textContent = text;
    element.classList.toggle("failed", text.startsWith("Could not"));
  }
}

function patchRemote(groupId, changes) {
  const groups = loadGroups();
  const group = groups.find(function (item) {
    return item.id === groupId;
  });
  if (group && group.remote) {
    Object.assign(group.remote, changes);
    saveGroups(groups);
  }
}

function shareData(group, mode, holder) {
  const data = {
    type: group.type,
    name: group.name,
    holder: holder,
    mode: mode,
    at: new Date().toISOString(),
    members: group.members.slice(),
    history: group.history.slice(),
  };
  if (group.type === "hangout") {
    data.bills = group.bills;
    data.payments = group.payments;
    return data;
  }
  const totals = {};
  group.contributions.forEach(function (item) {
    totals[item.name] = (totals[item.name] || 0) + item.amount;
  });
  const collected = Object.values(totals).reduce(function (sum, value) {
    return sum + value;
  }, 0);
  const today = new Date().toLocaleDateString("en-CA");
  data.contributions =
    mode === "totals"
      ? [{ id: "total", name: "", amount: collected, date: today }]
      : Object.keys(totals).map(function (name) {
          return { id: name, name: name, amount: totals[name], date: today };
        });
  if (mode !== "everyone") {
    data.history = [];
  }
  if (mode === "totals") {
    data.members = [];
  }
  data.spendings = group.spendings;
  data.goal = group.goal;
  data.schedule = group.schedule || null;
  return data;
}

function viewLink(remoteId) {
  return new URL("view.html?g=" + remoteId, location.href).href;
}

async function ensureRemote(groupId, mode, holder) {
  const group = findGroup(groupId);
  if (group.remote) {
    return group.remote;
  }
  const secret = secretToken();
  const id = await callRpc("create_group", {
    p_data: shareData(group, mode, holder),
    p_log: group.history,
    p_secret: secret,
  });
  const remote = {
    id: id,
    secret: secret,
    version: 1,
    mode: mode,
    holder: holder,
  };
  const groups = loadGroups();
  groups.find(function (item) {
    return item.id === groupId;
  }).remote = remote;
  saveGroups(groups);
  return remote;
}

function syncGroup(groupId) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    pushNow(groupId);
  }, 400);
}

function flushSync(groupId) {
  clearTimeout(syncTimer);
  return pushNow(groupId);
}

async function pushNow(groupId) {
  const current = findGroup(groupId);
  if (!current || !current.remote) {
    return;
  }
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  setSyncState("Saving");
  try {
    const group = findGroup(groupId);
    const version = await callRpc("save_group", {
      p_id: group.remote.id,
      p_secret: group.remote.secret,
      p_data: shareData(
        group,
        group.remote.mode,
        group.holder || group.remote.holder,
      ),
      p_log: group.history,
      p_expected: group.remote.version,
    });
    patchRemote(groupId, { version: version });
    conflicts = 0;
    setSyncState(
      "The link stays the same, friends see changes when they refresh",
    );
  } catch (error) {
    if (error.message === "conflict" && conflicts < 2) {
      conflicts += 1;
      try {
        const server = await callRpc("get_version", {
          p_id: findGroup(groupId).remote.id,
        });
        patchRemote(groupId, { version: server });
        syncAgain = true;
      } catch (inner) {
        setSyncState("Could not reach the database, check your internet");
      }
    } else {
      setSyncState("Could not save: " + error.message);
    }
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      pushNow(groupId);
    }
  }
}
