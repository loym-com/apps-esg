/** @odoo-module **/

import { localization } from "@web/core/l10n/localization";
import { jsToPyLocale } from "@web/core/l10n/utils";
import { patch } from "@web/core/utils/patch";
import { user } from "@web/core/user";
import { useOwnedDialogs } from "@web/core/utils/hooks";
import { PropertyDefinition } from "@web/views/fields/properties/property_definition";
import { PropertyDefinitionTranslationDialog } from "./property_definition_translation_dialog";

patch(PropertyDefinition.prototype, {
    setup() {
        super.setup(...arguments);
        this.addDialog = useOwnedDialogs();
        this._applyTranslatedLabelToState();
    },

    async _syncStateWithProps(propertyDefinition) {
        await super._syncStateWithProps(...arguments);
        this._applyTranslatedLabelToState(propertyDefinition);
    },

    _applyTranslatedLabelToState(propertyDefinition = this.state.propertyDefinition) {
        const lang = this.props.context?.lang;
        if (!lang || !propertyDefinition) {
            return;
        }

        const translations = propertyDefinition.string_translations || {};
        const translated = translations[lang];
        if (typeof translated !== "string") {
            return;
        }

        this.state.propertyDefinition = {
            ...propertyDefinition,
            string: translated,
        };
    },

    get isMultiLang() {
        return localization.multiLang;
    },

    get lang() {
        return new Intl.Locale(user.lang).language.toUpperCase();
    },

    _currentLangCode() {
        return this.props.context?.lang || jsToPyLocale(user.lang);
    },

    /**
     * Keep per-language property titles in string_translations.
     */
    onPropertyLabelChange(event) {
        const newString = event.target.value || "";
        const lang = this._currentLangCode();
        const translations = {
            ...(this.state.propertyDefinition.string_translations || {}),
        };

        if (lang) {
            translations[lang] = newString;
        }

        const propertyDefinition = {
            ...this.state.propertyDefinition,
            string: newString,
        };
        propertyDefinition.string_translations = translations;

        this.props.onChange(propertyDefinition);
        this.state.propertyDefinition = propertyDefinition;
    },

    onPropertyLabelTranslateClick() {
        const currentLang = this._currentLangCode();
        const propertyDefinition = this.state.propertyDefinition;

        this.addDialog(PropertyDefinitionTranslationDialog, {
            propertyLabel: propertyDefinition.string || "Label",
            currentValue: propertyDefinition.string || "",
            currentLang,
            translations: propertyDefinition.string_translations || {},
            onSave: async ({ currentValue, translations }) => {
                const updatedDefinition = {
                    ...this.state.propertyDefinition,
                    string: currentValue,
                };

                updatedDefinition.string_translations = {
                    ...translations,
                    [currentLang]: currentValue,
                };

                this.props.onChange(updatedDefinition);
                this.state.propertyDefinition = updatedDefinition;
            },
        });
    },
});
