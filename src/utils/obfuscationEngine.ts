import { RuleProvider, ObfuscationRule } from '../models/ruleProvider';

export class ObfuscationEngine {
    private ruleProvider: RuleProvider;

    constructor(ruleProvider: RuleProvider) {
        this.ruleProvider = ruleProvider;
    }

    public obfuscateText(text: string): string {
        const rules = this.ruleProvider.getRules().filter(rule => rule.isEnabled);
        let resultText = text;

        for (const rule of rules) {
            resultText = this.applyRule(resultText, rule);
        }

        return resultText;
    }

    private applyRule(text: string, rule: ObfuscationRule): string {
        if (rule.isRegex) {
            try {
                const flags = rule.caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(rule.originalText, flags);
                return text.replace(regex, rule.replacementText);
            } catch (error) {
                console.error(`Invalid regex in rule: ${rule.originalText}`, error);
                return text;
            }
        } else {
            // Simple string replacement
            if (rule.caseSensitive) {
                return this.replaceAll(text, rule.originalText, rule.replacementText);
            } else {
                return this.replaceAllCaseInsensitive(text, rule.originalText, rule.replacementText);
            }
        }
    }

    private replaceAll(text: string, search: string, replacement: string): string {
        return text.split(search).join(replacement);
    }

    private replaceAllCaseInsensitive(text: string, search: string, replacement: string): string {
        const regex = new RegExp(this.escapeRegExp(search), 'gi');
        return text.replace(regex, replacement);
    }

    private escapeRegExp(string: string): string {
        // Manual escape of all special regex characters
        let result = string;
        const specialChars = ["\\", ".", "*", "+", "?", "^", "$", "(", ")", "[", "]", "{", "}", "|"];
        
        for (const char of specialChars) {
            // Use string.split().join() instead of replace to avoid regex issues
            result = result.split(char).join("\\" + char);
        }
        
        return result;
    }
}
