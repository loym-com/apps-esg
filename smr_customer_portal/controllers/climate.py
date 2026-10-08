from odoo import http, fields
from odoo.http import request
from datetime import date

class ClimateAPI(http.Controller):
    # @http.route('/portal/api/climate/recent_retirement', type='json', auth='user')
    # def get_recent_retirement(self, **kw):
    #     return {
    #         'project_name': 'Amazon Rainforest Conservation Project',
    #         'amount': '2.50',
    #         'date': 'May 12, 2025',
    #         'image_url': 'https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-4.0.3'
    #     }

    @http.route('/portal/api/climate/recent_retirement', type='json', auth='user')
    def get_recent_retirement(self, **kw):
        env = request.env
        partner = env.user.partner_id

        last_move = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('status', '=', 'burned'),
            ('picking_id.state', '=', 'done')
        ], order='id desc', limit=1)

        if not last_move:
            return {
                'project_name': '',
                'amount': '0.00',
                'date': '',
                'source_location': '',
                'dest_location': '',
                'image_url': 'https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-4.0.3'
            }

        retired_date = last_move.retired_date
        date_str = retired_date.strftime('%b %d, %Y') if retired_date else ''

        return {
            'project_name': last_move.name,
            'amount': f"{last_move.product_uom_qty:.2f}",
            'date': date_str,
            'source_location': last_move.location_id.complete_name or last_move.location_id.name,
            'dest_location': last_move.location_dest_id.complete_name or last_move.location_dest_id.name,
            'image_url': 'https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-4.0.3'
        }

    # @http.route('/portal/api/climate/portfolio_data', type='json', auth='user')
    # def get_portfolio_data(self, **kw):
    #     return {
    #         'stats': {
    #             'certificates': 7,
    #             'contributions': '12.75',
    #             'projects': 18,
    #             'retirements': 7,
    #             'portfolio': 4,
    #             'documents': 12
    #         },
    #         'timeline': [
    #             {'month': 'May 2024', 'amount': '1.50', 'active': True},
    #             {'month': 'Jul 2024', 'amount': '2.25', 'active': True},
    #             {'month': 'Sep 2024', 'amount': '1.75', 'active': True},
    #             {'month': 'Nov 2024', 'amount': '2.50', 'active': True},
    #             {'month': 'Jan 2025', 'amount': '2.00', 'active': True},
    #             {'month': 'Mar 2025', 'amount': '2.75', 'active': False}
    #         ],
    #         'timeline_progress': 82,
    #         'summary': {
    #             'total_retired': '12.75',
    #             'active_projects': 4,
    #             'retirements': 7
    #         }
    #     }
    
    @http.route('/portal/api/climate/portfolio_data', type='json', auth='user')
    def get_portfolio_data(self, **kw):
        env = request.env
        partner = env.user.partner_id

        def get_my_certificates():
            return env['smr.minted.tokens'].sudo().search_count([('partner_id', '=', partner.id)])

        def get_purchase_lines():
            return env['sale.order.line'].sudo().search([
                ('order_id.partner_id', '=', partner.id),
                ('order_id.state', 'in', ['sale', 'done'])
            ])

        def get_credits_purchased(lines):
            return sum(lines.mapped('product_uom_qty'))

        def get_distinct_projects(lines):
            return len(lines.mapped('product_id'))

        def get_credits_retired():
            moves = env['stock.move'].sudo().search([
                ('picking_id.owner_id', '=', partner.id),
                ('picking_id.picking_type_id.code', '=', 'burn'),
                ('picking_id.state', '=', 'done'),
                ('status', '=', 'burned'),
            ])
            return sum(moves.mapped('product_uom_qty'))

        def get_retirement_records_count():
            return env['stock.move'].sudo().search_count([
                ('picking_id.owner_id', '=', partner.id),
                ('picking_id.picking_type_id.code', '=', 'burn'),
                ('picking_id.state', '=', 'done')
            ])

        def get_monthly_timeline(lines):
            today = fields.Date.today()
            current_year = today.year
            current_month = today.month

            monthly_totals = {m: 0.0 for m in range(1, current_month + 1)}
            for line in lines:
                order_date = line.order_id.date_order
                if not order_date:
                    continue
                order_date = fields.Datetime.from_string(order_date) if isinstance(order_date, str) else order_date
                if order_date.year == current_year and order_date.month <= current_month:
                    monthly_totals[order_date.month] += line.product_uom_qty

            timeline = []
            for m in range(1, current_month + 1):
                month_label = date(current_year, m, 1).strftime('%b %Y')
                timeline.append({
                    'month': month_label,
                    'amount': f"{monthly_totals[m]:.2f}",
                    'active': True
                })
            return timeline

        purchase_lines = get_purchase_lines()

        certificates = get_my_certificates()
        contributions = get_credits_purchased(purchase_lines)
        projects = get_distinct_projects(purchase_lines)
        portfolio = projects
        retirements = get_retirement_records_count()
        total_retired = get_credits_retired()

        return {
            'stats': {
                'certificates': certificates,
                'contributions': f"{contributions:.2f}",
                'projects': projects,
                'retirements': retirements,
                'portfolio': portfolio,
                'documents': 0
            },
            'timeline': get_monthly_timeline(purchase_lines),
            'timeline_progress': round((date.today().month / 12) * 100),
            'summary': {
                'total_retired': f"{total_retired:.2f}",
                'active_projects': portfolio,
                'retirements': retirements
            }
        }

    @http.route('/portal/api/climate/certificates', type='json', auth='user')
    def get_certificates(self, **kw):
        env = request.env
        partner = env.user.partner_id

        tokens = env['smr.minted.tokens'].sudo().search([
            ('partner_id', '=', partner.id),
            ('status', '=', 'minted')
        ], order='id desc')

        result = []
        for token in tokens:
            result.append({
                'certificate_id': token.certificate_id,
                'metadata_hash': token.metadata_hash,
                'pdf_hash': token.pdf_hash,
                'token_url': token.token_url,
                'key': token.key,
            })

        return result

    @http.route('/portal/api/climate/contributions', type='json', auth='user')
    def get_my_contributions(self, **kw):
        env = request.env
        partner = env.user.partner_id

        orders = env['sale.order'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', 'in', ['sale', 'done'])
        ], order='date_order desc')

        result = []
        for order in orders:
            total_qty = sum(order.order_line.mapped('product_uom_qty'))
            order_date = order.date_order
            date_str = order_date.strftime('%b %d, %Y') if order_date else ''

            result.append({
                'name': order.name,
                'total_quantity': f"{total_qty:.2f}",
                'total_amount': f"{order.amount_total:.2f}",
                'date': date_str,
            })

        return result

    @http.route('/portal/api/climate/projects', type='json', auth='user')
    def get_projects(self, **kw):
        env = request.env
        partner = env.user.partner_id

        orders = env['sale.order'].sudo().search([
            ('partner_id', '=', partner.id),
            ('state', 'in', ['sale', 'done'])
        ])
        order_lines = orders.mapped('order_line')
        products = {}
        for line in order_lines:
            product = line.product_id
            if not product:
                continue
            if product.id not in products:
                products[product.id] = {
                    'product_name': product.name,
                    'total_quantity': 0.0,
                    'retired_quantity': 0.0,
                    'category_name': product.categ_id.name or '',
                }
            products[product.id]['total_quantity'] += line.product_uom_qty

        # fetch retirement (burn) moves for this partner, across all products at once
        retirement_moves = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('picking_id.state', '=', 'done'),
            ('product_id', 'in', list(products.keys()))
        ])

        for move in retirement_moves:
            pdt_id = move.product_id.id
            if pdt_id in products:
                products[pdt_id]['retired_quantity'] += move.product_uom_qty

        result = []
        for pdt_id, data in products.items():
            result.append({
                'product_name': data['product_name'],
                'total_quantity': f"{data['total_quantity']:.2f}",
                'retired_quantity': f"{data['retired_quantity']:.2f}",
                'category_name': data['category_name'],
            })

        return result

    @http.route('/portal/api/climate/retirements', type='json', auth='user')
    def get_retirement_records(self, **kw):
        env = request.env
        partner = env.user.partner_id

        moves = env['stock.move'].sudo().search([
            ('picking_id.owner_id', '=', partner.id),
            ('picking_id.picking_type_id.code', '=', 'burn'),
            ('picking_id.state', '=', 'done')
        ], order='id desc')

        result = []
        for move in moves:
            move_date = move.date
            date_str = move_date.strftime('%b %d, %Y') if move_date else ''

            result.append({
                'picking_name': move.picking_id.name,
                'quantity': f"{move.product_uom_qty:.2f}",
                'source_location': move.location_id.complete_name or move.location_id.name,
                'dest_location': move.location_dest_id.complete_name or move.location_dest_id.name,
                'date': date_str,
            })

        return result
