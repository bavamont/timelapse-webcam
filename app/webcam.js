/**
 * Webcam
 * 
 * @author Bavamont
 * @link https://github.com/bavamont
 */

const electron = require("electron");
const {ipcRenderer} = electron;
const {Tray, Menu} = electron.remote;
const dialog = electron.remote.dialog;
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-binaries");
const imageSize = require("image-size");
const moment = require('moment');
const fontManager = require('font-manager');
const settings = new(require("./scripts/settings.js"));
const i18n = new(require("./scripts/i18n.js"));
const CronJob = require("cron").CronJob;
var Client = require("ssh2").Client;
let app = electron.app ? electron.app : electron.remote.app;
ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));

/** 
 * Load from from settings.json
 */
var videoDevice = settings.get("videoDevice");
var videoResolution = settings.get("videoResolution");
var screenshotInterval = settings.get("screenshotInterval");
var screenshotIntervalUnit = settings.get("screenshotIntervalUnit");
var screenshotFilename = settings.get("screenshotFilename");
var screenshotFilenameType = settings.get("screenshotFilenameType");
var createVideo = settings.get("createVideo");
var timelapseCron = settings.get("timelapseCron");
var timelapseFilename = settings.get("timelapseFilename");
var timelapseFilenameType = settings.get("timelapseFilenameType");
var fps = settings.get("fps");
var musicFile = settings.get("musicFile");
var overlayTimelapseFile = settings.get("overlayTimelapseFile");
var overlayTimelapseX = settings.get("overlayTimelapseX");
var overlayTimelapseY = settings.get("overlayTimelapseY");
var overlayFile = settings.get("overlayFile");
var overlayX = settings.get("overlayX");
var overlayY = settings.get("overlayY");
var screenshotText = settings.get("screenshotText");
var screenshotTextX = settings.get("screenshotTextX");
var screenshotTextY = settings.get("screenshotTextY");
var screenshotTextFont = settings.get("screenshotTextFont");
var screenshotTextFontSize = settings.get("screenshotTextFontSize");
var screenshotTextFontColor = settings.get("screenshotTextFontColor");
var ftpHost = settings.get("ftpHost");
var ftpPort = settings.get("ftpPort");
var ftpUser = settings.get("ftpUser");
var autoStart = settings.get("autoStart");
var useFtp = settings.get("useFtp");
var videoEffect = settings.get("videoEffect");
document.title = settings.get("appName");
document.getElementById("loading").innerHTML = i18n.__("Loading...");

/** 
 * Set initial values.
 */
var trayIcon = new Tray(path.join(__dirname, "assets", "app", "icon-off.png"));
var videoElement = document.querySelector("video");
const canvas = document.createElement("canvas");
const userDataPath = app.getPath("userData");
var initView = false;
var videoLength = 0;
var imageName = 1;
var imageDimensions = "";
var timer = "";
var hasWebcam = false;


/**
 * Create options for the timelase cron select.
 * Seconds: 0-59, Minutes: 0-59, Hours: 0-23
 * Day of Month: 1-31, Months: 0-11 (Jan-Dec), Day of Week: 0-6 (Sun-Sat)
 */
function createTimelapseCron() {
	for (var hour = 0; hour <= 23; ++hour) {
		if (hour < 10) hour = "0" + hour;
		for (var minute = 0; minute <= 45; minute += 15) {
			if (minute == 0) minute = "0" + minute;
			var option = document.createElement("option");
			option.value = "00 " + minute + " " + hour + " * * *";
			option.text = moment(moment().format("YYYY-MM-DD") + " " + hour + ":" + minute + ":00").locale(settings.get("lang")).format("LT");
			$("#timelapseCron").append(option);
			minute = parseInt(minute);
		}
		hour = parseInt(hour);
	}
}

/**
 * Create options for the font manager select.
 */
function createFontManager() {
	var fonts = fontManager.getAvailableFontsSync();
	$.each(fonts, function(k, v) {
		var option = document.createElement("option");
		option.value = v.path.replace("C:","").replace(/\\/g,"/");
		option.text = v.family + " " + v.style;
		$("#screenshotTextFont").append(option);
	});
}

/**
 * Show the webcam view.
 */
function showWebcamView() {
	if ($("#settingsView").is(":visible")) {
		$("#settingsView").hide();
		$("#webcamView").show();
	} else {
		if (!initView) {
			initView = true;
			$("#webcamView").show();
		}
	}
}

