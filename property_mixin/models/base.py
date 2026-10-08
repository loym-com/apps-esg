from odoo import models


class Base(models.AbstractModel):
    _inherit = "base"

    def _additional_allowed_keys_properties_definition(self):
        return (*super()._additional_allowed_keys_properties_definition(), "definition_protected")
