const STORAGE_KEY = "esl-mystery-box";

const defaultGame = {
  title: "ESL Mystery Boxes",
  teams: ["Red", "Blue", "Green"],
  scores: { Red: 0, Blue: 0, Green: 0 },
  currentTeam: "Red",
  opened: [],
  doubleNext: {},
  boxes: [
    { task: "Speak for 30 seconds: describe your favorite food.", prize: { type: "points", value: 50 } },
    { task: "Write 4 past-tense verbs on the board.", prize: { type: "steal", value: 25 } },
    { task: "Ask a classmate: 'Have you ever...?'", prize: { type: "give", value: 20 } },
    { task: "Fix this sentence: 'She don't like apples.'", prize: { type: "points", value: -15 } },
    { task: "Talk for 30 seconds about your hometown.", prize: { type: "bonus", kind: "extraTurn" } },
    { task: "Use 'if' in 2 sentences.", prize: { type: "bonus", kind: "doubleNext" } },
    { task: "Name 8 classroom objects.", prize: { type: "points", value: 40 } },
    { task: "Role-play: you lost your passport at the airport.", prize: { type: "steal", value: 40 } },
    { task: "Compare two sports using 'more' / 'than'.", prize: { type: "points", value: 30 } },
  ],
};

let game = loadGame();
let view = "play";

const els = {
  title: document.getElementById("gameTitle"),
  playBtn: document.getElementById("playBtn"),
  editBtn: document.getElementById("editBtn"),
  resetBtn: document.getElementById("resetBtn"),
  turnBanner: document.getElementById("turnBanner"),
  scoreboard: document.getElementById("scoreboard"),
  board: document.getElementById("board"),
  editor: document.getElementById("editor"),
  titleInput: document.getElementById("titleInput"),
  teamsInput: document.getElementById("teamsInput"),
  boxEditor: document.getElementById("boxEditor"),
  addBoxBtn: document.getElementById("addBoxBtn"),
  saveBtn: document.getElementById("saveBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  modal: document.getElementById("modal"),
  modalBody: document.getElementById("modalBody"),
};

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultGame);
    return normalizeGame(JSON.parse(saved));
  } catch {
    return structuredClone(defaultGame);
  }
}

