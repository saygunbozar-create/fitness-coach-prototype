import { useState, useMemo } from "react";

// ————— Marka renkleri (story videosuyla aynı) —————
const C = {
  bg: "#0B0D12",
  card: "#161C26",
  card2: "#1E2632",
  edge: "#2C3644",
  lime: "#C6F94E",
  white: "#F5F7FA",
  grey: "#96A0AC",
  greyD: "#69737F",
  red: "#FF6363",
  blue: "#60A5FA",
  orange: "#FBB040",
};

// ————— Excel'den gelen veriler —————
const CLIENTS = [
  {
    id: 1,
    name: "Örnek Danışan",
    goal: "Yağ Yakımı",
    weight: 80.2,
    startWeight: 82,
    kcalTarget: 2230,
    tdee: 2786,
    macros: { p: 164, k: 254, y: 62 },
    pr: 151.7,
    proj: [82, 81.5, 81, 80.5, 80, 79.4, 78.9, 78.4, 77.9, 77.4, 76.9, 76.4, 75.9],
    actual: [82, 81.6, 81.1, 80.7, 80.2],
    checkin: { Uyku: 8, Enerji: 8, "Açlık": 6, Stres: 3, Motivasyon: 9 },
  },
  {
    id: 2,
    name: "Mert K.",
    goal: "Kas Kazanımı",
    weight: 71.4,
    startWeight: 68,
    kcalTarget: 3050,
    tdee: 2750,
    macros: { p: 150, k: 380, y: 85 },
    pr: 122.5,
    proj: [68, 68.3, 68.6, 68.9, 69.2, 69.5, 69.8, 70.1, 70.4, 70.7, 71, 71.3, 71.6],
    actual: [68, 68.4, 69, 69.9, 70.6, 71.4],
    checkin: { Uyku: 6, Enerji: 7, "Açlık": 4, Stres: 5, Motivasyon: 8 },
  },
];

const INITIAL_WORKOUT = {
  Pzt: {
    label: "GÖĞÜS & TRICEPS",
    rows: [
      { ex: "Bench Press", grp: "Göğüs", set: 4, rep: 8, kg: 70, done: true },
      { ex: "Incline DB Press", grp: "Göğüs (Üst)", set: 4, rep: 10, kg: 26, done: true },
      { ex: "Cable Fly", grp: "Göğüs", set: 3, rep: 12, kg: 15, done: false },
      { ex: "Dips", grp: "Göğüs/Triceps", set: 3, rep: 10, kg: 0, done: false },
      { ex: "Skull Crusher", grp: "Triceps", set: 3, rep: 10, kg: 25, done: false },
      { ex: "Triceps Pushdown", grp: "Triceps", set: 3, rep: 12, kg: 25, done: false },
    ],
  },
  Sal: {
    label: "SIRT & BICEPS",
    rows: [
      { ex: "Barbell Row", grp: "Sırt", set: 4, rep: 8, kg: 60, done: false },
      { ex: "Lat Pulldown", grp: "Sırt (Kanat)", set: 4, rep: 10, kg: 55, done: false },
      { ex: "Seated Cable Row", grp: "Sırt (Orta)", set: 3, rep: 12, kg: 50, done: false },
      { ex: "Barbell Curl", grp: "Biceps", set: 3, rep: 10, kg: 30, done: false },
      { ex: "Hammer Curl", grp: "Biceps", set: 3, rep: 12, kg: 12, done: false },
    ],
  },
  Çar: {
    label: "BACAK",
    rows: [
      { ex: "Squat", grp: "Bacak", set: 4, rep: 8, kg: 90, done: false },
      { ex: "Romanian Deadlift", grp: "Bacak (Arka)", set: 4, rep: 10, kg: 70, done: false },
      { ex: "Leg Press", grp: "Bacak", set: 3, rep: 12, kg: 140, done: false },
      { ex: "Leg Curl", grp: "Bacak (Arka)", set: 3, rep: 12, kg: 40, done: false },
      { ex: "Calf Raise", grp: "Baldır", set: 4, rep: 15, kg: 60, done: false },
    ],
  },
};

