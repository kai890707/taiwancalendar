const srcBase = "./transform_data/";
const monthName = i => ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"][i - 1];
const getMonthIdx = m => Number(m) - 1;
const isWeekend = d => d.week_chinese === "六" || d.week_chinese === "日";
const isNationalHoliday = d => d.caption && /節|假|春節|國慶|中秋|除夕|勞動|清明|光復|行憲|元旦|紀念日|小年夜/.test(d.caption);

function findHolidayBlocks(data) {
  let arr = [], cur = [];
  for (const d of data) {
    if (d.caption && d.caption.match(/補班|補行上班/)) { if (cur.length) arr.push(cur); cur = []; continue; }
    if (d.isHoliday) cur.push(d);
    else { if (cur.length) arr.push(cur); cur = []; }
  }
  if (cur.length) arr.push(cur);
  return arr;
}
function isWeekendBlock(block) {
  return block.length === 2 && isWeekend(block[0]) && isWeekend(block[1]) && !block[0].caption && !block[1].caption;
}
function hasNationalHoliday(block) { return block.some(isNationalHoliday); }
function makeBestVacationAdvices(data, maxLeave = 4) {
  let methodMax = new Map();
  for (let start = 0; start < data.length; start++) {
    if (!data[start].isHoliday && !isNationalHoliday(data[start]) && !isWeekend(data[start])) continue;
    let leaveDays = [], block = [], used = 0, capSet = new Set();
    for (let end = start; end < data.length; end++) {
      let d = data[end];
      if (d.caption && d.caption.match(/補班|補行上班/)) break;
      if (d.isHoliday || isNationalHoliday(d)) { block.push(d); if (d.caption) capSet.add(d.caption); }
      else if (!isWeekend(d)) {
        if (used < maxLeave) { leaveDays.push(d); block.push(d); used++; }
        else break;
      } else { block.push(d); }
      let reachEnd = (isNationalHoliday(data[end]) || isWeekend(data[end]))
        && (isNationalHoliday(data[start]) || isWeekend(data[start]));
      if (reachEnd && block.length >= 4 && leaveDays.length > 0 && block.length === end - start + 1) {
        let askKey = leaveDays.map(d => d.date).join(',');
        if (
          !methodMax.has(askKey) ||
          block.length > methodMax.get(askKey).block.length
        ) {
          methodMax.set(askKey, {
            block: block.slice(),
            ask: leaveDays.slice(),
            caption: [...capSet].filter(s => s).join('、') || "連假"
          });
        }
      }
    }
  }
  let arr = [];
  methodMax.forEach((info, askKey) => {
    let block = info.block, leaveDays = info.ask;
    let range = `${parseInt(block[0].month)}/${parseInt(block[0].day)} - ${parseInt(block[block.length - 1].month)}/${parseInt(block[block.length - 1].day)}`;
    arr.push({
      range,
      start: block[0].date,
      caption: info.caption,
      choices: [{
        ask: leaveDays.length,
        days: block.length,
        askDates: leaveDays.map(d => `${parseInt(d.month)}/${parseInt(d.day)}（${d.week_chinese}）`),
        detail: block.map(d => `${parseInt(d.month)}/${parseInt(d.day)}${d.caption ? '/' + d.caption : ""}（${d.week_chinese}）`).join('、'),
        range: range,
        caption: info.caption
      }]
    });
  });
  let arr2 = [];
  let combKey = k => `${k.range}##${k.caption}`;
  let comb = new Map();
  for (let m of arr) {
    let key = combKey(m);
    if (!comb.has(key)) comb.set(key, { ...m, choices: [] });
    comb.get(key).choices.push(...m.choices);
  }
  arr2 = Array.from(comb.values());
  arr2.forEach(a => {
    a.choices.sort((x, y) => y.days - x.days || x.ask - y.ask);
    let mx = a.choices[0]?.days;
    let minask = Math.min(...a.choices.filter(x => x.days === mx).map(x => x.ask));
    a.choices = a.choices.filter(x => x.days == mx && x.ask == minask && x.days >= 4);
  });
  arr2 = arr2.filter(a => a.choices.length > 0);
  arr2.sort((a, b) => a.start.localeCompare(b.start));
  return arr2;
}