/**
 * Show the settings view.
 */
function showSettingsView() {
	webcamStop();
	if ($("#webcamView").is(":visible")) {
		$("#webcamView").hide();
		$("#settingsView").show();
	} else {
		if (!initView) {
			$("#settingsView").show();
		}
	}
}

/**
 * Take and save a picture from the webcam.
 */
function takeScreenshot() {
	if (!hasWebcam) return "";
	canvas.width = videoElement.videoWidth;
	canvas.height = videoElement.videoHeight;
	canvas.getContext("2d").drawImage(videoElement, 0, 0);
	const url = canvas.toDataURL("image/jpeg", 0.8);
	const base64Data = url.replace(/^data:image\/jpeg;base64,/, "");
	var outFileName = screenshotFilename;
	if (screenshotFilenameType === "timestamp") outFileName = moment().format("X") + ".jpg";
	else if (screenshotFilenameType === "date") outFileName = moment().format("YYYY-MM-DD") + ".jpg";
	else if (screenshotFilenameType === "dotw") outFileName = moment().locale(settings.get("lang")).format("dddd").toLowerCase() + ".jpg";
	fse.outputFile(path.join(userDataPath, outFileName), base64Data, "base64");
	if (createVideo) {
		fse.outputFile(path.join(userDataPath, "timelapse", imageName + ".jpg"), base64Data, "base64");
		imageName++;
	}
	if (screenshotText !== "")
	{
		var screenshotTextEdited = screenshotText.replace(/{DATE_TIME}/g, moment().locale(settings.get("lang")).format("L, LT"))
		.replace(/{DATE}/g, moment().locale(settings.get("lang")).format("L"))
		.replace(/{TIME}/g, moment().locale(settings.get("lang")).format("LT"))
		.replace(/:/g, "\\:").replace(/'/g, "");
	}
	// Still needs to be added screenshotTextFont
	if ($("#overlayFile").val().indexOf(".png") >= 0) {
		var image = new ffmpeg();
		image.addInput(path.join(userDataPath, outFileName));
		var complexFilterSettings = Array();
		image.addInput($("#overlayFile").val());
		if (screenshotText !== "") {
			complexFilterSettings.push("[0:v][1:v]overlay=" + overlayX + ":" + overlayY + "[overlay]");
			complexFilterSettings.push("[overlay]drawtext=fontfile='" + screenshotTextFont + "':text='" + screenshotTextEdited + "':fontcolor=" + screenshotTextFontColor + ":fontsize=" + screenshotTextFontSize + ":y=" + screenshotTextY + ":x=" + screenshotTextX);
		} else complexFilterSettings.push("[0:v][1:v]overlay=" + overlayX + ":" + overlayY);
		image.complexFilter(complexFilterSettings);
		image.on("end", function() {
			imageDimensions = imageSize(path.join(userDataPath, outFileName));
			handleConsole(i18n.__("Webcam image saved."));
			uploadToFTP(path.join(userDataPath, outFileName));
		})
		.on("error", function(err) {
			handleConsole(err);
		})
		.save(path.join(userDataPath, outFileName));
	} else {
		if (screenshotText !== "")
		{
			var image = new ffmpeg();
			image.addInput(path.join(userDataPath, outFileName));
			var complexFilterSettings = Array();
			complexFilterSettings.push("[0:v]drawtext=fontfile='" + screenshotTextFont + "':text='" + screenshotTextEdited + "':fontcolor=" + screenshotTextFontColor + ":fontsize=" + screenshotTextFontSize + ":y=" + screenshotTextY + ":x=" + screenshotTextX);
			image.complexFilter(complexFilterSettings);
			image.on("end", function() {
				imageDimensions = imageSize(path.join(userDataPath, outFileName));
				handleConsole(i18n.__("Webcam image saved."));
				uploadToFTP(path.join(userDataPath, outFileName));
			})
			.on("error", function(err) {
				handleConsole(err);
			})
			.save(path.join(userDataPath, outFileName));
		} else {
			imageDimensions = imageSize(path.join(userDataPath, outFileName));
			handleConsole(i18n.__("Webcam image saved."));
			uploadToFTP(path.join(userDataPath, outFileName));
		}
	}
};

/**
 * Start taking pictures from the webcam.
 */
function webcamStart() {
	if (!hasWebcam) return "";
	handleConsole(i18n.__("Webcam started."));
	imageName = 1;
	$("#webcamStartButton").hide();
	$("#webcamStopButton").show();
	document.title = settings.get("appName") + " (" + i18n.__("Active") + ")";
	createVideoCronjob.start();
	clearInterval(timer);
	var factor = 1000;
	if (screenshotIntervalUnit === "minutes") factor = 60000;
	timer = setInterval(takeScreenshot, (screenshotInterval * factor));
	updateTray();
}

/**
 * Stop taking pictures from the webcam.
 */
function webcamStop() {
	if (document.title === settings.get("appName")) return "";
	clearInterval(timer);
	createVideoCronjob.stop();
	$("#webcamStopButton").hide();
	$("#webcamStartButton").show();
	document.title = settings.get("appName");
	handleConsole(i18n.__("Webcam stopped."));
	updateTray();
}

/**
 * Remove the timelapse directory with all content.
 */
function cleanCache() {
	if (fs.existsSync(path.join(userDataPath, "timelapse"))) fse.removeSync(path.join(userDataPath, "timelapse"));
}

/**
 * Create the timelapse video and save it
 */
function createTimelapseVideo() {
	if (!hasWebcam) return "";
	if (fs.existsSync(path.join(userDataPath, "timelapse"))) {
		webcamStop();
		var outVideoFileName = timelapseFilename;
		if (timelapseFilenameType === "timestamp") outVideoFileName = moment().format("X") + ".mp4";
		else if (timelapseFilenameType === "date") outVideoFileName = moment().format("YYYY-MM-DD") + ".mp4";
		else if (timelapseFilenameType === "dotw") outVideoFileName = moment().locale(settings.get("lang")).format("dddd").toLowerCase() + ".mp4";
		handleConsole(i18n.__("Creating timelapse..."));
		var files = fs.readdirSync(path.join(userDataPath, "timelapse"));
		if (files.length <= fps) {
			handleConsole(i18n.__("More images needed for a timelapse video."));
			return "";
		}
		videoLength = Math.round((files.length / fps));
		var video = new ffmpeg();
		video.addInput(path.join(userDataPath, "timelapse", '%d.jpg'));
		var complexFilterSettings = Array();
		/** Effects */
		if (videoEffect != "none") 
		{
			complexFilterSettings.push("[0:v]scale=" + imageDimensions.width + ":" + imageDimensions.height + "[scaled]");
			if (videoEffect === "keyburn")
				complexFilterSettings.push({
						"filter": "zoompan",
						"options": {  
							"z": "pzoom+0.002",  
							"d": 1,  
							"s": imageDimensions.width + "x" + imageDimensions.height,  
							"fps": fps  
						}, 
						inputs: "scaled",
						outputs: "output"
					});
		} else complexFilterSettings.push("[0:v]scale=" + imageDimensions.width + ":" + imageDimensions.height + "[output]");
		/** Deflicker */
		complexFilterSettings.push("[output]deflicker=s=7:m=am[corrected]");
		/** Overlay */
		if ($("#overlayTimelapseFile").val().indexOf(".png") >= 0) {
			video.addInput($("#overlayTimelapseFile").val());
			complexFilterSettings.push("[corrected][1:v]overlay=" + overlayTimelapseX + ":" + overlayTimelapseY);
		} else complexFilterSettings.push("[corrected]scale=" + imageDimensions.width + ":" + imageDimensions.height);
		if ($("#musicFile").val().indexOf(".mp3") >= 0) video.addInput($("#musicFile").val());		
		video.complexFilter(complexFilterSettings);
		video.inputFPS(fps)	
		.duration(videoLength)
		.videoCodec("libx264");
		video.on("end", function() {
			cleanCache();
			handleConsole(i18n.__("Timelapse created."));
			uploadToFTP(path.join(userDataPath, outVideoFileName));
			webcamStart();
		})
		.on("error", function(err) {
			handleConsole(err);
		})
		.save(path.join(userDataPath, outVideoFileName));
	}
}

/**
 * Insert devices into device select.
 */
function gotDevices(deviceInfos) {
	let camera = false;
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement("option");
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === "videoinput") {
			option.text = deviceInfo.label || "camera " + ($("#videoSource").length + 1);
			$("#videoSource").append(option);
			camera = true;
		}
	}
	if (camera)
	{
		if (videoDevice != "") $("#videoSource").val(videoDevice);
		else {
			videoDevice = $("#videoSource").val();
			settings.set("videoDevice", videoDevice);
		}
	} else {
		$("#webcamStartButton").hide();
		handleConsole(i18n.__("No webcam found."));
	}
}

