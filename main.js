const { app, BrowserWindow, ipcMain, dialog, shell, Menu, desktopCapturer, protocol } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const Store = require('electron-store');
const { spawn, execSync } = require('child_process');
const ftp = require('basic-ftp');
const sftp = require('ssh2-sftp-client');
const sharp = require('sharp');

let mainWindow;
let ffmpegAvailable = false;
let captureInterval = null;
let captureStartTime = null;
let imageCount = 0;
let isPaused = false;
let updateCheckInProgress = false;
let cleanupInterval = null;
let autoTimelapseInterval = null;

const ffmpegQueue = [];
let ffmpegProcessing = false;

const store = new Store({
    name: 'timelapse-webcam-config',
    defaults: {
        cameraSettings: {
            defaultResolution: '1920x1080',
            defaultInterval: 30,
            imageFormat: 'jpeg',
            jpegQuality: 85,
            autoStart: false
        },
        ftpSettings: {
            enabled: false,
            server: '',
            port: 21,
            username: '',
            password: '',
            directory: '/timelapse/',
            autoUploadImages: false,
            autoUploadVideos: false
        },
        storageSettings: {
            location: path.join(os.homedir(), 'TimelapseWebcam'),
            autoCleanup: false,
            cleanupDays: 30,
            maxStorage: 10
        },
        videoSettings: {
            defaultFps: 30,
            defaultQuality: 'high',
            hardwareAcceleration: true,
            preserveAspectRatio: true
        },
        notifications: {
            show: true,
            sound: false,
            captureStart: true,
            captureComplete: true,
            videoComplete: true,
            uploadComplete: true
        },
        watermark: {
            enabled: false,
            type: 'text',
            text: '',
            position: 'bottom-right',
            imagePath: '',
            imageSize: 'medium',
            imageOpacity: 80
        },
        updater: {
            autoCheck: true,
            lastCheck: null,
            skippedVersion: null
        },
        autoTimelapse: {
            enabled: false,
            interval: 24,
            mode: 'replace',
            upload: true,
            fps: 30,
            quality: 'high',
            lastRun: null
        }
    }
});

autoUpdater.checkForUpdatesAndNotify = false;
autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: getIconPath(),
        show: false,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0a0e1a',
        title: 'Timelapse Webcam'
    });

    mainWindow.setMenu(null);
    
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.once('ready-to-show', function() {
        mainWindow.show();
        if (process.argv.includes('--dev') || process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
        
        if (store.get('updater.autoCheck', true)) {
            setTimeout(function() {
                checkForUpdatesAutomatically();
            }, 3000);
        }
        
        setupCleanupScheduler();
        setupAutoTimelapseScheduler();
    });

    mainWindow.on('closed', function() {
        mainWindow = null;
        stopCapture();
    });

    mainWindow.webContents.setWindowOpenHandler(function(details) {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });
}

function getIconPath() {
    const iconPaths = {
        win32: 'assets/icon.ico',
        darwin: 'assets/icon.png',
        linux: 'assets/icon.png'
    };

    const iconPath = iconPaths[process.platform] || iconPaths.linux;
    return path.join(__dirname, iconPath);
}

async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch (error) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (mkdirError) {
            throw new Error(`Failed to create directory ${dirPath}: ${mkdirError.message}`);
        }
    }
}

function checkFFmpegAvailability() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        ffmpegAvailable = true;
    } catch (error) {
        ffmpegAvailable = false;
    }
}

autoUpdater.on('checking-for-update', function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-checking');
    }
});

autoUpdater.on('update-available', function(info) {
    const skippedVersion = store.get('updater.skippedVersion');
    if (skippedVersion && skippedVersion === info.version) {
        return;
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', {
            currentVersion: app.getVersion(),
            newVersion: info.version,
            releaseNotes: info.releaseNotes || 'error.no_release_notes',
            releaseDate: info.releaseDate
        });
    }
});

autoUpdater.on('update-not-available', function(info) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available');
    }
});

autoUpdater.on('error', function(err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', err.message);
    }
});

autoUpdater.on('download-progress', function(progressObj) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', {
            percent: Math.round(progressObj.percent),
            transferred: progressObj.transferred,
            total: progressObj.total,
            bytesPerSecond: progressObj.bytesPerSecond
        });
    }
});

autoUpdater.on('update-downloaded', function(info) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', {
            version: info.version,
            releaseNotes: info.releaseNotes
        });
    }
});

async function checkForUpdatesAutomatically() {
    if (updateCheckInProgress) return;
    
    try {
        updateCheckInProgress = true;
        await autoUpdater.checkForUpdates();
        store.set('updater.lastCheck', new Date().toISOString());
    } catch (error) {
        if (mainWindow) {
            mainWindow.webContents.send('update-error', error.message);
        }
    } finally {
        updateCheckInProgress = false;
    }
}

ipcMain.handle('window-minimize', function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
    return { success: true };
});

ipcMain.handle('window-maximize', function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
    return { success: true };
});

ipcMain.handle('window-close', function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
    return { success: true };
});

