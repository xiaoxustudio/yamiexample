/** ******************************** 本地化语言管理器 ******************************** */
let Local = new class LocalizationManager {
    /** 激活的语言 */
    active = '';
    /** 选择的语言 */
    language = '';
    /** 文本映射表 */
    textMap = {};
    /** 语言重映射表 */
    langRemap = {
        'zh-HK': 'zh-TW',
        'zh-SG': 'zh-TW',
    };
    /** 引用标签的正则表达式 */
    refRegexp = /<ref:([0-9a-f]{16})>/g;
    /** 初始化 */
    initialize() {
        this.createTextMap();
        this.compileTextContents();
        this.setLanguage(Data.globalData.language);
    }
    /** 创建本地化映射表 */
    createTextMap() {
        const map = this.textMap;
        const set = (items) => {
            for (const item of items) {
                if ('children' in item) {
                    set(item.children);
                }
                else {
                    map[item.id] = item;
                }
            }
        };
        set(Data.localization.list);
    }
    /** 编译文本内容 */
    compileTextContents() {
        const regexp = /<global:([0-9a-f]{16})>/g;
        const compile = (content) => {
            const slices = [];
            const setters = [];
            let li = 0;
            let match;
            while (match = regexp.exec(content)) {
                const mi = match.index;
                if (mi > li) {
                    slices.push(content.slice(li, mi));
                }
                const index = slices.length;
                const key = match[1];
                const getter = () => Variable.get(key);
                const setter = () => { slices[index] = getter(); };
                setters.push(setter);
                slices.push('');
                li = regexp.lastIndex;
            }
            // 无匹配标签的情况
            if (li === 0) {
                return content;
            }
            // 找到标签的情况
            if (content.length > li) {
                slices.push(content.slice(li));
            }
            return () => {
                for (const setter of setters) {
                    setter();
                }
                return slices.join('');
            };
        };
        const languages = Data.config.localization.languages.map(lang => lang.name);
        for (const { contents } of Object.values(this.textMap)) {
            for (const language of languages) {
                contents[language] = compile(contents[language]);
            }
        }
    }
    /**
     * 设置语言
     * @param 本地化语言代码
     */
    setLanguage(language) {
        if (this.language !== language) {
            const languages = Data.config.localization.languages;
            let active = language;
            if (active === 'auto') {
                active = this.getLanguage();
            }
            let settings = languages.find(lang => lang.name === active);
            if (!settings)
                settings = languages[0] ?? { name: active, font: '', scale: 1 };
            try {
                this.active = settings.name;
                this.language = language;
                this.updateAllTexts();
                window.dispatchEvent(new Event('localize'));
                Printer.setLanguageFont(settings.font);
                Printer.setSizeScale(settings.scale);
                Printer.setWordWrap(['zh-CN', 'zh-TW', 'ja', 'ko'].includes(active) ? 'break' : 'keep');
            }
            catch (error) {
                console.error(error);
            }
        }
    }
    /**
     * 获取合适的语言
     * @returns 本地化语言代码
     */
    getLanguage() {
        const languages = Data.config.localization.languages.map(lang => lang.name);
        let nLanguage = navigator.language;
        // 重映射本地语言
        const mappedLang = this.langRemap[nLanguage];
        if (mappedLang)
            nLanguage = mappedLang;
        let language = languages[0] ?? nLanguage;
        let matchedWeight = 0;
        const sKeys = nLanguage.split('-');
        for (const key of languages) {
            const dKeys = key.split('-');
            if (sKeys[0] === dKeys[0]) {
                let weight = 0;
                for (let sKey of sKeys) {
                    if (dKeys.includes(sKey)) {
                        weight++;
                    }
                }
                if (matchedWeight < weight) {
                    matchedWeight = weight;
                    language = key;
                }
            }
        }
        return language;
    }
    /**
     * 获取本地化文本
     * @param id 本地化文本ID
     * @returns 当前语言包的本地化文本
     */
    get(id) {
        const content = this.textMap[id]?.contents[this.active];
        return typeof content === 'function' ? content() : content;
    }
    /**
     * 替换文本内容
     * @param text 原始文本内容
     * @returns 替换本地化文本后的内容
     */
    replace(text) {
        return text.replace(this.refRegexp, (match, refId) => {
            const ref = this.get(refId);
            return ref !== undefined ? ref : match;
        });
    }
    /** 更新所有文本 */
    updateAllTexts() {
        const update = (elements) => {
            for (const element of elements) {
                element.updateTextContent?.();
                update(element.children);
            }
        };
        if (UI.root instanceof UIElement) {
            update(UI.root.children);
        }
    }
};
//# sourceMappingURL=local.js.map