/**
 * Get the camera stream.
 */
function getStream() {
	cleanCache();
	if (window.stream) {
		window.stream.getTracks().forEach(function(track) {
			track.stop();
		});
	}
	if (videoResolution === "qvga") var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 320}, height: {exact: 240} }};
	else if (videoResolution === "hd") var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 1280}, height: {exact: 720} }};
	else if (videoResolution === "full-hd") var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 1920}, height: {exact: 1080} }};
	else if (videoResolution === "fourK") var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 4096}, height: {exact: 2160} }};
	else if (videoResolution === "eightK") var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 7680}, height: {exact: 4320} }};	
	else var constraints = {video: { deviceId: {exact: videoDevice}, width: {exact: 640}, height: {exact: 480} }};
	navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(() => {
		$("#webcamStartButton").hide();
		handleConsole(i18n.__("Webcam error! Change the resolution or make sure that your webcam is not being used by another application."))
	});
}

/**
 * Show the camera stream in videoElement.
 */
function gotStream(stream) {
	hasWebcam = true;
	window.stream = stream;
	videoElement.srcObject = stream;
	$("#webcamStartButton").show();
	if (autoStart) webcamStart();
}

/**
 * Show the dialog box for music selection.
 */
function selectMusic() {
	const options = {
      title: i18n.__("Select music (.mp3) file."),
      buttonLabel: i18n.__("Select"),
      filters: [
        { name: ".mp3", extensions: ["mp3"] }
      ]
    };
    musicFile = dialog.showOpenDialog(null, options)[0];
	settings.set("musicFile", musicFile);
    $("#musicFile").val(musicFile);
    handleConsole(i18n.__("Music updated."));
}