ipcMain.handle('window-focus', function() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
    }
    return { success: true };
});

ipcMain.handle('check-for-updates', async function() {
    try {
        if (updateCheckInProgress) {
            return { success: false, error: 'Update check already in progress' };
        }
        
        updateCheckInProgress = true;
        const updateCheckResult = await autoUpdater.checkForUpdates();
        store.set('updater.lastCheck', new Date().toISOString());
        
        return { 
            success: true, 
            updateInfo: updateCheckResult ? updateCheckResult.updateInfo : null 
        };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        updateCheckInProgress = false;
    }
});

ipcMain.handle('download-update', async function() {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('install-update', function() {
    try {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('skip-update-version', function(event, version) {
    try {
        store.set('updater.skippedVersion', version);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-version', async function() {
    return {
        success: true,
        version: app.getVersion(),
        name: app.getName()
    };
});

ipcMain.handle('get-update-settings', async function() {
    return {
        success: true,
        settings: store.get('updater', {
            autoCheck: true,
            lastCheck: null,
            skippedVersion: null
        })
    };
});

ipcMain.handle('save-update-settings', async function(event, settings) {
    try {
        store.set('updater', settings);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-cameras', async function() {
    try {
        const result = await mainWindow.webContents.executeJavaScript(`
            (async () => {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    return videoDevices.map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || 'Camera ' + (videoDevices.indexOf(device) + 1)
                    }));
                } catch (error) {
                    return [];
                }
            })();
        `);
        
        return {
            success: true,
            cameras: result && result.length > 0 ? result : []
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('start-capture', async function(event, settings) {
    try {
        if (captureInterval) {
            return { success: false, error: 'error.capture_already_running' };
        }

        const storageLocation = store.get('storageSettings.location');
        if (!storageLocation) {
            return { success: false, error: 'error.storage_not_configured' };
        }

        try {
            await ensureDirectoryExists(storageLocation);
            await ensureDirectoryExists(path.join(storageLocation, 'images'));
        } catch (dirError) {
            return { success: false, error: `Failed to create storage directories: ${dirError.message}` };
        }

        captureStartTime = Date.now();
        imageCount = 0;
        isPaused = false;

        const intervalMs = settings.interval * (settings.unit === 'minutes' ? 60000 : settings.unit === 'hours' ? 3600000 : 1000);

        const captureOnce = async function() {
            if (!isPaused) {
                const result = await captureImage(settings);
                if (!result.success && mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('capture-warning', {
                        message: `Failed to capture image: ${result.error}`
                    });
                }
            }
        };

        captureInterval = setInterval(captureOnce, intervalMs);
        await captureOnce();

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-capture', async function() {
    try {
        stopCapture();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('pause-capture', async function() {
    try {
        isPaused = true;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('resume-capture', async function() {
    try {
        isPaused = false;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function stopCapture() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    captureStartTime = null;
    imageCount = 0;
    isPaused = false;
}

function setupCleanupScheduler() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }
    
    const runCleanup = async function() {
        const storageSettings = store.get('storageSettings');
        if (storageSettings.autoCleanup) {
            try {
                const result = await performCleanup();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cleanup-completed', result);
                }
            } catch (error) {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cleanup-error', { error: error.message });
                }
            }
        }
    };
    
    runCleanup();
    
    cleanupInterval = setInterval(runCleanup, 24 * 60 * 60 * 1000);
}

function setupAutoTimelapseScheduler() {
    if (autoTimelapseInterval) {
        clearInterval(autoTimelapseInterval);
    }
    
    const runAutoTimelapse = async function() {
        const autoTimelapseSettings = store.get('autoTimelapse');
        if (autoTimelapseSettings.enabled && captureStartTime) {
            try {
                const now = Date.now();
                const lastRun = autoTimelapseSettings.lastRun || 0;
                const intervalMs = autoTimelapseSettings.interval * 60 * 60 * 1000;
                
                if (now - lastRun >= intervalMs) {
                    await createAutoTimelapse();
                    store.set('autoTimelapse.lastRun', now);
                }
            } catch (error) {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('auto-timelapse-error', { error: error.message });
                }
            }
        }
    };
    
    runAutoTimelapse();
    
    autoTimelapseInterval = setInterval(runAutoTimelapse, 60 * 60 * 1000);
}

async function createAutoTimelapse() {
    const storageLocation = store.get('storageSettings.location');
    const imagesDir = path.join(storageLocation, 'images');
    const videosDir = path.join(storageLocation, 'videos');
    
    const autoTimelapseSettings = store.get('autoTimelapse');
    const cutoffTime = Date.now() - (autoTimelapseSettings.interval * 60 * 60 * 1000);
    
    const files = await fs.readdir(imagesDir);
    const imageFiles = [];
    
    for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() >= cutoffTime && file.match(/\.(jpg|jpeg|png|webp)$/i)) {
            imageFiles.push(filePath);
        }
    }
    
    if (imageFiles.length === 0) {
        return;
    }
    
    imageFiles.sort((a, b) => {
        const aTime = fsSync.statSync(a).mtime.getTime();
        const bTime = fsSync.statSync(b).mtime.getTime();
        return aTime - bTime;
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z/, '');
    const baseFilename = autoTimelapseSettings.mode === 'replace' ? 'auto-timelapse' : `auto-timelapse_${timestamp}`;
    const outputPath = path.join(videosDir, `${baseFilename}.mp4`);
    
    if (autoTimelapseSettings.mode === 'replace' && fsSync.existsSync(outputPath)) {
        await fs.unlink(outputPath);
    }
    
    const options = {
        images: imageFiles,
        outputPath: outputPath,
        fps: autoTimelapseSettings.fps,
        quality: autoTimelapseSettings.quality,
        totalFrames: imageFiles.length,
        preserveAspectRatio: store.get('videoSettings.preserveAspectRatio'),
        effects: 'none',
        isAutoTimelapse: true
    };
    
    await createTimelapseInternal(options);
    
    if (autoTimelapseSettings.upload && store.get('ftpSettings.enabled')) {
        try {
            await uploadToFtp(outputPath, path.basename(outputPath));
            
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('auto-timelapse-uploaded', { 
                    filename: path.basename(outputPath) 
                });
            }
        } catch (uploadError) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('auto-timelapse-upload-error', { 
                    error: uploadError.message 
                });
            }
        }
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-timelapse-created', { 
            filename: path.basename(outputPath),
            imageCount: imageFiles.length
        });
    }
}

async function createTimelapseInternal(options) {
    return queueFFmpegTask(async () => {
        if (!ffmpegAvailable) {
            throw new Error('error.ffmpeg_not_found');
        }
        return await createTimelapseInternalImpl(options);
    });
}

async function createTimelapseInternalImpl(options) {

    if (!fsSync.existsSync(path.dirname(options.outputPath))) {
        fsSync.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    }
    
    const tempDir = path.join(os.tmpdir(), 'timelapse-' + Date.now());
    fsSync.mkdirSync(tempDir, { recursive: true });
    
    try {
        for (let i = 0; i < options.images.length; i++) {
            const sourcePath = options.images[i];
            const targetPath = path.join(tempDir, `frame_${String(i).padStart(6, '0')}.jpg`);
            await fs.copyFile(sourcePath, targetPath);
        }
        
        const ffmpegArgs = [
            '-framerate', options.fps.toString(),
            '-i', path.join(tempDir, 'frame_%06d.jpg'),
            '-c:v', 'libx264'
        ];

        if (store.get('videoSettings.hardwareAcceleration')) {
            ffmpegArgs.splice(0, 0, '-hwaccel', 'auto');
        }

        switch (options.quality) {
            case 'low':
                ffmpegArgs.push('-crf', '28');
                break;
            case 'medium':
                ffmpegArgs.push('-crf', '23');
                break;
            case 'high':
                ffmpegArgs.push('-crf', '18');
                break;
            case 'ultra':
                ffmpegArgs.push('-crf', '15');
                break;
        }

        const videoFilters = [];
        
        if (options.effects === 'fade') {
            videoFilters.push('fade=in:0:25');
            videoFilters.push('fade=out:st=' + (options.totalFrames / options.fps - 1) + ':d=1');
        } else if (options.effects === 'zoom') {
            videoFilters.push('zoompan=z=\'min(zoom+0.0015,1.5)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=' + (options.fps * 10));
        } else if (options.effects === 'pan') {
            videoFilters.push('zoompan=z=1:x=\'if(lte(on,1),(iw-ow)/2,x-1)\':y=\'ih/2-(ih/zoom/2)\':d=' + (options.fps * 10));
        }
        
        if (options.preserveAspectRatio !== false) {
            videoFilters.push('scale=\'if(gt(a,16/9),1920,-1)\':\'if(gt(a,16/9),-1,1080)\'');
            videoFilters.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
        }
        
        if (videoFilters.length > 0) {
            ffmpegArgs.push('-vf', videoFilters.join(','));
        }

        ffmpegArgs.push('-pix_fmt', 'yuv420p');
        ffmpegArgs.push('-y');
        ffmpegArgs.push(options.outputPath);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });
            
            ffmpeg.on('error', reject);
        });
        
    } finally {
        try {
            const files = fsSync.readdirSync(tempDir);
            for (const file of files) {
                fsSync.unlinkSync(path.join(tempDir, file));
            }
            fsSync.rmdirSync(tempDir);
        } catch (error) {
        }
    }
}

async function getCameraImage(settings) {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return null;
        }

        const result = await mainWindow.webContents.executeJavaScript(`
            (async () => {
                try {
                    const video = document.getElementById('camera-preview');
                    if (!video || !video.srcObject) {
                        return null;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 1920;
                    canvas.height = video.videoHeight || 1080;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const format = '${settings.imageFormat || 'jpeg'}';
                    const quality = ${settings.jpegQuality || 85} / 100;
                    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
                    
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
                    if (!blob) {
                        throw new Error('Failed to create image blob');
                    }
                    const arrayBuffer = await blob.arrayBuffer();
                    return Array.from(new Uint8Array(arrayBuffer));
                } catch (error) {
                    return null;
                }
            })();
        `);
        
        if (result && Array.isArray(result)) {
            return Buffer.from(result);
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

async function getStorageInfo() {
    try {
        const storageLocation = store.get('storageSettings.location');
        if (!storageLocation) {
            return { used: 0, available: 0, total: 0 };
        }

        let totalSize = 0;
        
        const imagesDir = path.join(storageLocation, 'images');
        if (fsSync.existsSync(imagesDir)) {
            const files = fsSync.readdirSync(imagesDir);
            for (const file of files) {
                const filePath = path.join(imagesDir, file);
                const stats = fsSync.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            }
        }
        
        const videosDir = path.join(storageLocation, 'videos');
        if (fsSync.existsSync(videosDir)) {
            const files = fsSync.readdirSync(videosDir);
            for (const file of files) {
                const filePath = path.join(videosDir, file);
                const stats = fsSync.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            }
        }
        
        return {
            used: totalSize,
            available: 0,
            total: 0
        };
    } catch (error) {
        return { used: 0, available: 0, total: 0 };
    }
}

async function captureImage(settings) {
    try {
        const storageInfo = await getStorageInfo();
        const maxStorageBytes = store.get('storageSettings.maxStorage') * 1024 * 1024 * 1024;
        
        if (storageInfo.used >= maxStorageBytes) {
            stopCapture();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('storage-limit-reached', {
                    used: storageInfo.used,
                    limit: maxStorageBytes
                });
            }
            throw new Error('Storage limit reached');
        }
        
        const storageLocation = store.get('storageSettings.location');
        if (!storageLocation) {
            throw new Error('Storage location not configured');
        }
        
        const imageFormat = store.get('cameraSettings.imageFormat') || 'jpeg';
        const jpegQuality = store.get('cameraSettings.jpegQuality') || 85;
        
        const imagesDir = path.join(storageLocation, 'images');
        if (!fsSync.existsSync(imagesDir)) {
            fsSync.mkdirSync(imagesDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z/, '');
        const filename = `capture_${timestamp}.${imageFormat}`;
        const filepath = path.join(imagesDir, filename);

        const captureSettings = {
            imageFormat: imageFormat,
            jpegQuality: jpegQuality
        };
        
        const imageBuffer = await getCameraImage(captureSettings);
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Failed to capture image from camera - buffer is empty');
        }

        let processedBuffer = imageBuffer;

        if (store.get('watermark.enabled')) {
            const watermarkSettings = store.get('watermark');
            
            if (watermarkSettings.type === 'text' && watermarkSettings.text) {
                processedBuffer = await addTextWatermark(imageBuffer, watermarkSettings.text, watermarkSettings.position);
            } else if (watermarkSettings.type === 'image' && watermarkSettings.imagePath) {
                processedBuffer = await addImageWatermark(imageBuffer, watermarkSettings);
            }
        }

        try {
            if (!processedBuffer || processedBuffer.length === 0) {
                throw new Error('Image buffer is empty');
            }
            await fs.writeFile(filepath, processedBuffer);
            
            const stats = await fs.stat(filepath);
            if (stats.size === 0) {
                throw new Error('File was written but is empty');
            }
        } catch (writeError) {
throw new Error(`Failed to save image: ${writeError.message}`);
        }
        
        imageCount++;

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('image-captured', {
                count: imageCount,
                filename: filename,
                filepath: filepath
            });
        }

        if (store.get('ftpSettings.enabled') && store.get('ftpSettings.autoUploadImages')) {
            try {
                await uploadToFtp(filepath, filename);
            } catch (uploadError) {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ftp-upload-error', { 
                        error: uploadError.message, 
                        filename: filename 
                    });
                }
            }
        }

        return { success: true, filename: filename };
    } catch (error) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('capture-error', {
                error: error.message
            });
        }
        return { success: false, error: error.message };
    }
}

