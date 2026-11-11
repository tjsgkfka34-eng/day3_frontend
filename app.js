// 제주 미세먼지 화면. 가공·등급 계산·예측은 전부 백엔드가 하고, 여기서는 결과만 받아 그린다.
const API = window.API_URL;
const GRADE_CLASS = { 좋음: "good", 보통: "ok", 나쁨: "bad", 매우나쁨: "worse" };
const REFRESH_MS = 5 * 60 * 1000; // 5분마다 자동 새로고침

const $ = (id) => document.getElementById(id);

function badge(grade) {
  const el = document.createElement("span");
  if (!grade) { el.textContent = "-"; return el; }
  el.className = "badge " + (GRADE_CLASS[grade] || "");
  el.textContent = grade;
  return el;
}

async function getJson(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(API + path, { signal: ctrl.signal });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).detail || ""; } catch (_) {}
      throw new Error(detail || "서버 응답 오류 (" + res.status + ")");
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function showNotice(text, isError) {
  const n = $("notice");
  n.textContent = text;
  n.className = "notice" + (isError ? " error" : "");
  n.hidden = !text;
}

function renderSummary(s) {
  $("avg10").textContent = s.avg_pm10 ?? "-";
  $("avg25").textContent = s.avg_pm25 ?? "-";
  $("stations").textContent = s.stations ? s.stations + "곳" : "-";
  $("worst").textContent = s.worst_station
    ? s.worst_station.station + " (" + s.worst_station.pm10 + ")" : "-";
  const g = $("avg10grade");
  g.replaceChildren(badge(s.avg_pm10_grade));
  $("meta").textContent = s.last_collect
    ? "마지막 수집: " + new Date(s.last_collect.ran_at)
        .toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) + " (한국 시간)"
    : "";
  showNotice(s.mode === "demo" ? "연습 데이터입니다. 실제 공공데이터가 아닙니다." : "", false);
}

function valueCell(v, grade) {
  const td = document.createElement("td");
  const num = document.createElement("span");
  num.className = "val";
  num.textContent = v ?? "-";
  td.append(num, badge(grade));
  return td;
}

function renderRows(rows) {
  const body = $("rows");
  body.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5; td.className = "empty"; td.textContent = "아직 수집된 데이터가 없습니다.";
    tr.append(td); body.append(tr);
    return;
  }
  for (const r of rows) {
    const tr = document.createElement("tr");
    const name = document.createElement("td"); name.textContent = r.station;
    const time = document.createElement("td"); time.textContent = r.time.slice(11);
    const act = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = "1시간 뒤?";
    btn.addEventListener("click", () => predict(r.station, btn));
    act.append(btn);
    tr.append(name, time, valueCell(r.pm10, r.pm10_grade), valueCell(r.pm25, r.pm25_grade), act);
    body.append(tr);
  }
}

function sparkline(recent, next) {
  const ns = "http://www.w3.org/2000/svg";
  const all = recent.concat([next]);
  const max = Math.max(...all), min = Math.min(...all);
  const W = 420, H = 90, pad = 8;
  const x = (i) => pad + (i * (W - 2 * pad)) / (all.length - 1);
  const y = (v) => H - pad - ((v - min) / Math.max(1, max - min)) * (H - 2 * pad);
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "최근 PM10 추이와 1시간 뒤 예측");
  const past = document.createElementNS(ns, "polyline");
  past.setAttribute("class", "past");
  past.setAttribute("points", recent.map((v, i) => x(i) + "," + y(v)).join(" "));
  const last = recent.length - 1;
  const fut = document.createElementNS(ns, "line");
  fut.setAttribute("class", "next");
  fut.setAttribute("x1", x(last)); fut.setAttribute("y1", y(recent[last]));
  fut.setAttribute("x2", x(last + 1)); fut.setAttribute("y2", y(next));
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("cx", x(last + 1)); dot.setAttribute("cy", y(next)); dot.setAttribute("r", 4);
  svg.append(past, fut, dot);
  return svg;
}

async function predict(station, btn) {
  const box = $("prediction");
  btn.disabled = true;
  try {
    const p = await getJson("/air/predict?station=" + encodeURIComponent(station));
    box.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = station + " · 1시간 뒤 예측";
    box.append(h);
    if (!p.ready) {
      const m = document.createElement("p");
      m.textContent = p.message;
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "서버가 1시간마다 자동 수집하므로 12시간 정도 지나면 예측할 수 있어요.";
      box.append(m, hint);
    } else {
      const line = document.createElement("p");
      line.className = "pred-line";
      const b = document.createElement("b");
      b.textContent = p.next_pm10;
      line.append("PM10 약 ", b, " ㎍/㎥ ", badge(p.next_grade));
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "평균 오차 ±" + p.avg_error + " ㎍/㎥ · " + p.model
        + " (점선이 예측, 최근 " + p.recent.length + "시간 기준)";
      box.append(line, sparkline(p.recent, p.next_pm10), hint);
    }
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) {
    showNotice("예측 실패: " + e.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function load() {
  const btn = $("refresh");
  btn.disabled = true;
  try {
    const [summary, latest] = await Promise.all([getJson("/air/summary"), getJson("/air/latest")]);
    renderSummary(summary);
    renderRows(latest);
  } catch (e) {
    showNotice("서버에 연결하지 못했습니다 (" + API + "): " + e.message, true);
    $("rows").innerHTML = '<tr><td colspan="5" class="empty">데이터를 불러오지 못했습니다.</td></tr>';
  } finally {
    btn.disabled = false;
  }
}

$("refresh").addEventListener("click", load);
load();
setInterval(load, REFRESH_MS);
