/**
 * menu.js
 * 
 * @author Bavamont
 * @link https://github.com/bavamont
 */

const {Menu} = require("electron");
const electron = require("electron");
const i18n = new(require("./i18n.js"));
let app = electron.app ? electron.app : electron.remote.app;

/**
 * Get all languages for the menu
 */
const langSubmenu = [];
i18n.getLanguages().forEach(lang => {
	if (lang.Language != i18n.__("Language"))
		langSubmenu.push({
			label: lang.Language,
			click() {
				i18n.set(lang.Iso6391);
			}
		});
});

/**
 * Template for the menu
 */
const menuTemplate = [
/*
	{
		label: i18n.__("Languages"),
		submenu: langSubmenu
	},
*/
	{
		label: i18n.__("Webcam"),
		click: function (menuItem, currentWindow) {
			currentWindow.webContents.send("showWebcamView");
		}
	},
	{
		label: i18n.__("Settings"),
		click: function (menuItem, currentWindow) {
			currentWindow.webContents.send("showSettingsView");
		}
	},
	{
		label: i18n.__("Quit"),
		accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
		click() {
			app.quit();
		}
	}
];

/**
 * Add empty object to menu, if on a mac
 */
if (process.platform == "darwin") {
	menuTemplate.unshift({});
}

/**
 * Add developer tools if not in production
 */
if (process.env.NODE_ENV !== "production") {
	menuTemplate.push({
		label: i18n.__("Developer Tools"),
		submenu: [
			{
				label: i18n.__("Toggle DevTools"),
				accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
				click(item, focusedWindow) {
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: "reload", label: i18n.__("Reload")
			}
		]
	});
}

const mainMenu = Menu.buildFromTemplate(menuTemplate);
module.exports = mainMenu;