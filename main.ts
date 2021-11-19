import { App, BaseComponent, ButtonComponent, Component, EventRef, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextAreaComponent, TextComponent, TFile, Vault } from 'obsidian';

export default class RegexPipeline extends Plugin {
	rules: string[]
	pathToRulesets = this.app.vault.configDir + "/regex-rulesets";
	indexFile = "/index.txt"
	menu: ApplyRuleSetMenu
	configs: SavedConfigs
	rightClickEventRef: EventRef

	log (message?: any, ...optionalParams: any[])
	{
		// comment this to disable logging
		console.log("[regex-pipeline] " + message);
	}

	async onload() {
		this.log('loading');
		this.addSettingTab(new ORPSettings(this.app, this))
		this.configs = await this.loadData()
		if (this.configs == null) this.configs = new SavedConfigs(3, false)
		if (this.configs.rulesInVault) this.pathToRulesets = "/regex-rulesets"
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

		this.reloadRulesets().then(
			this.updateRightclickMenu.bind(this)
		)
		this.log("Rulesets: " + this.pathToRulesets);
		this.log("Index: " + this.pathToRulesets + this.indexFile);

	}

	onunload() {
		this.log('unloading');
	}

	async reloadRulesets() {
		if (!await this.app.vault.adapter.exists(this.pathToRulesets))
			await this.app.vault.createFolder(this.pathToRulesets)
		if (!await this.app.vault.adapter.exists(this.pathToRulesets + this.indexFile))
			await this.app.vault.adapter.write(this.pathToRulesets + this.indexFile, "").catch((r) => {
				new Notice("Failed to write to index file: " + r)
			});

		let p = this.app.vault.adapter.read(this.pathToRulesets + this.indexFile);
		p.then(s => {
			this.rules = s.split(/\r\n|\r|\n/);
			this.rules = this.rules.filter((v) => v.length > 0);
			// this.log(this.rules);
		})
	}

	async updateRightclickMenu () {
		if (this.rightClickEventRef != null) this.app.workspace.offref(this.rightClickEventRef)
		this.rightClickEventRef = this.app.workspace.on("editor-menu", (menu) => {
			for (let i = 0; i < Math.min(this.configs.quickRules, this.rules.length); i++)
			{
				let rPath = this.pathToRulesets + "/" + this.rules[i]
				menu.addItem((item) => {
					item.setTitle("Apply Regex Ruleset: " + this.rules[i])
					.onClick(() => {
						this.applyRuleset(rPath)
					});
				});
			}
		})
		this.registerEvent(this.rightClickEventRef)
	}

	async appendRulesetsToIndex(name : string) : Promise<boolean> {
		var result : boolean = true
		this.rules.push(name)
		var newIndexValue = "";
		this.rules.forEach((v, i, all) => {
			newIndexValue += v + "\n"
		})
		await this.app.vault.adapter.write(this.pathToRulesets + this.indexFile, newIndexValue).catch((r) => {
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
		if (!await this.app.vault.adapter.exists(ruleset)) {
			new Notice(ruleset + " not found!");
			return
		}
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
		this.log(pos.top)

		let count = 0;
		let ruleMatches;
		while (ruleMatches = ruleParser.exec(ruleText))
		{
			if (ruleMatches == null) break;
			// this.log("\n" + ruleMatches[1] + "\n↓↓↓↓↓\n"+ ruleMatches[3]);

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
		new Notice("Executed " + count + " regex replacements!");

	}
}

class SavedConfigs {
	constructor(quickRules: number, rulesInVault: boolean) {
		this.quickRules = quickRules
		this.rulesInVault = rulesInVault
	}
	quickRules: number
	rulesInVault: boolean
}

class ORPSettings extends PluginSettingTab {

	plugin: RegexPipeline;
	constructor(app: App, plugin: RegexPipeline) {
		super(app, plugin);
	}

	display() {
		this.containerEl.empty()
		new Setting(this.containerEl)
			.setName("Quick Rules")
			.setDesc("The first N rulesets in your index file will be available in right click menu")
			.addSlider(c => {
				c.setValue(this.plugin.configs.quickRules)
				c.setLimits(0, 10, 1)
				c.setDynamicTooltip()
				c.showTooltip()
				c.onChange((v) => {
					this.plugin.configs.quickRules = v
				})
			})
		new Setting(this.containerEl)
			.setName("Save Rules In Vault")
			.setDesc("Reads rulesets from \".obsidian/regex-rulesets\" when off, \"./regex-ruleset\" when on (useful if you are user of ObsidianSync). ")
			.addToggle(c => {
				c.setValue(this.plugin.configs.rulesInVault)
				c.onChange(v => {
					this.plugin.configs.rulesInVault = v
					if (v) this.plugin.pathToRulesets = "/regex-rulesets"
					else this.plugin.pathToRulesets = this.app.vault.configDir + "/regex-rulesets"
				})
			})
	}

	hide () {
		this.plugin.reloadRulesets()
		this.plugin.updateRightclickMenu()
		this.plugin.saveData(this.plugin.configs)
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
				new NewRulesetPanel(this.app, this.plugin).open();
			});
		addButton.buttonEl.className = "add-ruleset-button";
		addButton.buttonEl.style.setProperty("width", "3.3em");
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class NewRulesetPanel extends Modal {

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