const INITIAL_MEALS = [
  {
    name: "Kahvaltı",
    items: [
      { food: "Yumurta (haşlanmış)", unit: "adet", qty: 3, kcal: 70, p: 6, k: 1, y: 5 },
      { food: "Yulaf Ezmesi 60 g", unit: "porsiyon", qty: 1, kcal: 230, p: 8, k: 40, y: 4 },
      { food: "Muz", unit: "adet", qty: 1, kcal: 105, p: 1, k: 27, y: 0 },
      { food: "Badem 15 g", unit: "porsiyon", qty: 1, kcal: 90, p: 3, k: 3, y: 8 },
    ],
  },
  {
    name: "Ara Öğün",
    items: [
      { food: "Protein Tozu (whey)", unit: "ölçek", qty: 1, kcal: 120, p: 24, k: 3, y: 1 },
      { food: "Süt (yağsız) 250 ml", unit: "porsiyon", qty: 1, kcal: 90, p: 9, k: 12, y: 0 },
      { food: "Elma", unit: "adet", qty: 1, kcal: 95, p: 0, k: 25, y: 0 },
    ],
  },
  {
    name: "Öğle Yemeği",
    items: [
      { food: "Tavuk Göğsü (ızgara) 100 g", unit: "porsiyon", qty: 1.8, kcal: 165, p: 31, k: 0, y: 4 },
      { food: "Basmati Pirinç 100 g", unit: "porsiyon", qty: 1.5, kcal: 130, p: 3, k: 28, y: 0 },
      { food: "Yeşil Salata + Zeytinyağı", unit: "porsiyon", qty: 1, kcal: 120, p: 2, k: 6, y: 10 },
    ],
  },
];

const nf = (v, d = 0) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });

// ————— Küçük parçalar —————
function Panel({ title, right, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.edge}` }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: C.card2, borderBottom: `1px solid ${C.edge}` }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.lime }} />
          <span className="font-bold text-sm tracking-wide" style={{ color: C.white }}>{title}</span>
        </div>
        {right && <span className="text-xs" style={{ color: C.grey }}>{right}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Bar({ label, val, target, unit, color }) {
  const frac = Math.min(val / target, 1);
  const over = val > target;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: C.grey }}>{label}</span>
        <span className="font-bold" style={{ color: over ? C.red : C.white }}>
          {nf(val)} / {nf(target)} {unit}
        </span>
      </div>
      <div className="h-2.5 rounded-full relative" style={{ background: C.edge }}>
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${frac * 100}%`, background: color }}
        />
        {over && (
          <div
            className="absolute top-0 h-2.5 rounded-full"
            style={{ right: -Math.min(((val - target) / target) * 100, 8) + "%", width: "6px", background: C.red }}
          />
        )}
      </div>
    </div>
  );
}

function Ring({ pct, size = 120 }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const shown = Math.min(pct, 130);
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.edge} strokeWidth="10" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct > 105 ? C.orange : C.lime} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(shown, 100) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .7s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize="22" fontWeight="800" fill={C.white}>
        %{Math.round(pct)}
      </text>
    </svg>
  );
}

function LineChart({ proj, actual, h = 170 }) {
  const w = 320;
  const all = [...proj, ...actual];
  const min = Math.min(...all) - 0.8;
  const max = Math.max(...all) + 0.8;
  const X = (i, n) => 14 + (i / (n - 1)) * (w - 28);
  const Y = (v) => h - 24 - ((v - min) / (max - min)) * (h - 44);
  const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${X(i, proj.length)},${Y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="14" x2={w - 14} y1={20 + f * (h - 44)} y2={20 + f * (h - 44)} stroke={C.edge} strokeWidth="1" />
      ))}
      <path d={path(proj)} fill="none" stroke={C.greyD} strokeWidth="2.5" strokeDasharray="5 5" />
      <path d={path(actual)} fill="none" stroke={C.lime} strokeWidth="3.5" strokeLinecap="round" />
      {actual.map((v, i) => (
        <circle key={i} cx={X(i, proj.length)} cy={Y(v)} r="4" fill={C.lime} />
      ))}
      <text x="14" y={h - 4} fontSize="10" fill={C.greyD}>Başlangıç</text>
      <text x={w - 14} y={h - 4} fontSize="10" fill={C.greyD} textAnchor="end">Hafta 12</text>
    </svg>
  );
}

