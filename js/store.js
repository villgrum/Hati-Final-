const storageKey = "hati-groups";

function loadGroups() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveGroups(groups) {
  localStorage.setItem(storageKey, JSON.stringify(groups));
}

function sharedGroup() {
  try {
    const group = JSON.parse(sessionStorage.getItem("hati-view"));
    if (!group) {
      return undefined;
    }
    group.id = "shared";
    return group;
  } catch (error) {
    return undefined;
  }
}

function findGroup(id) {
  if (id === "shared") {
    return sharedGroup();
  }
  return loadGroups().find(function (group) {
    return group.id === id;
  });
}

function addGroup(group) {
  const groups = loadGroups();
  groups.unshift(group);
  saveGroups(groups);
}

function updateGroup(updated) {
  const groups = loadGroups();
  const index = groups.findIndex(function (group) {
    return group.id === updated.id;
  });
  if (index === -1) {
    return;
  }
  if (groups[index].remote) {
    updated.remote = groups[index].remote;
  }
  if (!updated.holder && groups[index].holder) {
    updated.holder = groups[index].holder;
  }
  groups[index] = updated;
  saveGroups(groups);
  if (updated.remote && typeof syncGroup === "function") {
    syncGroup(updated.id);
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
