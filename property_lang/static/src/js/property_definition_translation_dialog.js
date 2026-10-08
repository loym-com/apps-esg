/** @odoo-module **/

import { Dialog } from "@web/core/dialog/dialog";
import { loadLanguages, _t } from "@web/core/l10n/translation";
import { jsToPyLocale } from "@web/core/l10n/utils";
import { user } from "@web/core/user";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart } from "@odoo/owl";

export class PropertyDefinitionTranslationDialog extends Component {
    static template = "property_lang.PropertyDefinitionTranslationDialog";
    static components = { Dialog };
    static props = {
        close: Function,
        onSave: Function,
        propertyLabel: { type: String, optional: true },
        currentValue: { type: String, optional: true },
        currentLang: { type: String, optional: true },
        translations: { type: Object, optional: true },
    };

    setup() {
        this.orm = useService("orm");
        this.user = user;
        this.title = _t("Translate: %s", this.props.propertyLabel || _t("Label"));
        this.terms = [];
        this.updatedTerms = {};

        onWillStart(async () => {
            const languages = await loadLanguages(this.orm);
            const currentLang = this.props.currentLang || jsToPyLocale(this.user.lang);
            const rawTranslations = this.props.translations || {};

            this.terms = languages
                .map(([code, name], index) => {
                    const value =
                        code === currentLang
                            ? this.props.currentValue || ""
                            : rawTranslations[code] || "";
                    this.updatedTerms[index + 1] = value;
                    return {
                        id: index + 1,
                        lang: code,
                        langName: name,
                        value,
                    };
                })
                .sort((a, b) => a.langName.localeCompare(b.langName));
        });
    }

    async onSaveDialog() {
        const currentLang = this.props.currentLang || jsToPyLocale(this.user.lang);
        let currentValue = this.props.currentValue || "";
        const translations = {};

        for (const term of this.terms) {
            const value = (this.updatedTerms[term.id] || "").trim();
            if (term.lang === currentLang) {
                currentValue = value;
                continue;
            }
            if (value) {
                translations[term.lang] = value;
            }
        }

        await this.props.onSave({
            currentValue,
            translations,
        });
        this.props.close();
    }
}