// ————— Sekmeler —————
function Dashboard({ client, workout, meals }) {
  const week = Object.values(workout);
  const totalSets = week.reduce((a, d) => a + d.rows.reduce((x, r) => x + r.set, 0), 0);
  const totalVol = week.reduce((a, d) => a + d.rows.reduce((x, r) => x + r.set * r.rep * r.kg, 0), 0);
  const kcalToday = meals.reduce((a, m) => a + m.items.reduce((x, it) => x + it.kcal * it.qty, 0), 0);
  const pct = (kcalToday / client.kcalTarget) * 100;
  const kpis = [
    ["Antrenman Günü", week.length + " gün"],
    ["Toplam Set", totalSets],
    ["Haftalık Hacim", nf(totalVol) + " kg"],
    ["En Yüksek 1RM", nf(client.pr, 1) + " kg"],
  ];
  const diff = client.weight - client.startWeight;
  return (
    <div className="space-y-4">
      <Panel title="Kontrol Paneli" right={client.goal}>
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(([l, v]) => (
            <div key={l} className="rounded-xl p-3" style={{ background: C.card2, borderLeft: `3px solid ${C.lime}` }}>
              <div className="text-xs mb-1" style={{ color: C.grey }}>{l}</div>
              <div className="text-lg font-extrabold" style={{ color: C.lime }}>{v}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Bugünkü Kalori" right={`Hedef ${nf(client.kcalTarget)} kcal`}>
        <div className="flex items-center gap-4">
          <Ring pct={pct} />
          <div className="flex-1 text-sm space-y-1">
            <div style={{ color: C.white }} className="font-bold">{nf(kcalToday)} kcal alındı</div>
            <div style={{ color: pct > 105 ? C.orange : C.grey }}>
              {pct > 105 ? `Hedefin ${nf(kcalToday - client.kcalTarget)} kcal üzerinde` : "Hedef aralığında"}
            </div>
            <div style={{ color: C.greyD }} className="text-xs">TDEE: {nf(client.tdee)} kcal · otomatik</div>
          </div>
        </div>
      </Panel>
      <Panel title="Kilo Durumu" right="12 haftalık plan">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl font-extrabold" style={{ color: C.white }}>{nf(client.weight, 1)} kg</span>
          <span className="font-bold text-sm" style={{ color: diff <= 0 ? C.lime : C.orange }}>
            {diff > 0 ? "+" : ""}{nf(diff, 1)} kg
          </span>
        </div>
        <LineChart proj={client.proj} actual={client.actual} />
        <div className="flex gap-4 text-xs mt-1">
          <span className="flex items-center gap-1.5" style={{ color: C.grey }}>
            <span className="w-4 h-0.5 inline-block" style={{ background: C.lime }} /> Gerçekleşen
          </span>
          <span className="flex items-center gap-1.5" style={{ color: C.grey }}>
            <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: C.greyD }} /> Projeksiyon
          </span>
        </div>
      </Panel>
    </div>
  );
}

