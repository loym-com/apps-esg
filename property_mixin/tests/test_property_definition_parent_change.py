from odoo.tests.common import TransactionCase


class TestPropertyDefinitionParentChange(TransactionCase):
    def test_merge_parent_change_keeps_category_only_codes(self):
        mixin_model = self.env["property.definition.mixin"]

        old_parent_definitions = [
            {"name": "A", "type": "char", "code": "a"},
            {"name": "B", "type": "char", "code": "b"},
        ]
        record_definitions = [
            {"name": "A", "type": "char", "code": "a"},
            {"name": "B", "type": "char", "code": "b"},
            {"name": "Category C", "type": "char", "code": "c"},
            {"name": "Category D", "type": "char", "code": "d"},
            {"name": "Duplicate D", "type": "char", "code": "d"},
            {"name": "Local Separator", "type": "separator"},
        ]
        new_parent_definitions = [
            {"name": "B", "type": "char", "code": "b"},
            {"name": "Parent E", "type": "char", "code": "e"},
            {"name": "Parent C", "type": "char", "code": "c"},
            {"name": "Parent Separator", "type": "separator"},
        ]

        merged = mixin_model._merge_parent_change_definitions(
            record_definitions,
            old_parent_definitions,
            new_parent_definitions,
        )

        merged_codes = [
            definition.get("code")
            for definition in merged
            if definition.get("code") and definition.get("type") != "separator"
        ]

        self.assertEqual(merged_codes, ["c", "d", "b", "e"])

        parent_separator_count = sum(
            1
            for definition in merged
            if definition.get("type") == "separator"
            and definition.get("name") == "Parent Separator"
        )
        local_separator_count = sum(
            1
            for definition in merged
            if definition.get("type") == "separator"
            and definition.get("name") == "Local Separator"
        )

        self.assertEqual(parent_separator_count, 1)
        self.assertEqual(local_separator_count, 0)

    def test_get_updated_definitions_detects_changes_by_code(self):
        mixin_model = self.env["property.definition.mixin"]

        old_definitions = [
            {"name": "A", "string": "A", "type": "char", "code": "a"},
            {"name": "B", "string": "B", "type": "char", "code": "b"},
        ]
        new_definitions = [
            {"name": "A", "string": "A (updated)", "type": "char", "code": "a"},
            {"name": "B", "string": "B", "type": "char", "code": "b"},
        ]

        updated = mixin_model._get_updated_definitions(old_definitions, new_definitions)
        updated_codes = sorted(definition.get("code") for definition in updated)

        self.assertEqual(updated_codes, ["a"])

    def test_get_updated_definitions_ignores_definition_changed_flag(self):
        mixin_model = self.env["property.definition.mixin"]

        old_definitions = [
            {"name": "A", "string": "A", "type": "char", "code": "a"},
        ]
        new_definitions = [
            {
                "name": "A",
                "string": "A",
                "type": "char",
                "code": "a",
                "definition_changed": True,
            },
        ]

        updated = mixin_model._get_updated_definitions(old_definitions, new_definitions)

        self.assertFalse(updated)

    def test_protect_inherited_definitions_marks_parent_codes(self):
        mixin_model = self.env["property.definition.mixin"]

        definitions = [
            {"name": "A", "string": "A", "type": "char", "code": "a"},
            {"name": "B", "string": "B", "type": "char", "code": "b"},
            {"name": "Separator", "type": "separator"},
        ]

        protected = mixin_model._protect_inherited_definitions(definitions, {"a"})

        self.assertEqual(protected[0]["definition_protected"], True)
        self.assertNotIn("definition_protected", protected[1])
        self.assertNotIn("definition_protected", protected[2])

    def test_protect_inherited_definitions_clears_stale_flag(self):
        mixin_model = self.env["property.definition.mixin"]

        definitions = [
            {
                "name": "A",
                "string": "A",
                "type": "char",
                "code": "a",
                "definition_protected": True,
            }
        ]

        protected = mixin_model._protect_inherited_definitions(definitions, set())

        self.assertNotIn("definition_protected", protected[0])

    def test_reorder_child_definitions_parent_codes_first(self):
        mixin_model = self.env["property.definition.mixin"]

        parent_definitions = [
            {"name": "B", "type": "char", "code": "b"},
            {"name": "A", "type": "char", "code": "a"},
            {"name": "Parent Separator", "type": "separator"},
        ]
        child_definitions = [
            {"name": "A", "type": "char", "code": "a"},
            {"name": "Child Separator", "type": "separator"},
            {"name": "Child C", "type": "char", "code": "c"},
            {"name": "B", "type": "char", "code": "b"},
        ]

        reordered = mixin_model._reorder_child_definitions(
            child_definitions,
            parent_definitions,
        )

        reordered_codes = [
            definition.get("code")
            for definition in reordered
            if definition.get("code") and definition.get("type") != "separator"
        ]
        self.assertEqual(reordered_codes, ["b", "a", "c"])

        child_separator_index = next(
            i for i, definition in enumerate(reordered) if definition.get("name") == "Child Separator"
        )
        self.assertGreater(child_separator_index, 1)

    def test_has_definition_order_change_detects_order_only_changes(self):
        mixin_model = self.env["property.definition.mixin"]

        old_definitions = [
            {"name": "S1", "type": "char", "code": "s1"},
            {"name": "S2", "type": "char", "code": "s2"},
        ]
        new_definitions = [
            {"name": "S2", "type": "char", "code": "s2"},
            {"name": "S1", "type": "char", "code": "s1"},
        ]

        self.assertTrue(
            mixin_model._has_definition_order_change(old_definitions, new_definitions)
        )
