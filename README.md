## Regex Pipeline

Regex Pipeline is a [obsidian](https://obsidian.md/) plugin that allows users setup custom regex rules to automatically format notes, this is especially useful in scenerios like building personal knowledge database.

![](https://i.imgur.com/kdEfCtN.gif)

![](https://i.imgur.com/NOVYGTh.gif)

## Usage
First of all, enable the plugin, a file named index.txt should be created at `.obsidian/regex-rulesets/`. Due to how obsidian protects your disks, you have to specified what ruleset files are there to be read, that's why we need a index file.

#### Writing Rulesets
Now you can start editing your own rule sets.
A ruleset contains one or more rule, the format looks like:
```
"SEARCH"->"REPLACE"
```
By default, `gm` (multiline) flag is appended to the search regex, you can overwrite this by providing your own flags, for example, use `gmu` flag in this way:
```
"SEARCH"gmu->"REAPLCE"
```

Noted that `gm` flags are bascially neccessary for this plugin to be useful, you seldom wants to only replace only 1 occurances or operate on a single line notes.

Rules are executed in order.

#### Indexing
Rulesets must be saved in `.obsidian/regex-rulesets/`.

After you saved your ruleset, you have to add the filename into the `index.txt`, one file per line.

#### Applying Rulesets
Press the sidebar button of this plugin to show the rulesets menu, select your ruleset then it'll apply.

## Examples
**NumberToAlphabet**
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
**[Goo 辞書 Formatter](dictionary.goo.ne.jp/word/彷徨く/)**
```
"^#\s.+goo国語辞書\n+(.+)\n+の解説\n+\-+(\r\n|\r|\n)"->"# $1$2"
"^類語"->"#### 類語"
"^関連語"->"#### 関連語"
```


## Tips
If you want to use characters like `\n` in replacement string you can try to capture it first then use it in replacements. Example:
```
"^.+(\r\n|\r|\n)"`->"$1$1$1"
```
This rule create 3 new lines at the end of the line.