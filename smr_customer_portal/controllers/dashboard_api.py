from odoo import models, fields, api, _
from datetime import timedelta
from datetime import date
import json
import logging
from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class CustomerPortalDashboardAPI(http.Controller):
    # @http.route('/portal/api/dashboard/kpi_summary', type='json', auth='user')
    # def get_kpi_summary(self, **kw):
    #     return {
    #         'cards': [
    #             {
    #                 'id': 'total_credits_purchased',
    #                 'title': 'Total Credits Purchased Monthly vs Previous Month (tCO2e)',
    #                 'value': '487.3K',
    #                 'comparison_text': 'vs prev month 412.8K',
    #                 'change_pct': '+18%',
    #                 'change_dir': 'up',
    #                 'bar_current': 82,
    #                 'bar_previous': 68,
    #             },
    #             {
    #                 'id': 'total_spend',
    #                 'title': 'Total Spend on Credits Monthly vs Previous Month (USD)',
    #                 'value': '$18.5M',
    #                 'comparison_text': 'vs prev month $14.2M',
    #                 'change_pct': '+30%',
    #                 'change_dir': 'up',
    #                 'bar_current': 88,
    #                 'bar_previous': 60,
    #             },
    #             {
    #                 'id': 'credits_retired',
    #                 'title': 'Credits Retired Monthly vs Previous Month (tCO2e)',
    #                 'value': '356.2K',
    #                 'comparison_text': 'vs prev month 298.5K',
    #                 'change_pct': '+19%',
    #                 'change_dir': 'up',
    #                 'bar_current': 75,
    #                 'bar_previous': 62,
    #             },
    #             {
    #                 'id': 'avg_price',
    #                 'title': 'Average Price Per Credit Monthly vs Previous Month (USD)',
    #                 'value': '$37.95',
    #                 'comparison_text': 'vs prev month $34.42',
    #                 'change_pct': '+10%',
    #                 'change_dir': 'up',
    #                 'bar_current': 70,
    #                 'bar_previous': 55,
    #             },
    #             {
    #                 'id': 'offset_rate',
    #                 'title': 'Portfolio Carbon Offset Achievement Rate Monthly vs Previous Month (%)',
    #                 'value': '89.5%',
    #                 'comparison_text': 'vs prev month 74.6%',
    #                 'change_pct': '+20%',
    #                 'change_dir': 'up',
    #                 'bar_current': 90,
    #                 'bar_previous': 75,
    #             },
    #         ]
    #     }

    @http.route('/portal/api/dashboard/kpi_summary', type='json', auth='user')
    def get_kpi_summary(self, **kw):
        env = request.env
        partner = env.user.partner_id

        now = fields.Date.today()
        first_day_current = now.replace(day=1)
        first_day_prev = (first_day_current - timedelta(days=1)).replace(day=1)
        last_day_prev = first_day_current - timedelta(days=1)

        # def get_credits_purchased(date_from, date_to):
        #     lines = env['purchase.order.line'].sudo().search([
        #         ('order_id.partner_id', '=', partner.id),
        #         ('order_id.picking_type_id.code', '=', 'dropship'),
        #         ('order_id.state', '=', 'purchase'),
        #         ('order_id.date_order', '>=', fields.Datetime.to_datetime(date_from)),
        #         ('order_id.date_order', '<=', fields.Datetime.to_datetime(date_to).replace(hour=23, minute=59, second=59)),
        #     ])
        #     total_qty = sum(lines.mapped('product_qty'))
        #     total_spend = sum(lines.mapped('price_subtotal'))
        #     avg_price = (total_spend / total_qty) if total_qty > 0 else 0
        #     return total_qty, total_spend, avg_price

        def get_credits_purchased(date_from, date_to):
            lines = env['sale.order.line'].sudo().search([
                ('order_id.partner_id', '=', partner.id),
                ('order_id.state', 'in', ['sale', 'done']),
                ('order_id.date_order', '>=', fields.Datetime.to_datetime(date_from)),
                ('order_id.date_order', '<=', fields.Datetime.to_datetime(date_to).replace(
                    hour=23, minute=59, second=59
                )),
            ])
            total_qty = sum(lines.mapped('product_uom_qty'))
            total_spend = sum(lines.mapped('price_subtotal'))
            avg_price = (total_spend / total_qty) if total_qty > 0 else 0

            return total_qty, total_spend, avg_price

        def get_credits_retired(date_from, date_to):
            moves = env['stock.move'].sudo().search([
                ('picking_id.owner_id', '=', partner.id),
                ('picking_id.picking_type_id.code', '=', 'burn'),
                ('picking_id.state', '=', 'done'),
                ('status', '=', 'burned'),
                ('date', '>=', fields.Datetime.to_datetime(date_from)),
                ('date', '<=', fields.Datetime.to_datetime(date_to).replace(hour=23, minute=59, second=59)),
            ])
            return sum(moves.mapped('product_uom_qty'))

        current_credits, current_spend, current_avg = get_credits_purchased(first_day_current, now)
        prev_credits, prev_spend, prev_avg = get_credits_purchased(first_day_prev, last_day_prev)
        current_retired = get_credits_retired(first_day_current, now)
        prev_retired = get_credits_retired(first_day_prev, last_day_prev)

        def fmt(val):
            if val >= 1_000_000:
                return f"{val/1_000_000:.1f}M"
            elif val >= 1_000:
                return f"{val/1_000:.1f}K"
            return f"{val:.1f}"

        def fmt_currency(val):
            if val >= 1_000_000:
                return f"${val/1_000_000:.1f}M"
            elif val >= 1_000:
                return f"${val/1_000:.1f}K"
            return f"${val:.2f}"

        def calc_change(current, prev):
            if prev > 0:
                pct = ((current - prev) / prev) * 100
                return (f"+{pct:.0f}%" if pct >= 0 else f"{pct:.0f}%"), ('up' if pct >= 0 else 'down')
            return 'N/A', 'up'

        def calc_bars(current, prev):
            max_val = max(current, prev, 1)
            return round((current / max_val) * 100), round((prev / max_val) * 100)

        change_pct_str, change_dir = calc_change(current_credits, prev_credits)
        bar_current, bar_previous = calc_bars(current_credits, prev_credits)

        spend_change_pct_str, spend_change_dir = calc_change(current_spend, prev_spend)
        spend_bar_current, spend_bar_previous = calc_bars(current_spend, prev_spend)

        retired_change_pct_str, retired_change_dir = calc_change(current_retired, prev_retired)
        retired_bar_current, retired_bar_previous = calc_bars(current_retired, prev_retired)

        avg_change_pct_str, avg_change_dir = calc_change(current_avg, prev_avg)
        avg_bar_current, avg_bar_previous = calc_bars(current_avg, prev_avg)

        return {
            'cards': [
                {
                    'id': 'total_credits_purchased',
                    'title': 'Total Credits Purchased Monthly vs Previous Month (tCO2e)',
                    'value': fmt(current_credits),
                    'comparison_text': f'vs prev month {fmt(prev_credits)}',
                    'change_pct': change_pct_str,
                    'change_dir': change_dir,
                    'bar_current': bar_current,
                    'bar_previous': bar_previous,
                },
                {
                    'id': 'total_spend',
                    'title': 'Total Spend on Credits Monthly vs Previous Month (USD)',
                    'value': fmt_currency(current_spend),
                    'comparison_text': f'vs prev month {fmt_currency(prev_spend)}',
                    'change_pct': spend_change_pct_str,
                    'change_dir': spend_change_dir,
                    'bar_current': spend_bar_current,
                    'bar_previous': spend_bar_previous,
                },
                {
                    'id': 'credits_retired',
                    'title': 'Credits Retired Monthly vs Previous Month (tCO2e)',
                    'value': fmt(current_retired),
                    'comparison_text': f'vs prev month {fmt(prev_retired)}',
                    'change_pct': retired_change_pct_str,
                    'change_dir': retired_change_dir,
                    'bar_current': retired_bar_current,
                    'bar_previous': retired_bar_previous,
                },
                {
                    'id': 'avg_price',
                    'title': 'Average Price Per Credit Monthly vs Previous Month (USD)',
                    'value': fmt_currency(current_avg),
                    'comparison_text': f'vs prev month {fmt_currency(prev_avg)}',
                    'change_pct': avg_change_pct_str,
                    'change_dir': avg_change_dir,
                    'bar_current': avg_bar_current,
                    'bar_previous': avg_bar_previous,
                },
                {
                    'id': 'offset_rate',
                    'title': 'Portfolio Carbon Offset Achievement Rate Monthly vs Previous Month (%)',
                    'value': '89.5%',
                    'comparison_text': 'vs prev month 74.6%',
                    'change_pct': '+20%',
                    'change_dir': 'up',
                    'bar_current': 90,
                    'bar_previous': 75,
                },
            ]
        }

    #  Credit Purchase Volume Trend (Monthly line/area chart) ─
    # @http.route('/portal/api/dashboard/purchase_volume_trend', type='json', auth='user')
    # def get_purchase_volume_trend(self, **kw):
    #     months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024',
    #               'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024',
    #               'Nov 2024', 'Dec 2024']
    #     return {
    #         'labels': months,
    #         'datasets': [
    #             {
    #                 'label': 'Forestry & REDD+',
    #                 'data': [180, 200, 220, 260, 280, 310, 340, 360, 390, 420, 450, 480],
    #                 'color': '#2d2d8a',
    #             },
    #             {
    #                 'label': 'Renewable Energy',
    #                 'data': [120, 140, 150, 180, 190, 210, 230, 250, 270, 290, 310, 330],
    #                 'color': '#5b5bbd',
    #             },
    #             {
    #                 'label': 'Blue Carbon',
    #                 'data': [60, 80, 90, 110, 120, 140, 150, 170, 180, 200, 210, 230],
    #                 'color': '#8e8edb',
    #             },
    #         ]
    #     }

    @http.route('/portal/api/dashboard/purchase_volume_trend', type='json', auth='user')
    def get_purchase_volume_trend(self, **kw):
        env = request.env
        partner = env.user.partner_id

        # Current year months
        current_year = date.today().year
        month_labels = [date(current_year, m, 1).strftime('%b %Y') for m in range(1, 13)]

        # lines = env['purchase.order.line'].sudo().search([
        #     ('order_id.partner_id', '=', partner.id),
        #     ('order_id.picking_type_id.code', '=', 'dropship'),
        #     ('order_id.state', '=', 'purchase'),
        #     ('order_id.date_approve', '>=', date(current_year, 1, 1).strftime('%Y-%m-%d')),
        #     ('order_id.date_approve', '<', date(current_year + 1, 1, 1).strftime('%Y-%m-%d')),
        # ])
        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', date(current_year, 1, 1).strftime('%Y-%m-%d')),
            ('order_id.date_order', '<', date(current_year + 1, 1, 1).strftime('%Y-%m-%d')),
        ])

        # { categ_id: { month_index (0-11): qty } }
        categ_data = {}
        categ_names = {}

        for line in lines:
            product = line.product_id
            if not product:
                continue

            categ = product.categ_id
            if not categ:
                continue

            order_date = line.order_id.date_order
            if not order_date:
                continue

            month_index = order_date.month - 1  # 0-based

            if categ.id not in categ_data:
                categ_data[categ.id] = [0] * 12
                categ_names[categ.id] = categ.name

            categ_data[categ.id][month_index] += line.product_qty

        # Build color palette
        colors = [
            '#2d2d8a', '#5b5bbd', '#8e8edb', '#b0b0e8', '#3a7bd5',
            '#00b4d8', '#48cae4', '#90e0ef', '#0077b6', '#023e8a',
        ]

        datasets = []
        for i, (categ_id, monthly_qty) in enumerate(categ_data.items()):
            datasets.append({
                'label': categ_names[categ_id],
                'data': monthly_qty,
                'color': colors[i % len(colors)],
            })

        # Sort datasets by total volume descending
        datasets.sort(key=lambda d: sum(d['data']), reverse=True)

        return {
            'labels': month_labels,
            'datasets': datasets,
        }

    #  Credits Retired vs Credits Available (Monthly bar chart) ──
    # @http.route('/portal/api/dashboard/retired_vs_available', type='json', auth='user')
    # def get_retired_vs_available(self, **kw):
    #     months = ['Jul 20...', 'Aug 20...', 'Sep 20...', 'Oct 20...', 'Nov 20...', 'Dec 20...']
    #     return {
    #         'labels': months,
    #         'datasets': [
    #             {
    #                 'label': 'Credits Retired',
    #                 'data': [1500, 1550, 1600, 1650, 1680, 1750],
    #                 'color': '#3833a4',
    #             },
    #             {
    #                 'label': 'Available Credits',
    #                 'data': [350, 380, 400, 420, 440, 350],
    #                 'color': '#39c0c0',
    #             },
    #         ]
    #     }

    @http.route('/portal/api/dashboard/retired_vs_available', type='json', auth='user')
    def get_retired_vs_available(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        # Build month labels and date ranges for current year
        month_labels = []
        month_ranges = []
        for m in range(1, 13):
            month_start = date(current_year, m, 1)
            # Last day of month
            if m == 12:
                month_end = date(current_year, 12, 31)
            else:
                month_end = date(current_year, m + 1, 1) - timedelta(days=1)

            month_labels.append(month_start.strftime('%b %Y'))
            month_ranges.append((month_start, month_end))


        def get_retired_in_month(date_from, date_to):
            moves = env['stock.move'].sudo().search([
                ('picking_id.owner_id', '=', partner.id),
                ('picking_id.picking_type_id.code', '=', 'burn'),
                ('picking_id.state', '=', 'done'),
                ('status', '=', 'burned'),
                ('date', '>=', fields.Datetime.to_datetime(date_from)),
                ('date', '<=', fields.Datetime.to_datetime(date_to).replace(
                    hour=23, minute=59, second=59)),
            ])
            return sum(moves.mapped('product_uom_qty'))

        # def get_purchased_in_month(date_from, date_to):
        #     lines = env['purchase.order.line'].sudo().search([
        #         ('order_id.partner_id', '=', partner.id),
        #         ('order_id.picking_type_id.code', '=', 'dropship'),
        #         ('order_id.state', '=', 'purchase'),
        #         ('order_id.date_order', '>=', fields.Datetime.to_datetime(date_from)),
        #         ('order_id.date_order', '<=', fields.Datetime.to_datetime(date_to).replace(
        #             hour=23, minute=59, second=59)),
        #     ])
        #     return sum(lines.mapped('product_qty'))

        def get_purchased_in_month(date_from, date_to):
            lines = env['sale.order.line'].sudo().search([
                ('order_id.partner_id', '=', partner.id),
                ('order_id.state', 'in', ['sale', 'done']),
                ('order_id.date_order', '>=', fields.Datetime.to_datetime(date_from)),
                ('order_id.date_order', '<=', fields.Datetime.to_datetime(date_to).replace(
                    hour=23, minute=59, second=59
                )),
            ])
            return sum(lines.mapped('product_uom_qty'))

        # ── Fetch all-time totals before current year for running balance ──
        year_start = date(current_year, 1, 1)

        # prior_purchased_lines = env['purchase.order.line'].sudo().search([
        #     ('order_id.partner_id', '=', partner.id),
        #     ('order_id.picking_type_id.code', '=', 'dropship'),
        #     ('order_id.state', '=', 'purchase'),
        #     ('order_id.date_order', '<', fields.Datetime.to_datetime(year_start)),
        # ])
        prior_purchased_lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '<', fields.Datetime.to_datetime(year_start)),
        ])
        prior_purchased = sum(prior_purchased_lines.mapped('product_qty'))

        prior_retired_moves = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('picking_id.state', '=', 'done'),
            ('status', '=', 'burned'),
            ('date', '<', fields.Datetime.to_datetime(year_start)),
        ])
        prior_retired = sum(prior_retired_moves.mapped('product_uom_qty'))

        # ── Build monthly data ────────────────────────────────────
        retired_data = []
        available_data = []

        cumulative_purchased = prior_purchased
        cumulative_retired = prior_retired

        for date_from, date_to in month_ranges:
            monthly_purchased = get_purchased_in_month(date_from, date_to)
            monthly_retired = get_retired_in_month(date_from, date_to)

            cumulative_purchased += monthly_purchased
            cumulative_retired += monthly_retired

            retired_data.append(round(monthly_retired, 2))
            available_data.append(round(max(cumulative_purchased - cumulative_retired, 0), 2))

        return {
            'labels': month_labels,
            'datasets': [
                {
                    'label': 'Credits Retired',
                    'data': retired_data,
                    'color': '#3833a4',
                },
                {
                    'label': 'Available Credits',
                    'data': available_data,
                    'color': '#39c0c0',
                },
            ]
        }

    #  Spend by Credit Type Yearly (Pie/Donut) 
    # @http.route('/portal/api/dashboard/spend_by_type', type='json', auth='user')
    # def get_spend_by_type(self, **kw):
    #     return {
    #         'segments': [
    #             {'label': 'Forestry & REDD+', 'value': 7000000, 'pct': 34, 'color': '#2d2d8a'},
    #             {'label': 'Renewable Energy', 'value': 5000000, 'pct': 27, 'color': '#5b5bbd'},
    #             {'label': 'Blue Carbon', 'value': 4000000, 'pct': 19, 'color': '#8e8edb'},
    #             {'label': 'Soil & Agriculture', 'value': 2000000, 'pct': 12, 'color': '#b8b8e8'},
    #             {'label': 'Industrial Gas', 'value': 2000000, 'pct': 8, 'color': '#d5d5f0'},
    #         ]
    #     }

    @http.route('/portal/api/dashboard/spend_by_type', type='json', auth='user')
    def get_spend_by_type(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        year_start = date(current_year, 1, 1)
        year_end = date(current_year, 12, 31)

        # lines = env['purchase.order.line'].sudo().search([
        #     ('order_id.partner_id', '=', partner.id),
        #     ('order_id.picking_type_id.code', '=', 'dropship'),
        #     ('order_id.state', '=', 'purchase'),
        #     ('order_id.date_order', '>=', fields.Datetime.to_datetime(year_start)),
        #     ('order_id.date_order', '<=', fields.Datetime.to_datetime(year_end).replace(
        #         hour=23, minute=59, second=59)),
        # ])
        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', fields.Datetime.to_datetime(year_start)),
            ('order_id.date_order', '<=', fields.Datetime.to_datetime(year_end).replace(
                hour=23, minute=59, second=59
            )),
        ])

        # { categ_id: { name, total_spend } }
        categ_spend = {}
        categ_names = {}

        for line in lines:
            product = line.product_id
            if not product:
                continue

            categ = product.categ_id
            if not categ:
                continue

            if categ.id not in categ_spend:
                categ_spend[categ.id] = 0.0
                categ_names[categ.id] = categ.name

            categ_spend[categ.id] += line.price_subtotal

        total_spend = sum(categ_spend.values())

        colors = [
            '#2d2d8a', '#5b5bbd', '#8e8edb', '#b8b8e8', '#d5d5f0',
            '#3a7bd5', '#00b4d8', '#48cae4', '#90e0ef', '#0077b6',
        ]

        segments = []
        for i, (categ_id, spend) in enumerate(categ_spend.items()):
            pct = round((spend / total_spend * 100), 1) if total_spend > 0 else 0
            segments.append({
                'label': categ_names[categ_id],
                'value': round(spend, 2),
                'pct': pct,
                'color': colors[i % len(colors)],
            })

        # Sort by spend descending
        segments.sort(key=lambda x: x['value'], reverse=True)

        return {'segments': segments}

    #  Average Market Price Per Credit Monthly (Line chart) 
    # @http.route('/portal/api/dashboard/avg_price_monthly', type='json', auth='user')
    # def get_avg_price_monthly(self, **kw):
    #     months = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']
    #     return {
    #         'labels': months,
    #         'datasets': [
    #             {
    #                 'label': 'Forestry & REDD+',
    #                 'data': [28, 35, 42, 48, 55, 62],
    #                 'color': '#2d2d8a',
    #             },
    #             {
    #                 'label': 'Renewable Energy',
    #                 'data': [22, 28, 33, 38, 44, 50],
    #                 'color': '#22c55e',
    #             },
    #             {
    #                 'label': 'Blue Carbon',
    #                 'data': [30, 38, 45, 52, 60, 68],
    #                 'color': '#06b6d4',
    #             },
    #         ]
    #     }

    @http.route('/portal/api/dashboard/avg_price_monthly', type='json', auth='user')
    def get_avg_price_monthly(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        month_labels = [date(current_year, m, 1).strftime('%b %Y') for m in range(1, 13)]

        # Build month date ranges
        month_ranges = []
        for m in range(1, 13):
            month_start = date(current_year, m, 1)
            if m == 12:
                month_end = date(current_year, 12, 31)
            else:
                month_end = date(current_year, m + 1, 1) - timedelta(days=1)
            month_ranges.append((month_start, month_end))

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', fields.Datetime.to_datetime(date(current_year, 1, 1))),
            ('order_id.date_order', '<=', fields.Datetime.to_datetime(date(current_year, 12, 31)).replace(
                hour=23, minute=59, second=59)),
        ])

        # { categ_id: { 'name': str, 'months': [ [qty, spend], ... ] (12 entries) } }
        categ_monthly = {}
        categ_names = {}

        for line in lines:
            product = line.product_id
            if not product:
                continue

            categ = product.categ_id
            if not categ:
                continue

            order_date = line.order_id.date_order
            if not order_date:
                continue

            # date_order is a Datetime; convert to date for month check
            order_date_only = order_date.date() if hasattr(order_date, 'date') else order_date
            month_index = order_date_only.month - 1  # 0-based

            if categ.id not in categ_monthly:
                categ_monthly[categ.id] = [[0.0, 0.0] for _ in range(12)]  # [qty, spend]
                categ_names[categ.id] = categ.name

            categ_monthly[categ.id][month_index][0] += line.product_uom_qty
            categ_monthly[categ.id][month_index][1] += line.price_subtotal

        colors = [
            '#2d2d8a', '#5b5bbd', '#8e8edb', '#b8b8e8', '#d5d5f0',
            '#3a7bd5', '#00b4d8', '#48cae4', '#90e0ef', '#0077b6',
        ]

        datasets = []
        for i, (categ_id, monthly) in enumerate(categ_monthly.items()):
            avg_prices = []
            for qty, spend in monthly:
                avg = round(spend / qty, 2) if qty > 0 else 0
                avg_prices.append(avg)

            datasets.append({
                'label': categ_names[categ_id],
                'data': avg_prices,
                'color': colors[i % len(colors)],
            })

        # Sort by overall average price descending
        datasets.sort(key=lambda d: sum(d['data']) / max(sum(1 for v in d['data'] if v > 0), 1), reverse=True)

        return {
            'labels': month_labels,
            'datasets': datasets,
        }

    # #  Top Credit Projects by Volume (Horizontal bar) 
    # @http.route('/portal/api/dashboard/top_projects', type='json', auth='user')
    # def get_top_projects(self, **kw):
    #     return {
    #         'projects': [
    #             {'name': 'Amazon Rainfores...', 'volume': 490000},
    #             {'name': 'Solar Farm Initi...', 'volume': 450000},
    #             {'name': 'Mangrove Restora...', 'volume': 410000},
    #             {'name': 'Wind Energy Proj...', 'volume': 380000},
    #             {'name': 'Peatland Protect...', 'volume': 350000},
    #             {'name': 'Reforestation Pe...', 'volume': 330000},
    #             {'name': 'Hydroelectric Ug...', 'volume': 310000},
    #             {'name': 'Biomass Energy M...', 'volume': 290000},
    #             {'name': 'Coastal Protecti...', 'volume': 270000},
    #             {'name': 'Agroforestry Phi...', 'volume': 250000},
    #         ]
    #     }

    @http.route('/portal/api/dashboard/top_projects', type='json', auth='user')
    def get_top_projects(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', fields.Datetime.to_datetime(date(current_year, 1, 1))),
            ('order_id.date_order', '<=', fields.Datetime.to_datetime(date(current_year, 12, 31)).replace(
                hour=23, minute=59, second=59)),
        ])

        # { product_id: { 'name': str, 'volume': float } }
        product_volumes = {}

        for line in lines:
            product = line.product_id
            if not product:
                continue

            if product.id not in product_volumes:
                product_volumes[product.id] = {
                    'name': product.name,
                    'volume': 0,
                }

            product_volumes[product.id]['volume'] += line.product_uom_qty

        projects = [
            {
                'name': data['name'],
                'volume': int(data['volume']),
            }
            for data in product_volumes.values()
        ]

        # Sort by volume descending, top 10
        projects.sort(key=lambda x: x['volume'], reverse=True)
        projects = projects[:10]
      
        return {'projects': projects}

    #  Credit Purchase Volume by Country (World map data) ──
    # @http.route('/portal/api/dashboard/volume_by_country', type='json', auth='user')
    # def get_volume_by_country(self, **kw):
    #     return {
    #         'countries': [
    #             {'code': 'BR', 'name': 'Brazil', 'volume': 10},
    #             {'code': 'IN', 'name': 'India', 'volume': 8},
    #             {'code': 'ID', 'name': 'Indonesia', 'volume': 7},
    #             {'code': 'MX', 'name': 'Mexico', 'volume': 6},
    #             {'code': 'CN', 'name': 'China', 'volume': 5},
    #             {'code': 'VN', 'name': 'Vietnam', 'volume': 4},
    #             {'code': 'PH', 'name': 'Philippines', 'volume': 3},
    #             {'code': 'KE', 'name': 'Kenya', 'volume': 3},
    #             {'code': 'CO', 'name': 'Colombia', 'volume': 2},
    #             {'code': 'TH', 'name': 'Thailand', 'volume': 2},
    #         ]
    #     }

    @http.route('/portal/api/dashboard/volume_by_country', type='json', auth='user')
    def get_volume_by_country(self, **kw):
        env = request.env
        partner = env.user.partner_id

        # lines = env['purchase.order.line'].sudo().search([
        #     ('order_id.partner_id', '=', partner.id),
        #     ('order_id.picking_type_id.code', '=', 'dropship'),
        #     ('order_id.state', '=', 'purchase'),
        # ])
        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
        ])

        country_volumes = {}

        for line in lines:
            product = line.product_id.product_tmpl_id
            if not product:
                continue

            raw_properties = product.read(['product_properties'])[0].get('product_properties') or []

            country_id = None
            for definition in raw_properties:
                if not isinstance(definition, dict):
                    continue
                if definition.get('type') == 'many2one' and definition.get('comodel') == 'res.country':
                    value = definition.get('value')
                    if value:
                        country_id = value[0]
                    break

            if not country_id:
                continue

            country_volumes[country_id] = country_volumes.get(country_id, 0) + line.product_qty

            qty = line.product_qty
            if country_id in country_volumes:
                country_volumes[country_id] += qty
            else:
                country_volumes[country_id] = qty

        # Fetch country records for code and name
        country_ids = list(country_volumes.keys())
        countries = env['res.country'].sudo().browse(country_ids)

        result = []
        for country in countries:
            result.append({
                'code': country.code,
                'name': country.name,
                'volume': country_volumes[country.id],
            })

        # Sort by volume descending
        result.sort(key=lambda x: x['volume'], reverse=True)
        return {'countries': result}

    #  Monthly Spend Waterfall ──
    # @http.route('/portal/api/dashboard/spend_waterfall', type='json', auth='user')
    # def get_spend_waterfall(self, **kw):
    #     return {
    #         'labels': ['Jan 2024', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    #                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'],
    #         'values': [8, 12, 25, 40, 55, 70, 90, 110, 130, 155, 180, 210, 240],
    #     }

    @http.route('/portal/api/dashboard/spend_waterfall', type='json', auth='user')
    def get_spend_waterfall(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', fields.Datetime.to_datetime(date(current_year, 1, 1))),
            ('order_id.date_order', '<=', fields.Datetime.to_datetime(date(current_year, 12, 31)).replace(
                hour=23, minute=59, second=59)),
        ])

        monthly_spend = [0.0] * 12

        for line in lines:
            order_date = line.order_id.date_order
            if not order_date:
                continue
            month_index = order_date.month - 1
            monthly_spend[month_index] += line.price_subtotal

        monthly_spend = [round(v, 2) for v in monthly_spend]
        total = round(max(monthly_spend), 2)

        first_month = date(current_year, 1, 1)
        labels = [date(current_year, m, 1).strftime('%b %Y') if m == 1
                else date(current_year, m, 1).strftime('%b')
                for m in range(1, 13)]
        labels.append('Total')

        return {
            'labels': labels,
            'values': monthly_spend + [total],
        }

    #  Credit Offset Achievement Rate (Gauge) ─
    @http.route('/portal/api/dashboard/offset_gauge', type='json', auth='user')
    def get_offset_gauge(self, **kw):
        return {
            'value': 89.5,
            'target': 100,
            'labels': ['0%', '33%', '67%', '100%'],
        }

    #  Credit Type Distribution by Project Category (Treemap) ─
    # @http.route('/portal/api/dashboard/type_distribution', type='json', auth='user')
    # def get_type_distribution(self, **kw):
    #     return {
    #         'categories': [
    #             {'label': 'Forestry & REDD+', 'value': 5000000, 'display': '5M', 'color': '#332ea6'},
    #             {'label': 'Renewable Energy', 'value': 3000000, 'display': '3M', 'color': '#6f6cf1'},
    #             {'label': 'Blue Carbon', 'value': 2000000, 'display': '2M', 'color': '#9694ff'},
    #             {'label': 'Industrial G...', 'value': 1000000, 'display': '1M', 'color': '#2462b8'},
    #             {'label': 'Soil & Agric...', 'value': 2000000, 'display': '2M', 'color': '#3d80d8'},
    #             {'label': 'Cookst...', 'value': 900000, 'display': '900k', 'color': '#1baabf'},
    #             {'label': 'Energy Ef...', 'value': 600000, 'display': '600k', 'color': '#81def4'},
    #         ]
    #     }

    @http.route('/portal/api/dashboard/type_distribution', type='json', auth='user')
    def get_type_distribution(self, **kw):
        env = request.env
        partner = env.user.partner_id
        current_year = date.today().year

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.date_order', '>=', fields.Datetime.to_datetime(date(current_year, 1, 1))),
            ('order_id.date_order', '<=', fields.Datetime.to_datetime(date(current_year, 12, 31)).replace(
                hour=23, minute=59, second=59)),
        ])

        categ_qty = {}
        categ_names = {}

        for line in lines:
            product = line.product_id
            if not product:
                continue

            categ = product.categ_id
            if not categ:
                continue

            if categ.id not in categ_qty:
                categ_qty[categ.id] = 0.0
                categ_names[categ.id] = categ.name

            categ_qty[categ.id] += line.product_uom_qty

        colors = [
            '#332ea6', '#6f6cf1', '#9694ff', '#2462b8',
            '#3d80d8', '#1baabf', '#81def4', '#0077b6', '#48cae4',
        ]

        def format_display(value):
            if value >= 1_000_000:
                formatted = f'{value / 1_000_000:.1f}'.rstrip('0').rstrip('.')
                return f'{formatted}M'
            elif value >= 1_000:
                formatted = f'{value / 1_000:.1f}'.rstrip('0').rstrip('.')
                return f'{formatted}k'
            return str(int(value))

        categories = []
        for i, (categ_id, qty) in enumerate(categ_qty.items()):
            categories.append({
                'label': categ_names[categ_id],
                'value': int(qty),
                'display': format_display(qty),
                'color': colors[i % len(colors)],
            })

        categories.sort(key=lambda x: x['value'], reverse=True)

        return {'categories': categories}

    #  Recent Purchase Transactions 
    # @http.route('/portal/api/dashboard/recent_transactions', type='json', auth='user')
    # def get_recent_transactions(self, **kw):
    #     return {
    #         'columns': ['Date', 'Project Name', 'Credit Type', 'Country',
    #                      'Volume (tCO2e)', 'Total Cost (USD)', 'Price/Credit',
    #                      'Status'],
    #         'rows': [
    #             {
    #                 'date': '05/12/2024',
    #                 'project': 'Biomass Energy Mexico',
    #                 'credit_type': 'Industrial Gas',
    #                 'country': 'Mexico',
    #                 'volume': '22,340',
    #                 'cost': '881,340',
    #                 'price': '39.45',
    #                 'status': 'Available',
    #             },
    #             {
    #                 'date': '04/12/2024',
    #                 'project': 'Coastal Protection Vietnam',
    #                 'credit_type': 'Blue Carbon',
    #                 'country': 'Vietnam',
    #                 'volume': '18,670',
    #                 'cost': '1,288,830',
    #                 'price': '69.05',
    #                 'status': 'Retired',
    #             },
    #             {
    #                 'date': '03/12/2024',
    #                 'project': 'Agroforestry Philippines',
    #                 'credit_type': 'Soil & Agriculture',
    #                 'country': 'Philippines',
    #                 'volume': '16,230',
    #                 'cost': '648,120',
    #                 'price': '39.92',
    #                 'status': 'Available',
    #             },
    #             {
    #                 'date': '02/12/2024',
    #                 'project': 'Wind Farm Brazil',
    #                 'credit_type': 'Renewable Energy',
    #                 'country': 'Brazil',
    #                 'volume': '31,500',
    #                 'cost': '1,102,500',
    #                 'price': '35.00',
    #                 'status': 'Available',
    #             },
    #             {
    #                 'date': '01/12/2024',
    #                 'project': 'REDD+ Amazon Reserve',
    #                 'credit_type': 'Forestry & REDD+',
    #                 'country': 'Brazil',
    #                 'volume': '45,200',
    #                 'cost': '2,260,000',
    #                 'price': '50.00',
    #                 'status': 'Retired',
    #             },
    #         ]
    #     }

    @http.route('/portal/api/dashboard/recent_transactions', type='json', auth='user')
    def get_recent_transactions(self, **kw):
        env = request.env
        partner = env.user.partner_id

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
        ])

        lines = lines.sorted(key=lambda l: l.order_id.date_order, reverse=True)[:20]

        rows = []

        for line in lines:
            product = line.product_id
            if not product:
                continue

            # ── Country from product_properties ──────────────────
            tmpl = product.product_tmpl_id
            raw_properties = tmpl.read(['product_properties'])[0].get('product_properties') or []

            country_name = None
            for definition in raw_properties:
                if not isinstance(definition, dict):
                    continue
                if definition.get('type') == 'many2one' and definition.get('comodel') == 'res.country':
                    value = definition.get('value')
                    if value:
                        country = env['res.country'].sudo().browse(value[0])
                        country_name = country.name
                    break

            # ── Status: purchased qty - retired qty ──────────────
            purchased_qty = line.product_uom_qty

            retired_moves = env['stock.move'].sudo().search([
                ('picking_id.owner_id', '=', partner.id),
                ('picking_id.picking_type_id.code', '=', 'burn'),
                ('picking_id.state', '=', 'done'),
                ('status', '=', 'burned'),
                ('product_id', '=', product.id),
            ])
            retired_qty = sum(retired_moves.mapped('product_uom_qty'))

            status = 'Retired' if (purchased_qty - retired_qty) == 0 else 'Available'

            rows.append({
                'date': line.order_id.date_order.strftime('%d/%m/%Y') if line.order_id.date_order else '',
                'project': product.name,
                'credit_type': product.categ_id.name if product.categ_id else '',
                'country': country_name or '',
                'volume': int(line.product_uom_qty),
                'cost': round(line.price_subtotal, 2),
                'price': round(line.price_unit, 2),
                'status': status,
            })

        return {
            'columns': ['Date', 'Project Name', 'Credit Type', 'Country',
                        'Volume (tCO2e)', 'Total Cost (USD)', 'Price/Credit', 'Status'],
            'rows': rows,
        }

    #  Full Dashboard Payload (single-call) 
    @http.route('/portal/api/dashboard/full', type='json', auth='user')
    def get_full_dashboard(self, **kw):
        return {
            'kpi_summary': self.get_kpi_summary(),
            'purchase_volume_trend': self.get_purchase_volume_trend(),
            'retired_vs_available': self.get_retired_vs_available(),
            'spend_by_type': self.get_spend_by_type(),
            'avg_price_monthly': self.get_avg_price_monthly(),
            'top_projects': self.get_top_projects(),
            'volume_by_country': self.get_volume_by_country(),
            'spend_waterfall': self.get_spend_waterfall(),
            'offset_gauge': self.get_offset_gauge(),
            'type_distribution': self.get_type_distribution(),
            'recent_transactions': self.get_recent_transactions(),
        }

