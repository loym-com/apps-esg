{
    "name": "Property Code",
    "summary": "Adds a stable code for dynamic properties",
    "author": "FIQ, Loym",
    "version": "19.0.1.0.0",
    "category": "Hidden",
    "license": "AGPL-3",
    "depends": ["base", "web"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "property_code/static/src/js/property_definition_patch.js",
            "property_code/static/src/xml/property_definition_patch.xml"
        ]
    },
    "installable": True,
}
