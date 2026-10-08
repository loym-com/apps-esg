from odoo.tests.common import TransactionCase


class TestPropertyLabelTranslations(TransactionCase):
    def test_get_property_label_uses_string_translations(self):
        definition = {
            "string": "Default Label",
            "string_translations": {
                "nb_NO": "Norsk tittel",
                "en_US": "English title",
            },
        }

        label_nb = self.env["property.mixin"].with_context(lang="nb_NO")._get_property_label(
            definition,
            "demo",
        )
        label_fr = self.env["property.mixin"].with_context(lang="fr_FR")._get_property_label(
            definition,
            "demo",
        )

        self.assertEqual(label_nb, "Norsk tittel")
        self.assertEqual(label_fr, "Default Label")
