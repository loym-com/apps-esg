from odoo import models


class PropertyMixin(models.AbstractModel):
    _name = "property.mixin"
    _description = "Property Mixin"

    _properties_field = None

    def _get_properties(self):
        self.ensure_one()
        properties_field = self._properties_field
        if not properties_field:
            return []

        raw_properties = self.read([properties_field])[0].get(properties_field) or []
        formatted_properties = []

        for definition in raw_properties:
            if definition.get("type") == "separator":
                continue

            code = definition.get("code") or ""
            label = self._get_property_label(definition, code)
            value = self._get_property_value(definition)

            formatted_properties.append(
                {
                    "code": code,
                    "label": label,
                    "value": value,
                }
            )

        return sorted(
            formatted_properties,
            key=lambda item: (
                item["code"] == "",
                item["code"].lower(),
                item["label"].lower(),
            ),
        )

    def _get_property(self, code):
        self.ensure_one()
        for prop in self._get_properties():
            if prop.get("code") == code:
                return prop
        return None

    def _get_property_value(self, definition):
        property_type = definition.get("type")
        value = definition.get("value")

        if property_type == "boolean":
            return self.env._("Yes") if value else self.env._("No")

        if not value:
            return None

        if property_type == "many2one":
            return value[1]

        if property_type == "many2many":
            return ", ".join(record[1] for record in value if len(record) > 1)

        if property_type in ("selection", "tags"):
            options = {
                option[0]: option[1:]
                for option in (definition.get(property_type) or [])
            }
            if property_type == "selection":
                selected = options.get(value)
                return selected[0] if selected else None

            tag_names = [options[tag][0] for tag in value if tag in options]
            return ", ".join(tag_names) if tag_names else None

        if isinstance(value, list):
            return ", ".join(str(item) for item in value)

        return str(value)

    def _get_property_label(self, definition, code):
        label = definition.get("string") or code

        # When property_lang is installed, labels may be provided per language.
        translations = definition.get("string_translations") or {}
        if not isinstance(translations, dict):
            return label

        translated_label = translations.get(self.env.lang)
        return translated_label or label
