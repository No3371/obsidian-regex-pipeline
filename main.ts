import * as fs from 'fs'
import { App, ButtonComponent, Component, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';
import * as path from 'path';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	rules: string[]

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		this.addRibbonIcon('dice', 'Regex Rulesets', () => {
			new ApplyRuleSetMenu(this.app, this).open();
		});

		this.addStatusBarItem().setText('Status Bar Text');

		this.addCommand({
			id: 'apply-ruleset',
			name: 'Apply Ruleset',
			// callback: () => {
			// 	console.log('Simple Callback');
			// },
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new ApplyRuleSetMenu(this.app, this).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.getRulesets(this.app.vault.configDir + "/regex-pipleline-rules/");
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	async getRulesets(rulesetFolder : string) {
		fs.readdir(path.resolve(rulesetFolder), (err, files) => {
			this.rules = files;
		});
	}

	applyRuleset (ruleset : string) {
		let lineParser = /^"(.+)"\s?"(.+)"\n$/;
		let ruleMatches = lineParser.exec(fs.readFileSync(ruleset).toString())
		if (ruleMatches == null) return;
		let activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeMarkdownView == null) return;

		console.log(ruleMatches);
		let matchRule = new RegExp(ruleMatches[1]);
		if (activeMarkdownView.editor.somethingSelected())
		{
			let newSelection = activeMarkdownView.editor.getSelection().replace(matchRule, ruleMatches[2]);
			activeMarkdownView.editor.replaceSelection(newSelection)
		}
		else
		{
			let newFullNote = activeMarkdownView.data.replace(matchRule, ruleMatches[2]);
		}

		activeMarkdownView.requestSave();
	}
}

class ApplyRuleSetMenu extends Modal {
	plugin: MyPlugin;
	constructor(app: App, plugin: MyPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Rules are located at .obsidian/regex-pipeline-rulesets');
		for (let i = 0; i < this.plugin.rules.length; i++)
		{
			new Setting(contentEl)
				.setName(this.plugin.rules[i])
				.addButton(btn => btn.onClick(async () => {
					this.plugin.applyRuleset(this.plugin.rules[i])
				}))
		}
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}


class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s not a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue('')
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
