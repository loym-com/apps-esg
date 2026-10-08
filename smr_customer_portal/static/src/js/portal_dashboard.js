/** @odoo-module **/
import { Component, useState, xml, whenReady, onWillStart, onMounted, onPatched, onWillUnmount, useRef } from "@odoo/owl";
import { mount } from "@odoo/owl";

async function rpc(url, params = {}) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params: params })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.data?.message || d.error.message);
    return d.result;
}

function fmtK(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
    return String(n);
}

/* Inline CDN loaders (Chart.js + amCharts 5)*/
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

let libsLoaded = false;
async function loadChartJs() {
    if (libsLoaded) return;
    if (!window.Chart) {
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js');
    }
    // amCharts 5 for world map
    if (!window.am5) {
        await loadScript('https://cdn.amcharts.com/lib/5/index.js');
    }
    if (!window.am5map) {
        await loadScript('https://cdn.amcharts.com/lib/5/map.js');
    }
    if (!window.am5geodata_worldLow) {
        await loadScript('https://cdn.amcharts.com/lib/5/geodata/worldLow.js');
    }
    if (!window.am5themes_Animated) {
        await loadScript('https://cdn.amcharts.com/lib/5/themes/Animated.js');
    }
    if (!window.ChartTreemapLoaded) {
        await loadScript('https://cdn.jsdelivr.net/npm/chartjs-chart-treemap/dist/chartjs-chart-treemap.min.js');
        window.ChartTreemapLoaded = true;
    }
    libsLoaded = true;
}

/* Main Dashboard Component*/
class PlaceholderTab extends Component {
    static template = xml`
        <div style="padding:40px;text-align:center;color:#adb5bd;">
            <div style="font-size:48px;margin-bottom:16px;"></div>
            <div style="font-size:18px;font-weight:600;color:#6c757d;margin-bottom:8px;"
                 t-esc="props.label"/>
        </div>
    `;
    static props = ["label"];
}


class ClimatePortfolioTab extends Component {
    setup() {
        this.state = useState({
            recentRetirement: null,
            portfolioData: null,
            loading: true
        });

        onWillStart(async () => {
            try {
                const [retirement, portfolio] = await Promise.all([
                    rpc('/portal/api/climate/recent_retirement'),
                    rpc('/portal/api/climate/portfolio_data')
                ]);
                this.state.recentRetirement = retirement;
                this.state.portfolioData = portfolio;
                console.log(this.state.portfolioData);
            } catch (e) {
                console.error(e);
            }
            this.state.loading = false;
        });
    }

