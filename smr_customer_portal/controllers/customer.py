from odoo import http
from odoo.http import request

class CustomerDashboardController(http.Controller):
    @http.route('/dashboard/get_profile_details', type='json', auth='user')
    def get_profile_details(self):
        partner = request.env.user.partner_id
        return {
            'name': partner.name or '',
            'email': partner.email or '',
            'phone': partner.phone or '',
            'street': partner.street or '',
            'city': partner.city or '',
            'country': partner.country_id.name if partner.country_id else '',
        }

    @http.route('/dashboard/update_profile_details', type='json', auth='user')
    def update_profile_details(self, **kwargs):
        partner = request.env.user.partner_id
        try:
            update_vals = {}
            if 'name' in kwargs: update_vals['name'] = kwargs['name']
            if 'email' in kwargs: update_vals['email'] = kwargs['email']
            if 'phone' in kwargs: update_vals['phone'] = kwargs['phone']
            if 'city' in kwargs: update_vals['city'] = kwargs['city']
            if 'street' in kwargs: update_vals['street'] = kwargs['street']

            if update_vals:
                partner.sudo().write(update_vals)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
