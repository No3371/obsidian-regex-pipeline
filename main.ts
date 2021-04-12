import { App, BaseComponent, ButtonComponent, Component, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextComponent, TFile, Vault } from 'obsidian';

export default class RegexPipeline extends Plugin {
	rules: string[]
	pathToRulesets = this.app.vault.configDir + "/regex-rulesets/";
	pathToIndex = this.app.vault.configDir + "/regex-rulesets/index.txt"

	log (message?: any, ...optionalParams: any[])
	{
		// comment this to disable logging
		// console.log("[regex-pipeline] " + message);
	}

	async onload() {
		this.log('loading');

		this.addRibbonIcon('dice', 'Regex Rulesets', () => {
			new ApplyRuleSetMenu(this.app, this).open();
		});

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

		this.reloadRulesets();
		this.log("Rulesets: " + this.pathToRulesets);
		this.log("Index: " + this.pathToIndex);
	}

	onunload() {
		this.log('unloading');
	}
	
	async reloadRulesets() {
		if (!this.app.vault.adapter.exists(this.pathToIndex))
			await this.app.vault.adapter.write(this.pathToIndex, "");
		let p = this.app.vault.adapter.read(this.pathToIndex);
		p.then(s => {
			this.rules = s.split(/\r\n|\r|\n/);
			this.rules = this.rules.filter((v) => v.length > 0);
			this.log(this.rules);
		})
	}

	async applyRuleset (ruleset : string) {
		this.log("applyRuleset: " + ruleset);
		let ruleParser = /^"(.+?)"([a-z]?)->"(.+?)"([a-z]?)\n?$/gmus;		
		let ruleText = await this.app.vault.adapter.read(ruleset);

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
			this.log("\n" + ruleMatches[1] + "\n↓↓↓↓↓\n"+ ruleMatches[3]);

			let matchRule = ruleMatches[2].length == 0? new RegExp(ruleMatches[1], 'gm') : new RegExp(ruleMatches[1], ruleMatches[2]);
			if (ruleMatches[4] == 'x') subject = subject.replace(matchRule, '');
			else subject = subject.replace(matchRule, ruleMatches[3]);
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
		contentEl.append(contentEl.createEl("h1", null, el => el.innerHTML = this.plugin.pathToRulesets + "..."));
		for (let i = 0; i < this.plugin.rules.length; i++)
		{
			new Setting(contentEl)
				.setName(this.plugin.rules[i])
				.addButton(btn => btn.onClick(async () => {
					this.plugin.applyRuleset(this.plugin.pathToRulesets + this.plugin.rules[i])
				}).setButtonText("Apply"));
		}
		new ButtonComponent(contentEl)
			.setButtonText("RELOAD")
			.onClick(async (evt) => {
				this.plugin.reloadRulesets();
				this.onClose();
				this.onOpen();
			})
			.buttonEl.style.setProperty("margin", "auto");
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}
