from odoo import http
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal
import json
import werkzeug


class CustomerPortalRedirect(CustomerPortal):

    # @http.route(['/my/home'], type='http', auth="user", website=True)
    # def home(self, **kw):
    #     if request.env.user.has_group('base.group_portal'):
    #         return request.redirect('/my/dashboard')
    #     return super(CustomPortalRedirect, self).home(**kw)

    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        return values

    @http.route(['/my/dashboard'], type='http', auth="user", website=True)
    def customer_portal_dashboard(self, **kw):
        values = {
            'page_name': 'dashboard',
            'user': request.env.user,
        }
        return request.render('smr_customer_portal.portal_analytics_dashboard_page', values)
    
    @http.route('/custom/logout', type='http', auth='public', website=True, sitemap=False, csrf=False)
    def custom_logout(self, **kwargs):
        request.session.logout(keep_db=True)
        return werkzeug.utils.redirect('/web/login#logout')