class CustomerPortalInventoryDetails(http.Controller):
    @http.route('/portal/api/inventory_details', type='json', auth='user')
    def get_inventory_details(self, **kw):
        env = request.env
        partner = env.user.partner_id

        lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
        ])

        product_data = {}
        for line in lines:
            product = line.product_id
            if not product:
                continue
            if product.id not in product_data:
                product_data[product.id] = {
                    'name': product.name,
                    'purchased': 0.0,
                    'retired': 0.0,
                }

            product_data[product.id]['purchased'] += line.product_uom_qty

        # Fetch retired qty per product from burn stock moves
        product_ids = list(product_data.keys())
        retired_moves = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('picking_id.state', '=', 'done'),
            ('status', '=', 'burned'),
            ('product_id', 'in', product_ids),
        ])

        for move in retired_moves:
            if move.product_id.id in product_data:
                product_data[move.product_id.id]['retired'] += move.product_uom_qty

        result = []
        for product_id, data in product_data.items():
            purchased = int(data['purchased'])
            retired = int(data['retired'])
            active = purchased - retired

            result.append({
                'product_id': product_id,
                'product': data['name'],
                'purchased': purchased,
                'retired': retired,
                'active': active,
            })

        result.sort(key=lambda x: x['purchased'], reverse=True)
     
        return {'inventory_details': result}

    @http.route('/portal/api/retire_credits', type='json', auth='user')
    def retire_credits(self, **kw):
        env = request.env
        partner = env.user.partner_id

        product_id = kw.get('product_id')
        qty = kw.get('quantity')

        if not product_id:
            return {'error': 'product_id is required'}
        if not qty or float(qty) <= 0:
            return {'error': 'quantity must be a positive number'}

        qty = float(qty)

        product = env['product.product'].sudo().browse(product_id)
        if not product.exists():
            return {'error': f'Product {product_id} not found'}

        so_lines = env['sale.order.line'].sudo().search([
            ('order_id.partner_id', '=', partner.id),
            ('order_id.state', 'in', ['sale', 'done']),
            ('product_id', '=', product_id),
        ])
        purchased_qty = sum(so_lines.mapped('product_uom_qty'))

        retired_moves = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('picking_id.state', '=', 'done'),
            ('status', '=', 'burned'),
            ('product_id', '=', product_id),
        ])
        retired_qty = sum(retired_moves.mapped('product_uom_qty'))

        active_qty = purchased_qty - retired_qty
        if qty > active_qty:
            return {'error': f'Insufficient active credits. Available: {int(active_qty)}, Requested: {int(qty)}'}

        burn_type = env['stock.picking.type'].sudo().search([('code', '=', 'burn'),], limit=1)
        if not burn_type:
            return {'error': 'Burn picking type not found'}

        picking = env['stock.picking'].sudo().create({
            'partner_id': partner.id,
            'owner_id': partner.id,
            'picking_type_id': burn_type.id,
            'location_id': burn_type.default_location_src_id.id,
            'location_dest_id': burn_type.default_location_dest_id.id,
        })

        env['stock.move'].sudo().create({
            'description_picking': product.name,
            'picking_id': picking.id,
            'product_id': product.id,
            'product_uom_qty': qty,
            'product_uom': product.uom_id.id,
            'location_id': burn_type.default_location_src_id.id,
            'location_dest_id': burn_type.default_location_dest_id.id,
        })

        picking.action_confirm()
        picking.action_assign()

        for move in picking.move_ids:
            move.quantity = move.product_uom_qty

        picking.button_validate()

        return {
            'success': True,
            'picking_id': picking.id,
            'picking_name': picking.name,
            'product': product.name,
            'quantity_retired': int(qty),
            'remaining_active': int(active_qty - qty),
        }
    
class CustomerPortalSaleOrderDetails(http.Controller):
    @http.route('/portal/api/sale_orders', type='json', auth='user')
    def get_sale_orders(self, **kw):
        env = request.env
        partner = env.user.partner_id

        orders = env['sale.order'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', 'in', ['sale', 'done']),
        ], order='date_order desc')

        result = []
        for order in orders:
            result.append({
                'id': order.id,
                'name': order.name,
                'date_order': order.date_order.strftime('%d/%m/%Y') if order.date_order else '',
                'state': order.state,
                'amount_total': round(order.amount_total, 2),
                'currency': order.currency_id.name if order.currency_id else '',
            })
    
        return {'orders': result}

