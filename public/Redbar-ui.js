export function bootRedbarUI({ root, onReadyText }) {
  const KEY = "redbar_state_v1";
  const state = load() || { budget: 100, spent: 0, lastResetDay: dayKey(new Date()) };

  // Reset spent once per local day
  const today = dayKey(new Date());
  if (state.lastResetDay !== today) {
    state.spent = 0;
    state.lastResetDay = today;
    save();
  }

  root.innerHTML = `
    <div class="wrap">
      <div class="top">
        <div class="brand">
          <div class="name">The Red Bar</div>
          <div class="sub">daily budget — one bar</div>
        </div>
        <div class="pill" id="envPill">WEB</div>
      </div>

      <div class="panel">
        <div class="numbers">
          <div class="big"><span id="leftAmt">—</span><span class="unit"> left</span></div>
          <div class="small"><span id="spentAmt">—</span> spent • budget <span id="budgetAmt">—</span></div>
        </div>

        <div class="barWrap" aria-label="Budget bar">
          <div class="barBg" id="barBg">
            <div class="barFill" id="barFill"></div>
            <div class="barTeeth" id="barTeeth"></div>
          </div>
        </div>

        <div class="inputRow">
          <input id="inp" class="inp" inputmode="decimal" autocomplete="off" spellcheck="false"
            placeholder="type 50 ↵  |  budget: 120  |  reset" />
        </div>

        <div class="help">
          <span class="chip">number = spend</span>
          <span class="chip">budget: n</span>
          <span class="chip">undo</span>
          <span class="chip">reset</span>
          <span class="chip">export</span>
        </div>
      </div>
    </div>
  `;

  const el = {
    left: root.querySelector("#leftAmt"),
    spent: root.querySelector("#spentAmt"),
    budget: root.querySelector("#budgetAmt"),
    fill: root.querySelector("#barFill"),
    teeth: root.querySelector("#barTeeth"),
    bg: root.querySelector("#barBg"),
    inp: root.querySelector("#inp"),
    env: root.querySelector("#envPill"),
  };

  const history = [];
  function snap(){ history.push(JSON.stringify(state)); if(history.length>30) history.shift(); }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function load(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function dayKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

  function fmt(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    const y = Math.max(0, x);
    return y.toFixed(2).replace(/\.00$/, "");
  }

  function render(){
    const left = Math.max(0, state.budget - state.spent);
    el.left.textContent = fmt(left);
    el.spent.textContent = fmt(state.spent);
    el.budget.textContent = fmt(state.budget);

    const ratio = state.budget > 0 ? Math.max(0, Math.min(1, left / state.budget)) : 0;
    el.fill.style.width = `${ratio*100}%`;

    const panic = ratio <= 0.2;
    el.bg.classList.toggle("panic", panic);
    el.teeth.innerHTML = "";
    if (panic) {
      const teethCount = 18;
      for (let i=0;i<teethCount;i++){
        const t = document.createElement("div");
        t.className = "tooth";
        t.style.left = `${(i/(teethCount-1))*100}%`;
        t.style.height = `${10 + Math.random()*18}px`;
        el.teeth.appendChild(t);
      }
    }
  }

  function setEnv(isMini){
    el.env.textContent = isMini ? "MINI" : "WEB";
    el.env.classList.toggle("mini", !!isMini);
  }

  function pulse(msg){
    const prev = el.env.textContent;
    el.env.textContent = String(msg).toUpperCase();
    el.env.classList.add("pulse");
    setTimeout(() => {
      el.env.classList.remove("pulse");
      el.env.textContent = prev;
    }, 900);
  }

  async function exportState(){
    const payload = JSON.stringify({ v: 1, ...state }, null, 0);
    try { await navigator.clipboard.writeText(payload); pulse("exported"); }
    catch { pulse("copy failed"); }
  }

  function undo(){
    const prev = history.pop();
    if (!prev) return pulse("nothing");
    const obj = JSON.parse(prev);
    state.budget = obj.budget;
    state.spent = obj.spent;
    state.lastResetDay = obj.lastResetDay;
    save(); render(); pulse("undone");
  }

  function reset(){
    snap();
    state.spent = 0;
    state.lastResetDay = dayKey(new Date());
    save(); render(); pulse("reset");
  }

  function applySpend(amount){
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return pulse("bad");
    snap();
    state.spent = Math.max(0, state.spent + n);
    save(); render();
  }

  function applyBudget(amount){
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return pulse("bad");
    snap();
    state.budget = n;
    save(); render(); pulse("budget");
  }

  function run(raw){
    const v = String(raw || "").trim();
    if (!v) return;

    if (/^reset$/i.test(v)) return reset();
    if (/^undo$/i.test(v)) return undo();
    if (/^export$/i.test(v)) return exportState();

    const mBudget = v.match(/^budget:\s*([0-9]*\.?[0-9]+)\s*$/i);
    if (mBudget) return applyBudget(mBudget[1]);

    const mNum = v.match(/^([0-9]*\.?[0-9]+)\s*$/);
    if (mNum) return applySpend(mNum[1]);

    pulse("unknown");
  }

  render();
  if (onReadyText) pulse(onReadyText);

  root.addEventListener("pointerdown", () => el.inp.focus());
  el.inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = el.inp.value;
      el.inp.value = "";
      run(val);
    }
  });

  return { setEnv };
}