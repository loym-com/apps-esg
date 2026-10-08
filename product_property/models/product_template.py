from odoo import _, fields, models
from odoo.exceptions import ValidationError


class ProductTemplate(models.Model):
    _name = "product.template"
    _inherit = ["property.mixin", "product.template"]
    _properties_field = "product_properties"

    category_lock = fields.Boolean(
        string='Category Lock',
        help="If enabled, the product's category cannot be changed.",
    )

    def write(self, vals):
        if "categ_id" in vals:
            for record in self:
                if record.category_lock:
                    new_category_id = vals["categ_id"]
                    if record.categ_id.id != new_category_id:
                        raise ValidationError(
                            _("The category is locked and cannot be changed.")
                        )
        return super().write(vals)
