import * as vscode from 'vscode';
import { RuleProvider } from './models/ruleProvider';
import { RuleView } from './views/ruleView';
import { ObfuscationEngine } from './utils/obfuscationEngine';

let ruleProvider: RuleProvider;
let ruleView: RuleView;
let obfuscationEngine: ObfuscationEngine;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Obfuscator extension is now active');


    // Initialize components
    ruleProvider = new RuleProvider(context);
    obfuscationEngine = new ObfuscationEngine(ruleProvider);
    ruleView = new RuleView(context, ruleProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.createRuleFromSelection', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.selection;
                if (!selection.isEmpty) {
                    const selectedText = editor.document.getText(selection);
                    createRuleFromSelection(selectedText);
                } else {
                    vscode.window.showInformationMessage('Please select text to create an obfuscation rule');
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.applyRules', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                applyObfuscationRules(editor);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.toggleRule', (ruleId: string) => {
            ruleProvider.toggleRule(ruleId);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.exportRules', () => {
            ruleProvider.exportRules();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.importRules', () => {
            ruleProvider.importRules();
        })
    );

    // Register editor right-click menu item
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('*', {
            provideCodeActions: (document, range) => {
                const createRuleAction = new vscode.CodeAction('Create Obfuscation Rule', vscode.CodeActionKind.RefactorRewrite);
                createRuleAction.command = {
                    command: 'codeObfuscator.createRuleFromSelection',
                    title: 'Create Obfuscation Rule',
                    tooltip: 'Create a new rule to obfuscate this text'
                };
                return [createRuleAction];
            }
        })
    );

    // Add this in the activate function with the other command registrations
    context.subscriptions.push(
        vscode.commands.registerCommand('codeObfuscator.applyRulesToFolder', async () => {
            const folderOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Folder'
            };
            const folderUris = await vscode.window.showOpenDialog(folderOptions);

            if (folderUris && folderUris.length > 0) {
                const folderUri = folderUris[0];
                await applyObfuscationRulesToFolder(folderUri);
            }
        })
    );
    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(shield) Obfuscate";
    statusBarItem.tooltip = "Apply obfuscation rules to current document";
    statusBarItem.command = 'codeObfuscator.applyRules';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    // Clean up resources if needed
}

async function createRuleFromSelection(selectedText: string) {
    const replacementValue = await vscode.window.showInputBox({
        prompt: 'Enter replacement value for ' + selectedText,
        placeHolder: 'e.g. COMPANY_NAME'
    });

    if (replacementValue) {
        ruleProvider.addRule({
            id: Date.now().toString(),
            originalText: selectedText,
            replacementText: replacementValue,
            isEnabled: true,
            isRegex: false,
            caseSensitive: true,
            scope: 'global'
        });
        vscode.window.showInformationMessage(`Rule created: "${selectedText}" → "${replacementValue}"`);

        // Add this code to automatically apply the rule right after creation
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            applyObfuscationRules(editor);
        }
    }
}

async function applyObfuscationRules(editor: vscode.TextEditor) {
    const document = editor.document;
    const fullText = document.getText();

    const obfuscatedText = obfuscationEngine.obfuscateText(fullText);

    editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(fullText.length)
        );
        editBuilder.replace(fullRange, obfuscatedText);
    });

    vscode.window.showInformationMessage('Obfuscation rules applied');
}

async function applyObfuscationRulesToFolder(folderUri: vscode.Uri) {
    const pattern = new vscode.RelativePattern(folderUri.fsPath, '**/*');
    const files = await vscode.workspace.findFiles(pattern);

    let processedCount = 0;

    // Show progress indicator
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Obfuscating files",
        cancellable: true
    }, async (progress, token) => {
        const totalFiles = files.length;

        for (let i = 0; i < files.length; i++) {
            if (token.isCancellationRequested) {
                break;
            }

            const file = files[i];
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const originalText = document.getText();
                const obfuscatedText = obfuscationEngine.obfuscateText(originalText);

                // Only update if changes were made
                if (originalText !== obfuscatedText) {
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(originalText.length)
                    );
                    edit.replace(file, fullRange, obfuscatedText);
                    await vscode.workspace.applyEdit(edit);
                    await document.save();
                    processedCount++;
                }

                // Update progress
                progress.report({
                    message: `Processing file ${i + 1} of ${totalFiles}`,
                    increment: (100 / totalFiles)
                });

            } catch (error) {
                console.error(`Error processing file ${file.fsPath}:`, error);
            }
        }
    });

    vscode.window.showInformationMessage(`Obfuscation complete. Modified ${processedCount} file(s).`);
}