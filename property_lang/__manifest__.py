{
    "name": "Property Lang",
    "summary": "Store property labels per language",
    "author": "FIQ, Loym",
    "version": "19.0.1.0.0",
    "category": "Hidden",
    "license": "AGPL-3",
    "depends": ["base", "web"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "property_lang/static/src/js/property_definition_translation_dialog.js",
            "property_lang/static/src/js/property_definition_patch.js",
            "property_lang/static/src/js/properties_field_patch.js",
            "property_lang/static/src/xml/property_definition_translation_dialog.xml",
            "property_lang/static/src/xml/property_definition_patch.xml",
        ]
    },
    "installable": True,
}
