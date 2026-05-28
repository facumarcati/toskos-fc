const sortableHeaders = document.querySelectorAll(".sortable-header");

sortableHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const sortKey = header.dataset.sort;

    const section = header.closest(".product-list-section");

    const list = section.querySelector(".product-list");

    const rows = Array.from(list.querySelectorAll(".h2h-history-row"));

    const currentOrder = header.dataset.order || "desc";

    const newOrder = currentOrder === "desc" ? "asc" : "desc";

    sortableHeaders.forEach((h) => {
      h.dataset.order = "";
      h.classList.remove("active-sort");
    });

    header.dataset.order = newOrder;
    header.classList.add("active-sort");

    rows.sort((a, b) => {
      const aVal = Number(a.dataset[sortKey]);
      const bVal = Number(b.dataset[sortKey]);

      return newOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    rows.forEach((row, index) => {
      row.querySelector(".col-num").textContent = `${index + 1}`;

      list.appendChild(row);
    });
  });
});

const chartData = window.h2hChartData;

if (chartData && chartData.matches && chartData.matches.length) {
  const canvas = document.getElementById("h2hChart");

  if (canvas) {
    const ctx = canvas.getContext("2d");

    const ratio = window.devicePixelRatio || 1;

    const width = canvas.offsetWidth;
    const height = 180;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    ctx.scale(ratio, ratio);

    const paddingTop = 25;
    const paddingBottom = 35;
    const paddingLeft = 55;
    const paddingRight = 20;

    let progression = [0];
    let current = 0;

    chartData.matches
      .slice()
      .reverse()
      .forEach((match) => {
        const isWhite = match.teamOfA === "A";

        const goalsA = isWhite ? match.teamA : match.teamB;
        const goalsB = isWhite ? match.teamB : match.teamA;

        if (goalsA > goalsB) current++;
        else if (goalsA < goalsB) current--;

        progression.push(current);
      });

    const maxValue = Math.max(...progression, 2);
    const minValue = Math.min(...progression, -2);

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    function getX(i) {
      return paddingLeft + (i / (progression.length - 1)) * chartWidth;
    }

    function getY(v) {
      return (
        paddingTop + ((maxValue - v) / (maxValue - minValue)) * chartHeight
      );
    }

    ctx.strokeStyle = "rgba(255,255,255,.08)";

    ctx.lineWidth = 1;

    for (let i = minValue; i <= maxValue; i++) {
      const y = getY(i);

      ctx.beginPath();

      ctx.moveTo(paddingLeft, y);

      ctx.lineTo(width - paddingRight, y);

      ctx.stroke();
    }

    ctx.font = '12px "Josefin Sans", sans-serif';

    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.fillText(chartData.playerA, 8, getY(maxValue) + 4);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(chartData.playerB, 8, getY(minValue) + 4);

    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText("E", 8, getY(0) + 4);

    ctx.strokeStyle = "rgba(255,255,255,.18)";

    ctx.beginPath();

    ctx.moveTo(paddingLeft, getY(0));

    ctx.lineTo(width - paddingRight, getY(0));

    ctx.stroke();

    ctx.beginPath();

    progression.forEach((value, index) => {
      const x = getX(index);
      const y = getY(value);

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#facc15";

    ctx.lineWidth = 3;

    ctx.stroke();

    progression.forEach((value, index) => {
      const x = getX(index);
      const y = getY(value);

      ctx.beginPath();

      ctx.arc(x, y, 5, 0, Math.PI * 2);

      ctx.fillStyle = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : "#facc15";

      ctx.fill();

      ctx.font = '10px "Josefin Sans", sans-serif';

      ctx.textAlign = "center";

      ctx.fillStyle = "white";

      const label =
        value > 0 ? `${value}` : value < 0 ? `${Math.abs(value)}` : "0";

      ctx.fillText(label, x, y - 12);
    });

    ctx.strokeStyle = "rgba(255,255,255,.15)";

    ctx.lineWidth = 1;

    const axisY = height - paddingBottom + 8;

    ctx.beginPath();

    ctx.moveTo(paddingLeft, axisY);

    ctx.lineTo(width - paddingRight, axisY);

    ctx.stroke();

    ctx.font = '12px "Josefin Sans", sans-serif';

    ctx.fillStyle = "rgba(255,255,255,.55)";

    ctx.textAlign = "center";

    progression.forEach((_, index) => {
      const x = getX(index);

      ctx.beginPath();

      ctx.moveTo(x, axisY - 4);

      ctx.lineTo(x, axisY + 4);

      ctx.stroke();

      if (index >= 0) {
        ctx.fillText(index.toString(), x, axisY + 16);
      }
    });
  }
}
