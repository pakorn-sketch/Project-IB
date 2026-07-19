// =====================================================
// Dashboard Analytics
// =====================================================

let typeChart = null;
let subwhChart = null;
let agingChart = null;
let dashboardChartFilters = {
    type: "",
    subwh: "",
    aging: ""
};

function setDashboardChartFilter(filterName, value) {
    if (!Object.prototype.hasOwnProperty.call(dashboardChartFilters, filterName)) return;

    dashboardChartFilters[filterName] = dashboardChartFilters[filterName] === value ? "" : value;
    agingChartFilter = dashboardChartFilters.aging;
    applyFilters();
}

function clearDashboardChartFilters() {
    dashboardChartFilters = {
        type: "",
        subwh: "",
        aging: ""
    };
    agingChartFilter = "";
}

function getChartTheme() {
    const isDark = document.body.classList.contains("dark-mode");
    const styles = getComputedStyle(document.body);
    const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

    return {
        text: token("--ink-800", isDark ? "#E5E7EB" : "#334155"),
        tick: token("--ink-500", isDark ? "#CBD5E1" : "#64748B"),
        grid: token("--border", isDark ? "#334155" : "#E2E8F0"),
        tooltip: isDark ? "#0F172A" : "#2B2B2B",
        doughnutLabel: token("--ink-950", isDark ? "#F8FAFC" : "#0F172A"),
        animationDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700
    };
}

function loadCharts(data = filteredData) {
    destroyCharts();
    buildTypeChart(data);
    buildSubWHChart(data);
    buildAgingChart(data);
}

function destroyCharts() {
    if (typeChart) {
        typeChart.destroy();
        typeChart = null;
    }

    if (subwhChart) {
        subwhChart.destroy();
        subwhChart = null;
    }

    if (agingChart) {
        agingChart.destroy();
        agingChart = null;
    }
}

// =====================================================
// IB Type Doughnut
// =====================================================

