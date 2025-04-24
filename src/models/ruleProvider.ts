import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ObfuscationRule {
    id: string;
    originalText: string;
    replacementText: string;
    isEnabled: boolean;
    isRegex: boolean;
    caseSensitive: boolean;
    scope: 'global' | 'project' | 'file';
}

export class RuleProvider {
    private rules: ObfuscationRule[] = [];
    private context: vscode.ExtensionContext;
    private _onRulesChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onRulesChanged: vscode.Event<void> = this._onRulesChanged.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadRules();
    }

    private loadRules(): void {
        const storedRules = this.context.globalState.get<ObfuscationRule[]>('codeObfuscator.rules');
        if (storedRules) {
            this.rules = storedRules;
        }
    }

    private saveRules(): void {
        this.context.globalState.update('codeObfuscator.rules', this.rules);
        this._onRulesChanged.fire();
    }

    public getRules(): ObfuscationRule[] {
        return [...this.rules];
    }

    public addRule(rule: ObfuscationRule): void {
        this.rules.push(rule);
        this.saveRules();
    }

    public updateRule(updatedRule: ObfuscationRule): void {
        const index = this.rules.findIndex(r => r.id === updatedRule.id);
        if (index !== -1) {
            this.rules[index] = updatedRule;
            this.saveRules();
        }
    }

    public deleteRule(ruleId: string): void {
        this.rules = this.rules.filter(r => r.id !== ruleId);
        this.saveRules();
    }

    public toggleRule(ruleId: string): void {
        const index = this.rules.findIndex(r => r.id === ruleId);
        if (index !== -1) {
            this.rules[index].isEnabled = !this.rules[index].isEnabled;
            this.saveRules();
        }
    }

    public async exportRules(): Promise<void> {
        const filePath = await vscode.window.showSaveDialog({
            filters: {
                'JSON Files': ['json']
            },
            saveLabel: 'Export Rules',
            title: 'Export Obfuscation Rules'
        });

        if (filePath) {
            try {
                fs.writeFileSync(filePath.fsPath, JSON.stringify(this.rules, null, 2));
                vscode.window.showInformationMessage(`Rules exported to ${filePath.fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export rules: ${error}`);
            }
        }
    }

    public async importRules(): Promise<void> {
        const filePaths = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON Files': ['json']
            },
            openLabel: 'Import Rules',
            title: 'Import Obfuscation Rules'
        });

        if (filePaths && filePaths[0]) {
            try {
                const fileContent = fs.readFileSync(filePaths[0].fsPath, 'utf8');
                const importedRules = JSON.parse(fileContent) as ObfuscationRule[];
                
                // Merge with existing rules or replace them
                const choice = await vscode.window.showQuickPick(['Merge with existing rules', 'Replace existing rules'], {
                    placeHolder: 'How would you like to import these rules?'
                });
                
                if (choice === 'Merge with existing rules') {
                    // Avoid duplicates by checking original text
                    for (const importedRule of importedRules) {
                        if (!this.rules.some(r => r.originalText === importedRule.originalText)) {
                            this.rules.push({
                                ...importedRule,
                                id: Date.now().toString() + Math.random().toString().substring(2, 5)
                            });
                        }
                    }
                } else if (choice === 'Replace existing rules') {
                    this.rules = importedRules.map(r => ({
                        ...r,
                        id: Date.now().toString() + Math.random().toString().substring(2, 5)
                    }));
                }
                
                this.saveRules();
                vscode.window.showInformationMessage(`Rules imported from ${filePaths[0].fsPath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to import rules: ${error}`);
            }
        }
    }
}
