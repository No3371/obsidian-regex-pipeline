import * as fs from 'fs'
import { App, ButtonComponent, Component, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextComponent, TFile, Vault } from 'obsidian';
import * as path from 'path';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class RegexPipeline extends Plugin {
	settings: MyPluginSettings;
	rules: string[]

	log (message?: any, ...optionalParams: any[])
	{
		// comment this to disable logging
		console.log("[regex-pipeline] " + message);
	}

	async onload() {
		this.log('loading plugin');

		await this.loadSettings();

		this.addRibbonIcon('dice', 'Regex Rulesets', () => {
			new ApplyRuleSetMenu(this.app, this).open();
		});

		this.addStatusBarItem().setText('Status Bar Text');

		this.addCommand({
			id: 'apply-ruleset',
			name: 'Apply Ruleset',
			// callback: () => {
			// 	this.log('Simple Callback');
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

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.log('unloading');
	}

	async loadSettings() {
		this.reloadRulesets();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	async reloadRulesets() {
		if (!this.app.vault.adapter.exists(".obsidian/regex-rulesets/index.txt"))
			await this.app.vault.adapter.write(".obsidian/regex-rulesets/index.txt", "");
		let p = this.app.vault.adapter.read(".obsidian/regex-rulesets/index.txt");
		p.then(s => {
			this.rules = s.split(/\r\n|\r|\n/);
			this.rules = this.rules.filter((v) => v.length > 0);
			this.log(this.rules);
		})
	}

	async applyRuleset (ruleset : string) {
		this.log("applyRuleset: " + ruleset);
		let ruleParser = /^"(.+)"([a-z]?)->"(.+)"\n?$/gmu;		
		let ruleText = await this.app.vault.adapter.read(ruleset);
		this.log(ruleText);

		let activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeMarkdownView == null)
		{
			new Notice("No active Markdown file!");
			return;
		}

		let subject;
		let selectionMode;
		if (activeMarkdownView.editor.somethingSelected())
		{
			subject = activeMarkdownView.editor.getSelection();
			selectionMode = true;
		}
		else
		{
			subject = activeMarkdownView.editor.getValue();
		}

		let count = 0;
		let ruleMatches;
		while (ruleMatches = ruleParser.exec(ruleText))
		{
			if (ruleMatches == null) break;
			this.log(ruleMatches);

			let matchRule = ruleMatches[2].length == 0? new RegExp(ruleMatches[1], 'gm') : new RegExp(ruleMatches[1], ruleMatches[2]);
			subject = subject.replace(matchRule, ruleMatches[3]);
			count++;
		}
		if (selectionMode)
			activeMarkdownView.editor.replaceSelection(subject);
		else 
			activeMarkdownView.editor.setValue(subject);

		activeMarkdownView.requestSave();
		new Notice("Applied " + count + " regex replacements!");
		
	}
}

class ApplyRuleSetMenu extends Modal {
	plugin: RegexPipeline;
	constructor(app: App, plugin: RegexPipeline) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('.obsidian/regex-rulesets/...');
		new ButtonComponent(contentEl)
			.setButtonText("RELOAD")
			.onClick(async (evt) => {
				this.plugin.reloadRulesets();
				new ApplyRuleSetMenu(this.app, this.plugin).open();
				this.close();
			});
		for (let i = 0; i < this.plugin.rules.length; i++)
		{
			new Setting(contentEl)
				.setName(this.plugin.rules[i])
				.addButton(btn => btn.onClick(async () => {
					this.plugin.applyRuleset(".obsidian/regex-rulesets/" + this.plugin.rules[i])
				}).setButtonText("Apply"));
		}
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}
