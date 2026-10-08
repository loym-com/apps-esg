from odoo import models
from odoo.orm.fields_properties import check_property_field_value_name


class Base(models.AbstractModel):
    _inherit = "base"

    def _additional_allowed_keys_properties_definition(self):
        return (*super()._additional_allowed_keys_properties_definition(), "code")

    def _validate_properties_definition(self, properties_definition, field):
        super()._validate_properties_definition(properties_definition, field)

        seen_codes = set()
        for definition in properties_definition:
            if definition.get("type") == "separator":
                continue

            code = definition.get("code")
            if not code:
                continue

            check_property_field_value_name(code)
            if code in seen_codes:
                raise ValueError(f"The property code {code!r} is duplicated.")
            seen_codes.add(code)
