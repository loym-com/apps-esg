from odoo import models


class ProductCategory(models.Model):
    _name = "product.category"
    _inherit = ["property.definition.mixin", "product.category"]

    _properties_definition_field = "product_properties_definition"
    _properties_definition_parent_field = "parent_id"
