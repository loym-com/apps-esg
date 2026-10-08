/** @odoo-module **/

import { jsToPyLocale } from "@web/core/l10n/utils";
import { user } from "@web/core/user";
import { patch } from "@web/core/utils/patch";
import { PropertiesField } from "@web/views/fields/properties/properties_field";

patch(PropertiesField.prototype, {
    get propertiesList() {
        const lang = this.props.context?.lang || jsToPyLocale(user.lang);
        return (this.props.record.data[this.props.name] || [])
            .filter((definition) => !definition.definition_deleted)
            .map((definition) => {
                const translated = definition.string_translations?.[lang];
                return {
                    ...definition,
                    string:
                        typeof translated === "string" && translated.length
                            ? translated
                            : definition.string,
                };
            });
    },
});