    static template = xml`
        <div style="display: grid; grid-template-columns: minmax(0,3fr) minmax(0,1fr); gap: 20px; padding: 20px; background: #fafafa;">
 
            <!-- Left Column -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
 
                <!-- Banner -->
                <div class="dbBox">
                    <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 8px; margin-top: 0;">Welcome back to Customer Portal</h1>
                    <p style="font-size: 13px; opacity: 0.88; margin-bottom: 20px; max-width: 380px; line-height: 1.5;">Thank you for your continued climate action. Your contributions support a measurable and sustainable future.</p>
                    <button style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 7px; font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; width: fit-content;">
                        Explore Projects &#8594;
                    </button>
                </div>
 
                <!-- 6 Stat Cards -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
 
                    <!-- Card 1: My Certificates -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-certificate" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">My Certificates</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.stats.certificates : '-'"></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">View Certificates <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                    <!-- Card 2: My Contributions -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-leaf" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">My Contributions</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;"><t t-esc="state.portfolioData ? state.portfolioData.stats.contributions : '-'"/> <span style="font-size: 13px; font-weight: 500; color: #6b7280;">tCO&#x2082;e</span></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">View Contributions <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                    <!-- Card 3: Explore Projects -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-compass" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">Explore Projects</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.stats.projects : '-'"></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">Browse Projects <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                    <!-- Card 4: Retirement Records -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-cloud" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">Retirement Records</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.stats.retirements : '-'"></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">View Retirements <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                    <!-- Card 5: Climate Portfolio -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-pie-chart" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">Climate Portfolio</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.stats.portfolio : '-'"></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">View Portfolio <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                    <!-- Card 6: Download Documents -->
                    <div style="background: white; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
                        <div style="display: flex; gap: 12px;">
                            <div style="background: #f0fdf4; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #dcfce7;">
                                <i class="fa fa-file-text-o" style="color: #22c55e; font-size: 16px;"/>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 500; color: #4b5563;">Download Documents</span>
                                <span style="font-size: 24px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.stats.documents : '-'"></span>
                            </div>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px; margin-top: 12px;">View Documents <span style="margin-left: auto;">&#8250;</span></a>
                    </div>
 
                </div>
 
                <!-- Contribution Timeline -->
                <div style="background: white; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fa fa-leaf" style="color: #22c55e; font-size: 14px;"/>
                            <span style="font-size: 14px; font-weight: 700; color: #111827;">Contribution Timeline</span>
                        </div>
                        <a href="#" style="color: #22c55e; font-size: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;">View Full Timeline <span>&#8250;</span></a>
                    </div>
 
                    <div style="position: relative; width: 100%;" t-if="state.portfolioData">
 
                        <!-- Full grey track behind all dots -->
                        <div style="position: absolute; top: 5px; left: 0; right: 0; height: 2px; background: #e5e7eb; z-index: 0;"></div>
                        <!-- Green progress -->
                        <div style="position: absolute; top: 5px; left: 0; height: 2px; background: #22c55e; z-index: 0;" t-attf-style="width: {{ state.portfolioData.timeline_progress }}%;"></div>
 
                        <!-- Dots -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1;">
                            <div t-foreach="state.portfolioData.timeline" t-as="point" t-key="point.month" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div t-if="point.active" style="width: 12px; height: 12px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 3px white;"></div>
                                <div t-else="" style="width: 12px; height: 12px; background: white; border: 2px solid #e5e7eb; border-radius: 50%; box-sizing: border-box;"></div>
                                <span style="font-size: 11px; color: #6b7280; white-space: nowrap;" t-esc="point.month"></span>
                                <span style="font-size: 12px; font-weight: 600; color: #111827; white-space: nowrap;"><t t-esc="point.amount"/> <span style="font-size: 11px; font-weight: 500; color: #6b7280;">tCO&#x2082;e</span></span>
                            </div>
                        </div>

                    </div>
                </div>
 
            </div>
 
            <!-- Right Column (Sidebar) -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
 
                <!-- Climate Portfolio Summary -->
                <div style="background: white; border-radius: 10px; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <span style="font-size: 14px; font-weight: 700; color: #111827;">Climate Portfolio Summary</span>
                        <span style="color: #9ca3af; cursor: pointer; font-size: 20px; line-height: 1;">&#8942;</span>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Retired</div>
                        <div style="font-size: 24px; font-weight: 700; color: #22c55e;"><t t-esc="state.portfolioData ? state.portfolioData.summary.total_retired : '-'"/> <span style="font-size: 14px; font-weight: 500; color: #6b7280;">tCO&#x2082;e</span></div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
                    <div style="margin-bottom: 16px; margin-top: 16px;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Active Support Projects</div>
                        <div style="font-size: 18px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.summary.active_projects : '-'"></div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
                    <div style="margin-bottom: 16px; margin-top: 16px;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Retirements</div>
                        <div style="font-size: 18px; font-weight: 700; color: #111827;" t-esc="state.portfolioData ? state.portfolioData.summary.retirements : '-'"></div>
                    </div>
                    <button style="width: 100%; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 8px;">
                        View Portfolio <span>&#8250;</span>
                    </button>
                </div>
 
                <!-- Recent Retirement -->
                <div style="background: white; border-radius: 10px; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 14px; font-weight: 700; color: #111827;">Recent Retirement</span>
                        <i class="fa fa-check-circle-o" style="color: #22c55e; font-size: 16px;"/>
                    </div>
                    
                    <t t-if="!state.loading and state.recentRetirement">
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 60px; height: 60px; background: #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                                <img t-att-src="state.recentRetirement.image_url" style="width: 100%; height: 100%; object-fit: cover;" alt="Project Image"/>
                            </div>
                            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                                <div style="font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3;" t-esc="state.recentRetirement.project_name"></div>
                                <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 4px;"><t t-esc="state.recentRetirement.amount"/> <span style="font-size: 12px; font-weight: 500; color: #6b7280;">tCO&#x2082;e</span></div>
                                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Retired on <t t-esc="state.recentRetirement.date"/></div>
                            </div>
                        </div>
                    </t>
                    <t t-else="">
                        <div style="display: flex; gap: 12px; margin-bottom: 16px; opacity: 0.5;">
                            <div style="width: 60px; height: 60px; background: #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0;"></div>
                            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                                <div style="height: 14px; background: #e5e7eb; border-radius: 4px; width: 90%;"></div>
                                <div style="height: 14px; background: #e5e7eb; border-radius: 4px; width: 60%;"></div>
                                <div style="height: 12px; background: #e5e7eb; border-radius: 4px; width: 70%;"></div>
                            </div>
                        </div>
                    </t>
                    
                    <button style="width: 100%; background: white; border: none; padding: 10px; font-size: 13px; font-weight: 600; color: #22c55e; cursor: pointer; display: flex; justify-content: flex-start; align-items: center; gap: 6px; padding-left: 0;">
                        View Retirements <span>&#8250;</span>
                    </button>
                </div>
 
                <!-- Your Impact -->
                <div style="background: white; border-radius: 10px; padding: 20px; border: 1px solid #e5e7eb;">
                    <span style="font-size: 14px; font-weight: 700; color: #111827; display: block; margin-bottom: 16px;">Your Impact</span>
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <div style="background: #3f7e44; color: white; width: 42px; height: 42px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                            <span style="font-size: 10px; font-weight: 800; position: absolute; top: 4px; left: 4px;">13</span>
                            <i class="fa fa-globe" style="font-size: 16px; margin-top: 6px;"></i>
                        </div>
                        <div style="background: #56c02b; color: white; width: 42px; height: 42px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                            <span style="font-size: 10px; font-weight: 800; position: absolute; top: 4px; left: 4px;">15</span>
                            <i class="fa fa-tree" style="font-size: 16px; margin-top: 6px;"></i>
                        </div>
                        <div style="background: #fcc30b; color: white; width: 42px; height: 42px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                            <span style="font-size: 10px; font-weight: 800; position: absolute; top: 4px; left: 4px;">7</span>
                            <i class="fa fa-sun-o" style="font-size: 16px; margin-top: 6px;"></i>
                        </div>
                        <div style="background: #19486a; color: white; width: 42px; height: 42px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                            <span style="font-size: 10px; font-weight: 800; position: absolute; top: 4px; left: 4px;">17</span>
                            <i class="fa fa-asterisk" style="font-size: 16px; margin-top: 6px;"></i>
                        </div>
                    </div>
                    <button style="width: 100%; background: white; border: none; padding: 10px; font-size: 13px; font-weight: 600; color: #22c55e; cursor: pointer; display: flex; justify-content: flex-start; align-items: center; gap: 6px; padding-left: 0;">
                        View Impact Details <span>&#8250;</span>
                    </button>
                </div>
 
            </div>
        </div>
    `;
}


// ==========================================
// Reusable Chart Components
// ==========================================

export class PurchaseVolumeTrendChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Credit Purchase Volume Trend Monthly (tCO2e)'"/>
            <div class="pd-legend" t-if="props.data">
                <t t-foreach="props.data.datasets" t-as="ds" t-key="ds.label">
                    <div class="pd-legend-item">
                        <span class="pd-legend-dot" t-att-style="'background:' + ds.color"/>
                        <span t-esc="ds.label"/>
                    </div>
                </t>
            </div>
            <div class="pd-canvas-wrap"><canvas t-ref="trendCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.trendCanvas = useRef('trendCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.trendCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const d = this.props.data;
        this.chart = new window.Chart(el, {
            type: 'line',
            data: {
                labels: d.labels,
                datasets: d.datasets.map((ds, i) => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color,
                    backgroundColor: ds.color + '20',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    borderWidth: 2,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.5,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}

export class RetiredAvailableChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Credits Retired vs Credits Available Monthly (tCO2e)'"/>
            <div class="pd-legend" t-if="props.data">
                <t t-foreach="props.data.datasets" t-as="ds" t-key="ds.label">
                    <div class="pd-legend-item">
                        <span class="pd-legend-dot" t-att-style="'background:' + ds.color"/>
                        <span t-esc="ds.label"/>
                    </div>
                </t>
            </div>
            <div class="pd-canvas-wrap"><canvas t-ref="retiredCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.retiredCanvas = useRef('retiredCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.retiredCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const d = this.props.data;
        this.chart = new window.Chart(el, {
            type: 'bar',
            data: {
                labels: d.labels,
                datasets: d.datasets.map(ds => {
                    if (ds.label === 'Available Credits') {
                        return {
                            type: 'line',
                            label: ds.label,
                            data: ds.data,
                            borderColor: '#39c0c0',
                            backgroundColor: '#39c0c0',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#39c0c0',
                            yAxisID: 'y1',
                            tension: 0.3
                        };
                    } else {
                        return {
                            type: 'bar',
                            label: ds.label,
                            data: ds.data,
                            backgroundColor: '#3833a4',
                            borderRadius: 0,
                            barPercentage: 0.6,
                            yAxisID: 'y'
                        };
                    }
                })
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.8,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } },
                        title: { display: true, text: 'Month', font: { size: 11, weight: 'bold' }, color: '#4b5563' }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: '#f3f4f6' },
                        ticks: { font: { size: 10 } },
                        title: { display: true, text: 'Volume (k tCO2e)', font: { size: 11, weight: 'bold' }, color: '#4b5563' },
                        min: 0,
                        max: 2000
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { font: { size: 10 } },
                        title: { display: true, text: 'Available Credits (k tCO2e)', font: { size: 11, weight: 'bold' }, color: '#4b5563' },
                        min: 0,
                        max: 490
                    }
                }
            }
        });
    }
}