function Workout({ workout, setWorkout }) {
  const [day, setDay] = useState("Pzt");
  const d = workout[day];
  const dayVol = d.rows.reduce((a, r) => a + r.set * r.rep * r.kg, 0);
  const update = (i, field, delta) => {
    setWorkout((w) => {
      const rows = w[day].rows.map((r, j) =>
        j === i ? { ...r, [field]: Math.max(0, r[field] + delta) } : r
      );
      return { ...w, [day]: { ...w[day], rows } };
    });
  };
  const toggle = (i) =>
    setWorkout((w) => {
      const rows = w[day].rows.map((r, j) => (j === i ? { ...r, done: !r.done } : r));
      return { ...w, [day]: { ...w[day], rows } };
    });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.keys(workout).map((k) => (
          <button
            key={k}
            onClick={() => setDay(k)}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{
              background: day === k ? C.lime : C.card,
              color: day === k ? C.bg : C.grey,
              border: `1px solid ${day === k ? C.lime : C.edge}`,
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <Panel title={d.label} right="Hacim = Set × Tekrar × kg">
        <div className="space-y-3">
          {d.rows.map((r, i) => (
            <div key={r.ex} className="rounded-xl p-3" style={{ background: C.card2, opacity: r.done ? 0.65 : 1 }}>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => toggle(i)} className="flex items-center gap-2 text-left">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{
                      background: r.done ? C.lime : "transparent",
                      border: `2px solid ${r.done ? C.lime : C.greyD}`,
                      color: C.bg,
                    }}
                  >
                    {r.done ? "✓" : ""}
                  </span>
                  <span>
                    <span className="font-bold text-sm block" style={{ color: C.white, textDecoration: r.done ? "line-through" : "none" }}>{r.ex}</span>
                    <span className="text-xs" style={{ color: C.greyD }}>{r.grp}</span>
                  </span>
                </button>
                <span className="font-extrabold text-sm shrink-0" style={{ color: C.lime }}>
                  {nf(r.set * r.rep * r.kg)} kg
                </span>
              </div>
              <div className="flex gap-2">
                {[["set", "Set"], ["rep", "Tekrar"], ["kg", "kg"]].map(([f, l]) => (
                  <div key={f} className="flex-1 flex items-center justify-between rounded-lg px-2 py-1" style={{ background: C.card, border: `1px solid ${C.edge}` }}>
                    <button onClick={() => update(i, f, f === "kg" ? -2.5 : -1)} className="w-6 h-6 font-black" style={{ color: C.grey }}>−</button>
                    <span className="text-xs text-center">
                      <span className="font-bold block" style={{ color: C.white }}>{r[f]}</span>
                      <span style={{ color: C.greyD }}>{l}</span>
                    </span>
                    <button onClick={() => update(i, f, f === "kg" ? 2.5 : 1)} className="w-6 h-6 font-black" style={{ color: C.lime }}>+</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl px-4 py-3 flex justify-between items-center" style={{ background: C.lime }}>
          <span className="font-extrabold text-sm" style={{ color: C.bg }}>Gün Toplamı</span>
          <span className="font-extrabold" style={{ color: C.bg }}>{nf(dayVol)} kg</span>
        </div>
      </Panel>
    </div>
  );
}

function Nutrition({ client, meals, setMeals }) {
  const totals = useMemo(() => {
    let kcal = 0, p = 0, k = 0, y = 0;
    meals.forEach((m) =>
      m.items.forEach((it) => {
        kcal += it.kcal * it.qty; p += it.p * it.qty; k += it.k * it.qty; y += it.y * it.qty;
      })
    );
    return { kcal, p, k, y };
  }, [meals]);
  const step = (mi, ii, delta) =>
    setMeals((ms) =>
      ms.map((m, a) =>
        a !== mi ? m : { ...m, items: m.items.map((it, b) => (b !== ii ? it : { ...it, qty: Math.max(0, Math.round((it.qty + delta) * 2) / 2) })) }
      )
    );
  return (
    <div className="space-y-4">
      <Panel title="Günlük Hedef Durumu" right="otomatik">
        <Bar label="Kalori" val={totals.kcal} target={client.kcalTarget} unit="kcal" color={C.lime} />
        <Bar label="Protein" val={totals.p} target={client.macros.p} unit="g" color={C.blue} />
        <Bar label="Karbonhidrat" val={totals.k} target={client.macros.k} unit="g" color={C.orange} />
        <Bar label="Yağ" val={totals.y} target={client.macros.y} unit="g" color={C.red} />
      </Panel>
      {meals.map((m, mi) => {
        const mk = m.items.reduce((a, it) => a + it.kcal * it.qty, 0);
        const mp = m.items.reduce((a, it) => a + it.p * it.qty, 0);
        return (
          <Panel key={m.name} title={m.name} right={`${nf(mk)} kcal · ${nf(mp)} g protein`}>
            <div className="space-y-2">
              {m.items.map((it, ii) => (
                <div key={it.food} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: C.white }}>{it.food}</div>
                    <div className="text-xs" style={{ color: C.greyD }}>{nf(it.kcal * it.qty)} kcal · P {nf(it.p * it.qty)} g</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => step(mi, ii, -0.5)} className="w-7 h-7 rounded-lg font-black" style={{ background: C.card, color: C.grey, border: `1px solid ${C.edge}` }}>−</button>
                    <span className="text-sm font-bold w-8 text-center" style={{ color: C.lime }}>{it.qty}</span>
                    <button onClick={() => step(mi, ii, 0.5)} className="w-7 h-7 rounded-lg font-black" style={{ background: C.card, color: C.lime, border: `1px solid ${C.edge}` }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Progress({ client }) {
  const entries = Object.entries(client.checkin);
  const avg = entries.reduce((a, [, v]) => a + v, 0) / entries.length;
  return (
    <div className="space-y-4">
      <Panel title="Haftalık Check-in" right={`Ortalama ${nf(avg, 1)} / 10`}>
        <div className="flex items-end gap-3 h-40 mb-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-bold mb-1" style={{ color: C.white }}>{v}</span>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{ height: `${v * 10}%`, background: v <= 4 ? C.red : C.lime }}
              />
              <span className="mt-1 text-center" style={{ color: C.grey, fontSize: 10 }}>{k}</span>
            </div>
          ))}
        </div>
        <div className="text-xs rounded-lg px-3 py-2" style={{ background: C.card2, color: C.grey }}>
          {entries.some(([, v]) => v <= 4)
            ? "Düşük skor tespit edildi — danışanla görüşme öner."
            : "Tüm skorlar sağlıklı aralıkta."}
        </div>
      </Panel>
      <Panel title="Kilo Projeksiyonu" right="7700 kcal ≈ 1 kg">
        <LineChart proj={client.proj} actual={client.actual} />
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            [nf(client.proj[12] - client.proj[0], 1) + " kg", "12 haftada"],
            [nf((client.proj[12] - client.proj[0]) / 12, 2) + " kg", "haftalık"],
            [nf(client.kcalTarget - client.tdee) + " kcal", "günlük fark"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl p-2 text-center" style={{ background: C.card2, border: `1px solid ${C.edge}` }}>
              <div className="font-extrabold text-sm" style={{ color: C.lime }}>{v}</div>
              <div style={{ color: C.grey, fontSize: 10 }}>{l}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Clients({ clients, activeId, onPick }) {
  return (
    <div className="space-y-3">
      {clients.map((c) => {
        const diff = c.weight - c.startWeight;
        const gaining = c.goal === "Kas Kazanımı";
        const onTrack = gaining ? diff > 0 : diff < 0;
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="w-full text-left rounded-2xl p-4 transition-colors"
            style={{
              background: C.card,
              border: `1px solid ${activeId === c.id ? C.lime : C.edge}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold"
                style={{ background: C.card2, color: C.lime, border: `1px solid ${C.edge}` }}
              >
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold" style={{ color: C.white }}>{c.name}</div>
                <div className="text-xs" style={{ color: C.grey }}>{c.goal} · {nf(c.weight, 1)} kg</div>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{
                  background: onTrack ? "rgba(198,249,78,.12)" : "rgba(251,176,64,.12)",
                  color: onTrack ? C.lime : C.orange,
                }}
              >
                {onTrack ? "Yolunda" : "Takip et"}
              </span>
            </div>
          </button>
        );
      })}
      <div className="rounded-2xl p-4 text-center text-sm" style={{ border: `2px dashed ${C.edge}`, color: C.greyD }}>
        + Yeni danışan ekle
      </div>
    </div>
  );
}

// ————— Uygulama kabuğu —————
const TABS = [
  { id: "panel", label: "Panel", icon: "▦" },
  { id: "antrenman", label: "Antrenman", icon: "⬢" },
  { id: "beslenme", label: "Beslenme", icon: "◈" },
  { id: "ilerleme", label: "İlerleme", icon: "↗" },
  { id: "danisan", label: "Danışan", icon: "◉" },
];

export default function App() {
  const [tab, setTab] = useState("panel");
  const [clientId, setClientId] = useState(1);
  const [workout, setWorkout] = useState(INITIAL_WORKOUT);
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const client = CLIENTS.find((c) => c.id === clientId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#05070A", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div
        className="w-full max-w-sm overflow-hidden flex flex-col"
        style={{ background: C.bg, border: `1px solid ${C.edge}`, height: "min(92vh, 820px)", boxShadow: "0 30px 80px rgba(0,0,0,.6)", borderRadius: "2.2rem" }}
      >
        {/* üst bar */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <div className="font-bold" style={{ color: C.greyD, fontSize: 10, letterSpacing: "0.2em" }}>FITNESS COACH</div>
            <div className="font-extrabold text-lg" style={{ color: C.white }}>
              {TABS.find((t) => t.id === tab).label}
            </div>
          </div>
          <button
            onClick={() => setTab("danisan")}
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: C.card, color: C.lime, border: `1px solid ${C.edge}` }}
          >
            {client.name}
          </button>
        </div>

        {/* içerik */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {tab === "panel" && <Dashboard client={client} workout={workout} meals={meals} />}
          {tab === "antrenman" && <Workout workout={workout} setWorkout={setWorkout} />}
          {tab === "beslenme" && <Nutrition client={client} meals={meals} setMeals={setMeals} />}
          {tab === "ilerleme" && <Progress client={client} />}
          {tab === "danisan" && <Clients clients={CLIENTS} activeId={clientId} onPick={(id) => { setClientId(id); setTab("panel"); }} />}
        </div>

        {/* alt sekmeler */}
        <div className="shrink-0 flex" style={{ background: C.card2, borderTop: `1px solid ${C.edge}` }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-3 flex flex-col items-center gap-0.5"
            >
              <span className="text-base leading-none" style={{ color: tab === t.id ? C.lime : C.greyD }}>{t.icon}</span>
              <span className="font-bold" style={{ color: tab === t.id ? C.lime : C.greyD, fontSize: 10 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
