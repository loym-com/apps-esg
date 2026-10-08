from odoo import fields, models


class ProductProduct(models.Model):
    _inherit = "product.product"

    cc_data_history = fields.Text(string="CC Data History")
