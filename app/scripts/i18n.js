/**
 * i18n.js
 * 
 * @author Bavamont
 * Based off of Christian Engvalls' Electron localization, https://www.christianengvall.se/electron-localization/
 * @link https://github.com/bavamont
 */
 
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const settings = new(require("./settings.js"));
let app = electron.app ? electron.app : electron.remote.app;
let loadedLanguage = undefined;

class i18n {
    constructor() {
        if (fse.existsSync(path.join(__dirname, "languages", settings.get("lang") + ".js"))) {
            loadedLanguage = JSON.parse(fse.readFileSync(path.join(__dirname, "languages", settings.get("lang")  + ".js")), "utf8");
        } 
        else if (fse.existsSync(path.join(__dirname, "languages", app.getLocale() + ".js"))) {
            settings.set("lang", app.getLocale());
            loadedLanguage = JSON.parse(fse.readFileSync(path.join(__dirname, "languages", app.getLocale() + ".js")), "utf8");
        }
        else {
            loadedLanguage = JSON.parse(fse.readFileSync(path.join(__dirname, "languages", settings.get("defaultLang") + ".js")), "utf8");
        }
    }

    /**
     * Returns all available languages
     *
     * @return
     *   Languages
     */
    getLanguages() {
        const languages = [];
        fs.readdirSync(path.join(__dirname, "languages")).forEach(languageFile => {
            var currentLanguage = JSON.parse(fse.readFileSync(path.join(__dirname, "languages", languageFile)), "utf8");
            languages.push({
                Language : currentLanguage.Language,
                Iso6391 : currentLanguage.Iso6391
            });
        });
        return languages;
    }

    /**
     * Returns the apps directory path
     *
     * @param string phrase
     *   Phrase to translate
     *
     * @return
     *   Translated phrase
     */
    __(phrase) {
        let translation = loadedLanguage[phrase];
        if(translation === undefined) {
             translation = phrase;
        }
        return translation;
    }
    
    /**
     * Set/Load a language and then restart the application
     *
     * @param string lang
     *   Language to load (Iso 6391)
     */
    set(lang) {
        if (fse.existsSync(path.join(__dirname, "languages", lang + ".js"))) {
            settings.set("lang", lang);
            app.relaunch();
            app.exit();
        } 
    }
}
module.exports = i18n;