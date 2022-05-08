# Regex Pipeline

![](https://img.shields.io/github/downloads/no3371/obsidian-regex-pipeline/total?style=plastic)

(Sharing rulesets with self closing issues/pr is welcomed)

Regex Pipeline is an [Obsidian](https://obsidian.md/) plugin that allows users to setup custom regex rules to automatically format notes, this is especially useful in scenerios like building personal knowledge database, because you often clip webpage from same sources.

![](https://raw.githubusercontent.com/No3371/obsidian-regex-pipeline/master/assets/regex-pipeline-newmenu.gif)

## Usage

> [Mr. Partan](www.lpartan.com) provided a nice [writeup](https://gist.github.com/No3371/f1750b178376f0659df6650ccaf57c12) about how to use the plugin, I recommend it if you are not familiar with regex or software usage. (September 2021, v1.0.9)

First of all, enable the plugin, a file named index.txt should be created at `.obsidian/regex-rulesets/`. Due to how Obsidian protects your disks, you have to specify what ruleset files are there to be read, that's why we need a index file.

Starting from 1.0.8, a in-app "add ruleset" funtionality is included. you can add rulesets through the + button in the menu, but you still have to go to `.obsidian/regex-rulesets/` and modify the files you want to edit/remove, mainly because any UI to change what's already on your disk is not safe, also because it's hard to provide good editing experience as common editors(ex: VSCode).

Starting from 1.1.0, you can apply rulesets through right-click menu. The available option count can be adjusted in settings.

Starting from 1.2.0, the quick rulesets (mentioned right above) can be invoked through Obsidian's command system after **Quick Commands** is toggled on in settings.

#### Writing Rulesets
Now you can start editing your own rule sets.
A ruleset contains one or more rule, the format looks like:
```
:: Any "SEARCH" becomes "REPLACE"
"SEARCH"->"REPLACE"
```

#### Multi-line replacement string:
```
"SEARCH"->"REP
LACE"
:: Any "SEARCH" becomes "REP
:: LACE"
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
:: Any "SEARCH" becomes ""
```
In this case, whatever REPLACE is, the plugin treat it as "".


#### Indexing
Rulesets must be saved in `.obsidian/regex-rulesets/`, and have to be included in the `index.txt`, one file per line. The order also decides the displaying order in-app.

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