export class SpendByCreditTypeChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Spend by Credit Type Yearly (%)'"/>
            <div class="pd-canvas-wrap" style="max-width:260px;margin:0 auto;">
                <canvas t-ref="donutCanvas"/>
            </div>
            <div class="pd-donut-labels" style="margin-top:12px;">
                <t t-if="props.data" t-foreach="props.data.segments" t-as="seg" t-key="seg.label">
                    <div class="pd-donut-label-item">
                        <span class="pd-donut-label-dot" t-att-style="'background:' + seg.color"/>
                        <span t-esc="seg.label"/>
                        <span class="pd-donut-label-value"><t t-esc="fmtMoney(seg.value)"/> (<t t-esc="seg.pct"/>%)</span>
                    </div>
                </t>
            </div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.donutCanvas = useRef('donutCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    fmtMoney(val) {
        if (val >= 1e6) return (val / 1e6).toFixed(0) + ' M';
        if (val >= 1e3) return (val / 1e3).toFixed(0) + ' K';
        return String(val);
    }

    renderChart() {
        const el = this.donutCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const segs = this.props.data.segments;
        this.chart = new window.Chart(el, {
            type: 'doughnut',
            data: {
                labels: segs.map(s => s.label),
                datasets: [{
                    data: segs.map(s => s.value),
                    backgroundColor: segs.map(s => s.color),
                    borderWidth: 2,
                    borderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '55%',
                plugins: { legend: { display: false } }
            }
        });
    }
}

export class AvgMarketPriceChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Average Market Price Per Credit Monthly (USD)'"/>
            <div class="pd-legend" t-if="props.data">
                <t t-foreach="props.data.datasets" t-as="ds" t-key="ds.label">
                    <div class="pd-legend-item">
                        <span class="pd-legend-dot" t-att-style="'background:' + ds.color"/>
                        <span t-esc="ds.label"/>
                    </div>
                </t>
            </div>
            <div class="pd-canvas-wrap"><canvas t-ref="priceCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.priceCanvas = useRef('priceCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.priceCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const d = this.props.data;
        this.chart = new window.Chart(el, {
            type: 'line',
            data: {
                labels: d.labels,
                datasets: d.datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color,
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: ds.color,
                    borderWidth: 2,
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: {
                        grid: { color: '#f3f4f6' }, ticks: {
                            font: { size: 10 },
                            callback: v => '$' + v
                        }
                    }
                }
            }
        });
    }
}

export class TopCreditProjectsChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Top Credit Projects by Volume Purchased Yearly (tCO2e)'"/>
            <div class="pd-canvas-wrap"><canvas t-ref="topProjectsCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.topProjectsCanvas = useRef('topProjectsCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.topProjectsCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const projects = this.props.data.projects;
        this.chart = new window.Chart(el, {
            type: 'bar',
            data: {
                labels: projects.map(p => p.name),
                datasets: [{
                    data: projects.map(p => p.volume),
                    backgroundColor: '#332ea6',
                    borderRadius: 0,
                    barPercentage: 0.6,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.0,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        ticks: { font: { size: 12, color: '#4b5563' } },
                        title: { display: true, text: 'Volume Purchased (tCO2e)', font: { size: 13 }, color: '#4b5563' },
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 12, color: '#4b5563' } },
                        title: { display: true, text: 'Project Name', font: { size: 13 }, color: '#4b5563' }
                    }
                }
            }
        });
    }
}

export class SpendWaterfallChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Monthly Spend Waterfall (USD)'"/>
            <div class="pd-canvas-wrap"><canvas t-ref="waterfallCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.waterfallCanvas = useRef('waterfallCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.waterfallCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const d = this.props.data;
        this.chart = new window.Chart(el, {
            type: 'bar',
            data: {
                labels: d.labels,
                datasets: [{
                    data: d.values,
                    backgroundColor: d.values.map((v, i) =>
                        i === d.values.length - 1 ? '#2d2d8a' : '#5b5bbd'),
                    borderRadius: 3,
                    barPercentage: 0.6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}


export class VolumeByCountryChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Credit Purchase Volume by Country Yearly (tCO2e)'"/>
            <div style="display:flex;align-items:center;margin-bottom:8px;">
                <span style="font-size:11px;color:#6b7280;margin-right:8px;">0</span>
                <div style="flex:1;height:12px;border-radius:6px;background:linear-gradient(90deg,#e8eaf6,#c5cae9,#9fa8da,#7986cb,#5c6bc0,#3949ab,#2d2d8a);"></div>
                <span style="font-size:11px;color:#6b7280;margin-left:8px;">10</span>
            </div>
            <div t-ref="worldMapDiv" style="width:100%;height:280px;"></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.worldMapDiv = useRef('worldMapDiv');
        this.root = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderMap();
        });

        onPatched(() => {
            this.renderMap();
        });

        onWillUnmount(() => {
            if (this.root) {
                this.root.dispose();
            }
        });
    }

    renderMap() {
        const container = this.worldMapDiv.el;
        if (!container || !this.props.data) return;
        if (!window.am5 || !window.am5map || !window.am5geodata_worldLow) return;

        if (this.root) {
            this.root.dispose();
        }

        var volMap = {};
        for (var i = 0; i < this.props.data.countries.length; i++) {
            var c = this.props.data.countries[i];
            volMap[c.code] = c.volume;
        }

        this.root = am5.Root.new(container);
        if (this.root._logo) {
            this.root._logo.dispose();
        }
        this.root.setThemes([am5themes_Animated.new(this.root)]);

        var chart = this.root.container.children.push(am5map.MapChart.new(this.root, {
            panX: 'translateX',
            panY: 'translateY',
            projection: am5map.geoNaturalEarth1(),
        }));

        var polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(this.root, {
            geoJSON: am5geodata_worldLow,
            exclude: ['AQ'],
        }));

        polygonSeries.mapPolygons.template.setAll({
            tooltipText: '{name}: {value}',
            interactive: true,
            strokeWidth: 0.5,
            stroke: am5.color(0xffffff),
        });

        polygonSeries.mapPolygons.template.adapters.add('fill', function (fill, target) {
            var dataContext = target.dataItem ? target.dataItem.dataContext : null;
            var id = dataContext ? dataContext.id : '';
            var vol = volMap[id] || 0;
            if (vol > 0) {
                return am5.color(0x2d2d8a);
            }
            return am5.color(0xe8eaf6);
        });

        polygonSeries.mapPolygons.template.adapters.add('tooltipText', function (text, target) {
            var dataContext = target.dataItem ? target.dataItem.dataContext : null;
            var id = dataContext ? dataContext.id : '';
            var vol = volMap[id] || 0;
            var name = dataContext ? dataContext.name : '';
            return name + ': ' + vol;
        });

        polygonSeries.mapPolygons.template.states.create('hover', {
            fillOpacity: 0.8,
        });

        chart.appear(1000, 100);
    }
}

export class OffsetAchievementGaugeChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Credit Offset Achievement Rate Monthly (%)'"/>
            <div class="pd-gauge-container">
                <canvas t-ref="gaugeCanvas" width="280" height="220"/>
            </div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.gaugeCanvas = useRef('gaugeCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
        });
    }

    renderChart() {
        const el = this.gaugeCanvas.el;
        if (!el || !this.props.data || !window.Chart) return;
        if (this.chart) {
            this.chart.destroy();
        }
        const val = this.props.data.value;
        this.chart = new window.Chart(el, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [33.3, 33.3, 33.4],
                    backgroundColor: ['#332ea6', '#6f6cf1', '#9694ff'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                rotation: -90,
                circumference: 180,
                cutout: '65%',
                layout: {
                    padding: { bottom: 55, left: 20, right: 20, top: 10 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'gaugeNeedle',
                afterDraw(chart) {
                    const { ctx } = chart;
                    const meta = chart.getDatasetMeta(0);
                    if (!meta.data.length) return;
                    const arc = meta.data[0];
                    const cx = arc.x;
                    const cy = arc.y;

                    const startAngle = meta.data[0].startAngle;
                    const endAngle = meta.data[2].endAngle;
                    const totalAngle = endAngle - startAngle;

                    const angle = startAngle + (val / 100) * totalAngle;
                    const outerRadius = arc.outerRadius;
                    const needleLen = outerRadius * 0.95;

                    ctx.save();

                    ctx.font = '12px Inter, sans-serif';
                    ctx.fillStyle = '#4b5563';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    ctx.fillText('0%', cx - outerRadius - 20, cy);
                    ctx.fillText('100%', cx + outerRadius + 24, cy);
                    const a33 = startAngle + totalAngle * 0.333;
                    ctx.fillText('33%', cx + Math.cos(a33) * (outerRadius + 20), cy + Math.sin(a33) * (outerRadius + 20));
                    const a67 = startAngle + totalAngle * 0.666;
                    ctx.fillText('67%', cx + Math.cos(a67) * (outerRadius + 20), cy + Math.sin(a67) * (outerRadius + 20));

                    ctx.translate(cx, cy);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, -3);
                    ctx.lineTo(needleLen, 0);
                    ctx.lineTo(0, 3);
                    ctx.fillStyle = '#374151';
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(0, 0, 8, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();

                    ctx.save();
                    ctx.font = 'bold 26px Inter, sans-serif';
                    ctx.fillStyle = '#000000';
                    ctx.textAlign = 'center';
                    ctx.fillText(val + '%', cx, cy + 28);
                    ctx.font = '13px Inter, sans-serif';
                    ctx.fillStyle = '#9ca3af';
                    ctx.fillText('Target : 100%', cx, cy + 46);
                    ctx.restore();
                }
            }]
        });
    }
}

export class TypeDistributionTreemapChart extends Component {
    static template = xml`
        <div class="pd-chart-card pd-animate-in">
            <div class="pd-chart-title" t-esc="props.title || 'Credit Type Distribution by Project Category Yearly (tCO2e)'"/>
            <div class="pd-canvas-wrap" style="height:250px;"><canvas t-ref="treemapCanvas"/></div>
        </div>
    `;
    static props = {
        data: { type: Object, optional: true },
        title: { type: String, optional: true },
    };

    setup() {
        this.treemapCanvas = useRef('treemapCanvas');
        this.chart = null;

        onWillStart(async () => {
            await loadChartJs();
        });

        onMounted(() => {
            this.renderChart();
        });

        onPatched(() => {
            this.renderChart();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        });
    }

    renderChart() {
        if (!this.treemapCanvas.el || !this.props.data || !this.props.data.categories || this.props.data.categories.length === 0) return;
        if (!window.Chart || !window.ChartTreemapLoaded) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = this.treemapCanvas.el.getContext('2d');

        let treeData = this.props.data.categories.map(c => ({
            value: c.value,
            label: c.label,
            display: c.display,
            color: c.color
        }));

        this.chart = new Chart(ctx, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: treeData,
                    key: 'value',
                    groups: ['label'],
                    backgroundColor: (ctx) => {
                        if (ctx.type !== 'data' || !ctx.raw) return '#ccc';
                        let d = ctx.raw._data;
                        if (!d) d = ctx.raw;
                        if (Array.isArray(d)) d = d[0];
                        else if (d.children && Array.isArray(d.children)) d = d.children[0];
                        return d.color || '#332ea6';
                    },
                    borderWidth: 1,
                    borderColor: '#ffffff',
                    labels: {
                        display: true,
                        color: '#ffffff',
                        font: [{ size: 14, weight: 'bold' }, { size: 12, weight: 'normal' }],
                        align: 'center',
                        position: 'middle',
                        formatter: (ctx) => {
                            if (ctx.type !== 'data' || !ctx.raw) return '';
                            let d = ctx.raw._data;
                            if (!d) d = ctx.raw;
                            if (Array.isArray(d)) d = d[0];
                            else if (d.children && Array.isArray(d.children)) d = d.children[0];
                            if (!d.label) return '';
                            return [d.label, '(' + (d.display || d.value) + ')'];
                        }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                let ctx = items[0];
                                let d = ctx.raw._data;
                                if (!d) d = ctx.raw;
                                if (Array.isArray(d)) d = d[0];
                                else if (d.children && Array.isArray(d.children)) d = d.children[0];
                                return d.label || '';
                            },
                            label: (item) => {
                                let ctx = item;
                                let d = ctx.raw._data;
                                if (!d) d = ctx.raw;
                                if (Array.isArray(d)) d = d[0];
                                else if (d.children && Array.isArray(d.children)) d = d.children[0];
                                return d.display ? 'Volume: ' + d.display : '';
                            }
                        }
                    }
                }
            }
        });
    }
}

