from odoo.tests.common import TransactionCase
from odoo.tests import tagged


@tagged("post_install", "-at_install")
class TestProductCategoryDefinitionProtection(TransactionCase):
    def test_child_category_gets_protected_definition_flag_on_parent_update(self):
        parent = self.env["product.category"].create({"name": "1"})
        child = self.env["product.category"].create({"name": "1.1", "parent_id": parent.id})

        parent.write(
            {
                "product_properties_definition": [
                    {
                        "code": "1",
                        "name": "55e0207da89ffd09",
                        "type": "char",
                        "string": "1",
                        "default": False,
                        "string_translations": {"en_US": "1"},
                    }
                ]
            }
        )

        self.assertEqual(
            child.product_properties_definition,
            [
                {
                    "code": "1",
                    "name": "55e0207da89ffd09",
                    "type": "char",
                    "string": "1",
                    "default": False,
                    "string_translations": {"en_US": "1"},
                    "definition_protected": True,
                }
            ],
        )

    def test_parent_change_keeps_protected_definition_flag(self):
        parent = self.env["product.category"].create({"name": "1"})
        parent.write(
            {
                "product_properties_definition": [
                    {
                        "code": "1",
                        "name": "55e0207da89ffd09",
                        "type": "char",
                        "string": "1",
                        "default": False,
                        "string_translations": {"en_US": "1"},
                    }
                ]
            }
        )

        child = self.env["product.category"].create({"name": "1.1"})
        child.write({"parent_id": parent.id})

        self.assertEqual(
            child.product_properties_definition,
            [
                {
                    "code": "1",
                    "name": "55e0207da89ffd09",
                    "type": "char",
                    "string": "1",
                    "default": False,
                    "string_translations": {"en_US": "1"},
                    "definition_protected": True,
                }
            ],
        )