function buildTypeChart(data) {
    const theme = getChartTheme();
    const validData = getValidRows(data, "Type");
    const count = {};

    validData.forEach(item => {
        const type = item["Type"].trim();
        count[type] = (count[type] || 0) + 1;
    });

    const labels = Object.keys(count);
    const values = Object.values(count);
    const colorMap = {
        "E-com IB": "#C8A2FF",
        "Extra IB": "#ff8c00",
        "Last Stock IB": "#F472B6",
        "New Store IB": "#7EDC95",
        "Normal IB": "#f1fb84",
        "Special IB": "#ff7d7d"
    };
    const colors = labels.map(label => colorMap[label] || "#D1D5DB");
    const canvas = document.getElementById("typeChart");

    if (!canvas) return;

    typeChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 16,
                hoverBorderWidth: 2,
                hoverBorderColor: "#ffffff"
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "74%",
            radius: "92%",
            onClick: (event, elements) => {
                if (elements.length === 0) return;

                setDashboardChartFilter("type", labels[elements[0].index]);
            },
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    color: theme.doughnutLabel,
                    font: {
                        weight: "bold",
                        size: 14
                    },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);

                        if (total === 0) return "";

                        const percent = ((value / total) * 100).toFixed(1);

                        return percent < 2 ? "" : percent + "%";
                    }
                },
                tooltip: {
                    backgroundColor: theme.tooltip,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        label(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percent = total === 0 ? 0 : ((value / total) * 100).toFixed(1);

                            return `${context.label} : ${value.toLocaleString()} (${percent}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: theme.animationDuration,
                easing: "easeOutQuart"
            }
        }
    });

    renderTypeLegend(labels, values, colors);
}

// =====================================================
// SUB WH Bar
// =====================================================

function buildSubWHChart(data) {
    const theme = getChartTheme();
    const validData = getValidRows(data, "SUB WH");
    const count = {};

    validData.forEach(item => {
        const subwh = String(item["SUB WH"]).trim();
        count[subwh] = (count[subwh] || 0) + 1;
    });

    const result = Object.entries(count)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    const sortedLabels = result.map(item => item.label);
    const sortedValues = result.map(item => item.value);
    const colorMap = {
        "C01MM": "#A8D8FF",
        "C01LY": "#FFC1E3",
        "IB Extra": "#4B4B4B"
    };
    const backgroundColors = sortedLabels.map(label => {
        const key = String(label).trim();

        return colorMap[key] || "#D1D5DB";
    });
    const canvas = document.getElementById("subwhChart");

    if (!canvas) return;

    subwhChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: sortedLabels,
            datasets: [{
                data: sortedValues,
                backgroundColor: backgroundColors,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            indexAxis: "y",
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length === 0) return;

                setDashboardChartFilter("subwh", sortedLabels[elements[0].index]);
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: theme.tick
                    }
                },
                x: {
                    beginAtZero: true,
                    grid: {
                        color: theme.grid
                    },
                    ticks: {
                        color: theme.tick
                    }
                }
            }
        }
    });

    renderSubWHLegend(sortedLabels, sortedValues, backgroundColors);
}

// =====================================================
// Aging Bar
// =====================================================

function buildAgingChart(data) {
    const theme = getChartTheme();
    const ranges = [
        "0-7",
        "8-14",
        "15-21",
        "22-28",
        "29-35",
        "36-42",
        "43-49",
        "50-56",
        "57+"
    ];
    const count = Object.fromEntries(ranges.map(range => [range, 0]));

    data.forEach(item => {
        const raw = String(item["Aging"] ?? "").trim();

        if (raw === "") return;

        const aging = Number(raw);

        if (isNaN(aging)) return;

        if (aging <= 7) count["0-7"]++;
        else if (aging <= 14) count["8-14"]++;
        else if (aging <= 21) count["15-21"]++;
        else if (aging <= 28) count["22-28"]++;
        else if (aging <= 35) count["29-35"]++;
        else if (aging <= 42) count["36-42"]++;
        else if (aging <= 49) count["43-49"]++;
        else if (aging <= 56) count["50-56"]++;
        else count["57+"]++;
    });

    const values = ranges.map(range => count[range]);
    const canvas = document.getElementById("agingChart");

    if (!canvas) return;

    agingChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ranges,
            datasets: [{
                data: values,
                barPercentage: 0.85,
                categoryPercentage: 0.90,
                borderRadius: 8,
                borderSkipped: false,
                backgroundColor: [
                    "#D1D5DB",
                    "#A7F3C0",
                    "#16A34A",
                    "#FDE68A",
                    "#FFD400",
                    "#FBD38D",
                    "#EA580C",
                    "#FCA5A5",
                    "#DC2626"
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length === 0) return;

                const selected = ranges[elements[0].index];

                setDashboardChartFilter("aging", selected);
            },
            layout: {
                padding: {
                    top: 20,
                    right: 10,
                    bottom: 30,
                    left: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: theme.tooltip,
                    callbacks: {
                        label(context) {
                            return context.raw.toLocaleString() + " IB";
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: theme.grid
                    },
                    ticks: {
                        color: theme.tick,
                        callback(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: theme.tick
                    }
                }
            },
            animation: {
                duration: theme.animationDuration,
                easing: "easeOutQuart"
            }
        },
        plugins: [{
            id: "valueLabel",
            afterDatasetsDraw(chart) {
                const { ctx } = chart;

                ctx.save();
                ctx.font = "bold 13px Poppins";
                ctx.fillStyle = theme.text;
                ctx.textAlign = "center";

                chart.getDatasetMeta(0).data.forEach((bar, index) => {
                    ctx.fillText(values[index].toLocaleString(), bar.x, bar.y - 10);
                });

                ctx.restore();
            }
        }]
    });

    renderAgingLegend(count);
}

// =====================================================
// Legends
// =====================================================

function renderTypeLegend(labels, values, colors) {
    const legend = document.getElementById("typeLegend");

    if (!legend) return;

    const items = labels
        .map((label, index) => ({
            label,
            value: values[index],
            color: colors[index]
        }))
        .sort((a, b) => b.value - a.value);

    legend.innerHTML = items.map(item => `
        <div class="legend-item chart-filter-option ${dashboardChartFilters.type === item.label ? "active" : ""}"
             data-dashboard-filter="type" data-filter-value="${escapeHtml(item.label)}" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:${item.color}"></span>
                <span class="legend-label">${item.label}</span>
            </div>
            <span class="legend-value">${item.value.toLocaleString()}</span>
        </div>
    `).join("");

    bindDashboardLegendFilters(legend);
}

function renderSubWHLegend(labels, values, colors) {
    const legend = document.getElementById("subwhLegend");

    if (!legend) return;

    legend.innerHTML = labels.map((label, index) => `
        <div class="legend-item chart-filter-option ${dashboardChartFilters.subwh === label ? "active" : ""}"
             data-dashboard-filter="subwh" data-filter-value="${escapeHtml(label)}" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:${colors[index]}"></span>
                <span class="legend-label">${label}</span>
            </div>
            <span class="legend-value">${values[index].toLocaleString()}</span>
        </div>
    `).join("");

    bindDashboardLegendFilters(legend);
}

function renderAgingLegend(count) {
    const legend = document.getElementById("agingLegend");

    if (!legend) return;

    const normal = count["0-7"] + count["8-14"] + count["15-21"];
    const follow = count["22-28"] + count["29-35"] + count["36-42"];
    const urgent = count["43-49"] + count["50-56"] + count["57+"];

    legend.innerHTML = `
        <div class="legend-item chart-filter-option ${dashboardChartFilters.aging === "0-21" ? "active" : ""}"
             data-dashboard-filter="aging" data-filter-value="0-21" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#22C55E"></span>
                <span class="legend-label">Normal (0-21)</span>
            </div>
            <span class="legend-value">${normal.toLocaleString()}</span>
        </div>

        <div class="legend-item chart-filter-option ${dashboardChartFilters.aging === "22-42" ? "active" : ""}"
             data-dashboard-filter="aging" data-filter-value="22-42" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#FFD400"></span>
                <span class="legend-label">Need Follow (22-42)</span>
            </div>
            <span class="legend-value">${follow.toLocaleString()}</span>
        </div>

        <div class="legend-item chart-filter-option ${dashboardChartFilters.aging === "43+" ? "active" : ""}"
             data-dashboard-filter="aging" data-filter-value="43+" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#DC2626"></span>
                <span class="legend-label">Urgent (43+)</span>
            </div>
            <span class="legend-value">${urgent.toLocaleString()}</span>
        </div>
    `;

    bindDashboardLegendFilters(legend);
}

function bindDashboardLegendFilters(container) {
    container.querySelectorAll("[data-dashboard-filter]").forEach(item => {
        const activate = () => {
            setDashboardChartFilter(item.dataset.dashboardFilter, item.dataset.filterValue);
        };

        item.addEventListener("click", activate);
        item.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
            }
        });
    });
}

// =====================================================
// Utilities
// =====================================================

function getValidRows(data, field) {
    return data.filter(row => {
        const value = row[field];

        return (
            value !== undefined &&
            value !== null &&
            value.toString().trim() !== ""
        );
    });
}