// ==========================================
// Main Dashboard Tab
// ==========================================

class DashboardTab extends Component {
    static components = {
        PurchaseVolumeTrendChart,
        RetiredAvailableChart,
        SpendByCreditTypeChart,
        AvgMarketPriceChart,
        TopCreditProjectsChart,
        VolumeByCountryChart,
        SpendWaterfallChart,
        OffsetAchievementGaugeChart,
        TypeDistributionTreemapChart,
    };

    static template = xml`
    <div class="pd-wrapper">
        <!-- Loading -->
        <t t-if="state.loading">
            <div class="pd-loading">
                <div class="pd-spinner"></div>
                <div class="pd-loading-text">Loading dashboard data...</div>
            </div>
        </t>

        <t t-else="">

            <!-- Filter Bar -->
            <div class="pd-filter-bar pd-animate-in">
                <div class="pd-filter-group">
                    <span class="pd-filter-label">Start date</span>
                    <input type="date" class="pd-filter-input" value="2024-01-01" />
                </div>
                <div class="pd-filter-group">
                    <span class="pd-filter-label">End date</span>
                    <input type="date" class="pd-filter-input" value="2024-12-31" />
                </div>
                <div class="pd-filter-group">
                    <span class="pd-filter-label">Project Type</span>
                    <select class="pd-filter-select">
                        <option>All Types</option>
                        <option>Renewable Energy</option>
                        <option>Forestry</option>
                        <option>Methane Capture</option>
                    </select>
                </div>
                <div class="pd-filter-group">
                    <span class="pd-filter-label">Region</span>
                    <select class="pd-filter-select">
                        <option>All Regions</option>
                        <option>North America</option>
                        <option>Europe</option>
                        <option>Asia Pacific</option>
                        <option>Latin America</option>
                    </select>
                </div>
                <div class="pd-filter-group">
                    <span class="pd-filter-label">Vintage</span>
                    <select class="pd-filter-select">
                        <option>All Vintages</option>
                        <option>2024</option>
                        <option>2023</option>
                        <option>2022</option>
                    </select>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="pd-kpi-row">
                <t t-foreach="state.kpi" t-as="card" t-key="card.id">
                    <div class="pd-kpi-card pd-animate-in">
                        <div class="pd-kpi-title" t-esc="card.title"/>
                        <div class="pd-kpi-value" t-esc="card.value"/>
                        <div class="pd-kpi-comparison">
                            <span t-esc="card.comparison_text"/>
                            <span t-att-class="'pd-kpi-badge ' + card.change_dir">
                                <t t-if="card.change_dir === 'up'">▲</t>
                                <t t-else="">▼</t>
                                <t t-esc="card.change_pct"/>
                            </span>
                        </div>
                        <div class="pd-kpi-bars">
                            <div class="pd-kpi-bar-row">
                                <span class="pd-kpi-bar-label">Current</span>
                                <div class="pd-kpi-bar-track">
                                    <div class="pd-kpi-bar-fill current"
                                         t-att-style="'width:' + card.bar_current + '%'"/>
                                </div>
                            </div>
                            <div class="pd-kpi-bar-row">
                                <span class="pd-kpi-bar-label">Previous</span>
                                <div class="pd-kpi-bar-track">
                                    <div class="pd-kpi-bar-fill previous"
                                         t-att-style="'width:' + card.bar_previous + '%'"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </t>
            </div>

            <!-- Row 1: Purchase Volume Trend + Retired vs Available -->
            <div class="pd-charts-row two-col">
                <PurchaseVolumeTrendChart data="state.trend"/>
                <RetiredAvailableChart data="state.retiredAvail"/>
            </div>

            <!-- Row 2: Donut + Line + Horizontal Bar -->
            <div class="pd-charts-row three-col">
                <SpendByCreditTypeChart data="state.spendType"/>
                <AvgMarketPriceChart data="state.avgPrice"/>
                <TopCreditProjectsChart data="state.topProjects"/>
            </div>

            <!-- Row 3: Map + Waterfall -->
            <div class="pd-charts-row two-equal">
                <VolumeByCountryChart data="state.countryData"/>
                <SpendWaterfallChart data="state.waterfallData"/>
            </div>

            <!-- Row 4: Gauge + Treemap -->
            <div class="pd-charts-row two-equal">
                <OffsetAchievementGaugeChart data="state.gaugeData"/>
                <TypeDistributionTreemapChart data="state.treemap"/>
            </div>

            <!-- Row 5: Recent Transactions Table -->
            <div class="pd-charts-row" style="grid-template-columns:1fr;">
                <div class="pd-chart-card pd-animate-in">
                    <div class="pd-chart-title">Recent Purchase Transactions Monthly</div>
                    <div class="pd-table-wrap" t-if="state.transactions">
                        <table class="pd-table">
                            <thead>
                                <tr>
                                    <t t-foreach="state.transactions.columns" t-as="col" t-key="col">
                                        <th t-esc="col"/>
                                    </t>
                                </tr>
                            </thead>
                            <tbody>
                                <t t-foreach="state.transactions.rows" t-as="row" t-key="row.date + row.project">
                                    <tr>
                                        <td t-esc="row.date"/>
                                        <td t-esc="row.project"/>
                                        <td t-esc="row.credit_type"/>
                                        <td t-esc="row.country"/>
                                        <td t-esc="row.volume"/>
                                        <td t-esc="row.cost"/>
                                        <td t-esc="row.price"/>
                                        <td>
                                            <span t-att-class="'pd-status-badge ' + (row.status === 'Retired' ? 'retired' : 'available')"
                                                  t-esc="row.status"/>
                                        </td>
                                    </tr>
                                </t>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </t>
    </div>
    `;