/**
 * Show the dialog box for timelapse overlay.
 */
function selectOverlayTimelapse() {
	const options = {
      title: i18n.__("Select overlay (.png) file."),
      buttonLabel: i18n.__("Select"),
      filters: [
        { name: ".png", extensions: ["png"] }
      ]
    };
    overlayTimelapseFile = dialog.showOpenDialog(null, options)[0];
	settings.set("overlayTimelapseFile", overlayTimelapseFile);
    $("#overlayTimelapseFile").val(overlayTimelapseFile);
    handleConsole(i18n.__("Timelapse overlay updated."));
}

/**
 * Show the dialog box for webcam overlay.
 */
function selectOverlay() {
	const options = {
      title: i18n.__("Select overlay (.png) file."),
      buttonLabel: i18n.__("Select"),
      filters: [
        { name: ".png", extensions: ["png"] }
      ]
    };
    overlayFile = dialog.showOpenDialog(null, options)[0];
    settings.set("overlayFile", overlayFile);
    $("#overlayFile").val(overlayFile);
    handleConsole(i18n.__("Webcam overlay updated."));
}

/**
 * Upload a file to the ftp server.
 */
function uploadToFTP(fileToUpload) {
	if ((!useFtp) || (ftpHost === "")) return "";
	settings.getEncrypt("ftpPassword").then((ftpPassword) => {
		var connSettings = {
		     host: ftpHost,
		     port: ftpPort,
		     username: ftpUser,
		     password: ftpPassword
		};
		handleConsole(i18n.__("Connecting to FTP server..."));
		var conn = new Client();
		conn.on("error", function(err) {
			handleConsole(i18n.__("An error occurred. Please check your FTP credentials!"));
		});
		conn.on("ready", function() {
			var fileNameOnServer = path.parse(fileToUpload).base;			
		    conn.sftp(function(err, sftp) {
		        if (err) handleConsole(i18n.__("An error occurred. Please check your FTP credentials!"));
		        else {
		        	var readStream = fs.createReadStream(fileToUpload);
		        	var writeStream = sftp.createWriteStream(fileNameOnServer);
			        writeStream.on("close",function () {
			            handleConsole(i18n.__("Uploaded successfully!"));
			        });
			        writeStream.on("end", function () {
			            conn.close();
			        });
			        readStream.pipe(writeStream);
			    }
		    });
		}).connect(connSettings);
	});
}

/**
 * Change console text.
 */
function handleConsole(text) {
	$("#console").html(text);
}

/**
 * Add and update tray icon.
 */