// ★最大化請假橫向表
function renderMaxVacTableRaw(bestVacationArr) {
  let html = '';
  for (const block of bestVacationArr) {
    let main = block.choices[0];
    let leaveSet = new Set(), dToInfo = {};
    let toMMDD = s => {
      let mm, dd;
      if (typeof s === 'string' && s.includes('/')) {
        let parts = s.split('/');
        mm = String(parseInt(parts[0], 10)).padStart(2, '0'), dd = String(parseInt(parts[1], 10)).padStart(2, '0');
        return mm + "/" + dd;
      }
      return s;
    };

    // 準備 caption 關鍵字陣列（ex: 春節、國慶、中秋等），可用 block.caption 拆分
    let holidayKeywords = block.caption.split(/、|；|,/).map(k => k.trim()).filter(Boolean);

    // build leaveSet
    main.askDates.forEach(dtstr => leaveSet.add(toMMDD(dtstr)));

    // 解析日期
    let first = main.detail.split('、')[0];
    let frags = first.match(/^(\d+)\/(\d+)/); if (!frags) continue;
    let m0 = frags[1], d0 = frags[2];
    let year = '2025', dt0 = new Date(`${year}/${m0}/${d0}`);
    if (!dt0 || isNaN(dt0.getTime())) continue;
    let dtStart = new Date(dt0), breaker = 0;
    while (dtStart.getDay() !== 6 && breaker++ < 7) dtStart.setDate(dtStart.getDate() - 1);
    if (breaker > 7) continue;

    // 依格子渲染
    let cellArr = [];
    for (let i = 0; i < 9; i++) {
      let dt = new Date(dtStart.getTime());
      dt.setDate(dt.getDate() + i);
      let mm = String(dt.getMonth() + 1).padStart(2, '0'), dd = String(dt.getDate()).padStart(2, '0');
      let dstr = `${mm}/${dd}`;
      // 找「該日」對應的 detailed info string
      let info = main.detail.split('、').find(s => s.startsWith(parseInt(mm) + '/' + parseInt(dd)));
      // 判斷顏色優先級
      let classStr;
      if (leaveSet.has(dstr)) classStr = "maxvac-leave";
      // 國定假判斷：如果該 info 中有 holidayKeywords 之中的任何關鍵字
      else if (info && holidayKeywords.some(kw => kw && info.includes(kw))) classStr = "maxvac-holiday";
      else if (dt.getDay() === 0 || dt.getDay() === 6) classStr = "maxvac-weekend";
      else classStr = "maxvac-normal";
      cellArr.push(`<td class="${classStr}">${parseInt(mm)}/${parseInt(dd)}</td>`);
    }
    let rowMonth = first.split('/')[0] + '月';
    html += `<tr class="text-center align-middle"><td>${rowMonth}</td><td>${block.caption}</td>`;
    html += `<td>${main.range}</td><td>${main.days}天</td>`;
    html += `<td>${main.askDates.length > 0 ? '請' + main.askDates.length + '休' + main.days + '</br>' + main.askDates.join('、')  : '不用請假'}</td>`;
    html += cellArr.join('');
    html += '</tr>';
  }
  document.getElementById('maxVacationTableBody').innerHTML = html;
}