async function addTextWatermark(imageBuffer, text, position) {
    try {
        const escapedText = text.replace(/[<>&'"]/g, function(char) {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                "'": '&apos;',
                '"': '&quot;'
            };
            return entities[char] || char;
        });

        const svg = `
            <svg width="300" height="50" xmlns="http://www.w3.org/2000/svg">
                <style>
                    .watermark-text { 
                        font-family: Arial, sans-serif; 
                        font-size: 20px; 
                        font-weight: bold;
                    }
                </style>
                <text x="10" y="30" class="watermark-text" fill="white" stroke="black" stroke-width="1">${escapedText}</text>
            </svg>
        `;

        const watermarkBuffer = Buffer.from(svg);
        
        let gravity;
        switch (position) {
            case 'top-left': gravity = 'northwest'; break;
            case 'top-right': gravity = 'northeast'; break;
            case 'bottom-left': gravity = 'southwest'; break;
            case 'bottom-right': gravity = 'southeast'; break;
            case 'center': gravity = 'center'; break;
            default: gravity = 'southeast';
        }

        const result = await sharp(imageBuffer)
            .composite([{ 
                input: watermarkBuffer, 
                gravity: gravity,
                blend: 'over'
            }])
            .jpeg({ quality: store.get('cameraSettings.jpegQuality') || 85 })
            .toBuffer();

        return result;
    } catch (error) {
        return imageBuffer;
    }
}

