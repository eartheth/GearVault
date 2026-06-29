        // ========================================================
        // CONFIGURATION: Hardcode your Supabase credentials here
        // ========================================================
        const SUPABASE_URL = "https://bgvfjygpdcgcklfabjom.supabase.co";
        const SUPABASE_KEY = "sb_publishable_ltcwyK9IDa-__0E2bFNsRA_hryjLZh8";

        // Core App State
        let supabaseClient = null;
        let html5QrScanner = null;

        const state = {
            cases: [],
            items: [],
            maintenance: [],
            scanHistory: [],
            activeView: 'dashboard'
        };

        // DOM elements
        const loader = document.getElementById('loader-overlay');
        const emptyDbNotice = document.getElementById('empty-db-notice');

        // Navigation elements
        const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
        const viewPanels = document.querySelectorAll('.view-panel');
        const pageHeading = document.getElementById('page-heading');

        // Initial setup
        window.addEventListener('DOMContentLoaded', async () => {
            initApp();
        });

        // Initialize connection
        async function initApp() {
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                showToast("Configuration Error: SUPABASE_URL and SUPABASE_KEY variables are empty.", "danger");
                const indicator = document.getElementById('settings-conn-indicator');
                if (indicator) {
                    indicator.innerText = "Status: Configuration missing (URL/Key variables empty)";
                    indicator.style.color = "var(--danger)";
                }
                loader.classList.add('hidden');
                return;
            }

            const connected = await connectSupabase(SUPABASE_URL, SUPABASE_KEY);
            loader.classList.add('hidden');

            if (!connected) {
                showToast("Connection failed. Please check your Supabase credentials in the source code.", "danger");
            }
        }

        // Connect client
        async function connectSupabase(url, key) {
            try {
                const client = supabase.createClient(url, key);

                // Test query to verify connection and credentials
                const { data, error } = await client.from('cases').select('id').limit(1);

                if (error) {
                    throw error;
                }

                supabaseClient = client;

                // Set Header Badge Indicator
                const syncBtn = document.getElementById('btn-sync-trigger');
                syncBtn.classList.add('connected');
                document.getElementById('sync-status-txt').innerText = "Connected";

                const indicator = document.getElementById('settings-conn-indicator');
                if (indicator) {
                    indicator.innerText = "Status: Connected to Supabase";
                    indicator.style.color = "var(--success)";
                }

                // Refresh Database records
                await loadDatabase();
                return true;
            } catch (err) {
                console.error("Connection failed:", err);
                const errMsg = err.message || err.details || "Check your URL and key details.";

                const indicator = document.getElementById('settings-conn-indicator');
                if (indicator) {
                    indicator.innerText = "Status: Connection failed. " + errMsg;
                    indicator.style.color = "var(--danger)";
                }

                const syncBtn = document.getElementById('btn-sync-trigger');
                syncBtn.classList.remove('connected');
                document.getElementById('sync-status-txt').innerText = "Connection Error";
                return false;
            }
        }

        // Refresh app data from Supabase
        async function loadDatabase() {
            if (!supabaseClient) return;

            try {
                // Fetch cases
                const { data: casesData, error: casesErr } = await supabaseClient
                    .from('cases')
                    .select('*')
                    .order('id');
                if (casesErr) throw casesErr;

                // Fetch items
                const { data: itemsData, error: itemsErr } = await supabaseClient
                    .from('items')
                    .select('*')
                    .order('id');
                if (itemsErr) throw itemsErr;

                // Fetch maintenance
                const { data: maintData, error: maintErr } = await supabaseClient
                    .from('maintenance')
                    .select('*')
                    .order('due_date');
                if (maintErr) throw maintErr;

                // Fetch scan history
                const { data: histData, error: histErr } = await supabaseClient
                    .from('scan_history')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(20);
                if (histErr) throw histErr;

                state.cases = casesData || [];
                state.items = itemsData || [];
                state.maintenance = maintData || [];
                state.scanHistory = histData || [];

                // Display database empty notice if cases is 0
                if (state.cases.length === 0) {
                    emptyDbNotice.style.display = "flex";
                } else {
                    emptyDbNotice.style.display = "none";
                }

                updateUI();
                populateDropdowns();
            } catch (err) {
                console.error("Data fetch failed:", err);
                showToast("Failed to fetch database: " + err.message, "danger");
            }
        }

        // Trigger manual Sync
        document.getElementById('btn-sync-trigger').addEventListener('click', async () => {
            if (!supabaseClient) {
                onboarding.classList.remove('hidden');
                return;
            }
            showLoading(true);
            await loadDatabase();
            showLoading(false);
            showToast("Database tables synced successfully!", "success");
        });

        // Search Input Handlers
        document.getElementById('search-input').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            runGlobalSearch(query);
        });

        function runGlobalSearch(query) {
            if (!query) {
                // Return views to default loaded state
                updateUI();
                return;
            }

            // If we are searching, we will filter the elements in the active view
            if (state.activeView === 'dashboard') {
                // Filter cases, missing, and maintenance lists based on query
                renderDashboardCases(state.cases.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)));
                renderDashboardMissing(state.items.filter(i => i.status === 'Missing' && (i.name.toLowerCase().includes(query) || i.id.toLowerCase().includes(query))));
                renderDashboardMaintenance(state.maintenance.filter(m => m.item_name.toLowerCase().includes(query) || m.task.toLowerCase().includes(query)));
            } else if (state.activeView === 'cases') {
                renderCasesGrid(state.cases.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)));
            } else if (state.activeView === 'equipment') {
                renderEquipmentTable(state.items.filter(i => i.name.toLowerCase().includes(query) || i.id.toLowerCase().includes(query) || (i.serial_number && i.serial_number.toLowerCase().includes(query))));
            } else if (state.activeView === 'missing') {
                renderMissingTable(state.items.filter(i => i.status === 'Missing' && (i.name.toLowerCase().includes(query) || i.id.toLowerCase().includes(query))));
            } else if (state.activeView === 'maintenance') {
                renderMaintenanceTable(state.maintenance.filter(m => m.item_name.toLowerCase().includes(query) || m.task.toLowerCase().includes(query)));
            } else if (state.activeView === 'history') {
                renderHistoryTable(state.scanHistory.filter(h => h.case_name.toLowerCase().includes(query) || h.case_id.toLowerCase().includes(query)));
            }
        }

        // Toggle Loader
        function showLoading(show) {
            if (show) {
                loader.classList.remove('hidden');
            } else {
                loader.classList.add('hidden');
            }
        }

        // Navigation Menu Switchers
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                if (view) {
                    switchView(view);
                    // Close sidebar on mobile
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
        });

        // Hamburger Menu Buttons
        document.getElementById('btn-open-menu').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('active');
        });
        document.getElementById('btn-close-menu').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
        });

        function switchView(viewName) {
            state.activeView = viewName;

            // Clear search bar on view switch
            document.getElementById('search-input').value = "";

            // Toggle active menu states
            menuItems.forEach(item => {
                if (item.getAttribute('data-view') === viewName) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Toggle view panels
            viewPanels.forEach(panel => {
                if (panel.id === `view-${viewName}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Update page header title
            const viewTitleMap = {
                'dashboard': 'Dashboard',
                'cases': 'Cases Vault',
                'equipment': 'Equipment Catalog',
                'missing': 'Missing Items Checklist',
                'maintenance': 'Maintenance Center',
                'history': 'Scan Activity Log',
                'settings': 'System Settings'
            };
            pageHeading.innerText = viewTitleMap[viewName] || 'GearVault';

            // Re-render views
            updateUI();
        }

        // Helper functions for dynamic UI updates
        function updateUI() {
            // Stats calculations
            const totalEq = state.items.length;
            const totalCases = state.cases.length;
            const missingCount = state.items.filter(i => i.status === 'Missing').length;
            const maintOverdue = state.maintenance.filter(m => m.status === 'OVERDUE').length;
            const maintTotal = state.maintenance.length;

            // Badges
            document.getElementById('badge-missing').innerText = missingCount;
            document.getElementById('badge-missing').style.display = missingCount > 0 ? "inline-block" : "none";
            document.getElementById('badge-maintenance').innerText = maintOverdue;
            document.getElementById('badge-maintenance').style.display = maintOverdue > 0 ? "inline-block" : "none";

            // Stats row cards
            document.getElementById('stat-total-equipment').innerText = totalEq;
            document.getElementById('stat-total-cases-sub').innerText = `across ${totalCases} cases`;
            document.getElementById('stat-total-cases').innerText = totalCases;
            document.getElementById('stat-missing-items').innerText = missingCount;
            document.getElementById('stat-maintenance').innerText = maintTotal;
            document.getElementById('stat-maintenance-overdue').innerText = `${maintOverdue} overdue`;

            if (state.scanHistory.length > 0) {
                const lastLog = state.scanHistory[0];
                const lastDate = new Date(lastLog.timestamp);

                // Formatted date output like "Today 18:34"
                const today = new Date();
                let timeStr = "";
                if (lastDate.toDateString() === today.toDateString()) {
                    timeStr = "Today " + lastDate.toTimeString().substring(0, 5);
                } else {
                    timeStr = lastDate.toLocaleDateString() + " " + lastDate.toTimeString().substring(0, 5);
                }

                document.getElementById('stat-last-scan-time').innerText = timeStr;
                document.getElementById('stat-last-scan-case').innerText = `${lastLog.case_id} — ${lastLog.case_name || 'Case'}`;
            } else {
                document.getElementById('stat-last-scan-time').innerText = "N/A";
                document.getElementById('stat-last-scan-case').innerText = "No logs recorded";
            }

            // Render specific panel lists based on current active view
            if (state.activeView === 'dashboard') {
                renderDashboardCases(state.cases);
                renderDashboardMissing(state.items.filter(i => i.status === 'Missing'));
                renderDashboardMaintenance(state.maintenance);
                renderDashboardScans(state.scanHistory);
            } else if (state.activeView === 'cases') {
                renderCasesGrid(state.cases);
            } else if (state.activeView === 'equipment') {
                renderEquipmentTable(state.items);
            } else if (state.activeView === 'missing') {
                renderMissingTable(state.items.filter(i => i.status === 'Missing'));
            } else if (state.activeView === 'maintenance') {
                renderMaintenanceTable(state.maintenance);
            } else if (state.activeView === 'history') {
                renderHistoryTable(state.scanHistory);
            }
        }

        // Render Dashboard: Recent Scans
        function renderDashboardScans(logs) {
            const container = document.getElementById('dashboard-recent-scans');
            container.innerHTML = "";
            if (logs.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-steel); font-size: 13px;">No scans recorded yet. Use Quick Scan to log scans.</div>`;
                return;
            }

            logs.slice(0, 5).forEach(log => {
                const date = new Date(log.timestamp);
                const hrsStr = date.toTimeString().substring(0, 5);

                // status pill mapping
                let badgeClass = "green";
                if (log.status.includes("MISSING")) badgeClass = "amber";
                if (log.status.includes("2") || log.status.includes("3") || log.status.includes("4")) badgeClass = "red";

                // dot color mapping
                let dotClass = "";
                if (log.status === "ALL PRESENT") dotClass = "";
                else if (log.status.includes("1")) dotClass = "missing";
                else dotClass = "danger";

                const caseItemsCount = state.items.filter(i => i.case_id === log.case_id).length;

                container.innerHTML += `
                    <div class="list-item" onclick="openCaseDrawer('${log.case_id}')" style="cursor: pointer;">
                        <div class="list-item-main">
                            <div class="status-dot ${dotClass}"></div>
                            <div class="item-meta">
                                <span class="item-title">${log.case_id} — ${log.case_name || 'Case Detail'}</span>
                                <span class="item-subtitle">${log.case_id} • ${caseItemsCount} items</span>
                                <div class="item-badges">
                                    <span class="badge-pill ${badgeClass}">${log.status}</span>
                                </div>
                            </div>
                        </div>
                        <div class="item-right">
                            <span class="timestamp">${hrsStr}</span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Dashboard: Missing items panel
        function renderDashboardMissing(items) {
            const container = document.getElementById('dashboard-missing-items');
            container.innerHTML = "";
            if (items.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--success); font-size: 13px; font-weight: 600;">✓ All equipment present and accounted for</div>`;
                return;
            }

            items.slice(0, 5).forEach(item => {
                const caseObj = state.cases.find(c => c.id === item.case_id);
                const caseName = caseObj ? caseObj.name : 'Unknown Case';
                container.innerHTML += `
                    <div class="list-item">
                        <div class="list-item-main">
                            <div class="status-dot danger"></div>
                            <div class="item-meta">
                                <span class="item-title">${item.name}</span>
                                <span class="item-subtitle">${item.case_id} — ${caseName} • ${item.layer}</span>
                            </div>
                        </div>
                        <div class="item-right">
                            <span class="right-number negative">-1</span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Dashboard: Cases list
        function renderDashboardCases(cases) {
            const container = document.getElementById('dashboard-cases-list');
            container.innerHTML = "";
            if (cases.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-steel); font-size: 13px;">No cases registered.</div>`;
                return;
            }

            cases.slice(0, 5).forEach(c => {
                const caseItems = state.items.filter(i => i.case_id === c.id);
                const missingInCase = caseItems.filter(i => i.status === 'Missing').length;

                let badge = `<span class="badge-pill green">ALL PRESENT</span>`;
                if (missingInCase > 0) {
                    badge = `<span class="badge-pill amber">${missingInCase} MISSING</span>`;
                }

                container.innerHTML += `
                    <div class="list-item" onclick="openCaseDrawer('${c.id}')" style="cursor: pointer;">
                        <div class="list-item-main">
                            <span class="case-code">${c.id}</span>
                            <div class="item-meta">
                                <span class="item-title">${c.name}</span>
                                <span class="item-subtitle">${caseItems.length} items</span>
                            </div>
                        </div>
                        <div class="item-right">
                            ${badge}
                        </div>
                    </div>
                `;
            });
        }

        // Render Dashboard: Maintenance summary list
        function renderDashboardMaintenance(records) {
            const container = document.getElementById('dashboard-maintenance-list');
            container.innerHTML = "";
            if (records.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-steel); font-size: 13px;">No active maintenance jobs.</div>`;
                return;
            }

            records.slice(0, 5).forEach(r => {
                let badgeClass = "steel";
                if (r.status === 'OVERDUE') badgeClass = "red";
                if (r.status === 'DUE SOON') badgeClass = "amber";

                container.innerHTML += `
                    <div class="list-item" onclick="switchView('maintenance')" style="cursor: pointer;">
                        <div class="list-item-main">
                            <div class="item-meta">
                                <span class="item-title">${r.item_name}</span>
                                <span class="item-subtitle">${r.task} • Due: ${r.due_date}</span>
                            </div>
                        </div>
                        <div class="item-right">
                            <span class="badge-pill ${badgeClass}">${r.status}</span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Cases: Case Cards
        function renderCasesGrid(cases) {
            const container = document.getElementById('full-cases-grid');
            container.innerHTML = "";

            cases.forEach(c => {
                const caseItems = state.items.filter(i => i.case_id === c.id);
                const missingInCase = caseItems.filter(i => i.status === 'Missing').length;

                let badge = `<span class="badge-pill green">ALL PRESENT</span>`;
                if (missingInCase > 0) {
                    badge = `<span class="badge-pill red">${missingInCase} MISSING</span>`;
                }

                container.innerHTML += `
                    <div class="case-card" onclick="openCaseDrawer('${c.id}')">
                        <div class="case-card-header">
                            <span class="case-code">${c.id}</span>
                            ${badge}
                        </div>
                        <div>
                            <h3 class="case-card-title">${c.name}</h3>
                            <p class="case-card-body">${c.description || 'No description provided.'}</p>
                        </div>
                        <div class="case-card-footer">
                            <span class="item-subtitle">${caseItems.length} items registered</span>
                            <span style="font-size: 12px; color: var(--accent-amber); font-weight: 700;">Open drawer →</span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Equipment Catalog Table
        function renderEquipmentTable(items) {
            const container = document.getElementById('equipment-table-body');
            container.innerHTML = "";
            if (items.length === 0) {
                container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-steel); padding: 30px 0;">No items found.</td></tr>`;
                return;
            }

            items.forEach(i => {
                const caseObj = state.cases.find(c => c.id === i.case_id);
                const caseName = caseObj ? caseObj.name : 'Unassigned';

                let statusBadge = `<span class="badge-pill green">Present</span>`;
                if (i.status === 'Missing') statusBadge = `<span class="badge-pill red">Missing</span>`;
                if (i.status === 'Maintenance') statusBadge = `<span class="badge-pill amber">Maintenance</span>`;

                container.innerHTML += `
                    <tr>
                        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 500;">${i.id}</td>
                        <td style="font-weight: 600;">${i.name}</td>
                        <td>${caseName} <span class="item-subtitle">(${i.case_id || 'N/A'})</span></td>
                        <td>${i.layer}</td>
                        <td>${statusBadge}</td>
                        <td style="font-family: 'JetBrains Mono', monospace; font-size: 13px;">${i.serial_number || '—'}</td>
                        <td style="text-align: right;">
                            <div class="table-actions">
                                <button class="action-icon-btn" onclick="openEditItemModal('${i.id}')" title="Edit Item">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="action-icon-btn delete-btn" onclick="deleteItem('${i.id}')" title="Delete Item">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Render Missing Table View
        function renderMissingTable(items) {
            const container = document.getElementById('missing-table-body');
            container.innerHTML = "";
            if (items.length === 0) {
                container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--success); font-weight: 600; padding: 30px 0;">✓ All registered items are accounted for.</td></tr>`;
                return;
            }

            items.forEach(i => {
                const caseObj = state.cases.find(c => c.id === i.case_id);
                const caseName = caseObj ? caseObj.name : 'Unknown';

                container.innerHTML += `
                    <tr>
                        <td style="font-family: 'JetBrains Mono', monospace;">${i.id}</td>
                        <td style="font-weight: 600;">${i.name}</td>
                        <td>${caseName} (${i.case_id})</td>
                        <td>${i.layer}</td>
                        <td style="font-family: 'JetBrains Mono', monospace; font-size: 13px;">${i.serial_number || '—'}</td>
                        <td style="text-align: right;">
                            <button class="btn-sync" onclick="resolveSingleMissing('${i.id}')" style="padding: 6px 12px; font-size: 12px; border-color: rgba(16, 185, 129, 0.3); color: var(--success); background: rgba(16, 185, 129, 0.05);">
                                Mark Found
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // Render Maintenance Center Table
        function renderMaintenanceTable(records) {
            const container = document.getElementById('maintenance-table-body');
            container.innerHTML = "";
            if (records.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-steel); padding: 30px 0;">No active maintenance items scheduled.</td></tr>`;
                return;
            }

            records.forEach(r => {
                let badgeClass = "steel";
                if (r.status === 'OVERDUE') badgeClass = "red";
                if (r.status === 'DUE SOON') badgeClass = "amber";

                container.innerHTML += `
                    <tr>
                        <td style="font-weight: 600;">${r.item_name} <span class="item-subtitle">(${r.item_id})</span></td>
                        <td>${r.task}</td>
                        <td><span class="badge-pill ${badgeClass}">${r.status}</span></td>
                        <td style="font-family: 'JetBrains Mono', monospace;">${r.due_date}</td>
                        <td style="text-align: right;">
                            <div class="table-actions" style="justify-content: flex-end;">
                                <button class="btn-sync" onclick="completeMaintenance('${r.id}', '${r.item_id}')" style="padding: 6px 12px; font-size: 12px; border-color: rgba(16, 185, 129, 0.3); color: var(--success); background: rgba(16, 185, 129, 0.05); margin-right: 6px;">
                                    Mark Done
                                </button>
                                <button class="action-icon-btn" onclick="openEditMaintModal('${r.id}')" title="Edit Job">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="action-icon-btn delete-btn" onclick="deleteMaintenance('${r.id}')" title="Delete Job">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Render Chronological History Table
        function renderHistoryTable(logs) {
            const container = document.getElementById('history-table-body');
            container.innerHTML = "";
            if (logs.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-steel); padding: 30px 0;">No scan activity logged yet.</td></tr>`;
                return;
            }

            logs.forEach(log => {
                const date = new Date(log.timestamp);
                const fullTimeStr = date.toLocaleDateString() + " " + date.toTimeString().substring(0, 8);

                let badgeClass = "green";
                if (log.status.includes("MISSING")) badgeClass = "amber";
                if (log.status.includes("2") || log.status.includes("3") || log.status.includes("4")) badgeClass = "red";

                container.innerHTML += `
                    <tr>
                        <td style="font-family: 'JetBrains Mono', monospace;">${fullTimeStr}</td>
                        <td style="font-family: 'JetBrains Mono', monospace; font-weight: 500;">${log.case_id}</td>
                        <td style="font-weight: 600;">${log.case_name || 'Case Record'}</td>
                        <td><span class="badge-pill ${badgeClass}">${log.status}</span></td>
                        <td style="font-weight: 500;">${log.operator || 'SeminarDD'}</td>
                    </tr>
                `;
            });
        }

        // Dropdown populator for Forms
        function populateDropdowns() {
            // 1. Cases selection dropdowns
            const filterCase = document.getElementById('filter-case');
            const itemCaseSelect = document.getElementById('item-case-select');

            // Keep default option
            filterCase.innerHTML = `<option value="">All Cases</option>`;
            itemCaseSelect.innerHTML = `<option value="">-- Choose Case --</option>`;

            state.cases.forEach(c => {
                filterCase.innerHTML += `<option value="${c.id}">${c.id} — ${c.name}</option>`;
                itemCaseSelect.innerHTML += `<option value="${c.id}">${c.id} — ${c.name}</option>`;
            });

            // 2. Maintenance item selection dropdown
            const maintItemSelect = document.getElementById('maint-item-select');
            maintItemSelect.innerHTML = `<option value="">-- Choose Item --</option>`;
            state.items.forEach(i => {
                maintItemSelect.innerHTML += `<option value="${i.id}">${i.name} (${i.id})</option>`;
            });

            // 3. Scan simulator list
            const scanSimSelect = document.getElementById('scan-sim-select');
            scanSimSelect.innerHTML = `<option value="">Choose item to simulate scanning...</option>`;
            state.items.forEach(i => {
                scanSimSelect.innerHTML += `<option value="${i.id}">${i.name} (SN: ${i.serial_number || 'None'})</option>`;
            });
        }

        // Equipment List Filters
        function filterItems() {
            const caseId = document.getElementById('filter-case').value;
            const layer = document.getElementById('filter-layer').value;
            const status = document.getElementById('filter-status').value;

            let filtered = state.items;

            if (caseId) filtered = filtered.filter(i => i.case_id === caseId);
            if (layer) filtered = filtered.filter(i => i.layer === layer);
            if (status) filtered = filtered.filter(i => i.status === status);

            renderEquipmentTable(filtered);
        }

        // Drawer slider case actions
        async function openCaseDrawer(caseId) {
            const c = state.cases.find(x => x.id === caseId);
            if (!c) return;

            document.getElementById('drawer-case-code').innerText = c.id;
            document.getElementById('drawer-case-name').innerText = c.name;

            // Bind edit case button in drawer
            document.getElementById('btn-edit-case-drawer').onclick = () => {
                closeDrawer();
                openEditCaseModal(c.id);
            };

            const body = document.getElementById('drawer-case-body');
            body.innerHTML = "";

            const caseItems = state.items.filter(i => i.case_id === caseId);
            const layers = ["Top Layer", "Main Compartment", "Bottom Layer"];

            layers.forEach(layer => {
                const layerItems = caseItems.filter(i => i.layer === layer);
                if (layerItems.length > 0) {
                    let itemsHtml = "";
                    layerItems.forEach(item => {
                        let statusPill = `<span class="badge-pill green">Present</span>`;
                        if (item.status === 'Missing') statusPill = `<span class="badge-pill red">Missing</span>`;
                        if (item.status === 'Maintenance') statusPill = `<span class="badge-pill amber">Maint</span>`;

                        itemsHtml += `
                            <div class="list-item" onclick="openEditItemModal('${item.id}'); closeDrawer();" style="cursor: pointer; padding: 10px 14px; margin-bottom: 6px;">
                                <div class="list-item-main" style="gap: 10px;">
                                    <div class="item-meta">
                                        <span class="item-title" style="font-size: 13px;">${item.name}</span>
                                        <span class="item-subtitle" style="font-size: 11px;">SN: ${item.serial_number || 'None'}</span>
                                    </div>
                                </div>
                                <div class="item-right">
                                    ${statusPill}
                                </div>
                            </div>
                        `;
                    });

                    body.innerHTML += `
                        <div class="layer-section">
                            <span class="layer-heading">${layer} (${layerItems.length})</span>
                            <div>${itemsHtml}</div>
                        </div>
                    `;
                }
            });

            if (caseItems.length === 0) {
                body.innerHTML = `<div style="text-align: center; color: var(--text-steel); padding: 40px 0; font-size: 13px;">No items currently stored in this case.</div>`;
            }

            document.getElementById('case-drawer-overlay').classList.add('active');
        }

        function closeDrawer() {
            document.getElementById('case-drawer-overlay').classList.remove('active');
        }

        document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
        document.getElementById('case-drawer-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('case-drawer-overlay')) {
                closeDrawer();
            }
        });

        // Modal triggers
        function openModal(id) {
            document.getElementById(id).classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        // Add Case Modal Open
        function openAddCaseModal() {
            document.getElementById('case-modal-title').innerText = "Add New Case";
            document.getElementById('case-id').disabled = false;
            document.getElementById('case-id').value = "";
            document.getElementById('case-name').value = "";
            document.getElementById('case-desc').value = "";
            openModal('modal-case');
        }

        // Edit Case Modal Open
        function openEditCaseModal(caseId) {
            const c = state.cases.find(x => x.id === caseId);
            if (!c) return;

            document.getElementById('case-modal-title').innerText = "Edit Case Details";
            document.getElementById('case-id').value = c.id;
            document.getElementById('case-id').disabled = true; // Cannot edit PK code
            document.getElementById('case-name').value = c.name;
            document.getElementById('case-desc').value = c.description || "";
            openModal('modal-case');
        }

        // Save Case
        async function saveCase(e) {
            e.preventDefault();
            if (!supabaseClient) return;

            const id = document.getElementById('case-id').value.trim();
            const name = document.getElementById('case-name').value.trim();
            const description = document.getElementById('case-desc').value.trim();

            showLoading(true);
            try {
                const isEdit = document.getElementById('case-id').disabled;
                let error = null;

                if (isEdit) {
                    // Update
                    const { error: err } = await supabaseClient
                        .from('cases')
                        .update({ name, description })
                        .eq('id', id);
                    error = err;
                } else {
                    // Insert
                    const { error: err } = await supabaseClient
                        .from('cases')
                        .insert({ id, name, description });
                    error = err;
                }

                if (error) throw error;

                closeModal('modal-case');
                showToast(isEdit ? "Case specifications modified!" : "New case created successfully!", "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Operation failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Item Modals Open
        function openAddItemModal(prefilledCaseId = "") {
            document.getElementById('item-modal-title').innerText = "Add Inventory Item";
            document.getElementById('edit-item-mode').value = "create";
            document.getElementById('item-id').disabled = false;

            document.getElementById('item-id').value = "";
            document.getElementById('item-name').value = "";
            document.getElementById('item-case-select').value = prefilledCaseId;
            document.getElementById('item-layer').value = "Top Layer";
            document.getElementById('item-status').value = "Present";
            document.getElementById('item-serial').value = "";
            document.getElementById('item-notes').value = "";
            openModal('modal-item');
        }

        function openEditItemModal(itemId) {
            const item = state.items.find(x => x.id === itemId);
            if (!item) return;

            document.getElementById('item-modal-title').innerText = "Edit Item Details";
            document.getElementById('edit-item-mode').value = "edit";
            document.getElementById('item-id').value = item.id;
            document.getElementById('item-id').disabled = true; // Cannot edit PK barcode

            document.getElementById('item-name').value = item.name;
            document.getElementById('item-case-select').value = item.case_id || "";
            document.getElementById('item-layer').value = item.layer;
            document.getElementById('item-status').value = item.status;
            document.getElementById('item-serial').value = item.serial_number || "";
            document.getElementById('item-notes').value = item.notes || "";
            openModal('modal-item');
        }

        // Save Item
        async function saveItem(e) {
            e.preventDefault();
            if (!supabaseClient) return;

            const id = document.getElementById('item-id').value.trim();
            const name = document.getElementById('item-name').value.trim();
            const case_id = document.getElementById('item-case-select').value || null;
            const layer = document.getElementById('item-layer').value;
            const status = document.getElementById('item-status').value;
            const serial_number = document.getElementById('item-serial').value.trim() || null;
            const notes = document.getElementById('item-notes').value.trim() || null;

            showLoading(true);
            try {
                const mode = document.getElementById('edit-item-mode').value;
                let error = null;

                if (mode === "edit") {
                    const { error: err } = await supabaseClient
                        .from('items')
                        .update({ name, case_id, layer, status, serial_number, notes, updated_at: new Date() })
                        .eq('id', id);
                    error = err;
                } else {
                    const { error: err } = await supabaseClient
                        .from('items')
                        .insert({ id, name, case_id, layer, status, serial_number, notes });
                    error = err;
                }

                if (error) throw error;

                closeModal('modal-item');
                showToast(mode === "edit" ? "Item parameters updated!" : "New item indexed successfully!", "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Operation failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Delete Item
        async function deleteItem(id) {
            if (!supabaseClient) return;
            if (!confirm(`Are you sure you want to delete item ${id} from catalog?`)) return;

            showLoading(true);
            try {
                const { error } = await supabaseClient
                    .from('items')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                showToast("Item deleted from database catalog.", "warning");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Delete failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Maintenance Modals
        function openAddMaintModal() {
            document.getElementById('maint-modal-title').innerText = "Schedule Maintenance Task";
            document.getElementById('edit-maint-id').value = "";
            document.getElementById('maint-item-select').disabled = false;
            document.getElementById('maint-item-select').value = "";
            document.getElementById('maint-task').value = "";
            document.getElementById('maint-status').value = "SCHEDULED";
            document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
            openModal('modal-maintenance');
        }

        function openEditMaintModal(maintId) {
            const maint = state.maintenance.find(x => x.id === maintId);
            if (!maint) return;

            document.getElementById('maint-modal-title').innerText = "Edit Maintenance Task";
            document.getElementById('edit-maint-id').value = maint.id;
            document.getElementById('maint-item-select').value = maint.item_id;
            document.getElementById('maint-item-select').disabled = true; // Cannot edit item reference
            document.getElementById('maint-task').value = maint.task;
            document.getElementById('maint-status').value = maint.status;
            document.getElementById('maint-date').value = maint.due_date;
            openModal('modal-maintenance');
        }

        // Save Maintenance
        async function saveMaintenance(e) {
            e.preventDefault();
            if (!supabaseClient) return;

            const id = document.getElementById('edit-maint-id').value;
            const item_id = document.getElementById('maint-item-select').value;
            const task = document.getElementById('maint-task').value.trim();
            const status = document.getElementById('maint-status').value;
            const due_date = document.getElementById('maint-date').value;

            const selectedItem = state.items.find(x => x.id === item_id);
            const item_name = selectedItem ? selectedItem.name : "Unknown Item";

            showLoading(true);
            try {
                let error = null;

                if (id) {
                    // Update
                    const { error: err } = await supabaseClient
                        .from('maintenance')
                        .update({ task, status, due_date })
                        .eq('id', id);
                    error = err;
                } else {
                    // Insert
                    const { error: err } = await supabaseClient
                        .from('maintenance')
                        .insert({ item_id, item_name, task, status, due_date });
                    error = err;

                    // Automatically toggle item status to 'Maintenance' when added
                    if (!err) {
                        await supabaseClient
                            .from('items')
                            .update({ status: 'Maintenance' })
                            .eq('id', item_id);
                    }
                }

                if (error) throw error;

                closeModal('modal-maintenance');
                showToast("Maintenance log updated successfully!", "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Operation failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Complete Maintenance (Mark Done)
        async function completeMaintenance(id, item_id) {
            if (!supabaseClient) return;
            showLoading(true);
            try {
                // Delete maintenance record
                const { error: delErr } = await supabaseClient
                    .from('maintenance')
                    .delete()
                    .eq('id', id);
                if (delErr) throw delErr;

                // Toggle item status back to 'Present'
                const { error: itemErr } = await supabaseClient
                    .from('items')
                    .update({ status: 'Present' })
                    .eq('id', item_id);
                if (itemErr) throw itemErr;

                showToast("Maintenance task completed. Item status restored to Present.", "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Failed to complete task: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Delete Maintenance Task
        async function deleteMaintenance(id) {
            if (!supabaseClient) return;
            if (!confirm("Are you sure you want to cancel this maintenance schedule?")) return;

            showLoading(true);
            try {
                const { error } = await supabaseClient
                    .from('maintenance')
                    .delete()
                    .eq('id', id);
                if (error) throw error;

                showToast("Maintenance schedule removed.", "warning");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Delete failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Resolve single missing item
        async function resolveSingleMissing(itemId) {
            if (!supabaseClient) return;
            showLoading(true);
            try {
                const { error } = await supabaseClient
                    .from('items')
                    .update({ status: 'Present' })
                    .eq('id', itemId);

                if (error) throw error;

                showToast(`Item ${itemId} marked as Present.`, "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Failed to update status: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Quick Resolve All Missing
        async function quickResolveMissing() {
            const missing = state.items.filter(i => i.status === 'Missing');
            if (missing.length === 0) {
                showToast("No missing items to resolve.", "info");
                return;
            }

            if (!confirm(`Mark all ${missing.length} missing items as Present?`)) return;

            showLoading(true);
            try {
                const { error } = await supabaseClient
                    .from('items')
                    .update({ status: 'Present' })
                    .in('id', missing.map(i => i.id));

                if (error) throw error;

                showToast("All missing items marked as Present.", "success");
                await loadDatabase();
            } catch (err) {
                console.error(err);
                showToast("Resolve failed: " + err.message, "danger");
            } finally {
                showLoading(false);
            }
        }

        // Scan Modal Camera Control
        const btnQuickScan = document.getElementById('btn-quick-scan');
        const btnSideScan = document.getElementById('btn-side-scan');
        const modalScan = document.getElementById('modal-scan');
        const btnCloseScan = document.getElementById('btn-close-scan-modal');
        const btnCancelScan = document.getElementById('btn-cancel-scan');
        const btnToggleCamera = document.getElementById('btn-toggle-camera');

        function openScanModal() {
            openModal('modal-scan');
            document.getElementById('scan-feedback-box').style.display = "none";
        }

        function closeScanModal() {
            stopCameraScanner();
            closeModal('modal-scan');
        }

        btnQuickScan.addEventListener('click', openScanModal);
        btnSideScan.addEventListener('click', openScanModal);
        btnCloseScan.addEventListener('click', closeScanModal);
        btnCancelScan.addEventListener('click', closeScanModal);

        btnToggleCamera.addEventListener('click', () => {
            if (html5QrScanner) {
                stopCameraScanner();
            } else {
                startCameraScanner();
            }
        });

        // Web Audio beep feedback
        function playScanBeep(success = true) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                if (success) {
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                    osc.stop(ctx.currentTime + 0.12);
                } else {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(120, ctx.currentTime);
                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                    osc.stop(ctx.currentTime + 0.35);
                }
            } catch (e) {
                console.error("Synthesizer error:", e);
            }
        }

        // Camera library scanner implementation
        async function startCameraScanner() {
            document.getElementById('scanner-container').classList.add('scanning');
            document.getElementById('scanner-instructions').style.display = "none";
            btnToggleCamera.innerText = "Stop Camera";
            btnToggleCamera.style.borderColor = "var(--danger)";
            btnToggleCamera.style.color = "var(--danger)";

            try {
                html5QrScanner = new Html5Qrcode("reader");
                const qrSuccess = (decodedText) => {
                    handleScannedBarcode(decodedText);
                };
                const config = { fps: 12, qrbox: { width: 250, height: 250 } };
                await html5QrScanner.start({ facingMode: "environment" }, config, qrSuccess);
            } catch (err) {
                console.error("Camera activation error:", err);
                showScanFeedback("Webcam error: " + err, true);
                stopCameraScanner();
            }
        }

        function stopCameraScanner() {
            document.getElementById('scanner-container').classList.remove('scanning');
            document.getElementById('scanner-instructions').style.display = "flex";
            btnToggleCamera.innerText = "Start Live Camera";
            btnToggleCamera.style.borderColor = "var(--border-color)";
            btnToggleCamera.style.color = "var(--text-white)";

            if (html5QrScanner) {
                html5QrScanner.stop().then(() => {
                    html5QrScanner = null;
                }).catch(err => {
                    console.error("Scanner stop fail:", err);
                    html5QrScanner = null;
                });
            }
        }

        // Handle scanned barcodes
        async function handleScannedBarcode(codeText) {
            const item = state.items.find(x => x.id === codeText || (x.serial_number && x.serial_number === codeText));

            if (item) {
                playScanBeep(true);
                showScanFeedback(`Success: ${item.name} (${item.id}) detected!`);

                // If it was missing or maintenance, update it to Present
                if (item.status !== 'Present') {
                    try {
                        const { error } = await supabaseClient
                            .from('items')
                            .update({ status: 'Present' })
                            .eq('id', item.id);
                        if (error) throw error;
                    } catch (err) {
                        console.error("Scanned status write fail:", err);
                    }
                }

                // Log a scan event in scan_history table
                try {
                    const caseObj = state.cases.find(c => c.id === item.case_id);
                    const caseName = caseObj ? caseObj.name : "Unknown Case";

                    // We calculate what items are missing in that case now
                    const caseItems = state.items.filter(i => i.case_id === item.case_id);
                    let missingCount = caseItems.filter(i => i.status === 'Missing').length;

                    // If this item was missing and we just found it, subtract 1
                    if (item.status === 'Missing') {
                        missingCount = Math.max(0, missingCount - 1);
                    }

                    const caseStatus = missingCount > 0 ? `${missingCount} MISSING` : "ALL PRESENT";

                    await supabaseClient
                        .from('scan_history')
                        .insert({
                            case_id: item.case_id,
                            case_name: caseName,
                            status: caseStatus,
                            operator: 'SeminarDD'
                        });

                } catch (err) {
                    console.error("Scan history write fail:", err);
                }

                showToast(`Scanned ${item.name} in ${item.case_id}. Status updated.`, "success");
                await loadDatabase();
            } else {
                playScanBeep(false);
                showScanFeedback(`Invalid tag: "${codeText}" not found in database.`, true);
            }
        }

        // Scan simulator button click
        function simulateScannedItem() {
            const val = document.getElementById('scan-sim-select').value;
            if (!val) {
                showScanFeedback("Please select an item to simulate.", true);
                return;
            }
            handleScannedBarcode(val);
        }

        function showScanFeedback(text, isError = false) {
            const box = document.getElementById('scan-feedback-box');
            box.innerText = text;
            box.style.display = "block";
            if (isError) {
                box.classList.add('error');
            } else {
                box.classList.remove('error');
            }
        }

        // Operations Buttons Trigger
        document.getElementById('btn-side-checklist').addEventListener('click', () => {
            switchView('missing');
        });
        document.getElementById('btn-side-labels').addEventListener('click', () => {
            showToast("Generating barcodes and labels for your Cases...", "info");
        });
        document.getElementById('btn-side-reports').addEventListener('click', () => {
            showToast("Generating visual inventory reports...", "info");
        });

        // Toast feedback system
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            // Icon mapping
            let icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
            if (type === 'success') {
                icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>`;
            } else if (type === 'danger') {
                icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
            } else if (type === 'warning') {
                icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="18" height="18"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            }

            toast.innerHTML = `
                ${icon}
                <div class="toast-content">${message}</div>
            `;

            container.appendChild(toast);

            // Slide out after 3.5s
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3500);
        }

        // Database seeding script trigger
        document.getElementById('btn-seed-db').addEventListener('click', seedDatabase);

        async function seedDatabase() {
            if (!supabaseClient) return;

            showLoading(true);
            document.getElementById('btn-seed-db').innerText = "Seeding data...";
            document.getElementById('btn-seed-db').disabled = true;

            try {
                // 1. Seed Cases
                const sampleCases = [
                    { id: "CA-01", name: "Lighting Rig", description: "Main truss lighting fixtures and safety cables" },
                    { id: "CB-02", name: "Moving Heads", description: "Profile and wash intelligent moving fixtures" },
                    { id: "CC-03", name: "Audio", description: "Speakers, amplifiers, mixer, and stage microphones" },
                    { id: "CD-04", name: "Cables", description: "DMX, powerCON, XLR, and HDMI runs" },
                    { id: "CE-05", name: "Rigging", description: "Truss segments, clamps, and motor control" },
                    { id: "CF-06", name: "Power", description: "Distros, extensions, and power converters" },
                    { id: "CG-07", name: "Visuals", description: "LED screen tiles and media servers" },
                    { id: "CH-08", name: "Control", description: "GrandMA console, DMX splitters, and nodes" },
                    { id: "CI-09", name: "SFX", description: "Hazers, smoke machines, and CO2 jets" },
                    { id: "CJ-10", name: "Comms", description: "Wireless beltpacks and base stations" },
                    { id: "CK-11", name: "Camera Equipment", description: "Tripods, lenses, and SDI runs" },
                    { id: "CL-12", name: "Backstage Power", description: "Loom lines and local boxes" },
                    { id: "CM-13", name: "Uplighting", description: "Battery powered PAR cans" },
                    { id: "CN-14", name: "Truss Clamps", description: "Half couplers and trigger clamps" },
                    { id: "CO-15", name: "Stage Monitoring", description: "Wedges and IEM transmitters" },
                    { id: "CP-16", name: "Microphones", description: "Instrument mics and receiver racks" },
                    { id: "CQ-17", name: "Safety Gear", description: "Harnesses, lanyards, and helmets" },
                    { id: "CR-18", name: "Spare Lamps/Parts", description: "Bulbs, fuses, and tape supplies" }
                ];

                const { error: caseErr } = await supabaseClient.from('cases').insert(sampleCases);
                if (caseErr) throw caseErr;

                // 2. Generate 247 Items
                const sampleItems = [];

                // Case CA-01: 18 items
                sampleItems.push({ id: "CA-01-01", name: "DMX Cable 3m", case_id: "CA-01", layer: "Top Layer", status: "Missing", serial_number: "CA-001-01", notes: "Red band tag" });
                for (let i = 2; i <= 9; i++) {
                    sampleItems.push({ id: `CA-01-0${i}`, name: "LED PAR 64 Fixture", case_id: "CA-01", layer: "Main Compartment", status: "Present", serial_number: `CA-001-0${i}` });
                }
                for (let i = 10; i <= 16; i++) {
                    sampleItems.push({ id: `CA-01-${i}`, name: "DMX Cable 5m", case_id: "CA-01", layer: "Top Layer", status: "Present", serial_number: `CA-001-${i}` });
                }
                sampleItems.push({ id: "CA-01-17", name: "Safety Cable 1m", case_id: "CA-01", layer: "Bottom Layer", status: "Present", serial_number: "CA-001-17" });
                sampleItems.push({ id: "CA-01-18", name: "Safety Cable 1m", case_id: "CA-01", layer: "Bottom Layer", status: "Present", serial_number: "CA-001-18" });

                // Case CB-02: 10 items
                for (let i = 1; i <= 2; i++) {
                    sampleItems.push({ id: `CB-02-0${i}`, name: `Robe 600E Beam`, case_id: "CB-02", layer: "Main Compartment", status: "Maintenance", serial_number: `CB-002-0${i}` });
                }
                for (let i = 3; i <= 4; i++) {
                    sampleItems.push({ id: `CB-02-0${i}`, name: `Heavy Duty Truss Clamp`, case_id: "CB-02", layer: "Bottom Layer", status: "Present", serial_number: `CB-002-0${i}` });
                }
                for (let i = 5; i <= 6; i++) {
                    sampleItems.push({ id: `CB-02-0${i}`, name: `Safety Cable 2m`, case_id: "CB-02", layer: "Bottom Layer", status: "Present", serial_number: `CB-002-0${i}` });
                }
                for (let i = 7; i <= 10; i++) {
                    sampleItems.push({ id: `CB-02-${i < 10 ? '0' + i : i}`, name: `PowerCON True1 Cable`, case_id: "CB-02", layer: "Top Layer", status: "Present", serial_number: `CB-002-${i < 10 ? '0' + i : i}` });
                }

                // Case CC-03: 8 items
                for (let i = 1; i <= 2; i++) {
                    sampleItems.push({ id: `CC-03-0${i}`, name: `QSC K12.2 Active Speaker`, case_id: "CC-03", layer: "Main Compartment", status: "Present", serial_number: `CC-003-0${i}` });
                }
                sampleItems.push({ id: "CC-03-03", name: "Yamaha MG12XU Mixer", case_id: "CC-03", layer: "Main Compartment", status: "Present", serial_number: "CC-003-03" });
                for (let i = 4; i <= 7; i++) {
                    sampleItems.push({ id: `CC-03-0${i}`, name: `XLR Cable 10m`, case_id: "CC-03", layer: "Top Layer", status: "Present", serial_number: `CC-003-0${i}` });
                }
                sampleItems.push({ id: "CC-03-08", name: "Radial ProDI Active DI", case_id: "CC-03", layer: "Bottom Layer", status: "Present", serial_number: "CC-003-08" });

                // Case CD-04: 32 items
                for (let i = 1; i <= 32; i++) {
                    sampleItems.push({ id: `CD-04-${i < 10 ? '0' + i : i}`, name: i <= 12 ? "XLR Cable 5m" : (i <= 24 ? "PowerCON Cable 3m" : "HDMI Cable 10m"), case_id: "CD-04", layer: i <= 12 ? "Top Layer" : (i <= 24 ? "Bottom Layer" : "Main Compartment"), status: "Present", serial_number: `CD-004-${i < 10 ? '0' + i : i}` });
                }

                // Case CE-05: 14 items
                for (let i = 1; i <= 14; i++) {
                    sampleItems.push({ id: `CE-05-${i < 10 ? '0' + i : i}`, name: i <= 4 ? "Truss Corner Block" : "Truss Pin & Clip Set", case_id: "CE-05", layer: "Main Compartment", status: "Present", serial_number: `CE-005-${i < 10 ? '0' + i : i}` });
                }

                // Case CF-06: 12 items
                sampleItems.push({ id: "CF-06-01", name: "Extension Lead 10m", case_id: "CF-06", layer: "Bottom Layer", status: "Missing", serial_number: "CF-006-01" });
                sampleItems.push({ id: "CF-06-02", name: "Distribution Box", case_id: "CF-06", layer: "Main Compartment", status: "Missing", serial_number: "CF-006-02" });
                for (let i = 3; i <= 12; i++) {
                    sampleItems.push({ id: `CF-06-${i < 10 ? '0' + i : i}`, name: "Power Extension 5m", case_id: "CF-06", layer: "Top Layer", status: "Present", serial_number: `CF-006-${i < 10 ? '0' + i : i}` });
                }

                // Fill other cases programmatically
                const otherCases = [
                    { id: "CG-07", count: 15, prefix: "CG-07", name: "LED Screen Tile" },
                    { id: "CH-08", count: 8, prefix: "CH-08", name: "DMX Splitter Node" },
                    { id: "CI-09", count: 10, prefix: "CI-09", name: "Hazer Machine Fluid" },
                    { id: "CJ-10", count: 12, prefix: "CJ-10", name: "Comms Beltpack" },
                    { id: "CK-11", count: 10, prefix: "CK-11", name: "Camera Tripod" },
                    { id: "CL-12", count: 15, prefix: "CL-12", name: "PowerCON Loom" },
                    { id: "CM-13", count: 20, prefix: "CM-13", name: "Battery PAR Can" },
                    { id: "CN-14", count: 30, prefix: "CN-14", name: "Half Coupler Clamp" },
                    { id: "CO-15", count: 10, prefix: "CO-15", name: "In-Ear Monitor Pack" },
                    { id: "CP-16", count: 15, prefix: "CP-16", name: "Shure SM58 Microphone" },
                    { id: "CQ-17", count: 12, prefix: "CQ-17", name: "Safety Harness" },
                    { id: "CR-18", count: 16, prefix: "CR-18", name: "Spare Bulb 250W" }
                ];

                otherCases.forEach(oc => {
                    for (let i = 1; i <= oc.count; i++) {
                        sampleItems.push({
                            id: `${oc.prefix}-${i < 10 ? '0' + i : i}`,
                            name: oc.name,
                            case_id: oc.id,
                            layer: i % 2 === 0 ? "Top Layer" : "Bottom Layer",
                            status: "Present",
                            serial_number: `${oc.prefix}-${i < 10 ? '0' + i : i}`
                        });
                    }
                });

                // Batch insert items (split into 3 groups of 100 to prevent payload limits)
                const itemsBatch1 = sampleItems.slice(0, 100);
                const itemsBatch2 = sampleItems.slice(100, 200);
                const itemsBatch3 = sampleItems.slice(200);

                const { error: itemsErr1 } = await supabaseClient.from('items').insert(itemsBatch1);
                if (itemsErr1) throw itemsErr1;

                const { error: itemsErr2 } = await supabaseClient.from('items').insert(itemsBatch2);
                if (itemsErr2) throw itemsErr2;

                const { error: itemsErr3 } = await supabaseClient.from('items').insert(itemsBatch3);
                if (itemsErr3) throw itemsErr3;

                // 3. Seed Maintenance
                const sampleMaintenance = [
                    {
                        item_id: "CB-02-01",
                        item_name: "Robe 600E Beam x2",
                        task: "Lamp replacement",
                        status: "OVERDUE",
                        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                    {
                        item_id: "CF-06-02",
                        item_name: "Distro Box",
                        task: "PAT testing",
                        status: "DUE SOON",
                        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                    {
                        item_id: "CG-07-01",
                        item_name: "GLP X4 Bar x8",
                        task: "Firmware",
                        status: "SCHEDULED",
                        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }
                ];

                const { error: maintErr } = await supabaseClient.from('maintenance').insert(sampleMaintenance);
                if (maintErr) throw maintErr;

                // 4. Seed Scan History
                const sampleHistory = [
                    { case_id: "CA-01", case_name: "Lighting Rig", status: "1 MISSING", timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), operator: "SeminarDD" },
                    { case_id: "CB-02", case_name: "Moving Heads", status: "ALL PRESENT", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), operator: "SeminarDD" },
                    { case_id: "CF-06", case_name: "Power", status: "2 MISSING", timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(), operator: "SeminarDD" },
                    { case_id: "CC-03", case_name: "Audio", status: "ALL PRESENT", timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(), operator: "SeminarDD" },
                    { case_id: "CD-04", case_name: "Cables", status: "ALL PRESENT", timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(), operator: "SeminarDD" }
                ];

                const { error: histErr } = await supabaseClient.from('scan_history').insert(sampleHistory);
                if (histErr) throw histErr;

                showToast("Database seeded with sample records successfully!", "success");
                await loadDatabase();

            } catch (err) {
                console.error(err);
                showToast("Failed to seed database: " + err.message, "danger");
            } finally {
                showLoading(false);
                document.getElementById('btn-seed-db').innerText = "Seed Sample Data";
                document.getElementById('btn-seed-db').disabled = false;
            }
        }
