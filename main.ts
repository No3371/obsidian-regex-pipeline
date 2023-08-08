import { App, BaseComponent, ButtonComponent, Component, EventRef, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextAreaComponent, TextComponent, TFile, Vault, Command, Editor, Hotkey, SliderComponent } from 'obsidian';

export default class RegexPipeline extends Plugin {
	rules: string[]
	pathToRulesets = this.app.vault.configDir + "/regex-rulesets";
	indexFile = "/index.txt"
	menu: ApplyRuleSetMenu
	configs: SavedConfigs
	rightClickEventRef: EventRef
	quickCommands : Command[]
	quickRulesChanged : boolean

	log (message?: any, ...optionalParams: any[])
	{
		// comment this to disable logging
		console.log("[regex-pipeline] " + message);
	}

	async onload() {
		this.log('loading');
		this.addSettingTab(new ORPSettings(this.app, this))
		this.configs = await this.loadData()
		if (this.configs == null) this.configs = new SavedConfigs(3, 3, false)
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

		this.reloadRulesets();
		this.log("Rulesets: " + this.pathToRulesets);
		this.log("Index: " + this.pathToRulesets + this.indexFile);

	}

	onunload() {
		this.log('unloading');
		if (this.rightClickEventRef != null) this.app.workspace.offref(this.rightClickEventRef)
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
			this.log(this.rules);
			this.updateRightclickMenu();
			this.updateQuickCommands();
		})
	}

	async updateQuickCommands () {
		if (this.configs.quickCommands <= 0) return;
		if (this.quickCommands == null) this.quickCommands = new Array<Command>();
		let expectedCommands = Math.min(this.configs.quickCommands, this.rules.length);
		// this.log(`setting up ${expectedCommands} commands...`)
		for (let i = 0; i < expectedCommands; i++)
		{
			let r = this.rules[i];
			let c = this.addCommand({
				id: `ruleset: ${r}`,
				name: r,
				editorCheckCallback: (checking: boolean) => {
					if (checking) return this.rules.contains(r);
					this.applyRuleset(this.pathToRulesets + "/" + r);
				},
			});
			// this.log(`pusing ${r} command...`)
			this.quickCommands.push(c);
			this.log(this.quickCommands)
		}
	}

	async updateRightclickMenu () {
		if (this.rightClickEventRef != null) this.app.workspace.offref(this.rightClickEventRef)
		this.rightClickEventRef = this.app.workspace.on("editor-menu", (menu) => {
			for (let i = 0; i < Math.min(this.configs.quickRules, this.rules.length); i++)
			{
				let rPath = this.pathToRulesets + "/" + this.rules[i]
				
				menu.addItem((item) => {
					item.setTitle("Regex Pipeline: " + this.rules[i])
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

	async applyRulesetSearchAndReplace(ruleset : string){
		let ruleParser = /^"(.+?)"([a-z]*?)(?:\r\n|\r|\n)?->(?:\r\n|\r|\n)?"(.*?)"([a-z]*?)(?:\r\n|\r|\n)?$/gmus;
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
			this.log("\n" + ruleMatches[1] + "\n↓↓↓↓↓\n"+ ruleMatches[3]);
			this.log("\n Search and Replace!");
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
		new Notice("Executed ruleset '" + ruleset + "' which contains " + count + " regex replacements!");
	}

	async applyRulesetSearchAndCopy(ruleset : string){
		let ruleParser = /^"(.+?)"([a-z]*?)(?:\r\n|\r|\n)?->(?:\r\n|\r|\n)?"(.*?)"([a-z]*?)(?:\r\n|\r|\n)?$/gmus;
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
		let newClipboardText:string = "";
		while (ruleMatches = ruleParser.exec(ruleText))
		{
			if (ruleMatches == null) break;
			this.log("\n" + ruleMatches[1] + "\n↓↓↓↓↓\n"+ ruleMatches[3]);
			this.log("\n Search and Copy!");
			let matchRule = ruleMatches[2].length == 0? new RegExp(ruleMatches[1], 'gm') : new RegExp(ruleMatches[1], ruleMatches[2]);
			let matchedOnes:Array<string> = subject.match(matchRule);
			for(let idx in matchedOnes){
				newClipboardText = newClipboardText + matchedOnes[idx]  +"\n";
			}
			count++;
			newClipboardText = newClipboardText + "\n"+ "---" +"\n";
		}
		navigator.clipboard.writeText(newClipboardText);

		new Notice("Executed ruleset '" + ruleset + "' which contains " + count + " regex is searched and copied!");
	}

	async applyRulesetSearchAndCopyAndReplace(ruleset : string){
		let ruleParser = /^"(.+?)"([a-z]*?)(?:\r\n|\r|\n)?->(?:\r\n|\r|\n)?"(.*?)"([a-z]*?)(?:\r\n|\r|\n)?$/gmus;
		let ruleText = await this.app.vault.adapter.read(ruleset);
		let newClipboardText:string = "";
		
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
			this.log("\n" + ruleMatches[1] + "\n↓↓↓↓↓\n"+ ruleMatches[3]);
			this.log("\n Search, Copy and Replace!");
			let matchRule = ruleMatches[2].length == 0? new RegExp(ruleMatches[1], 'gm') : new RegExp(ruleMatches[1], ruleMatches[2]);
			//copy 
			let matchedOnes:Array<string> = subject.match(matchRule);
			for(let idx in matchedOnes){
				newClipboardText = newClipboardText + matchedOnes[idx] +"\n";
			}
			newClipboardText = newClipboardText + "\n"+ "---" +"\n";
			//replace
			if (ruleMatches[4] == 'x') subject = subject.replace(matchRule, '');
			else subject = subject.replace(matchRule, ruleMatches[3]);
			count++;
		}
		if (selectionMode)
			activeMarkdownView.editor.replaceSelection(subject);
		else
			activeMarkdownView.editor.setValue(subject);
		
		navigator.clipboard.writeText(newClipboardText);

		activeMarkdownView.requestSave();
		activeMarkdownView.editor.scrollTo(0, pos.top)
		new Notice("Executed ruleset '" + ruleset + "' which contains " + count + " regex is searched, copied and replaced!");
	}

	//manual search and copy
	applyManualSearchAndCopy(regExpString : string){
		let newClipboardText:string = "";
		
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

		if(regExpString.length>0){
			this.log("\n" + regExpString + "\n↓↓↓↓↓\n");
			this.log("\n Search And Copy!");
			let matchRule = new RegExp(regExpString, 'gm');
			//copy 
			let matchedOnes:Array<string> = subject.match(matchRule);
			for(let idx in matchedOnes){
				newClipboardText = newClipboardText + matchedOnes[idx] +"\n";
			}
			newClipboardText = newClipboardText + "\n"+ "---" +"\n";


		navigator.clipboard.writeText(newClipboardText);
		activeMarkdownView.requestSave();
		activeMarkdownView.editor.scrollTo(0, pos.top)
		new Notice("Executed " + regExpString + ", regex is searched and copied!");
		}
	}

	async applyManualSearchAndReplace(regExpString : string, replacementString : string){
		
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

		if(regExpString.length>0){
			this.log("\n" + regExpString + "\n↓↓↓↓↓\n"+ replacementString);
			this.log("\n Search, Copy and Replace!");
			let matchRule = new RegExp(regExpString, 'gm');
			//replace
			subject = subject.replace(matchRule, replacementString)
		
		if (selectionMode)
			activeMarkdownView.editor.replaceSelection(subject);
		else
			activeMarkdownView.editor.setValue(subject);
		
		activeMarkdownView.requestSave();
		activeMarkdownView.editor.scrollTo(0, pos.top)
		new Notice("Executed RegExp: " + regExpString +  ", regex is searched and replaced!");
		}
	}

	async applyRuleset (ruleset : string, mode: number = 0) {
		if (!await this.app.vault.adapter.exists(ruleset)) {
			new Notice(ruleset + " not found!");
			return
		}
		switch (mode){
			case 0:{
				this.applyRulesetSearchAndReplace(ruleset);
				break;
			}
			case 1:{
				this.applyRulesetSearchAndCopy(ruleset);
				break;
			}
			case 2:{
				this.applyRulesetSearchAndCopyAndReplace(ruleset);
				break;
			}
			default:{
				this.applyRulesetSearchAndReplace(ruleset);
			}


		}
	}
}

class SavedConfigs {
	constructor(quickRules: number, quickCommands : number, rulesInVault: boolean) {
		this.quickRules = quickRules
		this.rulesInVault = rulesInVault
		this.quickCommands = quickCommands
	}
	quickRules: number
	quickCommands : number
	rulesInVault: boolean
}

class ORPSettings extends PluginSettingTab {

	plugin: RegexPipeline;
	constructor(app: App, plugin: RegexPipeline) {
		super(app, plugin);
	}

	quickRulesCache : number

	display() {
		this.containerEl.empty()
		new Setting(this.containerEl)
			.setName("Quick Rules")
			.setDesc("The first N rulesets in your index file will be available in the right click menu.")
			.addSlider(c => {
				c.setValue(this.plugin.configs.quickRules)
				c.setLimits(0, 10, 1)
				c.setDynamicTooltip()
				c.showTooltip()
				c.onChange((v) => {
					if (v != this.plugin.configs.quickRules) this.plugin.quickRulesChanged = true;
					this.plugin.configs.quickRules = v;
				})
			}) 
		new Setting(this.containerEl)
			.setName("Quick Rule Commands")
			.setDesc("The first N rulesets in your index file will be available as Obsidian commands. When changing this count or re-ordering rules, existing commands will not be removed until next reload (You can also manually re-enable the plugin).")
			.addSlider(c => {
				c.setValue(this.plugin.configs.quickCommands)
				c.setLimits(0, 10, 1)
				c.setDynamicTooltip()
				c.showTooltip()
				c.onChange((v) => {
					this.plugin.configs.quickCommands = v;
					this.plugin.updateQuickCommands();
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
		this.plugin.saveData(this.plugin.configs)
	}

}

class ApplyRuleSetMenu extends Modal {
	plugin: RegexPipeline;
	modeValue:number;
	manualRegExp:string;
	manualReplaceText:string;
	constructor(app: App, plugin: RegexPipeline) {
		super(app);
		this.plugin = plugin;
		this.modalEl.style.setProperty("width", "60vw");
		this.modalEl.style.setProperty("max-height", "60vh");
		this.modalEl.style.setProperty("padding", "2rem");
		this.titleEl.createEl("h1", null, el => {
			el.innerHTML = "Regexp Tool Setting";
			el.style.setProperty("display", "inline-block");
			el.style.setProperty("width", "92%");
			el.style.setProperty("max-width", "480px");
			el.style.setProperty("margin", "12 0 8");
		});
		this.titleEl.createEl("h1", null, el => { el.style.setProperty("flex-grow", "1") });

		new Setting(this.contentEl)
			.setName("Stored Rule Sets")
			.settingEl.style.setProperty("width","100%");
		let reloadStoredRulesetsSetting = new Setting(this.contentEl);
		reloadStoredRulesetsSetting
			.setName("Rule Sets Storage Path: " + this.plugin.pathToRulesets + "/...")
			.settingEl.style.setProperty("width","100%");
		reloadStoredRulesetsSetting.addButton((reloadStoredRulesetsBtn:ButtonComponent) => {
			reloadStoredRulesetsBtn.setButtonText("RELOAD")
				.onClick(async (evt) => {
					await this.plugin.reloadRulesets();
					this.onClose();
					this.onOpen();
				});
			reloadStoredRulesetsBtn.buttonEl.style.setProperty("display", "inline-block")
			reloadStoredRulesetsBtn.buttonEl.style.setProperty("bottom", "8px")
			reloadStoredRulesetsBtn.buttonEl.style.setProperty("margin", "auto")
		})

		new Setting(this.modalEl)
			.setName("Select Mode for Stored Rule Sets Above (0 Replace ; 1 CopyResult ; 2 Copy+Replace)")
			.addSlider((modeSliderComponent:SliderComponent) => {
				modeSliderComponent.setLimits(0,2,1);
				modeSliderComponent.setValue(0);
				modeSliderComponent.setDynamicTooltip();
				modeSliderComponent.onChange((value) => {
					this.modeValue = value;
					modeSliderComponent.showTooltip();
				});
			});

		let manualRegExpSetting = new Setting(this.modalEl);
		manualRegExpSetting
			.setName("Manual Reg Exp:")
			.addText((regExpInputText:TextComponent) => {
				regExpInputText.onChange((value) => {
					this.manualRegExp = value
				})
				regExpInputText.inputEl.className ="manual-input";
			})
			.addButton((searchAndCopyButton:ButtonComponent)=>{
				searchAndCopyButton
					.setButtonText("Search & Copy")
					.onClick(async (evt) => {
						this.plugin.applyManualSearchAndCopy(this.manualRegExp);
						this.close();
				});
				searchAndCopyButton.buttonEl.className = "apply-ruleset-button";
			});
		manualRegExpSetting.infoEl.className = "manual-input-info";

		let manualRegRepSetting = new Setting(this.modalEl);
		manualRegRepSetting
			.setName("Manual Replacement:")
			.addText((replacementText:TextComponent) => {
				replacementText.onChange((value) => {
					this.manualReplaceText = value
				})
				replacementText.inputEl.className ="manual-input";
			})
			.addButton((searchAndReplaceButton:ButtonComponent)=>{
				searchAndReplaceButton
					.setButtonText("Search & Replace")
					.onClick(async (evt) => {
						this.plugin.applyManualSearchAndReplace(this.manualRegExp,this.manualReplaceText);
						this.close();
				});
				searchAndReplaceButton.buttonEl.className = "apply-ruleset-button";
			});
		manualRegRepSetting.infoEl.className ="manual-input-info";
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
					this.plugin.applyRuleset(this.plugin.pathToRulesets + "/" + this.plugin.rules[i],this.modeValue)
					this.close();
				});
			ruleset.buttonEl.className = "apply-ruleset-button";
		}
		this.titleEl.getElementsByTagName("h1")[0].innerHTML = this.plugin.pathToRulesets + "/...";
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