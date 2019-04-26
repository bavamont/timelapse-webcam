/**
 * settings.js
 * 
 * @author Bavamont
 * @link https://github.com/bavamont
 */

 /**
 * Adjust these settings for your application.
 */
const defaults = {
	appName					: "Timelapse Webcam",
	appMode					: "production", //development
	defaultLang				: "en",
	lang 					: "",
	videoDevice				: "",
	videoResolution			: "vga",
	screenshotInterval		: 1,
	screenshotIntervalUnit	: "minutes",
	screenshotFilename		: "webcam.jpg",
	screenshotFilenameType	: "fixed",
	createVideo				: true,
	timelapseCron			: "00 00 00 * * *",
	timelapseFilename		: "timelapse.mp4",
	timelapseFilenameType	: "fixed",	
	fps						: 30,
	musicFile				: "",
	overlayTimelapseFile	: "",
	overlayTimelapseX		: 0,
	overlayTimelapseY		: 0,
	overlayFile				: "",
	overlayX				: 0,
	overlayY				: 0,
	screenshotText			: "{DATE_TIME}",
	screenshotTextX			: 25,
	screenshotTextY			: 25,
	screenshotTextFont		: "",
	screenshotTextFontSize	: 24,
	screenshotTextFontColor	: "#FFFFFF",
	ftpHost					: "",
	ftpPort					: 22,
	ftpUser					: "",
	autoStart				: false,
	useFtp					: false,
	videoEffect				: "none"
};

/**
 * Do not change anything below this line.
 */
const electron = require("electron");
const path = require("path");
const fse = require("fs-extra");
const keytar = require("keytar");
let app = electron.app ? electron.app : electron.remote.app;

class Settings {

  	constructor() {
  		const userDataPath = app.getPath("userData");
  		this.path = path.join(userDataPath, "settings.json");
  		this.data = defaults;
  		if (fse.existsSync(this.path)) {
	    	const data = fse.readJsonSync(this.path);
	    	if (Object.keys(data).length > 0) this.data = data;
	    }
	    /** 
	     * Making sure that these values are not changed by the user manually editing the settings.json file.
	     */
	    this.data.appName = defaults.appName;
	    this.data.appMode = defaults.appMode;
	    this.data.defaultLang = defaults.defaultLang;
  	}

	/**
	 * Returns the value of key
	 *
	 * @return
	 *   The value of key
	 */
  	get(key) {
  		return this.data[key];
  	}

	/**
	 * Sets and saves a value
	 */
  	set(key, val) {
  		this.data[key] = val;
  		fse.writeJsonSync(this.path, this.data);
  	}

	/**
	 * Returns the value of key (saved encrypted)
	 *
	 * @return
	 *   The value of key
	 */
  	getEncrypt(key) {
  		return keytar.getPassword(this.get("appName"), key);
  	}

	/**
	 * Sets and saves a value (saved encrypted)
	 */
  	setEncrypt(key, val) {
		keytar.setPassword(this.get("appName"), key, val);
  	}  	
}
module.exports = Settings;