function normalizeGame(raw) {
  const next = { ...structuredClone(defaultGame), ...raw };
  next.teams = (next.teams || []).map((t) => String(t).trim()).filter(Boolean);
  if (!next.teams.length) next.teams = ["Red", "Blue"];
  next.scores = next.scores || {};
  next.teams.forEach((team) => {
    if (typeof next.scores[team] !== "number") next.scores[team] = 0;
  });
  if (!next.teams.includes(next.currentTeam)) next.currentTeam = next.teams[0];
  next.opened = Array.isArray(next.opened) ? next.opened : [];
  next.doubleNext = next.doubleNext || {};
  next.boxes = Array.isArray(next.boxes) && next.boxes.length ? next.boxes : structuredClone(defaultGame.boxes);
  return next;
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function prizeLabel(prize) {
  if (prize.type === "points") {
    const n = prize.value || 0;
    return n >= 0 ? `+${n} points` : `${n} points`;
  }
  if (prize.type === "steal") return `Steal ${prize.value || 0} points`;
  if (prize.type === "give") return `Give ${prize.value || 0} points`;
  if (prize.kind === "extraTurn") return "Bonus: extra turn";
  if (prize.kind === "doubleNext") return "Bonus: double next prize";
  return "Bonus";
}

function render() {
  document.title = game.title;
  els.title.textContent = game.title;
  els.playBtn.classList.toggle("active", view === "play");
  els.editBtn.classList.toggle("active", view === "edit");
  els.editor.classList.toggle("hidden", view !== "edit");
  els.board.classList.toggle("hidden", view !== "play");
  els.turnBanner.classList.toggle("hidden", view !== "play");
  els.scoreboard.classList.toggle("hidden", view !== "play");

  const doubled = game.doubleNext[game.currentTeam] ? " — next points prize is doubled!" : "";
  els.turnBanner.textContent = `Current team: ${game.currentTeam}${doubled}`;

  els.scoreboard.innerHTML = "";
  game.teams.forEach((team) => {
    const btn = document.createElement("button");
    btn.className = "team" + (team === game.currentTeam ? " current" : "");
    btn.type = "button";
    btn.innerHTML = `<span class="team-name">${escapeHtml(team)}</span><span class="team-score">${game.scores[team] || 0}</span>`;
    btn.addEventListener("click", () => {
      game.currentTeam = team;
      saveGame();
      render();
    });
    els.scoreboard.appendChild(btn);
  });

  els.board.innerHTML = "";
  game.boxes.forEach((box, index) => {
    const opened = game.opened.includes(index);
    const tile = document.createElement("button");
    tile.className = "box" + (opened ? " opened" : "");
    tile.type = "button";
    tile.textContent = opened ? "✓" : String(index + 1);
    tile.setAttribute("aria-label", opened ? `Box ${index + 1} already opened` : `Open box ${index + 1}`);
    tile.disabled = opened;
    tile.addEventListener("click", () => openBox(index));
    els.board.appendChild(tile);
  });

  if (view === "edit") renderEditor();
}

function renderEditor() {
  els.titleInput.value = game.title;
  els.teamsInput.value = game.teams.join(", ");
  els.boxEditor.innerHTML = "";
  game.boxes.forEach((box, index) => {
    const card = document.createElement("article");
    card.className = "box-card";
    const prize = box.prize || { type: "points", value: 0 };
    card.innerHTML = `
      <h3>Box ${index + 1}</h3>
      <label>Task
        <textarea data-field="task">${escapeHtml(box.task || "")}</textarea>
      </label>
      <div class="prize-row">
        <label>Prize type
          <select data-field="type">
            <option value="points"${prize.type === "points" ? " selected" : ""}>Points</option>
            <option value="steal"${prize.type === "steal" ? " selected" : ""}>Steal</option>
            <option value="give"${prize.type === "give" ? " selected" : ""}>Give</option>
            <option value="bonus"${prize.type === "bonus" ? " selected" : ""}>Bonus</option>
          </select>
        </label>
        <label>Point value
          <input data-field="value" type="number" value="${prize.value || 0}" />
        </label>
        <label>Bonus kind
          <select data-field="kind">
            <option value="extraTurn"${prize.kind === "extraTurn" ? " selected" : ""}>Extra turn</option>
            <option value="doubleNext"${prize.kind === "doubleNext" ? " selected" : ""}>Double next prize</option>
          </select>
        </label>
      </div>
      <p class="prize-summary">${escapeHtml(prizeLabel(prize))}</p>
      <button type="button" class="danger" data-remove>Remove box</button>
    `;
    card.querySelector("[data-field=task]").addEventListener("input", (e) => {
      game.boxes[index].task = e.target.value;
    });
    card.querySelector("[data-field=type]").addEventListener("change", (e) => {
      game.boxes[index].prize = game.boxes[index].prize || {};
      game.boxes[index].prize.type = e.target.value;
      if (e.target.value === "bonus" && !game.boxes[index].prize.kind) {
        game.boxes[index].prize.kind = "extraTurn";
      }
      renderEditor();
    });
    card.querySelector("[data-field=value]").addEventListener("input", (e) => {
      game.boxes[index].prize = game.boxes[index].prize || {};
      game.boxes[index].prize.value = Number(e.target.value || 0);
    });
    card.querySelector("[data-field=kind]").addEventListener("change", (e) => {
      game.boxes[index].prize = game.boxes[index].prize || {};
      game.boxes[index].prize.kind = e.target.value;
    });
    card.querySelector("[data-remove]").addEventListener("click", () => {
      if (game.boxes.length <= 1) return;
      game.boxes.splice(index, 1);
      game.opened = game.opened.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
      render();
    });
    els.boxEditor.appendChild(card);
  });
}

function applyEditorFields() {
  game.title = els.titleInput.value.trim() || "Mystery Boxes";
  const teams = els.teamsInput.value.split(",").map((t) => t.trim()).filter(Boolean);
  const oldScores = game.scores;
  game.teams = teams.length ? teams : ["Red", "Blue"];
  game.scores = {};
  game.teams.forEach((team) => {
    game.scores[team] = typeof oldScores[team] === "number" ? oldScores[team] : 0;
  });
  if (!game.teams.includes(game.currentTeam)) game.currentTeam = game.teams[0];
}

function openBox(index) {
  if (game.opened.includes(index)) return;
  const box = game.boxes[index];
  showTask(index, box);
}

function showTask(index, box) {
  els.modalBody.innerHTML = `
    <h2>Box ${index + 1} — Task</h2>
    <p>${escapeHtml(box.task || "No task yet.")}</p>
    <div class="modal-actions">
      <button type="button" class="primary" id="revealBtn">Reveal prize</button>
      <button type="button" id="closeTaskBtn">Close</button>
    </div>
  `;
  els.modal.showModal();
  document.getElementById("revealBtn").addEventListener("click", () => showPrize(index, box));
  document.getElementById("closeTaskBtn").addEventListener("click", () => els.modal.close());
}

function showPrize(index, box) {
  const prize = box.prize || { type: "points", value: 0 };
  const needsTarget = prize.type === "steal" || prize.type === "give";
  const otherTeams = game.teams.filter((t) => t !== game.currentTeam);
  els.modalBody.innerHTML = `
    <h2>Prize</h2>
    <p>${escapeHtml(prizeLabel(prize))}</p>
    ${needsTarget ? `<p>Choose a team.</p><div class="modal-actions" id="targetTeams"></div>` : ""}
    <div class="modal-actions">
      ${needsTarget ? "" : `<button type="button" class="primary" id="applyBtn">Apply prize</button>`}
      <button type="button" id="closePrizeBtn">Close without applying</button>
    </div>
  `;
  if (!els.modal.open) els.modal.showModal();
  document.getElementById("closePrizeBtn").addEventListener("click", () => els.modal.close());
  if (needsTarget) {
    const wrap = document.getElementById("targetTeams");
    otherTeams.forEach((team) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary";
      btn.textContent = team;
      btn.addEventListener("click", () => finishBox(index, prize, team));
      wrap.appendChild(btn);
    });
  } else {
    document.getElementById("applyBtn").addEventListener("click", () => finishBox(index, prize, null));
  }
}