async function loadCalendar(year) {
  let url = srcBase + `${year}.json`;
  let data = await fetch(url).then(r => r.json());
  let holidays = data.filter(d => d.isHoliday),
    makeups = data.filter(d =>
      (d.caption && (d.caption.includes("補行上班") || d.caption.includes("補班"))) ||
      (d.week_chinese == "六" && !d.isHoliday && d.caption)
    );
  document.getElementById('holidayList').innerHTML =
    `<li class="list-group-item fw-bold">放假日：${holidays.length}天</li>` +
    holidays.filter(d => d.caption).map(d =>
      `<li class="list-group-item holiday">
    <span class="date-fixed-width me-2">${String(d.month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}（${d.week_chinese}）</span>${d.caption}
    <span class="badge tag-holiday ms-2">假</span>
  </li>`).join("");
  document.getElementById('makeupList').innerHTML =
    makeups.length ?
      `<li class="list-group-item fw-bold">補班日：${makeups.length}天</li>` +
      makeups.map(d =>
        `<li class="list-group-item makeup">
  <span class="date-fixed-width me-2">${String(d.month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}（${d.week_chinese}）</span>${d.caption}
  <span class="badge tag-makeup ms-2">補班</span>
</li>`).join("")
      : "";
  let mcount = new Array(12).fill(0);
  holidays.forEach(d => mcount[getMonthIdx(d.month)]++);
  let max = Math.max(...mcount, 1);
  document.getElementById('barchart').innerHTML =
    mcount.map((c, i) =>
      `<div class="d-flex align-items-center mb-2">
    <span class="me-2" style="width:4em">${monthName(i + 1)}</span>
    <div class="month-bar me-2" style="width:${c / max * 85 + 5}%;min-width:10px"></div>
    <span class="text-primary fw-bold">${c ? c : ""}</span>
  </div>`
    ).join("");
  let blocks = findHolidayBlocks(data)
    .filter(block => block.length >= 2 && hasNationalHoliday(block) && !isWeekendBlock(block));
  blocks.sort((a, b) => a[0].date.localeCompare(b[0].date));
  let longbreaks = blocks.map(block => {
    let captions = [...new Set(block.map(d => d.caption).filter(Boolean))];
    let name = captions.length ? captions.join("、") + "連假" : "連續假期";
    let range = `${parseInt(block[0].month)}/${parseInt(block[0].day)} - ${parseInt(block[block.length - 1].month)}/${parseInt(block[block.length - 1].day)}`;
    let detail = block.map(d => `${parseInt(d.month)}/${parseInt(d.day)}（${d.week_chinese}${d.caption ? "/" + d.caption : ""}）`).join('、');
    let advice = "-";
    return { name, range, days: block.length, detail, advice, block_first: block[0].date };
  });
  longbreaks.sort((a, b) => a.block_first.localeCompare(b.block_first));
  document.querySelector("#longbreakTable thead tr").innerHTML =
    `<th>連假名稱</th><th>範圍</th><th>連休天數</th><th>詳細日期</th><th>請假攻略</th>`;
  document.querySelector("#longbreakTable tbody").innerHTML =
    longbreaks.length
      ? longbreaks.map(lj =>
        `<tr>
      <td>${lj.name}</td>
      <td>${lj.range}</td>
      <td>${lj.days}</td>
      <td>${lj.detail}</td>
      <td>${lj.advice || '-'}</td>
    </tr>`
      ).join("")
      : `<tr><td colspan=5>本年無連續假日</td></tr>`;
  let bestVacationArr = makeBestVacationAdvices(data, 4);
  renderMaxVacTableRaw(bestVacationArr);
  let vacHTML = `<ul class="mb-0">`;
  if (!bestVacationArr.length) vacHTML += `<li>本年暫無顯著「最大化」請假情境</li>`;
  bestVacationArr.forEach(block => {
    vacHTML += `<li class="mb-2"><b>${block.range}</b> <span class="text-info">[${block.caption}]</span><ul>`;
    block.choices.forEach(b => {
      let leave = b.ask ? `請${b.ask}天 (${b.askDates.join('、')})` : "不用請假";
      vacHTML += `<li>${leave}可休${b.days}天，${b.detail}</li>`;
    });
    vacHTML += `</ul></li>`;
  });
  vacHTML += `</ul>`;
  document.getElementById('bestVacationAdvice').innerHTML = vacHTML;
}
document.getElementById('copyrightYear').textContent = new Date().getFullYear();