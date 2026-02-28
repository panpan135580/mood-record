// 本地存储键名
const STORAGE_KEY = 'moodDiaryData';

// 工具函数：格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 工具函数：获取星期文本
function getWeekdayText(date) {
  const map = ['日', '一', '二', '三', '四', '五', '六'];
  return `星期${map[date.getDay()]}`;
}

// 读取本地存储
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch (e) {
    console.error('读取本地数据失败', e);
    return {};
  }
}

// 写入本地存储
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

document.addEventListener('DOMContentLoaded', function () {
  window.scrollTo(0, 0);

  const today = new Date();
  const todayStr = formatDate(today);
  const todayWeekday = getWeekdayText(today);

  const todayDisplay = document.getElementById('todayDisplay');
  const scoreButtonsContainer = document.getElementById('scoreButtons');
  const moodText = document.getElementById('moodText');
  const textCounter = document.getElementById('textCounter');
  const imageInput = document.getElementById('imageInput');
  const imagePreviewWrapper = document.getElementById('imagePreviewWrapper');
  const saveButton = document.getElementById('saveButton');
  const exportButton = document.getElementById('exportButton');
  const saveToast = document.getElementById('saveToast');
  const exportModal = document.getElementById('exportModal');
  const closeExportModal = document.getElementById('closeExportModal');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const calendarMonthLabel = document.getElementById('calendarMonthLabel');
  const calendarGrid = document.getElementById('calendarGrid');
  const jsonDataTextarea = document.getElementById('jsonDataTextarea');
  const copyJsonButton = document.getElementById('copyJsonButton');
  const importJsonButton = document.getElementById('importJsonButton');

  let currentSelectedScore = null;
  let currentImagesBase64 = []; // 保存当前页面中图片的 base64
  let chartInstance = null;
  let viewingDateStr = null; // 当前查看的日期（YYYY-MM-DD）
  let calendarYear = today.getFullYear();
  let calendarMonth = today.getMonth(); // 0-11

  todayDisplay.textContent = `${todayStr} ${todayWeekday}`;

  // 初始化评分按钮
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'score-button';
    btn.textContent = String(i);
    btn.dataset.score = String(i);
    btn.addEventListener('click', function () {
      if (saveButton.disabled) return;
      currentSelectedScore = parseInt(btn.dataset.score, 10);
      const all = scoreButtonsContainer.querySelectorAll('.score-button');
      all.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    scoreButtonsContainer.appendChild(btn);
  }

  // 文本输入限制与计数
  function updateTextCounter() {
    const maxLen = 500;
    let val = moodText.value;
    if (val.length > maxLen) {
      val = val.slice(0, maxLen);
      moodText.value = val;
    }
    const remaining = maxLen - val.length;
    textCounter.textContent = `还可输入 ${remaining} 字`;
  }

  moodText.addEventListener('input', updateTextCounter);

  function renderImagePreviews() {
    imagePreviewWrapper.innerHTML = '';
    const isToday = viewingDateStr === todayStr;
    currentImagesBase64.forEach((base64, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-preview-item';

      const img = document.createElement('img');
      img.src = base64;
      wrapper.appendChild(img);

      if (isToday) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'image-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          currentImagesBase64.splice(index, 1);
          renderImagePreviews();
        });
        wrapper.appendChild(delBtn);
      }

      imagePreviewWrapper.appendChild(wrapper);
    });
  }

  // 图片上传
  imageInput.addEventListener('change', function (event) {
    if (saveButton.disabled) {
      imageInput.value = '';
      return;
    }
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (files.length > 3) {
      alert('最多只能选择 3 张图片哦~');
      imageInput.value = '';
      return;
    }

    currentImagesBase64 = [];

    let loadedCount = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const base64 = e.target.result;
        currentImagesBase64.push(base64);

        loadedCount++;
        if (loadedCount === files.length) {
          renderImagePreviews();
          imageInput.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  });

  function setEditableForDate(isToday) {
    const allScoreButtons = scoreButtonsContainer.querySelectorAll('.score-button');
    allScoreButtons.forEach(btn => {
      btn.disabled = !isToday;
    });
    imageInput.disabled = !isToday;
    moodText.readOnly = !isToday;
    saveButton.disabled = !isToday;
  }

  // 加载某天的数据并更新界面
  function renderDate(dateStr) {
    const allData = loadData();
    const record = allData[dateStr];

    viewingDateStr = dateStr;

    const isToday = dateStr === todayStr;
    setEditableForDate(isToday);

    currentSelectedScore = record ? record.score || null : null;
    const allScoreButtons = scoreButtonsContainer.querySelectorAll('.score-button');
    allScoreButtons.forEach(btn => {
      const s = parseInt(btn.dataset.score, 10);
      if (s === currentSelectedScore) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    moodText.value = record ? record.text || '' : '';
    updateTextCounter();

    currentImagesBase64 = record && Array.isArray(record.images) ? record.images.slice() : [];
    renderImagePreviews();
  }

  // 默认加载今天
  renderDate(todayStr);

  // 保存按钮逻辑
  saveButton.addEventListener('click', function () {
    if (saveButton.disabled) return;
    if (!currentSelectedScore) {
      alert('请选择今日评分');
      return;
    }

    // 只允许当天保存
    if (viewingDateStr !== todayStr) {
      return;
    }

    const text = moodText.value || '';
    const allData = loadData();

    allData[todayStr] = {
      score: currentSelectedScore,
      text: text,
      images: currentImagesBase64.slice()
    };

    saveData(allData);
    showSaveToast();
    updateTrendChart(allData);
  });

  function showSaveToast() {
    saveToast.classList.remove('show');
    // 触发重绘以重新播放动画
    void saveToast.offsetWidth;
    saveToast.classList.add('show');
  }

  // 趋势图
  function buildLastNDaysLabelsAndData(allData, daysCount) {
    const labels = [];
    const data = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      labels.push(key.slice(5)); // 只显示 MM-DD
      const record = allData[key];
      if (record && typeof record.score === 'number') {
        data.push(record.score);
      } else {
        data.push(null);
      }
    }
    return { labels, data };
  }

  function initTrendChart() {
    const allData = loadData();
    const { labels, data } = buildLastNDaysLabelsAndData(allData, 30);
    const ctx = document.getElementById('trendChart').getContext('2d');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          fill: false,
          borderColor: '#ff8fb7',
          backgroundColor: '#ff8fb7',
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: '#ff8fb7',
          spanGaps: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.parsed.y;
                if (value == null) return '';
                return `评分：${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 6
            }
          },
          y: {
            min: 1,
            max: 10,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  function updateTrendChart(allData) {
    if (!chartInstance) {
      initTrendChart();
      return;
    }
    const { labels, data } = buildLastNDaysLabelsAndData(allData, 30);
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
  }

  initTrendChart();

  // 日历渲染
  function renderCalendar() {
    const allData = loadData();
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const firstWeekDay = firstDay.getDay(); // 0(日) - 6(六)
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    calendarMonthLabel.textContent = `${calendarYear}年${String(calendarMonth + 1).padStart(2, '0')}月`;
    calendarGrid.innerHTML = '';

    // 前置空格
    for (let i = 0; i < firstWeekDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-cell empty';
      calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calendarYear, calendarMonth, day);
      const dateStr = formatDate(d);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      cell.textContent = String(day);

      const record = allData[dateStr];
      if (record && typeof record.score === 'number') {
        cell.classList.add('has-record');
      }
      if (dateStr === todayStr) {
        cell.classList.add('today');
      }
      if (dateStr === viewingDateStr) {
        cell.classList.add('selected');
      }

      cell.dataset.date = dateStr;
      cell.addEventListener('click', function () {
        renderDate(dateStr);
        renderCalendar();
      });

      calendarGrid.appendChild(cell);
    }
  }

  prevMonthBtn.addEventListener('click', function () {
    calendarMonth -= 1;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', function () {
    calendarMonth += 1;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
  });

  renderCalendar();

  // 导出相关
  function openExportModal() {
    exportModal.classList.remove('hidden');
  }

  function closeExport() {
    exportModal.classList.add('hidden');
  }

  exportButton.addEventListener('click', openExportModal);
  closeExportModal.addEventListener('click', closeExport);
  exportModal.addEventListener('click', function (e) {
    if (e.target === exportModal) {
      closeExport();
    }
  });

  function getRangeDates(range) {
    const dates = [];
    const base = new Date();
    let days = 1;
    if (range === 'day') {
      days = 1;
    } else if (range === 'week') {
      days = 7;
    } else if (range === 'month') {
      days = 30;
    } else if (range === 'year') {
      days = 365;
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      dates.push(new Date(d.getTime()));
    }
    return dates;
  }

  function formatEntryForExport(dateObj, record) {
    const dateStr = formatDate(dateObj);
    const weekday = getWeekdayText(dateObj);
    const lines = [];
    lines.push(`${dateStr} ${weekday}`);
    lines.push(`评分：${record.score}`);
    lines.push('文字：');
    lines.push(record.text || '');
    lines.push('');
    lines.push('--------------------------');
    lines.push('');
    return lines.join('\n');
  }

  function exportRange(range) {
    const allData = loadData();
    const dates = getRangeDates(range);
    const parts = [];
    dates.forEach(d => {
      const key = formatDate(d);
      const record = allData[key];
      if (record) {
        parts.push(formatEntryForExport(d, record));
      }
    });

    if (!parts.length) {
      alert('所选时间范围内没有任何记录哦~');
      return;
    }

    const content = parts.join('\n');
    let fileLabel = '';
    if (range === 'day') fileLabel = '一天';
    else if (range === 'week') fileLabel = '一周';
    else if (range === 'month') fileLabel = '一个月';
    else if (range === 'year') fileLabel = '一年';

    const fileName = `心情记录_${fileLabel}_${todayStr}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const exportOptionButtons = document.querySelectorAll('.export-option-button');
  exportOptionButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const range = btn.dataset.range;
      if (range) exportRange(range);
    });
  });

  // 导出 PDF（通过打印窗口“保存为 PDF”）
  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function rangeLabel(range) {
    if (range === 'day') return '一天';
    if (range === 'week') return '一周';
    if (range === 'month') return '一个月';
    if (range === 'year') return '一年';
    return '';
  }

  function exportPdfRange(range) {
    const allData = loadData();
    const dates = getRangeDates(range);
    const records = [];
    dates.forEach(d => {
      const key = formatDate(d);
      const record = allData[key];
      if (record && typeof record.score === 'number') {
        records.push({ dateObj: d, key, record });
      }
    });

    if (!records.length) {
      alert('所选时间范围内没有任何记录哦~');
      return;
    }

    const title = `心情记录（${rangeLabel(range)}）`;
    const cardsHtml = records.map(({ dateObj, record }) => {
      const dateStr = formatDate(dateObj);
      const weekday = getWeekdayText(dateObj);
      const textHtml = escapeHtml(record.text || '').replaceAll('\n', '<br>');
      const images = Array.isArray(record.images) ? record.images : [];
      const imagesHtml = images.map(src => (
        `<div class="img"><img src="${src}" alt="image"></div>`
      )).join('');

      return `
        <section class="card">
          <div class="head">
            <div class="date">${dateStr} <span class="wk">${weekday}</span></div>
            <div class="score">评分 <span class="badge">${record.score}</span></div>
          </div>
          <div class="text">${textHtml || '<span class="muted">（无文字）</span>'}</div>
          ${images.length ? `<div class="imgs">${imagesHtml}</div>` : `<div class="muted img-empty">（无图片）</div>`}
        </section>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{
      --pink:#ff8fb7;
      --pink2:#ffe2ee;
      --text:#333;
      --muted:#8a6a79;
    }
    *{box-sizing:border-box;}
    body{
      margin:0;
      font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
      color:var(--text);
      background:linear-gradient(180deg,#ffe7f2 0%, #ffffff 55%, #ffe7f2 100%);
      padding:18px;
    }
    .wrap{max-width:820px;margin:0 auto;}
    .top{
      display:flex;align-items:flex-end;justify-content:space-between;gap:12px;
      margin-bottom:12px;
    }
    h1{
      margin:0;
      font-size:18px;
      color:#d95f8b;
      font-weight:700;
    }
    .meta{font-size:12px;color:var(--muted);}
    .card{
      background:#fff;
      border-radius:16px;
      padding:14px 16px;
      box-shadow:0 6px 16px rgba(217,95,139,.12);
      border:1px solid rgba(255,143,183,.25);
      margin:0 0 12px;
      break-inside:avoid;
      page-break-inside:avoid;
    }
    .head{
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      margin-bottom:10px;
    }
    .date{font-size:14px;font-weight:700;color:#c15c85;}
    .wk{font-weight:600;color:#b68aa2;margin-left:6px;}
    .score{font-size:13px;color:#c15c85;}
    .badge{
      display:inline-flex;align-items:center;justify-content:center;
      min-width:26px;height:22px;padding:0 8px;
      background:var(--pink);
      color:#fff;border-radius:999px;
      margin-left:6px;font-weight:800;
    }
    .text{
      font-size:13px;line-height:1.7;
      background:rgba(255,226,238,.45);
      border-radius:12px;
      padding:10px 12px;
      border:1px solid rgba(255,143,183,.22);
      word-break:break-word;
      white-space:normal;
    }
    .muted{color:var(--muted);}
    .imgs{
      margin-top:10px;
      display:flex;flex-wrap:wrap;gap:8px;
    }
    .img{
      width:140px;height:140px;
      border-radius:14px;overflow:hidden;
      background:var(--pink2);
      border:1px solid rgba(255,143,183,.22);
    }
    .img img{width:100%;height:100%;object-fit:cover;display:block;}
    .img-empty{margin-top:10px;font-size:12px;}
    .print-tip{
      margin:10px 0 14px;
      background:#fff;
      border:1px dashed rgba(255,143,183,.45);
      border-radius:14px;
      padding:10px 12px;
      font-size:12px;
      color:var(--muted);
    }
    .print-btn{
      display:inline-block;
      border:none;
      background:var(--pink);
      color:#fff;
      padding:8px 12px;
      border-radius:999px;
      cursor:pointer;
      font-size:12px;
      margin-left:8px;
    }
    @media print{
      body{background:#fff;padding:0;}
      .print-tip{display:none;}
      .card{box-shadow:none;border:1px solid #f2c6d8;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">导出日期：${escapeHtml(todayStr)} ${escapeHtml(todayWeekday)}</div>
    </div>
    <div class="print-tip">
      这里会弹出打印窗口，请选择“保存为 PDF”。如果没有自动弹出，请点
      <button class="print-btn" onclick="window.print()">打开打印</button>
    </div>
    ${cardsHtml}
  </div>
  <script>
    window.addEventListener('load', function(){
      setTimeout(function(){ window.print(); }, 300);
    });
  </script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('浏览器拦截了新窗口，请允许弹窗后再导出 PDF。');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const pdfButtons = document.querySelectorAll('.pdf-option-button');
  pdfButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const range = btn.dataset.pdfRange;
      exportPdfRange(range);
    });
  });

  // JSON 文本导入 / 导出（仅日期、评分、文字，不含图片）
  copyJsonButton.addEventListener('click', function () {
    const data = loadData();
    const stripped = {};
    for (const [date, record] of Object.entries(data)) {
      if (record && typeof record.score === 'number') {
        stripped[date] = {
          score: record.score,
          text: (record.text && String(record.text)) || ''
        };
      }
    }
    const jsonText = JSON.stringify(stripped);
    jsonDataTextarea.value = jsonText;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonText).catch(function () {});
    }
  });

  importJsonButton.addEventListener('click', function () {
    const text = (jsonDataTextarea.value || '').trim();
    if (!text) {
      alert('请先在上方文本框中粘贴 JSON 数据。');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      alert('JSON 格式不正确，请确认复制粘贴完整。');
      return;
    }
    if (!parsed || typeof parsed !== 'object') {
      alert('JSON 内容无效，期望是一个对象结构。');
      return;
    }

    // 只合并日期、评分、文字，保留本机已有图片
    const current = loadData();
    for (const [date, record] of Object.entries(parsed)) {
      if (record && typeof record.score === 'number') {
        const existing = current[date];
        current[date] = {
          score: record.score,
          text: (record.text && String(record.text)) || '',
          images: (existing && Array.isArray(existing.images)) ? existing.images : []
        };
      }
    }
    saveData(current);
    alert('导入成功！已合并日期、评分与文字（图片未包含在 JSON 中，本机原有图片保留）。');

    renderDate(todayStr);
    updateTrendChart(loadData());
    renderCalendar();
  });
});