async function addImageWatermark(imageBuffer, watermarkSettings) {
    try {
        const watermarkPath = watermarkSettings.imagePath;
        const size = watermarkSettings.imageSize || 'medium';
        const opacity = (watermarkSettings.imageOpacity || 80) / 100;
        const position = watermarkSettings.position || 'bottom-right';

        const exists = await fs.access(watermarkPath).then(() => true).catch(() => false);
        if (!exists) {
            return imageBuffer;
        }

        let gravity;
        switch (position) {
            case 'top-left': gravity = 'northwest'; break;
            case 'top-right': gravity = 'northeast'; break;
            case 'bottom-left': gravity = 'southwest'; break;
            case 'bottom-right': gravity = 'southeast'; break;
            case 'center': gravity = 'center'; break;
            default: gravity = 'southeast';
        }

        let watermarkWidth;
        switch (size) {
            case 'small': watermarkWidth = 100; break;
            case 'medium': watermarkWidth = 200; break;
            case 'large': watermarkWidth = 300; break;
            default: watermarkWidth = 200;
        }

        const watermarkImage = await sharp(watermarkPath)
            .resize(watermarkWidth, null, { 
                withoutEnlargement: true,
                fit: 'inside'
            })
            .png()
            .toBuffer();

        const processedWatermark = await sharp(watermarkImage)
            .composite([{
                input: Buffer.from([255, 255, 255, Math.round(255 * opacity)]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in'
            }])
            .png()
            .toBuffer();

        const result = await sharp(imageBuffer)
            .composite([{ 
                input: processedWatermark, 
                gravity: gravity,
                blend: 'over'
            }])
            .jpeg()
            .toBuffer();

        return result;
    } catch (error) {
        return imageBuffer;
    }
}

ipcMain.handle('get-capture-status', async function() {
    try {
        const isRunning = captureInterval !== null;
        const elapsedTime = captureStartTime ? Date.now() - captureStartTime : 0;
        
        return {
            success: true,
            status: {
                isRunning: isRunning,
                isPaused: isPaused,
                imageCount: imageCount,
                elapsedTime: elapsedTime,
                startTime: captureStartTime
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-folder', async function(event, title) {
    try {
        if (typeof title !== 'string' && title !== undefined) {
            throw new Error('Invalid title parameter');
        }
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: title || 'Select Folder',
            properties: ['openDirectory', 'createDirectory']
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const selectedPath = path.resolve(result.filePaths[0]);
        if (!selectedPath.startsWith(path.resolve(os.homedir()))) {
            return { success: false, error: 'Path outside user directory not allowed' };
        }

        return { success: true, path: selectedPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-files', async function(event, options) {
    try {
        const dialogOptions = {
            title: options.title || 'Select Files',
            properties: ['openFile']
        };

        if (options.multiple) {
            dialogOptions.properties.push('multiSelections');
        }

        if (options.filters) {
            dialogOptions.filters = options.filters;
        }

        const result = await dialog.showOpenDialog(mainWindow, dialogOptions);

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        return { success: true, paths: result.filePaths };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-watermark-image', async function(event, dialogTitle) {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: dialogTitle || 'Select Watermark Image',
            properties: ['openFile'],
            filters: [
                { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const imagePath = result.filePaths[0];
        
        try {
            const metadata = await sharp(imagePath).metadata();
            if (!metadata.width || !metadata.height) {
                return { success: false, error: 'Invalid image file' };
            }
        } catch (error) {
            return { success: false, error: 'Invalid image format' };
        }

        return { success: true, path: imagePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-settings', async function() {
    try {
        return { success: true, settings: store.store };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-settings', async function(event, settings) {
    try {
        Object.keys(settings).forEach(function(key) {
            store.set(key, settings[key]);
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-ftp-connection', async function() {
    try {
        const ftpSettings = store.get('ftpSettings');
        const protocol = ftpSettings.protocol || 'ftp';
        
        if (protocol === 'sftp') {
            return await testSftpConnection(ftpSettings);
        } else {
            return await testFtpConnection(ftpSettings);
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

async function testFtpConnection(ftpSettings) {
    const client = new ftp.Client();
    
    await client.access({
        host: ftpSettings.server,
        port: ftpSettings.port,
        user: ftpSettings.username,
        password: ftpSettings.password
    });

    let ftpDirectory = ftpSettings.directory.replace(/\\/g, '/');
    if (!ftpDirectory.startsWith('/')) {
        ftpDirectory = '/' + ftpDirectory;
    }
    if (!ftpDirectory.endsWith('/')) {
        ftpDirectory = ftpDirectory + '/';
    }

    await client.ensureDir(ftpDirectory);
    client.close();

    return { success: true };
}

async function testSftpConnection(ftpSettings) {
    const client = new sftp();
    
    await client.connect({
        host: ftpSettings.server,
        port: ftpSettings.port || 22,
        username: ftpSettings.username,
        password: ftpSettings.password
    });

    let sftpDirectory = ftpSettings.directory.replace(/\\/g, '/');
    if (!sftpDirectory.startsWith('/')) {
        sftpDirectory = '/' + sftpDirectory;
    }
    if (!sftpDirectory.endsWith('/')) {
        sftpDirectory = sftpDirectory + '/';
    }

    try {
        await client.mkdir(sftpDirectory, true);
    } catch (error) {
    }

    await client.end();

    return { success: true };
}

async function processFFmpegQueue() {
    if (ffmpegProcessing || ffmpegQueue.length === 0) return;
    
    ffmpegProcessing = true;
    const task = ffmpegQueue.shift();
    
    try {
        const result = await task.execute();
        task.resolve(result);
    } catch (error) {
        task.reject(error);
    } finally {
        ffmpegProcessing = false;
        processFFmpegQueue();
    }
}

async function queueFFmpegTask(executeFunction) {
    return new Promise((resolve, reject) => {
        ffmpegQueue.push({
            execute: executeFunction,
            resolve: resolve,
            reject: reject
        });
        processFFmpegQueue();
    });
}

async function uploadToFtp(localPath, filename) {
    try {
        const ftpSettings = store.get('ftpSettings');
        const protocol = ftpSettings.protocol || 'ftp';
        
        if (protocol === 'sftp') {
            return await uploadViaSftp(localPath, filename, ftpSettings);
        } else {
            return await uploadViaFtp(localPath, filename, ftpSettings);
        }
    } catch (error) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ftp-upload-error', { error: error.message, filename: filename });
        }
        return { success: false, error: error.message };
    }
}

async function uploadViaFtp(localPath, filename, ftpSettings) {
    const client = new ftp.Client();
    
    await client.access({
        host: ftpSettings.server,
        port: ftpSettings.port,
        user: ftpSettings.username,
        password: ftpSettings.password
    });

    let ftpDirectory = ftpSettings.directory.replace(/\\/g, '/');
    if (!ftpDirectory.startsWith('/')) {
        ftpDirectory = '/' + ftpDirectory;
    }
    if (!ftpDirectory.endsWith('/')) {
        ftpDirectory = ftpDirectory + '/';
    }

    await client.ensureDir(ftpDirectory);
    const remotePath = ftpDirectory + filename;
    await client.uploadFrom(localPath, remotePath);
    client.close();

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-upload-complete', { filename: filename });
    }

    return { success: true };
}

async function uploadViaSftp(localPath, filename, ftpSettings) {
    const client = new sftp();
    
    await client.connect({
        host: ftpSettings.server,
        port: ftpSettings.port || 22,
        username: ftpSettings.username,
        password: ftpSettings.password
    });

    let sftpDirectory = ftpSettings.directory.replace(/\\/g, '/');
    if (!sftpDirectory.startsWith('/')) {
        sftpDirectory = '/' + sftpDirectory;
    }
    if (!sftpDirectory.endsWith('/')) {
        sftpDirectory = sftpDirectory + '/';
    }

    try {
        await client.mkdir(sftpDirectory, true);
    } catch (error) {
    }

    const remotePath = sftpDirectory + filename;
    await client.put(localPath, remotePath);
    await client.end();

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ftp-upload-complete', { filename: filename });
    }

    return { success: true };
}

ipcMain.handle('create-timelapse', async function(event, options) {
    try {
        if (!ffmpegAvailable) {
            return { 
                success: false, 
                error: 'error.ffmpeg_not_found' 
            };
        }

        const outputDir = path.join(store.get('storageSettings.location'), 'videos');
        await ensureDirectoryExists(outputDir);

        const outputPath = path.join(outputDir, `${options.name}.mp4`);
        
        if (!options.inputPath) {
            throw new Error('Input directory path is required');
        }
        
        if (!fsSync.existsSync(options.inputPath)) {
            throw new Error(`Input directory does not exist: ${options.inputPath}`);
        }
        
        let directoryStats;
        try {
            directoryStats = fsSync.statSync(options.inputPath);
        } catch (error) {
            throw new Error(`Cannot access input directory: ${options.inputPath}. Error: ${error.message}`);
        }
        
        if (!directoryStats.isDirectory()) {
            throw new Error(`Input path is not a directory: ${options.inputPath}`);
        }
        
        let imageFiles;
        try {
            imageFiles = fsSync.readdirSync(options.inputPath)
                .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
                .sort()
                .map(file => path.join(options.inputPath, file));
        } catch (error) {
            throw new Error(`Failed to read directory contents: ${options.inputPath}. Error: ${error.message}`);
        }
            
        if (imageFiles.length === 0) {
            throw new Error(`No JPEG images found in the specified directory: ${options.inputPath}`);
        }
        
        const tempFileList = path.join(os.tmpdir(), `timelapse_${Date.now()}.txt`);
        const fileListContent = imageFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
        fsSync.writeFileSync(tempFileList, fileListContent);
            
        const ffmpegArgs = [
            '-f', 'concat',
            '-safe', '0',
            '-r', options.fps.toString(),
            '-i', tempFileList
        ];
        
        let videoEncoder = 'mpeg4';
        let usesBitrate = true;
        
        try {
            execSync('ffmpeg -f lavfi -i testsrc=duration=0.1:size=320x240:rate=1 -c:v libx264 -f null - 2>/dev/null', { timeout: 5000 });
            videoEncoder = 'libx264';
            usesBitrate = false;
        } catch (e) {
        }
        
        if (store.get('videoSettings.hardwareAcceleration')) {
            ffmpegArgs.splice(0, 0, '-hwaccel', 'auto');
        }

        if (options.musicPath) {
            if (!fsSync.existsSync(options.musicPath)) {
                throw new Error(`Music file not found: ${options.musicPath}`);
            }
            
            ffmpegArgs.push('-i', options.musicPath);
        }

        ffmpegArgs.push('-c:v', videoEncoder);
        
        if (usesBitrate) {
            let bitrate = '5M';
            switch (options.quality) {
                case 'low':
                    bitrate = '2M';
                    break;
                case 'medium':
                    bitrate = '5M';
                    break;
                case 'high':
                    bitrate = '8M';
                    break;
                case 'ultra':
                    bitrate = '12M';
                    break;
            }
            ffmpegArgs.push('-b:v', bitrate);
        } else {
            switch (options.quality) {
                case 'low':
                    ffmpegArgs.push('-crf', '28');
                    break;
                case 'medium':
                    ffmpegArgs.push('-crf', '23');
                    break;
                case 'high':
                    ffmpegArgs.push('-crf', '18');
                    break;
                case 'ultra':
                    ffmpegArgs.push('-crf', '15');
                    break;
            }
        }

        if (options.musicPath) {
            ffmpegArgs.push('-c:a', 'aac');
            ffmpegArgs.push('-filter:a', `volume=${options.musicVolume / 100}`);
            ffmpegArgs.push('-shortest');
        }
        
        const videoFilters = [];
        
        if (options.effects === 'fade') {
            videoFilters.push('fade=in:0:25');
            videoFilters.push('fade=out:st=' + (options.totalFrames / options.fps - 1) + ':d=1');
        } else if (options.effects === 'zoom') {
            videoFilters.push('zoompan=z=\'min(zoom+0.0015,1.5)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=' + (options.fps * 10));
        } else if (options.effects === 'pan') {
            videoFilters.push('zoompan=z=1:x=\'if(lte(on,1),(iw-ow)/2,x-1)\':y=\'ih/2-(ih/zoom/2)\':d=' + (options.fps * 10));
        }
        
        if (store.get('videoSettings.preserveAspectRatio') !== false) {
            videoFilters.push('scale=\'if(gt(a,16/9),1920,-1)\':\'if(gt(a,16/9),-1,1080)\'');
            videoFilters.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
        }
        
        if (videoFilters.length > 0) {
            ffmpegArgs.push('-vf', videoFilters.join(','));
        }


        ffmpegArgs.push('-pix_fmt', 'yuv420p');
        ffmpegArgs.push('-y');
        ffmpegArgs.push(outputPath);


        return new Promise(function(resolve, reject) {
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            let progress = 0;
            let errorOutput = '';

            ffmpeg.stderr.on('data', function(data) {
                const output = data.toString();
                errorOutput += output;
                const frameMatch = output.match(/frame=\s*(\d+)/);
                if (frameMatch && options.totalFrames) {
                    progress = Math.round((parseInt(frameMatch[1]) / options.totalFrames) * 100);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('timelapse-progress', {
                            progress: progress,
                            frame: parseInt(frameMatch[1]),
                            total: options.totalFrames
                        });
                    }
                }
            });

            ffmpeg.on('close', function(code) {
                try {
                    fsSync.unlinkSync(tempFileList);
                } catch (err) {
                }
                
                if (code === 0) {
                    if (store.get('ftpSettings.enabled') && store.get('ftpSettings.autoUploadVideos')) {
                        uploadToFtp(outputPath, `${options.name}.mp4`);
                    }
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('timelapse-complete', {
                            outputPath: outputPath,
                            filename: `${options.name}.mp4`,
                            isAutoTimelapse: options.isAutoTimelapse || false
                        });
                    }
                    
                    resolve({ success: true, outputPath: outputPath });
                } else {
                    const message = errorOutput.includes('No such file or directory') ? 
                        'FFmpeg not found. Please install FFmpeg and ensure it is in your PATH.' :
                        `FFmpeg process exited with code ${code}. Error: ${errorOutput}`;
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('timelapse-error', {
                            error: message
                        });
                    }
                    
                    reject(new Error(message));
                }
            });

            ffmpeg.on('error', function(error) {
                try {
                    fsSync.unlinkSync(tempFileList);
                } catch (err) {
                }
                
                if (error.code === 'ENOENT') {
                    reject(new Error('FFmpeg not found. Please install FFmpeg and ensure it is in your PATH. Download from: https://ffmpeg.org/download.html'));
                } else {
                    reject(error);
                }
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-videos', async function() {
    try {
        const videosDir = path.join(store.get('storageSettings.location'), 'videos');
        await ensureDirectoryExists(videosDir);

        const files = await fs.readdir(videosDir);
        const videos = [];

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.mp4') {
                const filePath = path.join(videosDir, file);
                const stats = await fs.stat(filePath);
                
                videos.push({
                    name: path.basename(file, '.mp4'),
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                });
            }
        }

        videos.sort(function(a, b) {
            return b.created - a.created;
        });

        return { success: true, videos: videos };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-video', async function(event, videoPath) {
    try {
        await fs.unlink(videoPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('play-video', async function(event, videoPath) {
    try {
        
        if (!fsSync.existsSync(videoPath)) {
            return { success: false, error: `Video file not found: ${videoPath}` };
        }
        
        const result = await shell.openPath(videoPath);
        
        if (result === '') {
            return { success: true };
        } else {
            return { success: false, error: `Failed to open video: ${result}` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-video', async function(event, videoPath, dialogTitle) {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: dialogTitle || 'Export Video',
            defaultPath: path.basename(videoPath),
            filters: [
                { name: 'Video Files', extensions: ['mp4'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        await fs.copyFile(videoPath, result.filePath);
        return { success: true, path: result.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('upload-video-ftp', async function(event, videoPath, filename) {
    try {
        const result = await uploadToFtp(videoPath, filename);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-storage-info', async function() {
    try {
        const storageLocation = store.get('storageSettings.location');
        await ensureDirectoryExists(storageLocation);

        const imagesDir = path.join(storageLocation, 'images');
        const videosDir = path.join(storageLocation, 'videos');

        await ensureDirectoryExists(imagesDir);
        await ensureDirectoryExists(videosDir);

        let totalSize = 0;
        let imageCount = 0;
        let videoCount = 0;

        try {
            const imageFiles = await fs.readdir(imagesDir);
            for (const file of imageFiles) {
                const stats = await fs.stat(path.join(imagesDir, file));
                totalSize += stats.size;
                imageCount++;
            }
        } catch (error) {
        }

        try {
            const videoFiles = await fs.readdir(videosDir);
            for (const file of videoFiles) {
                if (path.extname(file).toLowerCase() === '.mp4') {
                    const stats = await fs.stat(path.join(videosDir, file));
                    totalSize += stats.size;
                    videoCount++;
                }
            }
        } catch (error) {
        }

        return {
            success: true,
            info: {
                totalSize: totalSize,
                imageCount: imageCount,
                videoCount: videoCount,
                location: storageLocation
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

async function performCleanup() {
    const storageSettings = store.get('storageSettings');
    if (!storageSettings.autoCleanup) {
        return { success: true, message: 'Auto cleanup is disabled' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - storageSettings.cleanupDays);

    const imagesDir = path.join(storageSettings.location, 'images');
    const files = await fs.readdir(imagesDir);
    
    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
            deletedSize += stats.size;
        }
    }

    return {
        success: true,
        deletedCount: deletedCount,
        deletedSize: deletedSize
    };
}

ipcMain.handle('cleanup-old-files', async function() {
    try {
        return await performCleanup();
    } catch (error) {
        return { success: false, error: error.message };
    }
});

process.on('uncaughtException', function(error) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox('Unexpected Error',
            'An unexpected error occurred: ' + error.message + '\n\nThe application will continue running, but you may want to restart it.'
        );
    }
});

process.on('unhandledRejection', function(reason, promise) {
    if (mainWindow) {
        mainWindow.webContents.send('promise-error', { reason: reason?.toString() || 'Unknown error' });
    }
});

app.enableSandbox = false;

app.whenReady().then(async function() {
    Menu.setApplicationMenu(null);
    checkFFmpegAvailability();
    
    const storageLocation = store.get('storageSettings.location');
    const imagesDir = path.join(storageLocation, 'images');
    const videosDir = path.join(storageLocation, 'videos');
    
    try {
        if (!fsSync.existsSync(storageLocation)) {
            await fs.mkdir(storageLocation, { recursive: true });
        }
        if (!fsSync.existsSync(imagesDir)) {
            await fs.mkdir(imagesDir, { recursive: true });
        }
        if (!fsSync.existsSync(videosDir)) {
            await fs.mkdir(videosDir, { recursive: true });
        }
    } catch (error) {
    }
    
    createWindow();

    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', function() {
    stopCapture();
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }
    if (autoTimelapseInterval) {
        clearInterval(autoTimelapseInterval);
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', function() {
    stopCapture();
});

app.on('web-contents-created', function(event, contents) {
    contents.on('new-window', function(event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });

    contents.on('will-navigate', function(event, navigationUrl) {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    contents.setWindowOpenHandler(function(details) {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });
});

app.setAboutPanelOptions({
    applicationName: 'Timelapse Webcam',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2025',
    credits: 'Built with Electron and FFmpeg'
});

if (process.env.NODE_ENV === 'production') {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
    } else {
        app.on('second-instance', function() {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    }
}