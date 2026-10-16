const remoteId = new URLSearchParams(location.search).get("g");

async function openGroup() {
  try {
    const result = await callRpc("get_group", { p_id: remoteId });
    if (!result) {
      throw new Error("missing");
    }
    const data = result.data;
    data.version = result.version;
    data.updatedAt = result.updated_at;
    data.remoteId = remoteId;
    sessionStorage.setItem("hati-view", JSON.stringify(data));
    location.replace(
      (data.type === "ambagan" ? "ambagan.html" : "group.html") +
        "?id=shared&g=" +
        remoteId,
    );
  } catch (error) {
    document.getElementById("loading").hidden = true;
    document.getElementById("problem").hidden = false;
  }
}

openGroup();
