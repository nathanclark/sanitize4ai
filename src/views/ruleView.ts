import * as vscode from 'vscode';
import { RuleProvider, ObfuscationRule } from '../models/ruleProvider';

export class RuleView {
    private ruleProvider: RuleProvider;
    private treeDataProvider: RuleTreeDataProvider;
    private treeView: vscode.TreeView<RuleTreeItem>;

    constructor(context: vscode.ExtensionContext, ruleProvider: RuleProvider) {
        this.ruleProvider = ruleProvider;
        this.treeDataProvider = new RuleTreeDataProvider(this.ruleProvider);
        
        // Create tree view
        this.treeView = vscode.window.createTreeView('codeObfuscatorRules', {
            treeDataProvider: this.treeDataProvider,
            showCollapseAll: true
        });
        
        // Register view
        context.subscriptions.push(this.treeView);
        
        // Register event listener for rules changes
        this.ruleProvider.onRulesChanged(() => {
            this.treeDataProvider.refresh();
        });
        
        // Register commands for the view
        context.subscriptions.push(
            vscode.commands.registerCommand('codeObfuscator.editRule', (item: RuleTreeItem) => {
                this.editRule(item.rule);
            })
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('codeObfuscator.deleteRule', (item: RuleTreeItem) => {
                if (item.rule) {
                    this.deleteRule(item.rule.id);
                }
            })
        );
    }

    private async editRule(rule: ObfuscationRule): Promise<void> {
        const replacementText = await vscode.window.showInputBox({
            prompt: `Edit replacement for "${rule.originalText}"`,
            value: rule.replacementText
        });

        if (replacementText !== undefined) {
            rule.replacementText = replacementText;
            this.ruleProvider.updateRule(rule);
        }
    }

    private async deleteRule(ruleId: string): Promise<void> {
        const confirmation = await vscode.window.showWarningMessage(
            'Are you sure you want to delete this rule?',
            'Delete',
            'Cancel'
        );

        if (confirmation === 'Delete') {
            this.ruleProvider.deleteRule(ruleId);
        }
    }
}

class RuleTreeItem extends vscode.TreeItem {
    constructor(
        public readonly rule: ObfuscationRule,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(rule.originalText, collapsibleState);
        
        this.tooltip = `${rule.originalText} → ${rule.replacementText}`;
        this.description = rule.replacementText;
        
        this.iconPath = rule.isEnabled 
            ? new vscode.ThemeIcon('check')
            : new vscode.ThemeIcon('circle-outline');
            
        this.contextValue = 'obfuscationRule';
        
        this.command = {
            command: 'codeObfuscator.toggleRule',
            title: 'Toggle Rule',
            arguments: [rule.id]
        };
    }
}

class RuleTreeDataProvider implements vscode.TreeDataProvider<RuleTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RuleTreeItem | undefined> = new vscode.EventEmitter<RuleTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<RuleTreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private ruleProvider: RuleProvider) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: RuleTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RuleTreeItem): RuleTreeItem[] {
        if (element) {
            return [];
        } else {
            const rules = this.ruleProvider.getRules();
            return rules.map(rule => new RuleTreeItem(
                rule,
                vscode.TreeItemCollapsibleState.None
            ));
        }
    }
}