function updateTray() {
	if (document.title === settings.get("appName")) {
		trayIcon.setImage(path.join(__dirname, "assets", "app", "icon-off.png"));
		var trayMenuTemplate = [
			{
				label: i18n.__("Start Webcam"),
				click: function() {
					webcamStart();
				}
			},
			{
				label: i18n.__("Quit"),
				click() {
					app.quit();
				}
			}
		];
	} else {
		trayIcon.setImage(path.join(__dirname, "assets", "app", "icon-on.png"));
		var trayMenuTemplate = [
			{
				label: i18n.__("Stop Webcam"),
				click: function() {
					webcamStop();
				}
			},
			{
				label: i18n.__("Quit"),
				click() {
					app.quit();
				}
			}		
		];
	}
	let trayMenu = Menu.buildFromTemplate(trayMenuTemplate);
	trayIcon.setContextMenu(trayMenu);
	trayIcon.setToolTip(document.title);
}

ipcRenderer.on('showWebcamView', function (ev, data) {
  showWebcamView();
})

ipcRenderer.on('showSettingsView', function (ev, data) {
  showSettingsView();
})

/**
 * Create the cronjob for the timelapse video.
 */
if (timelapseCron == undefined) timelapseCron = "00 00 00 * * *";
const createVideoCronjob = new CronJob(timelapseCron, function() {
	if (createVideo) createTimelapseVideo();
});

