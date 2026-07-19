(function () {
    const FILTERS = [
        { id: "typeFilter", label: "Type" },
        { id: "subwhFilter", label: "SUB WH" },
        { id: "storeFilter", label: "Store" },
        { id: "remarkFilter", label: "Remark" },
        { id: "agingFilter", label: "Aging" }
    ];

    let instances = [];

    window.buildPowerBIFilters = function () {
        destroyPowerBIFilters();

        instances = FILTERS
            .map(filter => createPowerBIFilter(filter))
            .filter(Boolean);
    };

    window.destroyPowerBIFilters = function () {
        instances.forEach(instance => instance.destroy());
        instances = [];

        document.removeEventListener("click", closeAllOnOutsideClick);
    };

    window.syncPowerBIFilters = function () {
        instances.forEach(instance => instance.sync());
    };

    window.clearPowerBIFilters = function () {
        instances.forEach(instance => instance.clear());
        closeAllOnOutsideClick();
    };

    function createPowerBIFilter(config) {
        const select = document.getElementById(config.id);

        if (!select) return null;

        select.setAttribute("multiple", "multiple");

        const wrapper = document.createElement("div");
        wrapper.className = "pbi-filter";
        wrapper.dataset.filterId = config.id;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "pbi-filter-button";
        button.innerHTML = `
            <span class="pbi-filter-label"></span>
            <span class="pbi-filter-count" hidden></span>
            <span class="pbi-filter-chevron" aria-hidden="true">▾</span>
        `;

        const panel = document.createElement("div");
        panel.className = "pbi-filter-panel";
        panel.innerHTML = `
            <input class="pbi-filter-search" type="text" placeholder="Search ${config.label}">
            <div class="pbi-filter-actions">
                <button type="button" class="pbi-filter-action" data-action="all">Select all</button>
                <button type="button" class="pbi-filter-action" data-action="clear">Clear</button>
            </div>
            <div class="pbi-filter-options"></div>
        `;

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(button);
        wrapper.appendChild(panel);

        const search = panel.querySelector(".pbi-filter-search");
        const optionsEl = panel.querySelector(".pbi-filter-options");
        const labelEl = button.querySelector(".pbi-filter-label");
        const countEl = button.querySelector(".pbi-filter-count");

        function renderOptions() {
            const keyword = search.value.toLowerCase().trim();
            const options = Array.from(select.options)
                .filter(option => option.value !== "")
                .filter(option => option.textContent.toLowerCase().includes(keyword));

            if (options.length === 0) {
                optionsEl.innerHTML = `<div class="pbi-filter-empty">No results</div>`;
                return;
            }

            optionsEl.innerHTML = options.map(option => `
                <label class="pbi-filter-option">
                    <input type="checkbox" value="${escapeHtml(option.value)}" ${option.selected ? "checked" : ""}>
                    <span>${escapeHtml(option.textContent)}</span>
                </label>
            `).join("");
        }

        function syncLabel() {
            const selected = Array.from(select.selectedOptions);

            if (selected.length === 0) {
                labelEl.textContent = `All ${config.label}`;
                countEl.hidden = true;
                countEl.textContent = "";
                return;
            }

            labelEl.textContent = selected.length === 1
                ? selected[0].textContent
                : `${selected.length} selected`;
            countEl.hidden = false;
            countEl.textContent = selected.length;
        }

        function sync() {
            syncLabel();
            renderOptions();
        }

        function setSelected(value, checked) {
            const option = Array.from(select.options).find(item => item.value === value);

            if (option) {
                option.selected = checked;
                select.dispatchEvent(new Event("change", { bubbles: true }));
            }

            sync();
        }

        button.addEventListener("click", event => {
            event.stopPropagation();
            closeAllExcept(wrapper);
            wrapper.classList.toggle("open");
            search.focus();
        });

        search.addEventListener("input", renderOptions);

        optionsEl.addEventListener("change", event => {
            if (event.target.matches("input[type='checkbox']")) {
                setSelected(event.target.value, event.target.checked);
            }
        });

        panel.addEventListener("click", event => {
            event.stopPropagation();

            const action = event.target.dataset.action;
            const options = Array.from(select.options).filter(option => option.value !== "");

            if (action === "all") {
                options.forEach(option => {
                    option.selected = true;
                });
                select.dispatchEvent(new Event("change", { bubbles: true }));
                sync();
            }

            if (action === "clear") {
                options.forEach(option => {
                    option.selected = false;
                });
                select.dispatchEvent(new Event("change", { bubbles: true }));
                sync();
            }
        });

        select.addEventListener("change", sync);
        document.addEventListener("click", closeAllOnOutsideClick);

        sync();

        return {
            sync,
            clear() {
                Array.from(select.options).forEach(option => {
                    option.selected = false;
                });
                search.value = "";
                select.dispatchEvent(new Event("change", { bubbles: true }));
                sync();
            },
            destroy() {
                wrapper.parentNode.insertBefore(select, wrapper);
                wrapper.remove();
            }
        };
    }

    function closeAllOnOutsideClick() {
        document.querySelectorAll(".pbi-filter.open").forEach(filter => {
            filter.classList.remove("open");
        });
    }

    function closeAllExcept(activeFilter) {
        document.querySelectorAll(".pbi-filter.open").forEach(filter => {
            if (filter !== activeFilter) {
                filter.classList.remove("open");
            }
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();
