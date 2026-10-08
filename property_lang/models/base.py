from odoo import models


class Base(models.AbstractModel):
    _inherit = "base"

    def _additional_allowed_keys_properties_definition(self):
        return (*super()._additional_allowed_keys_properties_definition(), "string_translations")

    def _validate_properties_definition(self, properties_definition, field):
        super()._validate_properties_definition(properties_definition, field)

        for definition in properties_definition:
            translations = definition.get("string_translations")
            if not translations:
                continue

            if not isinstance(translations, dict):
                raise ValueError("The property key 'string_translations' must be a dict.")

            for lang_code, label in translations.items():
                if not isinstance(lang_code, str):
                    raise ValueError("Translation language codes must be strings.")
                if not isinstance(label, str):
                    raise ValueError("Translated property labels must be strings.")
