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
**index.txt**
.obsidian/regex-rulesets/index.txt
```
number-to-alphabet.txt
goo
```

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
**[Goo 辞書 Formatter](dictionary.goo.ne.jp/word/彷徨く/)** (Gif above)
.obsidian/regex-rulesets/goo
```
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02539\.gif\)"->"![[@1.gif]]"
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02540\.gif\)"->"![[@2.gif]]"
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02541\.gif\)"->"![[@3.gif]]"
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02542\.gif\)"->"![[@4.gif]]"
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02543\.gif\)"->"![[@5.gif]]"
"\!\[\]\(https://dictionary\.goo\.ne\.jp/img/daijisen/gaiji/02544\.gif\)"->"![[@6.gif]]"
::This fix example sentence right after a topic
"［(.+?)］(.+)\n\n1\.  1\.  「"->"［$1］$2
>「"
::This extract entry name from the title
"^#\s.+goo国語辞書\n+(.+)\n+の解説\n+\-+"->"# $1"

::This extract titles for sub entries2
"(.+?)\n\nの解説\n+?\-+"->"---
# $1"

:: This convert these lines to headers
"^類語"->"#### 類語"
"^関連語"->"#### 関連語"
"^下接句"->"#### 下接句"

:: Convert all second level single example sentence
"    [\n\s]?    1\.\s+「(?!.+\n\s+?2\.)"->"    >「"

:: These 2 fix arrow reference
"    >→\[(.+?)\]\((.+)\)［(.+?)］"->"    →[$1]($2)［$3］"
"    1\.  →\[(.+?)\]\((.+)\)［(.+?)］"->"    →[$1]($2)［$3］"

:: This fix \n\n    → to \n    →
"[\n\s]+?(?=    →\[.+?\]\(.+\)［.+?］)"->"
"


"^        「"->"        >「"

:: This fix wrong bullets captured by [MardDownload](github.com/deathau/markdownload)
"^1\.  \*\*１\*\*"->"1. "
"^1\.  \*\*２\*\*"->"2. "
"^1\.  \*\*３\*\*"->"3. "
"^1\.  \*\*４\*\*"->"4. "
"^1\.  \*\*５\*\*"->"5. "
"^1\.  \*\*６\*\*"->"6. "
"^1\.  \*\*７\*\*"->"7. "
"^1\.  \*\*８\*\*"->"8. "
"^1\.  \*\*９\*\*"->"9. "
"^1\.  \*\*１０\*\*"->"10. "
"^1\.  \*\*１１\*\*"->"11. "
"^1\.  \*\*１２\*\*"->"12. "
"^1\.  \*\*１３\*\*"->"13. "
"^1\.  \*\*１４\*\*"->"14. "
"^1\.  \*\*１５\*\*"->"15. "
"^1\.  \*\*１６\*\*"->"16. "
"^1\.  \*\*１７\*\*"->"17. "
"^1\.  \*\*１８\*\*"->"18. "
"^1\.  \*\*１９\*\*"->"19. "
"^1\.  \*\*２０\*\*"->"20. "
"^1\.  \*\*２１\*\*"->"21. "
"^1\.  \*\*２２\*\*"->"22. "
"^1\.  \*\*２３\*\*"->"23. "
"^1\.  \*\*２４\*\*"->"24. "
"^1\.  \*\*２５\*\*"->"25. "
"^1\.  \*\*２６\*\*"->"26. "
"^1\.  \*\*２７\*\*"->"27. "
"^1\.  \*\*２８\*\*"->"28. "
"^1\.  \*\*２９\*\*"->"29. "
"^1\.  \*\*３０\*\*"->"30. "
"^(\d+?)\.  "->"$1. "

:: This fix 2 space after bullets
"    (\d+?)\.  "->"    $1. "
::This clears empty lines.
"\n\s+?\n    (\d+?)\. "->"
    $1. "
::This clears empty lines.
"\n\s+?\n        >「"->"
    >「"

::This clears empty lines.
"^\s+\n(\d+)\."->"$1."

"    (\d+?)\. 「"->"    $1. >「"
```