    setup() {
        this.state = useState({
            loading: true,
            total_active: 0,
            total_retired: 0,
            total_credits: 0,
            kpi: [],
            trend: null,
            retiredAvail: null,
            spendType: null,
            avgPrice: null,
            topProjects: null,
            countryData: null,
            waterfallData: null,
            gaugeData: null,
            treemap: null,
            transactions: null,
        });

        onWillStart(async () => {
            await loadChartJs();
            await this.fetchData();
        });
    }

    async fetchData() {
        try {
            // try {
            //     const response = await fetch('/dashboard/get_customer_stats', {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} })
            //     });
            //     const statsData = await response.json();
            //     if (statsData.result) {
            //         this.state.total_active = statsData.result.total_active || 0;
            //         this.state.total_retired = statsData.result.total_retired || 0;
            //         this.state.total_credits = statsData.result.total_credits || 0;
            //     }
            // } catch (error) {
            //     console.error("Error fetching stats:", error);
            // }

            const data = await rpc('/portal/api/dashboard/full');
            const ks = data.kpi_summary;
            this.state.kpi = (ks && ks.cards) ? ks.cards : (Array.isArray(ks) ? ks : []);
            this.state.trend = data.purchase_volume_trend;
            this.state.retiredAvail = data.retired_vs_available;
            this.state.spendType = data.spend_by_type;
            this.state.avgPrice = data.avg_price_monthly;
            this.state.topProjects = data.top_projects;
            this.state.countryData = data.volume_by_country;
            this.state.waterfallData = data.spend_waterfall;
            this.state.gaugeData = data.offset_gauge;
            this.state.treemap = data.type_distribution;
            this.state.transactions = data.recent_transactions;
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        } finally {
            this.state.loading = false;
        }
    }
}

//  Orders Tab
class OrdersTab extends Component {
    setup() {
        this.state = useState({
            loading: true,
            error: null,
            orders: [],
        });

        onWillStart(async () => {
            try {
                const data = await rpc('/portal/api/sale_orders');
                this.state.orders = data.orders || [];
            } catch (err) {
                this.state.error = err.message;
            } finally {
                this.state.loading = false;
            }
        });
    }

    onViewOrder(order) {
        console.log(order);
    }

    // onViewOrder(order) {
    //     window.location.href = '/my/orders/' + order.id;
    // }

    static template = xml`
        <div style="padding:10px 20px;">
            <div style="margin-bottom:24px;">
                <div style="font-size:19px;font-weight:800;color:#111827;letter-spacing:-0.5px;">My Orders</div>
            </div>
            
            <t t-if="state.loading">
                <div style="padding:60px 0;text-align:center;color:#6c757d;font-size:13px;">
                    <i class="fa fa-spinner fa-spin" style="color:#d2b04c;font-size:28px;"></i>
                    <div style="margin-top:10px;font-weight:500;">Loading orders...</div>
                </div>
            </t>
            <t t-elif="state.error">
                <div style="border:1px solid #fca5a5;background:#fef2f2;padding:14px 18px;border-radius:10px;color:#b91c1c;font-size:13px;font-weight:500;">
                    <i class="fa fa-exclamation-triangle" style="margin-right:8px;"/>
                    <t t-esc="state.error"/>
                </div>
            </t>
            <t t-else="">
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:20px;">
                    <t t-foreach="state.orders" t-as="order" t-key="order.id">
                        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;">
                            <div style="margin-bottom:12px;">
                                <div style="font-size:18px;font-weight:800;color:#1e1e5a;"><t t-esc="order.name"/></div>
                            </div>
                            
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#6b7280;margin-bottom:16px;border-bottom:1px solid #f3f4f6;padding-bottom:16px;">
                                <div>Date: <span style="color:#374151;font-weight:600;"><t t-esc="order.date_order"/></span></div>
                                <div style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:12px;background:#e0e7ff;color:#4338ca;text-transform:uppercase;">
                                    <t t-esc="order.state"/>
                                </div>
                            </div>
                            
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                                <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Total Amount:</div>
                                <div style="font-size:22px;font-weight:800;color:#16a34a;">
                                    <t t-esc="order.amount_total"/> <t t-esc="order.currency"/>
                                </div>
                            </div>
                            
                            <div style="margin-top:auto;">
                                <button t-on-click="() => this.onViewOrder(order)" 
                                        style="width:100%;padding:12px;background:linear-gradient(90deg, #374151, #1f2937);color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                                    View Order Details
                                </button>
                            </div>
                        </div>
                    </t>
                    <t t-if="state.orders.length === 0">
                        <div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9fafb;border-radius:12px;color:#6b7280;font-size:14px;border:1px dashed #d1d5db;">
                            No orders found.
                        </div>
                    </t>
                </div>
            </t>
        </div>
    `;
}

//  Inventory Tab
class InventoryTab extends Component {
    setup() {
        this.state = useState({
            loading: true,
            error: null,
            inventory: [],
            showRetireModal: false,
            selectedItem: null,
            retireAmount: '',
            retireError: ''
        });

        onWillStart(async () => {
            try {
                const data = await rpc('/portal/api/inventory_details');
                this.state.inventory = data.inventory_details || [];
            } catch (err) {
                this.state.error = err.message;
            } finally {
                this.state.loading = false;
            }
        });
    }

    onRetireClick(item) {
        this.state.selectedItem = item;
        this.state.retireAmount = '';
        this.state.retireError = '';
        this.state.showRetireModal = true;
    }

    closeRetireModal() {
        this.state.showRetireModal = false;
        this.state.selectedItem = null;
    }

    onRetireInput(ev) {
        this.state.retireAmount = ev.target.value;
        this.state.retireError = '';
    }

    async submitRetire() {
        let val = parseFloat(this.state.retireAmount);
        try {
            const res = await rpc('/portal/api/retire_credits', {
                product_id: this.state.selectedItem.product_id,
                quantity: val
            });
            if (res.error) {
                this.state.retireError = res.error;
            } else if (res.success) {
                alert('Successfully retired ' + val + ' credits of ' + this.state.selectedItem.product + '!');
                this.closeRetireModal();
                this.state.loading = true;
                const data = await rpc('/portal/api/inventory_details');
                this.state.inventory = data.inventory_details || [];
                this.state.loading = false;
            }
        } catch (e) {
            this.state.retireError = e.message || 'An error occurred while retiring credits.';
        }
    }

