# Regex Pipeline

Regex Pipeline is a [obsidian](https://obsidian.md/) plugin that allows users to setup custom regex rules to automatically format notes, this is especially useful in scenerios like building personal knowledge database, because you often clip webpage from same sources.

![](https://raw.githubusercontent.com/No3371/obsidian-regex-pipeline/master/assets/regex-pipeline-newmenu.gif)

## Usage
First of all, enable the plugin, a file named index.txt should be created at `.obsidian/regex-rulesets/`. Due to how Obsidian protects your disks, you have to specify what ruleset files are there to be read, that's why we need a index file.

Starting from 1.0.8, the menu is improved to fit in more rulesets, with a "add ruleset" funtionality included. you can add rulesets through the + button in the menu.

As for now, you still have to go to `.obsidian/regex-rulesets/` and modify the file when you want to edit/remove rulesets, mainly because any UI to change what's already on your disk is not safe, also because it's hard to provide good editing experience which can match the experience that common editors provides (ex: Vscode).

#### Writing Rulesets
Now you can start editing your own rule sets.
A ruleset contains one or more rule, the format looks like:
```
"SEARCH"->"REPLACE"
```

#### Multi-line replacement string:
```
"SEARCH"->"REP
LACE"
```

#### Regex Flags
By default, `gm` (multiline) flag is appended to the **SEARCH** regex, you can overwrite this by providing your own flags, for example, use `gmu` flag in this way:
```
"SEARCH"gmu->"REPLACE"
```

Noted that `gm` flags are bascially neccessary for this plugin to be useful, you seldom wants to replace only 1 occurances or operate on a note only contains 1 line.

#### Replace With Nothing
Due to how the plugin parse rules, the replacement string can not be a length zero string, if you want to delete with regex (replace with ""), you have to add a custom `x` flag:
```
"SEARCH"->"REPLACE"x
```
In this case, whatever REPLACE is, the plugin treat it as "".


#### Indexing
Rulesets must be saved in `.obsidian/regex-rulesets/`

After you saved your ruleset, you have to add the filename into the `index.txt`, one file per line.

#### Applying Rulesets
Press the sidebar button of this plugin to show the rulesets menu, select your ruleset then it'll apply.
The menu is a command so you can also bind it to a shortcut.

**Note**: The plugin support applying rules to selection only, if anything is selected, only selection is modified!

## Examples

**NumberToAlphabet**
.obsidian/regex-rulesets/number-to-alphabet.txt
```
"1"->"A"
"2"->"B"
"3"->"C"
"4"->"D"
"5"->"E"
"6"->"F"
"7"->"G"
"8"->"H"
"9"->"I"
```

**Table_c2**
This ruleset help you transform selected content into a table of 2 columns! Every 2 non-empty line will form a row.

.obsidian/regex-rulesets/Table_c2
```
"^(.+)$\n\n^(.+)$"->"| $1 | $2 |"
```

Take a look in [samples folder](https://github.com/No3371/obsidian-regex-pipeline/tree/master/samples) for more examples, including a very complex one like the above gif!

## Recommendations
- Markdownload (https://github.com/deathau/markdownload): for clipping webpages, don't forget to configure it to match your editing preferences.
