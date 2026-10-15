(() => {
  "use strict";

  const STORE_KEY = "trainingLog.v1";
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const SCHEDULE = { mon: "A", tue: "bjj", wed: "bjj", thu: "rest", fri: "bjj", sat: "B", sun: "C" };
  const TYPE_META = {
    A: { label: "Gym A", tag: "Lower + push", color: "var(--gym)" },
    B: { label: "Gym B", tag: "Pull + grip", color: "var(--gym)" },
    C: { label: "Gym C", tag: "Full body", color: "var(--gym)" },
    bjj: { label: "BJJ", tag: "Mat session", color: "var(--bjj)" },
    rest: { label: "Rest", tag: "Recover", color: "var(--rest)" }
  };

  const uid = () => Math.random().toString(36).slice(2, 9);
  const ex = (name, sets, reps) => ({ id: uid(), name, sets, reps });

  const DEFAULT_PROGRAM = {
    A: [ex("Back Squat", 4, "5"), ex("Bench Press", 4, "6"), ex("Romanian Deadlift", 3, "8"), ex("Overhead Press", 3, "8"), ex("Weighted Plank", 3, "45s")],
    B: [ex("Deadlift", 3, "5"), ex("Weighted Pull-up", 4, "6"), ex("Barbell Row", 3, "8"), ex("Farmer's Carry", 3, "40m"), ex("Towel Hang", 3, "max")],
    C: [ex("Front Squat", 3, "6"), ex("Incline DB Press", 3, "10"), ex("Single-arm DB Row", 3, "10"), ex("Bulgarian Split Squat", 3, "8"), ex("Turkish Get-up", 3, "3/side")]
  };

  // ---------- state ----------
  let state = load();
  let weekStart = mondayOf(new Date());
  let activeDay = DAYS[(new Date().getDay() + 6) % 7];

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.program && s.weeks) return s;
      }
    } catch (e) { /* storage unavailable or corrupt */ }
    return { program: structuredClone(DEFAULT_PROGRAM), weeks: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- dates ----------
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function key(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const fmt = (d, o) => d.toLocaleDateString("en-AU", o);

  function dayRecord(wk, day, create) {
    if (!state.weeks[wk]) { if (!create) return null; state.weeks[wk] = {}; }
    if (!state.weeks[wk][day]) { if (!create) return null; state.weeks[wk][day] = { done: false, notes: "", ex: {}, bjj: {} }; }
    return state.weeks[wk][day];
  }

  // Most recent logged sets for an exercise before the current week/day
  function previousLog(exId) {
    const curWk = key(weekStart);
    const curIdx = DAYS.indexOf(activeDay);
    const weeks = Object.keys(state.weeks).sort().reverse();
    for (const wk of weeks) {
      if (wk > curWk) continue;
      const days = DAYS.slice().reverse();
      for (const d of days) {
        if (wk === curWk && DAYS.indexOf(d) >= curIdx) continue;
        const rec = state.weeks[wk][d];
        const sets = rec && rec.ex && rec.ex[exId];
        if (sets && sets.some(v => v !== "" && v != null)) return { wk, sets };
      }
    }
    return null;
  }

  // ---------- render ----------
  const $ = s => document.querySelector(s);

  function renderWeek() {
    const end = addDays(weekStart, 6);
    const thisWeek = key(weekStart) === key(mondayOf(new Date()));
    $("#weekLabel").textContent = thisWeek
      ? "This week"
      : `${fmt(weekStart, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short" })}`;

    const nav = $("#days");
    nav.innerHTML = "";
    const todayKey = key(new Date());
    DAYS.forEach((d, i) => {
      const date = addDays(weekStart, i);
      const type = SCHEDULE[d];
      const rec = dayRecord(key(weekStart), d, false);
      const b = document.createElement("button");
      b.className = "day-btn";
      b.style.setProperty("--c", TYPE_META[type].color);
      if (d === activeDay) b.classList.add("active");
      if (key(date) === todayKey) b.classList.add("today");
      if (rec && rec.done) b.classList.add("done");
      b.innerHTML = `<span class="dn">${DAY_NAMES[d].slice(0, 3).toUpperCase()}</span><span class="dt">${rec && rec.done ? "✓ done" : TYPE_META[type].label}</span>`;
      b.addEventListener("click", () => { activeDay = d; render(); });
      nav.appendChild(b);
    });
  }

  function renderDay() {
    const main = $("#day");
    main.innerHTML = "";
    const wk = key(weekStart);
    const type = SCHEDULE[activeDay];
    const meta = TYPE_META[type];
    const date = addDays(weekStart, DAYS.indexOf(activeDay));
    const rec = dayRecord(wk, activeDay, false);

    const title = document.createElement("div");
    title.className = "day-title";
    title.style.setProperty("--c", meta.color);
    title.innerHTML = `<div><span class="tag">${meta.tag} · ${fmt(date, { day: "numeric", month: "short" })}</span><h2>${DAY_NAMES[activeDay]} — ${meta.label}</h2></div>`;
    const doneBtn = document.createElement("button");
    doneBtn.className = "done-toggle" + (rec && rec.done ? " on" : "");
    doneBtn.textContent = rec && rec.done ? "✓ Done" : "Mark done";
    doneBtn.addEventListener("click", () => {
      const r = dayRecord(wk, activeDay, true);
      r.done = !r.done; save(); render();
    });
    title.appendChild(doneBtn);
    main.appendChild(title);

    if (type in state.program) renderGym(main, wk, type);
    else if (type === "bjj") renderBjj(main, wk);
    else {
      const c = card("Rest day");
      c.insertAdjacentHTML("beforeend", `<p class="rest-msg">No session scheduled. Walk, mobility, sleep.</p>`);
      main.appendChild(c);
    }
    main.appendChild(notesCard(wk));
  }

  function renderGym(main, wk, type) {
    const tpl = $("#exerciseTpl");
    state.program[type].forEach(item => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".ex-name").textContent = item.name;
      node.querySelector(".ex-target").textContent = `${item.sets} × ${item.reps}`;

      const rec = dayRecord(wk, activeDay, false);
      const logged = (rec && rec.ex[item.id]) || [];
      const prev = previousLog(item.id);
      const n = Math.max(item.sets, logged.length);
      const setsEl = node.querySelector(".sets");
      for (let i = 0; i < n; i++) setsEl.appendChild(setInput(wk, item.id, i, logged[i], prev && prev.sets[i]));

      const prevEl = node.querySelector(".ex-prev");
      if (prev) {
        const vals = prev.sets.filter(v => v !== "" && v != null);
        const best = Math.max(...vals.map(Number).filter(x => !isNaN(x)));
        const curBest = Math.max(...logged.map(Number).filter(x => !isNaN(x) && x > 0), 0);
        prevEl.innerHTML = `Last: <b>${vals.join(" · ")} kg</b>` + (curBest > best ? ` <span class="up">▲ ${+(curBest - best).toFixed(2)} kg</span>` : "");
      } else {
        prevEl.textContent = "No previous log";
      }

      node.querySelector(".add-set").addEventListener("click", () => {
        const r = dayRecord(wk, activeDay, true);
        const arr = r.ex[item.id] || [];
        while (arr.length < n) arr.push("");
        arr.push("");
        r.ex[item.id] = arr; save(); renderDay();
      });
      node.querySelector(".ex-remove").addEventListener("click", () => {
        if (!confirm(`Remove "${item.name}" from ${TYPE_META[type].label}? Past logs are kept.`)) return;
        state.program[type] = state.program[type].filter(e => e.id !== item.id);
        save(); renderDay();
      });
      main.appendChild(node);
    });

    const add = card(`Add exercise to ${TYPE_META[type].label}`);
    const form = document.createElement("form");
    form.className = "add-ex";
    form.innerHTML = `<input name="name" placeholder="Exercise name" required>
      <input name="sets" type="number" min="1" max="10" value="3" aria-label="Sets">
      <input name="reps" value="8" aria-label="Reps">
      <button type="submit">Add</button>`;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const name = String(f.get("name")).trim();
      if (!name) return;
      state.program[type].push(ex(name, Math.max(1, Math.min(10, +f.get("sets") || 3)), String(f.get("reps") || "8").trim()));
      save(); renderDay();
    });
    add.appendChild(form);
    main.appendChild(add);
  }

  function setInput(wk, exId, i, val, prevVal) {
    const wrap = document.createElement("label");
    wrap.className = "set";
    wrap.innerHTML = `<span class="n">${i + 1}</span><input inputmode="decimal" type="text"><span class="u">kg</span>`;
    const input = wrap.querySelector("input");
    input.value = val ?? "";
    input.placeholder = prevVal ?? "–";
    input.setAttribute("aria-label", `Set ${i + 1} kg`);
    input.addEventListener("input", () => {
      const v = input.value.replace(",", ".").replace(/[^\d.]/g, "");
      if (v !== input.value) input.value = v;
      const r = dayRecord(wk, activeDay, true);
      const arr = r.ex[exId] || [];
      arr[i] = v;
      for (let k = 0; k < arr.length; k++) if (arr[k] == null) arr[k] = "";
      r.ex[exId] = arr;
      save();
    });
    return wrap;
  }

  function renderBjj(main, wk) {
    const rec = dayRecord(wk, activeDay, false);
    const bjj = (rec && rec.bjj) || {};
    const c = card("Session");
    c.insertAdjacentHTML("beforeend", `<div class="bjj-grid">
      <label>Class / focus<input data-k="focus" placeholder="e.g. guard retention"></label>
      <label>Rounds rolled<input data-k="rounds" inputmode="numeric" placeholder="0"></label>
    </div>`);
    c.querySelectorAll("input[data-k]").forEach(inp => {
      inp.value = bjj[inp.dataset.k] || "";
      inp.addEventListener("input", () => {
        const r = dayRecord(wk, activeDay, true);
        r.bjj = r.bjj || {};
        r.bjj[inp.dataset.k] = inp.value;
        save();
      });
    });
    main.appendChild(c);
  }

  function notesCard(wk) {
    const rec = dayRecord(wk, activeDay, false);
    const c = card("Notes");
    const ta = document.createElement("textarea");
    ta.placeholder = "How it felt, technique notes, injuries, sleep…";
    ta.value = (rec && rec.notes) || "";
    ta.addEventListener("input", () => {
      const r = dayRecord(wk, activeDay, true);
      r.notes = ta.value; save();
    });
    c.appendChild(ta);
    return c;
  }

  function card(title) {
    const c = document.createElement("section");
    c.className = "card";
    const h = document.createElement("h4");
    h.textContent = title;
    c.appendChild(h);
    return c;
  }

  function render() { renderWeek(); renderDay(); }

  // ---------- controls ----------
  $("#prevWeek").addEventListener("click", () => { weekStart = addDays(weekStart, -7); render(); });
  $("#nextWeek").addEventListener("click", () => { weekStart = addDays(weekStart, 7); render(); });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `training-log-${key(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $("#importFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.program || !data.weeks) throw new Error("bad file");
      if (!confirm("Replace all current data with this backup?")) return;
      state = data; save(); render();
    } catch (err) {
      alert("That file isn't a valid training log backup.");
    } finally {
      e.target.value = "";
    }
  });

  render();
})();