    static template = xml`
        <div style="padding:10px 20px;">
            <div style="margin-bottom:24px;">
                <div style="font-size:19px;font-weight:800;color:#111827;letter-spacing:-0.5px;">My Inventory</div>
            </div>
            <t t-if="state.loading">
                <div style="padding:60px 0;text-align:center;color:#6c757d;font-size:13px;">
                    <i class="fa fa-spinner fa-spin" style="color:#d2b04c;font-size:28px;"></i>
                    <div style="margin-top:10px;font-weight:500;">Loading inventory...</div>
                </div>
            </t>
            <t t-elif="state.error">
                <div style="border:1px solid #fca5a5;background:#fef2f2;padding:14px 18px;border-radius:10px;color:#b91c1c;font-size:13px;font-weight:500;">
                    <i class="fa fa-exclamation-triangle" style="margin-right:8px;"/>
                    <t t-esc="state.error"/>
                </div>
            </t>
            <t t-else="">
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:20px;">
                    <t t-foreach="state.inventory" t-as="item" t-key="item.product_id">
                        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;">
                            <div style="font-size:16px;font-weight:700;color:#1e1e5a;margin-bottom:16px;min-height:48px;line-height:1.3;">
                                <t t-esc="item.product"/>
                            </div>
                            
                            <div style="display:flex;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #f3f4f6;padding-bottom:16px;">
                                <div style="text-align:center;">
                                    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Purchased</div>
                                    <div style="font-size:20px;font-weight:800;color:#1e1e5a;"><t t-esc="item.purchased"/></div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Retired</div>
                                    <div style="font-size:20px;font-weight:800;color:#1e1e5a;"><t t-esc="item.retired"/></div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Active</div>
                                    <div style="font-size:20px;font-weight:800;color:#1e1e5a;"><t t-esc="item.active"/></div>
                                </div>
                            </div>
                            
                            <div style="margin-top:auto;">
                                <button t-on-click="() => this.onRetireClick(item)" 
                                        style="width:100%;padding:12px;background:linear-gradient(90deg, #1bbf78, #0a7d4b);color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.2s;box-shadow:0 2px 4px rgba(45,45,138,0.2);">
                                    Retire Credits
                                </button>
                            </div>
                        </div>
                    </t>
                    <t t-if="state.inventory.length === 0">
                        <div style="grid-column:1/-1;text-align:center;padding:40px;background:#f9fafb;border-radius:12px;color:#6b7280;font-size:14px;border:1px dashed #d1d5db;">
                            No inventory items found.
                        </div>
                    </t>
                </div>
            </t>
            
            <!-- Retire Modal -->
            <t t-if="state.showRetireModal and state.selectedItem">
                <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                    <div style="background:#fff;border-radius:12px;width:400px;max-width:90%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;animation:pd-fadeIn 0.2s ease-out;">
                        <div style="padding:20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-size:18px;font-weight:800;color:#111827;">Retire Credits</h3>
                        </div>
                        <div style="padding:20px;">
                            <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:16px;">
                                <t t-esc="state.selectedItem.product"/>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:20px;background:#f9fafb;padding:12px;border-radius:8px;">
                                <div style="text-align:center;">
                                    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Available</div>
                                    <div style="font-size:18px;font-weight:800;color:#16a34a;"><t t-esc="state.selectedItem.active"/></div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Retired</div>
                                    <div style="font-size:18px;font-weight:800;color:#1e1e5a;"><t t-esc="state.selectedItem.retired"/></div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom:16px;">
                                <label style="display:block;font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">To Retire</label>
                                <input type="number" t-att-value="state.retireAmount" t-on-input="onRetireInput" 
                                       style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;outline:none;" 
                                       placeholder="Enter amount..."/>
                                <t t-if="state.retireError">
                                    <div style="color:#dc2626;font-size:12px;margin-top:6px;font-weight:500;"><t t-esc="state.retireError"/></div>
                                </t>
                            </div>
                        </div>
                        <div style="padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb;display:flex;justify-content:flex-end;gap:12px;">
                            <button t-on-click="closeRetireModal" style="padding:8px 16px;background:#fff;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;">Cancel</button>
                            <button t-on-click="submitRetire" t-att-disabled="state.retireError ? 'disabled' : undefined" t-attf-style="padding:8px 16px;background:linear-gradient(90deg, #1bbf78, #0a7d4b);border:none;border-radius:6px;font-size:13px;font-weight:600;color:#fff;transition:opacity 0.2s; {{ state.retireError ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;' }}">Confirm Retire</button>
                        </div>
                    </div>
                </div>
            </t>
            
        </div>
    `;
}