$(document).ready(function(){
	$("#splashScreen").hide();
	$("#main").show();
	/**
	 * Translate webcam.html content.
	 */
	$("#webcamStartButton").html(i18n.__($("#webcamStartButton").html()));
	$("#webcamStopButton").html(i18n.__($("#webcamStopButton").html()));
	$("#videoSourceText").html(i18n.__($("#videoSourceText").html()));
	$("#screenshotIntervalText").html(i18n.__($("#screenshotIntervalText").html()));
	$("#screenshotFilenameText").html(i18n.__($("#screenshotFilenameText").html()));
	$(".fixedText").html(i18n.__($(".fixedText").html()));
	$(".timestampText").html(i18n.__($(".timestampText").html()));
	$(".dateText").html(i18n.__($(".dateText").html()));
	$(".dotwText").html(i18n.__($(".dotwText").html()));
	$("#minutesText").html(i18n.__($("#minutesText").html()));
	$("#secondsText").html(i18n.__($("#secondsText").html()));
	$("#cronForTimelapseText").html(i18n.__($("#cronForTimelapseText").html()));
	$("#timelapseFilenameText").html(i18n.__($("#timelapseFilenameText").html()));
	$("#musicForTimelapseText").html(i18n.__($("#musicForTimelapseText").html()));
	$("#selectMusicButton").html(i18n.__($("#selectMusicButton").html()));
	$("#overlayForTimelapseText").html(i18n.__($("#overlayForTimelapseText").html()));
	$("#overlayPositionForTimelapseText").html(i18n.__($("#overlayPositionForTimelapseText").html()));
	$("#selectOverlayTimelapseButton").html(i18n.__($("#selectOverlayTimelapseButton").html()));
	$("#overlayForWebcamText").html(i18n.__($("#overlayForWebcamText").html()));
	$("#overlayPositionForWebcamText").html(i18n.__($("#overlayPositionForWebcamText").html()));
	$("#selectOverlayButton").html(i18n.__($("#selectOverlayButton").html()));
	$("#textforWebcamText").html(i18n.__($("#textforWebcamText").html()));
	$("#textPositionforWebcamText").html(i18n.__($("#textPositionforWebcamText").html()));
	$("#textFontSizeforWebcamText").html(i18n.__($("#textFontSizeforWebcamText").html()));
	$("#textFontColorforWebcamText").html(i18n.__($("#textFontColorforWebcamText").html()));
	$("#textFontforWebcamText").html(i18n.__($("#textFontforWebcamText").html()));
	$("#fpsForTimelapseText").html(i18n.__($("#fpsForTimelapseText").html()));
	$("#webcamTitle").html(i18n.__($("#webcamTitle").html()));
	$("#timelapseTitle").html(i18n.__($("#timelapseTitle").html()));
	$("#ftpSettingsTitle").html(i18n.__($("#ftpSettingsTitle").html()));
	$("#autoStartText").html(i18n.__($("#autoStartText").html()));
	$("#createVideoText").html(i18n.__($("#createVideoText").html()));
	$("#useFtpText").html(i18n.__($("#useFtpText").html()));
	$("#videoEffectText").html(i18n.__($("#videoEffectText").html()));
	$("#videoEffectNoneText").html(i18n.__($("#videoEffectNoneText").html()));
	$("#videoEffectKeyburnText").html(i18n.__($("#videoEffectKeyburnText").html()));
	$("#softwareVersion").html(app.getVersion());

	createTimelapseCron();
	createFontManager();

	/**
	 * Populate form with settings.json values.
	 */
	$("#videoResolution").val(videoResolution);
	$("#screenshotInterval").val(screenshotInterval);
	$("#screenshotIntervalUnit").val(screenshotIntervalUnit);
	$("#screenshotFilename").val(screenshotFilename);
	$("#screenshotFilenameType").val(screenshotFilenameType);
	$("#createVideo").prop("checked", createVideo);
	$("#timelapseCron").val(timelapseCron);
	$("#timelapseFilename").val(timelapseFilename);
	$("#timelapseFilenameType").val(timelapseFilenameType);
	$("#fps").val(fps);
	$("#musicFile").val(musicFile);
	$("#overlayTimelapseFile").val(overlayTimelapseFile);
	$("#overlayTimelapseX").val(overlayTimelapseX);
	$("#overlayTimelapseY").val(overlayTimelapseY);
	$("#overlayFile").val(overlayFile);
	$("#overlayX").val(overlayX);
	$("#overlayY").val(overlayY);
	$("#screenshotText").val(screenshotText);
	$("#screenshotTextX").val(screenshotTextX);
	$("#screenshotTextY").val(screenshotTextY);
	$("#screenshotTextFont").val(screenshotTextFont);
	$("#screenshotTextFontSize").val(screenshotTextFontSize);
	$("#screenshotTextFontColor").val(screenshotTextFontColor);
	$("#ftpHost").val(ftpHost);
	$("#ftpPort").val(ftpPort);
	$("#ftpUser").val(ftpUser);
	$("#autoStart").prop("checked", autoStart);
	$("#useFtp").prop("checked", useFtp);
	$("#videoEffect").val(videoEffect);

	/**
	 * Get webcam devices and stream.
	 */
	navigator.mediaDevices.enumerateDevices().then(gotDevices).then(getStream).catch(() => {
		$("#webcamStartButton").hide();
		handleConsole(i18n.__("No webcam found."));
	});

	updateTray();
	handleConsole(i18n.__("Timelapse Webcam started."));
	clearInterval(timer);
	showWebcamView();		

	/**
	 * Update and save screenshot interval.
	 */
	$("#screenshotInterval").change(function() {
		webcamStop();
		screenshotInterval = parseInt($("#screenshotInterval").val());
		if (screenshotInterval <= 0) screenshotInterval = 1;
		settings.set("screenshotInterval", screenshotInterval);
		$("#screenshotInterval").val(screenshotInterval);
		handleConsole(i18n.__("Interval updated."));
	});

	/**
	 * Update and save screenshot interval unit.
	 */
	$("#screenshotIntervalUnit").change(function() {
		webcamStop();
		screenshotIntervalUnit = $("#screenshotIntervalUnit").val();
		settings.set("screenshotIntervalUnit", screenshotIntervalUnit);
		$("#screenshotIntervalUnit").val(screenshotIntervalUnit);
		handleConsole(i18n.__("Interval updated."));
	});

	/**
	 * Update and save create video.
	 */
	$("#createVideo").change(function() {
		createVideo = $("#createVideo").prop("checked");
		settings.set("createVideo", createVideo);
		handleConsole(i18n.__("Timelapse updated."));	
	});

	/**
	 * Update and save timelapse cron.
	 */
	$("#timelapseCron").change(function() {
		timelapseCron = $("#timelapseCron").val();
		settings.set("timelapseCron", timelapseCron);
		$("#timelapseCron").val(timelapseCron);
		handleConsole(i18n.__("Timelapse updated."));	
	});

	/**
	 * Update and save fps.
	 */
	$("#fps").change(function() {
		fps = parseInt($("#fps").val());
		if (fps <= 0) fps = 30;
		settings.set("fps", fps);
		$("#fps").val(fps);
		handleConsole(i18n.__("FPS updated."));	
	});

	/**
	 * Update and save video source.
	 */
	$("#videoSource").change(function() {
		videoDevice = $("#videoSource").val();
		settings.set("videoDevice", videoDevice);
		handleConsole(i18n.__("Video source updated."));	
		getStream();
	});

	/**
	 * Update and save video resolution.
	 */
	$("#videoResolution").change(function() {
		videoResolution = $("#videoResolution").val();
		settings.set("videoResolution", videoResolution);
		$("#videoResolution").val(videoResolution);
		handleConsole(i18n.__("Video source updated."));	
		getStream();
	});

	/**
	 * Update and save ftp host.
	 */
	$("#ftpHost").change(function() {
		ftpHost = $("#ftpHost").val();
		settings.set("ftpHost", ftpHost);
		$("#ftpHost").val(ftpHost);
		handleConsole(i18n.__("Host updated."));
	});

	/**
	 * Update and save ftp port.
	 */
	$("#ftpPort").change(function() {
		ftpPort = parseInt($("#ftpPort").val());
		settings.set("ftpPort", ftpPort);
		$("#ftpPort").val(ftpPort);
		handleConsole(i18n.__("Port updated."));
	});

	/**
	 * Update and save ftp user.
	 */
	$("#ftpUser").change(function() {
		ftpUser = $("#ftpUser").val();
		settings.set("ftpUser", ftpUser);
		$("#ftpUser").val(ftpUser);
		handleConsole(i18n.__("User updated."));
	});

	/**
	 * Update and save ftp password.
	 */
	$("#ftpPassword").change(function() {
		ftpPassword = $("#ftpPassword").val();
		settings.setEncrypt("ftpPassword", ftpPassword);
		$("#ftpPassword").val(ftpPassword);
		handleConsole(i18n.__("Password updated."));
	});

	/**
	 * Update and save auto start.
	 */
	$("#autoStart").change(function() {
		autoStart = $("#autoStart").prop("checked");
		settings.set("autoStart", autoStart);
		if (process.env.NODE_ENV === "production") { 
			app.setLoginItemSettings({
			    openAtLogin: autoStart,
			    path: app.getPath("exe")
			});
		}
		handleConsole(i18n.__("Auto start updated."));	
	});

	/**
	 * Update and save use FTP.
	 */
	$("#useFtp").change(function() {
		useFtp = $("#useFtp").prop("checked");
		settings.set("useFtp", useFtp);
		handleConsole(i18n.__("FTP settings updated."));	
	});

	/**
	 * Update and save video effect.
	 */
	$("#videoEffect").change(function() {
		videoEffect = $("#videoEffect").val();
		settings.set("videoEffect", videoEffect);
		handleConsole(i18n.__("Effect updated."));	
	});

	/**
	 * Update and save screenshot text
	 */
	$("#screenshotText").change(function() {
		screenshotText = $("#screenshotText").val();
		settings.set("screenshotText", screenshotText);
		$("#screenshotText").val(screenshotText);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save screenshot text X position.
	 */
	$("#screenshotTextX").change(function() {
		screenshotTextX = parseInt($("#screenshotTextX").val());
		if (screenshotTextX < 0) screenshotTextX = 0;
		settings.set("screenshotTextX", screenshotTextX);
		$("#screenshotTextX").val(screenshotTextX);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save screenshot text Y position.
	 */
	$("#screenshotTextY").change(function() {
		screenshotTextY = parseInt($("#screenshotTextY").val());
		if (screenshotTextY < 0) screenshotTextY = 0;
		settings.set("screenshotTextY", screenshotTextY);
		$("#screenshotTextY").val(screenshotTextY);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save screenshot text font.
	 */
	$("#screenshotTextFont").change(function() {
		screenshotTextFont = $("#screenshotTextFont").val();
		settings.set("screenshotTextFont", screenshotTextFont);
		$("#screenshotTextFont").val(screenshotTextFont);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save screenshot text font size.
	 */
	$("#screenshotTextFontSize").change(function() {
		screenshotTextFontSize = parseInt($("#screenshotTextFontSize").val());
		if (screenshotTextFontSize <= 0) screenshotTextFontSize = 1;
		settings.set("screenshotTextFontSize", screenshotTextFontSize);
		$("#screenshotTextFontSize").val(screenshotTextFontSize);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save screenshot text font color.
	 */
	$("#screenshotTextFontColor").change(function() {
		screenshotTextFontColor = $("#screenshotTextFontColor").val();
		settings.set("screenshotTextFontColor", screenshotTextFontColor);
		$("#screenshotTextFontColor").val(screenshotTextFontColor);
		handleConsole(i18n.__("Text updated."));
	});

	/**
	 * Update and save music file
	 */
	$("#musicFile").change(function() {
		musicFile = $("#musicFile").val();
		settings.set("musicFile", musicFile);
		handleConsole(i18n.__("Music updated."));
	});

	/**
	 * Update and save timelapse overlay
	 */
	$("#overlayTimelapseFile").change(function() {
		overlayTimelapseFile = $("#overlayTimelapseFile").val();
		settings.set("overlayTimelapseFile", overlayTimelapseFile);
		handleConsole(i18n.__("Timelapse overlay updated."));
	});

	/**
	 * Update and save timelapse overlay X position.
	 */
	$("#overlayTimelapseX").change(function() {
		overlayTimelapseX = parseInt($("#overlayTimelapseX").val());
		if (overlayTimelapseX < 0) overlayTimelapseX = 0;
		settings.set("overlayTimelapseX", overlayTimelapseX);
		$("#overlayTimelapseX").val(overlayTimelapseX);
		handleConsole(i18n.__("Timelapse overlay updated."));
	});

	/**
	 * Update and save timelapse overlay Y position.
	 */
	$("#overlayTimelapseY").change(function() {
		overlayTimelapseY = parseInt($("#overlayTimelapseY").val());
		if (overlayTimelapseY < 0) overlayTimelapseY = 0;
		settings.set("overlayTimelapseY", overlayTimelapseY);
		$("#overlayTimelapseY").val(overlayTimelapseY);
		handleConsole(i18n.__("Timelapse overlay updated."));
	});

	/**
	 * Update and save webcam overlay
	 */
	$("#overlayFile").change(function() {
		overlayFile = $("#overlayFile").val();
		settings.set("overlayFile", overlayFile);
		handleConsole(i18n.__("Webcam overlay updated."));
	});

	/**
	 * Update and save overlay X position.
	 */
	$("#overlayX").change(function() {
		overlayX = parseInt($("#overlayX").val());
		if (overlayX < 0) overlayX = 0;
		settings.set("overlayX", overlayX);
		$("#overlayX").val(overlayX);
		handleConsole(i18n.__("Webcam overlay updated."));
	});

	/**
	 * Update and save overlay Y position.
	 */
	$("#overlayY").change(function() {
		overlayY = parseInt($("#overlayY").val());
		if (overlayY < 0) overlayY = 0;
		settings.set("overlayY", overlayY);
		$("#overlayY").val(overlayY);
		handleConsole(i18n.__("Webcam overlay updated."));
	});

	/**
	 * Update and save screenshot filename.
	 */
	$("#screenshotFilename").change(function() {
		screenshotFilename = $("#screenshotFilename").val();
		settings.set("screenshotFilename", screenshotFilename);
		$("#screenshotFilename").val(screenshotFilename);
		handleConsole(i18n.__("Filename updated."));
	});

	/**
	 * Update and save screenshot filename type.
	 */
	$("#screenshotFilenameType").change(function() {
		screenshotFilenameType = $("#screenshotFilenameType").val();
		settings.set("screenshotFilenameType", screenshotFilenameType);
		$("#screenshotFilenameType").val(screenshotFilenameType);
		handleConsole(i18n.__("Filename updated."));
	});

	/**
	 * Update and save timelapse filename.
	 */
	$("#timelapseFilename").change(function() {
		timelapseFilename = $("#timelapseFilename").val();
		settings.set("timelapseFilename", timelapseFilename);
		$("#timelapseFilename").val(timelapseFilename);
		handleConsole(i18n.__("Filename updated."));
	});

	/**
	 * Update and save timelapse filename type.
	 */
	$("#timelapseFilenameType").change(function() {
		timelapseFilenameType = $("#timelapseFilenameType").val();
		settings.set("timelapseFilenameType", timelapseFilenameType);
		$("#timelapseFilenameType").val(timelapseFilenameType);
		handleConsole(i18n.__("Filename updated."));
	});

	/**
	 * On webcam start button click.
	 */
	$("#webcamStartButton").click(function() {
		webcamStart();
	});

	/**
	 * On webcam stop button click.
	 */
	$("#webcamStopButton").click(function() {
		webcamStop();
	});

	/**
	 * On select music button click.
	 */
	$("#selectMusicButton").click(function() {
		selectMusic();
	});

	/**
	 * On select timelapse overlay button click.
	 */
	$("#selectOverlayTimelapseButton").click(function() {
		selectOverlayTimelapse();
	});

	/**
	 * On select webcam overlay button click.
	 */
	$("#selectOverlayButton").click(function() {
		selectOverlay();
	});
});