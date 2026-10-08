/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PropertyDefinition } from "@web/views/fields/properties/property_definition";

patch(PropertyDefinition.prototype, {
    /**
     * Update the stable technical code used for reporting.
     * The backend enforces lowercase alphanumeric and underscore only.
     */
    onPropertyCodeChange(event) {
        const code = (event.target.value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_");

        const propertyDefinition = {
            ...this.state.propertyDefinition,
            code,
        };
        this.props.onChange(propertyDefinition);
        this.state.propertyDefinition = propertyDefinition;
    },
});
