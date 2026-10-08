{
    'name': 'SMR Customer Portal Dashboard',
    'version': '19.0.1.0.0',
    'category': 'Website',
    'summary': 'Carbon credits analytics dashboard for customer portal',
    'depends': ['base', 'web', 'website', 'portal'],
    'data': [
        'views/portal_dashboard_template.xml',
        'views/portal_menu.xml'
    ],
    'assets': {
        'web.assets_frontend': [
            'smr_customer_portal/static/src/css/portal_dashboard.css',
            'smr_customer_portal/static/src/js/portal_dashboard.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