function finishBox(index, prize, targetTeam) {
  if (!game.opened.includes(index)) game.opened.push(index);
  applyPrize(prize, game.currentTeam, targetTeam);
  els.modal.close();
  render();
}

function applyPrize(prize, fromTeam, toTeam) {
  let amount = prize.value || 0;
  if (prize.type === "points" && game.doubleNext[fromTeam]) {
    amount *= 2;
    game.doubleNext[fromTeam] = false;
  }

  if (prize.type === "points") {
    game.scores[fromTeam] += amount;
  } else if (prize.type === "steal" && toTeam) {
    game.scores[toTeam] -= amount;
    game.scores[fromTeam] += amount;
  } else if (prize.type === "give" && toTeam) {
    game.scores[fromTeam] -= amount;
    game.scores[toTeam] += amount;
  } else if (prize.type === "bonus" && prize.kind === "doubleNext") {
    game.doubleNext[fromTeam] = true;
  }

  const extraTurn = prize.type === "bonus" && prize.kind === "extraTurn";
  if (!extraTurn) rotateTeam();
  saveGame();
}

function rotateTeam() {
  const i = game.teams.indexOf(game.currentTeam);
  game.currentTeam = game.teams[(i + 1) % game.teams.length];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

els.playBtn.addEventListener("click", () => {
  applyEditorFields();
  saveGame();
  view = "play";
  render();
});

els.editBtn.addEventListener("click", () => {
  view = "edit";
  render();
});

els.resetBtn.addEventListener("click", () => {
  if (!confirm("Reset opened boxes and scores? Tasks and prizes stay the same.")) return;
  game.opened = [];
  game.teams.forEach((team) => {
    game.scores[team] = 0;
  });
  game.doubleNext = {};
  game.currentTeam = game.teams[0];
  saveGame();
  view = "play";
  render();
});

els.addBoxBtn.addEventListener("click", () => {
  applyEditorFields();
  game.boxes.push({ task: "New speaking task…", prize: { type: "points", value: 10 } });
  render();
});

els.saveBtn.addEventListener("click", () => {
  applyEditorFields();
  saveGame();
  els.saveBtn.textContent = "Saved";
  setTimeout(() => {
    els.saveBtn.textContent = "Save";
  }, 1200);
});

els.exportBtn.addEventListener("click", () => {
  applyEditorFields();
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mystery-boxes.json";
  a.click();
  URL.revokeObjectURL(url);
});

els.importInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    game = normalizeGame(JSON.parse(text));
    saveGame();
    view = "play";
    render();
  } catch {
    alert("Could not import that JSON file.");
  }
  event.target.value = "";
});

render();