//  Profile Tab
class ProfileTab extends Component {
    static template = xml`
        <div style="padding:10px 20px;">
            <div style="margin-bottom:24px;">
                <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">My Account</div>
                <div style="font-size:13px;color:#6b7280;margin-top:4px;">Manage your personal information and preferences</div>
            </div>
            <t t-if="state.loading">
                <div style="padding:60px 0;text-align:center;color:#6c757d;font-size:13px;">
                    <i class="fa fa-spinner fa-spin" style="color:#d2b04c;font-size:28px;"></i>
                    <div style="margin-top:10px;font-weight:500;"><t t-esc="state.saving ? 'Saving profile...' : 'Loading profile...'"/></div>
                </div>
            </t>
            <t t-elif="state.error">
                <div style="border:1px solid #fca5a5;background:#fef2f2;padding:14px 18px;
                            font-size:13px;color:#991b1b;border-radius:10px;">
                    <i class="fa fa-exclamation-circle" style="margin-right:6px;"/>
                    <t t-esc="state.error"/>
                </div>
            </t>
            <t t-elif="state.profile">
                <div style="display:flex;gap:30px;align-items:flex-start;">
                    <!-- Left Sidebar (Avatar & Quick Actions) -->
                    <div style="width:280px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);padding:30px 20px;text-align:center;">
                        <div style="width:96px;height:96px;background:linear-gradient(135deg,#d2b04c,#b8962e);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;margin:0 auto 16px;box-shadow:0 4px 10px rgba(210,176,76,0.3);">
                            <t t-esc="(state.profile.name || 'U').charAt(0).toUpperCase()"/>
                        </div>
                        <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:4px;"><t t-esc="state.profile.name or '—'"/></div>
                        <div style="font-size:13px;color:#6b7280;margin-bottom:16px;"><t t-esc="state.profile.email or '—'"/></div>
                        <div style="display:inline-block;padding:4px 12px;background:#f0fdf4;color:#166534;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:24px;border:1px solid #bbf7d0;">
                            <i class="fa fa-check-circle" style="margin-right:4px;"/> Verified Customer
                        </div>
                        <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
                            <t t-if="!state.isEditing">
                                <button style="width:100%;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:all 0.2s;"
                                        t-on-click="toggleEdit"
                                        onmouseenter="this.style.background='#f3f4f6'" onmouseleave="this.style.background='#f9fafb'">
                                    <i class="fa fa-pencil" style="margin-right:6px;color:#9ca3af;"/> Edit Profile
                                </button>
                            </t>
                            <t t-else="">
                                <button style="width:100%;padding:10px;background:#d2b04c;border:1px solid #c2a144;border-radius:8px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;margin-bottom:8px;transition:all 0.2s;"
                                        t-on-click="saveProfile"
                                        onmouseenter="this.style.background='#b8962e'" onmouseleave="this.style.background='#d2b04c'">
                                    <i class="fa" style="margin-right:6px;"/> Save Profile
                                </button>
                                <button style="width:100%;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;font-weight:600;color:#991b1b;cursor:pointer;transition:all 0.2s;"
                                        t-on-click="cancelEdit"
                                        onmouseenter="this.style.background='#fee2e2'" onmouseleave="this.style.background='#fef2f2'">
                                    <i class="fa" style="margin-right:6px;"/> Cancel
                                </button>
                            </t>
                        </div>
                    </div>

                    <!-- Right Main Content (Details Form Style) -->
                    <div style="flex:1;background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);padding:30px;">
                        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">Personal Information</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px 30px;">
                            
                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Full Name</label>
                                <t t-if="!state.isEditing">
                                    <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                        <t t-esc="state.profile.name or '—'"/>
                                    </div>
                                </t>
                                <t t-else="">
                                    <input type="text" t-model="state.editData.name" style="padding:12px 16px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);"/>
                                </t>
                            </div>

                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Email Address</label>
                                <t t-if="!state.isEditing">
                                    <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                        <t t-esc="state.profile.email or '—'"/>
                                    </div>
                                </t>
                                <t t-else="">
                                    <input type="email" t-model="state.editData.email" style="padding:12px 16px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);"/>
                                </t>
                            </div>

                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Phone Number</label>
                                <t t-if="!state.isEditing">
                                    <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                        <t t-esc="state.profile.phone or '—'"/>
                                    </div>
                                </t>
                                <t t-else="">
                                    <input type="tel" t-model="state.editData.phone" style="padding:12px 16px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);"/>
                                </t>
                            </div>

                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Country</label>
                                <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                    <t t-esc="state.profile.country or '—'"/>
                                </div>
                            </div>
                            
                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">City</label>
                                <t t-if="!state.isEditing">
                                    <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                        <t t-esc="state.profile.city or '—'"/>
                                    </div>
                                </t>
                                <t t-else="">
                                    <input type="text" t-model="state.editData.city" style="padding:12px 16px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);"/>
                                </t>
                            </div>

                            <div style="display:flex;flex-direction:column;gap:8px;">
                                <label style="font-size:12px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Street Address</label>
                                <t t-if="!state.isEditing">
                                    <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#111827;font-weight:500;">
                                        <t t-esc="state.profile.street or '—'"/>
                                    </div>
                                </t>
                                <t t-else="">
                                    <input type="text" t-model="state.editData.street" style="padding:12px 16px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);"/>
                                </t>
                            </div>

                        </div>
                    </div>
                </div>
            </t>
        </div>
    `;

    setup() {
        this.state = useState({ loading: true, saving: false, error: null, profile: null, isEditing: false, editData: {} });
        onWillStart(async () => { await this.loadProfile(); });
    }

    async loadProfile() {
        try {
            const resp = await fetch('/dashboard/get_profile_details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params: {} }),
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.data?.message || data.error.message);
            this.state.profile = data.result || {};
        } catch (e) {
            this.state.error = 'Failed to load profile: ' + e.message;
        } finally {
            this.state.loading = false;
        }
    }

    toggleEdit() {
        this.state.isEditing = true;
        this.state.editData = { ...this.state.profile };
    }

    cancelEdit() {
        this.state.isEditing = false;
    }

    async saveProfile() {
        this.state.saving = true;
        this.state.loading = true;
        this.state.error = null;
        try {
            const resp = await fetch('/dashboard/update_profile_details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params: this.state.editData }),
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.data?.message || data.error.message);
            if (data.result && data.result.success) {
                this.state.profile = { ...this.state.editData };
                this.state.isEditing = false;
            } else {
                throw new Error(data.result?.error || 'Unknown error occurred while saving.');
            }
        } catch (e) {
            this.state.error = 'Failed to save profile: ' + e.message;
        } finally {
            this.state.loading = false;
            this.state.saving = false;
        }
    }
}

//  Root App ──

class CustomerDashboardApp extends Component {
    static components = { DashboardTab, OrdersTab, InventoryTab, ProfileTab, ClimatePortfolioTab };

    static template = xml`
        <div style="display:flex;height:100vh;background:#f0f2f5;font-family:'Inter','Segoe UI',system-ui,sans-serif;">
            <!-- Main content -->
            <div style="flex:1;height:100%;overflow-y:auto;">
                <div style="padding:24px;">
                    <div>
                        <t t-if="state.activeTab === 'dashboard'"><ClimatePortfolioTab/></t>
                        <t t-elif="state.activeTab === 'orders'"><OrdersTab/></t>
                        <t t-elif="state.activeTab === 'inventory'"><InventoryTab/></t>
                        <t t-elif="state.activeTab === 'profile'"><ProfileTab/></t>
                    </div>
                </div>
            </div>
        </div>
    `;

    setup() {
        let defaultTab = 'dashboard';
        const hash = window.location.hash.substring(1);
        if (['dashboard', 'orders', 'inventory', 'profile'].includes(hash)) {
            defaultTab = hash;
            localStorage.setItem('activeCustomerTab', hash);
        } else {
            const savedTab = localStorage.getItem('activeCustomerTab');
            if (savedTab) {
                defaultTab = savedTab;
            }
        }
        this.state = useState({ activeTab: defaultTab });

        // Listen to hash changes in case user navigates back/forward
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1);
            if (['dashboard', 'orders', 'inventory', 'profile'].includes(newHash)) {
                this.state.activeTab = newHash;
                localStorage.setItem('activeCustomerTab', newHash);
            }
        });
    }
}


//  Mount ──

whenReady(() => {
    const el = document.querySelector('#portal_analytics_dashboard_root');
    if (el) {
        mount(CustomerDashboardApp, el, { templates: {} });
    }
});
