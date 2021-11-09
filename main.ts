import { App, BaseComponent, ButtonComponent, Component, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextComponent, TFile, Vault } from 'obsidian';

export default class RegexPipeline extends Plugin {
	rules: string[]
	pathToRulesets = this.app.vault.configDir + "/regex-rulesets";
	pathToIndex = this.app.vault.configDir + "/regex-rulesets/index.txt"
	menu: ApplyRuleSetMenu

	log (message?: any, ...optionalParams: any[])
	{
		// comment this to disable logging
		console.log("[regex-pipeline] " + message);
	}

	async onload() {
		this.log('loading');
		this.menu = new ApplyRuleSetMenu(this.app, this)
		this.menu.contentEl.className = "rulesets-menu-content"
		this.menu.titleEl.className = "rulesets-menu-title"

		this.addRibbonIcon('dice', 'Regex Rulesets', () => {
			this.menu.open();
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
						this.menu.open();
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
		if (!await this.app.vault.adapter.exists(this.pathToRulesets))
			await this.app.vault.createFolder(this.pathToRulesets)
		if (!await this.app.vault.adapter.exists(this.pathToIndex))
			await this.app.vault.adapter.write(this.pathToIndex, "").catch((r) => {
				new Notice("Failed to write to index file: " + r)
			});

		let p = this.app.vault.adapter.read(this.pathToIndex);
		p.then(s => {
			this.rules = s.split(/\r\n|\r|\n/);
			this.rules = this.rules.filter((v) => v.length > 0);
			this.log(this.rules);
		})
	}

	async appendRulesetsToIndex(name : string) : Promise<boolean> {
		var result : boolean = true
		this.rules.push(name)
		var newIndexValue = "";
		this.rules.forEach((v, i, all) => {
			newIndexValue += v + "\n"
		})
		await this.app.vault.adapter.write(this.pathToIndex, newIndexValue).catch((r) => {
			new Notice("Failed to write to index file: " + r)
			result = false;
		});

		return result;		
	}

	async createRuleset (name : string, content : string) : Promise<boolean> {
		var result : boolean = true
		this.log("createRuleset: " + name);
		var path = this.pathToRulesets + "/" + name;
		if (await this.app.vault.adapter.exists(path)) {
			this.log("file existed: " + path);
			return false;
		}

		await this.app.vault.adapter.write(path, content).catch((r) => {
			new Notice("Failed to write the ruleset file: " + r)
			result = false;
		});

		result = await this.appendRulesetsToIndex(name)
		return true;
	}

	async applyRuleset (ruleset : string) {
		this.log("applyRuleset: " + ruleset);
		let ruleParser = /^"(.+?)"([a-z]*?)->"(.+?)"([a-z]*?)\n?$/gmus;		
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

		let pos = activeMarkdownView.editor.getScrollInfo()
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
		activeMarkdownView.editor.scrollTo(0, pos.top)
		new Notice("Applied " + count + " regex replacements!");
		
	}
}

class ApplyRuleSetMenu extends Modal {
	plugin: RegexPipeline;
	constructor(app: App, plugin: RegexPipeline) {
		super(app);
		this.plugin = plugin;
		this.titleEl.append(this.titleEl.createEl("h1", null, el => { 
			el.innerHTML = this.plugin.pathToRulesets + "/...";
			el.style.setProperty("display", "inline-block");
			el.style.setProperty("width", "92%");
			el.style.setProperty("max-width", "480px");
			el.style.setProperty("margin", "12 0 8");
		}));
		var reloadButton = new ButtonComponent(this.titleEl)
			.setButtonText("RELOAD")
			.onClick(async (evt) => {
				this.plugin.reloadRulesets();
				this.onClose();
				this.onOpen();
			});
		reloadButton.buttonEl.style.setProperty("display", "inline-block")
		reloadButton.buttonEl.style.setProperty("bottom", "8px")
		reloadButton.buttonEl.style.setProperty("margin", "auto")
	}

	onOpen() {
		for (let i = 0; i < this.plugin.rules.length; i++)
		{
			// new Setting(contentEl)
			// 	.setName(this.plugin.rules[i])
			// 	.addButton(btn => btn.onClick(async () => {
			// 		this.plugin.applyRuleset(this.plugin.pathToRulesets + "/" + this.plugin.rules[i])
			// 		this.close();					
			// 	}).setButtonText("Apply"));
			var ruleset = new ButtonComponent(this.contentEl)
				.setButtonText(this.plugin.rules[i])
				.onClick(async (evt) => {
					this.plugin.applyRuleset(this.plugin.pathToRulesets + "/" + this.plugin.rules[i])
					this.close();					
				});
			ruleset.buttonEl.className = "add-ruleset-button";
		}
		var addButton = new ButtonComponent(this.contentEl)
			.setButtonText("+")
			.onClick(async (evt) => {
				new NewRuleset(this.app, this.plugin).open();
			});
		addButton.buttonEl.className = "add-ruleset-button";
		addButton.buttonEl.style.setProperty("width", "3.3em");
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class NewRuleset extends Modal {

	plugin: RegexPipeline;
	constructor(app: App, plugin: RegexPipeline) {
		super(app);
		this.plugin = plugin;
		this.contentEl.className = "ruleset-creation-content"
	}

	onOpen() {
		var nameHint = this.contentEl.createEl("h4");
		nameHint.innerHTML = "Name";
		this.contentEl.append(nameHint);
		var nameInput = this.contentEl.createEl("textarea");
		nameInput.setAttr("rows", "1");
		nameInput.addEventListener('keydown', (e) => {
			if (e.key === "Enter") e.preventDefault();
		  });
		this.contentEl.append(nameInput);
		var contentHint = this.contentEl.createEl("h4");
		contentHint.innerHTML = "Content";
		this.contentEl.append(contentHint);
		var contentInput = this.contentEl.createEl("textarea");
		contentInput.style.setProperty("height", "300px");
		this.contentEl.append(contentInput);
		var saveButton = new ButtonComponent(this.contentEl)
			.setButtonText("Save")
			.onClick(async (evt) => {
				if (!await this.plugin.createRuleset(nameInput.value, contentInput.value))
				{
					new Notice("Failed to create the ruleset! Please check if the file already exist.");
					return
				}
				this.plugin.menu.onClose();
				this.plugin.menu.onOpen();
				this.close()
			});
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}