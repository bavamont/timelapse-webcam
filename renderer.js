const ipcRenderer = (() => {
    if (window.electronAPI) {
        return {
            invoke: window.electronAPI.invoke,
            on: window.electronAPI.on,
            removeAllListeners: window.electronAPI.removeAllListeners
        };
    } else {
        try {
            return require('electron').ipcRenderer;
        } catch (e) {
            return null;
        }
    }
})();

async function safeInvoke(channel, ...args) {
    if (!ipcRenderer) {
        throw new Error('IPC communication not available');
    }
    try {
        return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
        throw error;
    }
}

let currentStream = null;
let isInitializing = true;
let isProgrammaticChange = false;
let appState = {
    isCapturing: false,
    isPaused: false,
    imageCount: 0,
    elapsedTime: 0,
    captureStartTime: null,
    currentTab: 'capture',
    cameras: [],
    videos: [],
    settings: {},
    captureTimer: null,
    statusTimer: null,
    createVideoModal: {
        isOpen: false,
        selectedImages: [],
        outputName: '',
        fps: 30,
        quality: 'high',
        musicEnabled: false,
        musicPath: '',
        musicVolume: 50,
        effects: 'none'
    },
    deleteModal: {
        isOpen: false,
        videoPath: '',
        videoName: ''
    },
    updateModal: {
        isOpen: false,
        updateInfo: null,
        isDownloading: false,
        downloadProgress: 0
    }
};

const elements = {
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),
    
    captureStatusText: document.getElementById('capture-status-text'),
    statusIndicator: document.getElementById('status-indicator'),
    languageSelector: document.getElementById('language-selector'),
    
    checkUpdatesBtn: document.getElementById('check-updates-btn'),
    manualCheckUpdatesBtn: document.getElementById('manual-check-updates'),
    autoCheckUpdates: document.getElementById('auto-check-updates'),
    currentVersion: document.getElementById('current-version'),
    updateStatus: document.getElementById('update-status'),
    
    cameraSelect: document.getElementById('camera-select'),
    resolutionSelect: document.getElementById('resolution-select'),
    intervalValue: document.getElementById('interval-value'),
    intervalUnit: document.getElementById('interval-unit'),
    
    startCaptureBtn: document.getElementById('start-capture-btn'),
    pauseCaptureBtn: document.getElementById('pause-capture-btn'),
    stopCaptureBtn: document.getElementById('stop-capture-btn'),
    
    cameraPreview: document.getElementById('camera-preview'),
    cameraOverlay: document.getElementById('camera-overlay'),
    noCameraMessage: document.getElementById('no-camera-message'),
    watermarkPreview: document.getElementById('watermark-preview'),
    watermarkImagePreview: document.getElementById('watermark-image-preview'),
    
    imagesCapturedCount: document.getElementById('images-captured-count'),
    elapsedTime: document.getElementById('elapsed-time'),
    nextCapture: document.getElementById('next-capture'),
    estimatedLength: document.getElementById('estimated-length'),
    
    saveLocation: document.getElementById('save-location'),
    browseSaveLocation: document.getElementById('browse-save-location'),
    autoUploadImages: document.getElementById('auto-upload-images'),
    addWatermark: document.getElementById('add-watermark'),
    watermarkSettings: document.getElementById('watermark-settings'),
    watermarkType: document.getElementById('watermark-type'),
    watermarkTextSettings: document.getElementById('watermark-text-settings'),
    watermarkImageSettings: document.getElementById('watermark-image-settings'),
    watermarkText: document.getElementById('watermark-text'),
    watermarkImagePath: document.getElementById('watermark-image-path'),
    browseWatermarkImage: document.getElementById('browse-watermark-image'),
    watermarkSize: document.getElementById('watermark-size'),
    watermarkOpacity: document.getElementById('watermark-opacity'),
    watermarkOpacityValue: document.getElementById('watermark-opacity-value'),
    watermarkPosition: document.getElementById('watermark-position'),
    
    createTimelapseBtn: document.getElementById('create-timelapse-btn'),
    createFirstVideoBtn: document.getElementById('create-first-video-btn'),
    videoList: document.getElementById('video-list'),
    videoEmptyState: document.getElementById('video-empty-state'),
    videoCount: document.getElementById('video-count'),
    
    timelapseModal: document.getElementById('timelapse-modal'),
    timelapseModalCancel: document.getElementById('timelapse-modal-cancel'),
    timelapseModalCreate: document.getElementById('timelapse-modal-create'),
    timelapseImages: document.getElementById('timelapse-images'),
    browseImagesBtn: document.getElementById('browse-images-btn'),
    timelapseOutputName: document.getElementById('timelapse-output-name'),
    timelapseFps: document.getElementById('timelapse-fps'),
    timelapseQuality: document.getElementById('timelapse-quality'),
    addMusic: document.getElementById('add-music'),
    musicSettings: document.getElementById('music-settings'),
    musicFile: document.getElementById('music-file'),
    browseMusicBtn: document.getElementById('browse-music-btn'),
    musicVolume: document.getElementById('music-volume'),
    musicVolumeValue: document.getElementById('music-volume-value'),
    videoEffects: document.getElementById('video-effects'),
    
    progressModal: document.getElementById('progress-modal'),
    creationProgressPercentage: document.getElementById('creation-progress-percentage'),
    creationProgressFill: document.getElementById('creation-progress-fill'),
    creationStatus: document.getElementById('creation-status'),
    framesProcessed: document.getElementById('frames-processed'),
    
    deleteModal: document.getElementById('delete-modal'),
    deleteModalCancel: document.getElementById('delete-modal-cancel'),
    deleteModalConfirm: document.getElementById('delete-modal-confirm'),
    deleteItemName: document.getElementById('delete-item-name'),
    
    updateModal: document.getElementById('update-modal'),
    modalCurrentVersion: document.getElementById('modal-current-version'),
    modalNewVersion: document.getElementById('modal-new-version'),
    releaseNotesContent: document.getElementById('release-notes-content'),
    downloadProgress: document.getElementById('download-progress'),
    downloadPercentage: document.getElementById('download-percentage'),
    downloadProgressFill: document.getElementById('download-progress-fill'),
    skipUpdate: document.getElementById('skip-update'),
    installLater: document.getElementById('install-later'),
    installUpdate: document.getElementById('install-update'),
    
    defaultResolution: document.getElementById('default-resolution'),
    defaultInterval: document.getElementById('default-interval'),
    imageFormat: document.getElementById('image-format'),
    jpegQuality: document.getElementById('jpeg-quality'),
    jpegQualityValue: document.getElementById('jpeg-quality-value'),
    autoStart: document.getElementById('auto-start'),
    
    ftpEnabled: document.getElementById('ftp-enabled'),
    ftpSettingsGroup: document.getElementById('ftp-settings-group'),
    uploadProtocol: document.getElementById('upload-protocol'),
    ftpServer: document.getElementById('ftp-server'),
    ftpPort: document.getElementById('ftp-port'),
    ftpUsername: document.getElementById('ftp-username'),
    ftpPassword: document.getElementById('ftp-password'),
    ftpDirectory: document.getElementById('ftp-directory'),
    testFtpBtn: document.getElementById('test-ftp-btn'),
    autoUploadCaptured: document.getElementById('auto-upload-captured'),
    autoUploadVideos: document.getElementById('auto-upload-videos'),
    
    storageLocation: document.getElementById('storage-location'),
    browseStorageLocation: document.getElementById('browse-storage-location'),
    autoCleanup: document.getElementById('auto-cleanup'),
    cleanupDays: document.getElementById('cleanup-days'),
    maxStorage: document.getElementById('max-storage'),
    
    defaultFps: document.getElementById('default-fps'),
    defaultVideoQuality: document.getElementById('default-video-quality'),
    hardwareAcceleration: document.getElementById('hardware-acceleration'),
    preserveAspectRatio: document.getElementById('preserve-aspect-ratio'),
    
    showNotifications: document.getElementById('show-notifications'),
    soundNotifications: document.getElementById('sound-notifications'),
    notifyCaptureStart: document.getElementById('notify-capture-start'),
    notifyCaptureComplete: document.getElementById('notify-capture-complete'),
    notifyVideoComplete: document.getElementById('notify-video-complete'),
    notifyUploadComplete: document.getElementById('notify-upload-complete'),
    
    autoTimelapseEnabled: document.getElementById('auto-timelapse-enabled'),
    autoTimelapseSettings: document.getElementById('auto-timelapse-settings'),
    autoTimelapseInterval: document.getElementById('auto-timelapse-interval'),
    autoTimelapseMode: document.getElementById('auto-timelapse-mode'),
    autoTimelapseUpload: document.getElementById('auto-timelapse-upload'),
    autoTimelapseFps: document.getElementById('auto-timelapse-fps'),
    autoTimelapseQuality: document.getElementById('auto-timelapse-quality')
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    if (!ipcRenderer) {
        if (typeof showToast === 'function') {
            showToast('Critical Error: Unable to communicate with the main process. Please restart the application.', 'error');
        } else {
            alert('Critical Error: Unable to communicate with the main process. Please restart the application.');
        }
        return;
    }
    
    setupEventListeners();
    setupWindowControls();
    setupUpdateEventListeners();
    await loadSettings();
    await loadCameras();
    await loadVideos();
    await loadAppVersion();
    setupLanguageHandling();
    startStatusUpdates();
    
    isInitializing = false;
    
    if (appState.settings.cameraSettings?.autoStart) {
        setTimeout(() => {
            startCapture();
        }, 1000);
    }
}

function setupLanguageHandling() {
    if (typeof i18n !== 'undefined') {
        if (elements.languageSelector) {
            elements.languageSelector.addEventListener('change', function(e) {
                i18n.setLanguage(e.target.value);
            });
        }
    } else {
        setTimeout(function() {
            if (typeof i18n !== 'undefined') {
                setupLanguageHandling();
            }
        }, 100);
    }
}

function setupEventListeners() {
    elements.navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    if (elements.startCaptureBtn) elements.startCaptureBtn.addEventListener('click', startCapture);
    if (elements.pauseCaptureBtn) elements.pauseCaptureBtn.addEventListener('click', pauseCapture);
    if (elements.stopCaptureBtn) elements.stopCaptureBtn.addEventListener('click', stopCapture);

    if (elements.browseSaveLocation) elements.browseSaveLocation.addEventListener('click', browseSaveLocation);
    if (elements.browseStorageLocation) elements.browseStorageLocation.addEventListener('click', browseStorageLocation);

    if (elements.addWatermark) elements.addWatermark.addEventListener('change', function() {
        toggleWatermarkSettings();
        if (!isInitializing && !isProgrammaticChange) {
            saveSettings();
        }
    });
    if (elements.watermarkType) elements.watermarkType.addEventListener('change', function() {
        toggleWatermarkType();
        if (!isInitializing && !isProgrammaticChange) {
            saveSettings();
        }
    });
    if (elements.watermarkText) elements.watermarkText.addEventListener('input', updateWatermarkPreview);
    if (elements.watermarkPosition) elements.watermarkPosition.addEventListener('change', updateWatermarkPreview);
    if (elements.browseWatermarkImage) elements.browseWatermarkImage.addEventListener('click', browseWatermarkImage);
    if (elements.watermarkSize) elements.watermarkSize.addEventListener('change', updateWatermarkPreview);
    if (elements.watermarkOpacity) elements.watermarkOpacity.addEventListener('input', updateWatermarkOpacityDisplay);

    if (elements.cameraSelect) elements.cameraSelect.addEventListener('change', function(e) {
        const deviceId = e.target.value;
        if (deviceId) {
            initializeCameraPreview(deviceId);
        }
    });

    if (elements.createTimelapseBtn) elements.createTimelapseBtn.addEventListener('click', openTimelapseModal);
    if (elements.createFirstVideoBtn) elements.createFirstVideoBtn.addEventListener('click', openTimelapseModal);
    if (elements.timelapseModalCancel) elements.timelapseModalCancel.addEventListener('click', closeTimelapseModal);
    if (elements.timelapseModalCreate) elements.timelapseModalCreate.addEventListener('click', createTimelapse);

    if (elements.browseImagesBtn) elements.browseImagesBtn.addEventListener('click', browseImages);
    if (elements.browseMusicBtn) elements.browseMusicBtn.addEventListener('click', browseMusic);
    if (elements.addMusic) elements.addMusic.addEventListener('change', toggleMusicSettings);
    if (elements.musicVolume) elements.musicVolume.addEventListener('input', updateMusicVolumeDisplay);

    if (elements.deleteModalCancel) elements.deleteModalCancel.addEventListener('click', closeDeleteModal);
    if (elements.deleteModalConfirm) elements.deleteModalConfirm.addEventListener('click', confirmDeleteVideo);

    if (elements.ftpEnabled) elements.ftpEnabled.addEventListener('change', toggleFtpSettings);
    if (elements.uploadProtocol) elements.uploadProtocol.addEventListener('change', handleProtocolChange);
    if (elements.testFtpBtn) elements.testFtpBtn.addEventListener('click', testFtpConnection);
    
    if (elements.autoTimelapseEnabled) elements.autoTimelapseEnabled.addEventListener('change', function() {
        toggleAutoTimelapseSettings();
        if (!isInitializing && !isProgrammaticChange) {
            saveSettings();
        }
    });

    if (elements.jpegQuality) elements.jpegQuality.addEventListener('input', updateJpegQualityDisplay);

    setupSettingsEventListeners();
    setupModalEventListeners();
}

function setupUpdateEventListeners() {
    if (elements.checkUpdatesBtn) {
        elements.checkUpdatesBtn.addEventListener('click', checkForUpdatesManually);
    }

    if (elements.manualCheckUpdatesBtn) {
        elements.manualCheckUpdatesBtn.addEventListener('click', checkForUpdatesManually);
    }

    if (elements.autoCheckUpdates) {
        elements.autoCheckUpdates.addEventListener('change', saveUpdateSettings);
    }

    if (elements.skipUpdate) {
        elements.skipUpdate.addEventListener('click', skipUpdateVersion);
    }

    if (elements.installLater) {
        elements.installLater.addEventListener('click', closeUpdateModal);
    }

    if (elements.installUpdate) {
        elements.installUpdate.addEventListener('click', function() {
            if (appState.updateModal.isDownloading) {
                return;
            }
            
            if (appState.updateModal.updateInfo && appState.updateModal.updateInfo.downloaded) {
                installUpdate();
            } else {
                downloadAndInstallUpdate();
            }
        });
    }
}

function setupWindowControls() {
    
    if (elements.minimizeBtn) {
        elements.minimizeBtn.addEventListener('click', async function() {
            try {
                await ipcRenderer.invoke('window-minimize');
            } catch (error) {
            }
        });
    } else {
    }

    if (elements.maximizeBtn) {
        elements.maximizeBtn.addEventListener('click', async function() {
            try {
                await ipcRenderer.invoke('window-maximize');
            } catch (error) {
            }
        });
    } else {
    }

    if (elements.closeBtn) {
        elements.closeBtn.addEventListener('click', async function() {
            try {
                await ipcRenderer.invoke('window-close');
            } catch (error) {
            }
        });
    } else {
    }
}

function setupSettingsEventListeners() {
    const settingsElements = [
        'defaultResolution', 'defaultInterval', 'imageFormat', 'autoStart',
        'ftpServer', 'ftpPort', 'ftpUsername', 'ftpPassword', 'ftpDirectory',
        'autoUploadCaptured', 'autoUploadVideos', 'storageLocation', 'autoCleanup', 'cleanupDays',
        'maxStorage', 'defaultFps', 'defaultVideoQuality', 'hardwareAcceleration', 'preserveAspectRatio',
        'showNotifications', 'soundNotifications', 'notifyCaptureStart', 'notifyCaptureComplete',
        'notifyVideoComplete', 'notifyUploadComplete', 'watermarkText', 
        'watermarkImagePath', 'watermarkSize', 'watermarkPosition'
    ];

    settingsElements.forEach(function(elementId) {
        const element = elements[elementId];
        if (element) {
            const eventType = element.type === 'checkbox' || element.type === 'range' ? 'change' : 'input';
            element.addEventListener(eventType, function() {
                if (!isInitializing && !isProgrammaticChange) {
                    saveSettings();
                }
            });
        }
    });
}

function setupModalEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            if (e.target === elements.timelapseModal) {
                closeTimelapseModal();
            } else if (e.target === elements.deleteModal) {
                closeDeleteModal();
            } else if (e.target === elements.updateModal) {
                closeUpdateModal();
            }
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (elements.timelapseModal.style.display === 'flex') {
                closeTimelapseModal();
            } else if (elements.deleteModal.style.display === 'flex') {
                closeDeleteModal();
            } else if (elements.updateModal.style.display === 'flex') {
                closeUpdateModal();
            }
        }
    });
}

async function loadAppVersion() {
    try {
        const result = await ipcRenderer.invoke('get-app-version');
        if (result.success && elements.currentVersion) {
            elements.currentVersion.textContent = result.version;
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function checkForUpdatesManually() {
    try {
        const btn = elements.checkUpdatesBtn || elements.manualCheckUpdatesBtn;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>' + i18n.t('updater.checking') + '</span>';
        }

        updateStatus(i18n.t('updater.checking'), 'info');
        showToast(i18n.t('toast.update_checking'), 'info');

        const result = await ipcRenderer.invoke('check-for-updates');
        
        if (!result.success) {
            updateStatus(i18n.t('updater.update_error'), 'error');
            showToast(i18n.t('toast.update_error'), 'error');
        }
    } catch (error) {
        updateStatus(i18n.t('updater.update_error'), 'error');
        showToast(i18n.t('toast.update_error'), 'error');
    } finally {
        const btn = elements.checkUpdatesBtn || elements.manualCheckUpdatesBtn;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i><span>' + i18n.t('updater.check_updates') + '</span>';
        }
    }
}

async function saveUpdateSettings() {
    try {
        const settings = {
            autoCheck: elements.autoCheckUpdates?.checked || false,
            lastCheck: null,
            skippedVersion: null
        };

        await ipcRenderer.invoke('save-update-settings', settings);
        showToast(i18n.t('toast.settings_saved'), 'success');
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function updateStatus(message, type) {
    if (elements.updateStatus) {
        elements.updateStatus.textContent = message;
        elements.updateStatus.className = 'update-status ' + (type || 'info');
    }
}

function openUpdateModal(updateInfo) {
    if (!elements.updateModal) return;

    appState.updateModal.isOpen = true;
    appState.updateModal.updateInfo = updateInfo;
    appState.updateModal.isDownloading = false;
    appState.updateModal.downloadProgress = 0;

    if (elements.modalCurrentVersion) {
        elements.modalCurrentVersion.textContent = updateInfo.currentVersion;
    }

    if (elements.modalNewVersion) {
        elements.modalNewVersion.textContent = updateInfo.newVersion;
    }

    if (elements.releaseNotesContent && updateInfo.releaseNotes) {
        elements.releaseNotesContent.innerHTML = updateInfo.releaseNotes;
    }

    if (elements.downloadProgress) {
        elements.downloadProgress.style.display = 'none';
    }

    if (elements.installUpdate) {
        elements.installUpdate.innerHTML = '<i class="fas fa-download"></i><span>' + i18n.t('updater.install_now') + '</span>';
        elements.installUpdate.disabled = false;
    }

    elements.updateModal.style.display = 'flex';
}

function closeUpdateModal() {
    if (elements.updateModal) {
        elements.updateModal.style.display = 'none';
        appState.updateModal.isOpen = false;
        appState.updateModal.updateInfo = null;
    }
}

async function downloadAndInstallUpdate() {
    try {
        appState.updateModal.isDownloading = true;
        
        if (elements.installUpdate) {
            elements.installUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>' + i18n.t('updater.downloading') + '</span>';
            elements.installUpdate.disabled = true;
        }

        if (elements.downloadProgress) {
            elements.downloadProgress.style.display = 'block';
        }

        const result = await ipcRenderer.invoke('download-update');
        
        if (!result.success) {
            showToast(i18n.t('updater.download_error'), 'error');
            closeUpdateModal();
        }
    } catch (error) {
        showToast(i18n.t('updater.download_error'), 'error');
        closeUpdateModal();
    }
}

async function installUpdate() {
    try {
        const result = await ipcRenderer.invoke('install-update');
        if (!result.success) {
            showToast(i18n.t('updater.install_error'), 'error');
        }
    } catch (error) {
        showToast(i18n.t('updater.install_error'), 'error');
    }
}

async function skipUpdateVersion() {
    try {
        if (appState.updateModal.updateInfo) {
            const result = await ipcRenderer.invoke('skip-update-version', appState.updateModal.updateInfo.newVersion);
            if (result.success) {
                closeUpdateModal();
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function switchTab(tabId) {
    appState.currentTab = tabId;

    elements.navItems.forEach(function(item) {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        }
    });

    elements.tabContents.forEach(function(content) {
        content.classList.remove('active');
        if (content.id === tabId + '-tab') {
            content.classList.add('active');
        }
    });

    if (tabId === 'timelapse') {
        loadVideos();
    } else if (tabId === 'capture') {
        if (appState.cameras.length > 0 && elements.cameraSelect) {
            const selectedDeviceId = elements.cameraSelect.value || appState.cameras[0].deviceId;
            initializeCameraPreview(selectedDeviceId);
        }
    }
}

async function loadSettings() {
    try {
        const result = await ipcRenderer.invoke('get-settings');
        if (result.success) {
            appState.settings = result.settings;
            applySettingsToUI();
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function applySettingsToUI() {
    const settings = appState.settings;

    if (elements.resolutionSelect) elements.resolutionSelect.value = settings.cameraSettings?.defaultResolution || '1920x1080';
    if (elements.intervalValue) elements.intervalValue.value = settings.cameraSettings?.defaultInterval || 30;
    
    if (elements.defaultResolution) elements.defaultResolution.value = settings.cameraSettings?.defaultResolution || '1920x1080';
    if (elements.defaultInterval) elements.defaultInterval.value = settings.cameraSettings?.defaultInterval || 30;
    if (elements.imageFormat) elements.imageFormat.value = settings.cameraSettings?.imageFormat || 'jpeg';
    if (elements.jpegQuality) {
        elements.jpegQuality.value = settings.cameraSettings?.jpegQuality || 85;
        updateJpegQualityDisplay();
    }
    if (elements.autoStart) elements.autoStart.checked = settings.cameraSettings?.autoStart || false;

    if (elements.ftpEnabled) elements.ftpEnabled.checked = settings.ftpSettings?.enabled || false;
    if (elements.uploadProtocol) elements.uploadProtocol.value = settings.ftpSettings?.protocol || 'ftp';
    if (elements.ftpServer) elements.ftpServer.value = settings.ftpSettings?.server || '';
    if (elements.ftpPort) elements.ftpPort.value = settings.ftpSettings?.port || (settings.ftpSettings?.protocol === 'sftp' ? 22 : 21);
    if (elements.ftpUsername) elements.ftpUsername.value = settings.ftpSettings?.username || '';
    if (elements.ftpPassword) elements.ftpPassword.value = settings.ftpSettings?.password || '';
    if (elements.ftpDirectory) elements.ftpDirectory.value = settings.ftpSettings?.directory || '/timelapse/';
    if (elements.autoUploadCaptured) elements.autoUploadCaptured.checked = settings.ftpSettings?.autoUploadImages || false;
    if (elements.autoUploadVideos) elements.autoUploadVideos.checked = settings.ftpSettings?.autoUploadVideos || false;

    if (elements.storageLocation) elements.storageLocation.value = settings.storageSettings?.location || '';
    if (elements.saveLocation) elements.saveLocation.value = settings.storageSettings?.location || '';
    if (elements.autoCleanup) elements.autoCleanup.checked = settings.storageSettings?.autoCleanup || false;
    if (elements.cleanupDays) elements.cleanupDays.value = settings.storageSettings?.cleanupDays || 30;
    if (elements.maxStorage) elements.maxStorage.value = settings.storageSettings?.maxStorage || 10;

    if (elements.defaultFps) elements.defaultFps.value = settings.videoSettings?.defaultFps || 30;
    if (elements.defaultVideoQuality) elements.defaultVideoQuality.value = settings.videoSettings?.defaultQuality || 'high';
    if (elements.hardwareAcceleration) elements.hardwareAcceleration.checked = settings.videoSettings?.hardwareAcceleration !== false;
    if (elements.preserveAspectRatio) elements.preserveAspectRatio.checked = settings.videoSettings?.preserveAspectRatio !== false;

    if (elements.showNotifications) elements.showNotifications.checked = settings.notifications?.show !== false;
    if (elements.soundNotifications) elements.soundNotifications.checked = settings.notifications?.sound || false;
    if (elements.notifyCaptureStart) elements.notifyCaptureStart.checked = settings.notifications?.captureStart !== false;
    if (elements.notifyCaptureComplete) elements.notifyCaptureComplete.checked = settings.notifications?.captureComplete !== false;
    if (elements.notifyVideoComplete) elements.notifyVideoComplete.checked = settings.notifications?.videoComplete !== false;
    if (elements.notifyUploadComplete) elements.notifyUploadComplete.checked = settings.notifications?.uploadComplete !== false;

    if (elements.autoCheckUpdates) elements.autoCheckUpdates.checked = settings.updater?.autoCheck !== false;

    if (elements.addWatermark) elements.addWatermark.checked = settings.watermark?.enabled || false;
    if (elements.watermarkType) elements.watermarkType.value = settings.watermark?.type || 'text';
    if (elements.watermarkText) elements.watermarkText.value = settings.watermark?.text || '';
    if (elements.watermarkImagePath) elements.watermarkImagePath.value = settings.watermark?.imagePath || '';
    if (elements.watermarkSize) elements.watermarkSize.value = settings.watermark?.imageSize || 'medium';
    if (elements.watermarkOpacity) {
        elements.watermarkOpacity.value = settings.watermark?.imageOpacity || 80;
        updateWatermarkOpacityDisplay();
    }
    if (elements.watermarkPosition) elements.watermarkPosition.value = settings.watermark?.position || 'bottom-right';
    
    if (elements.autoTimelapseEnabled) elements.autoTimelapseEnabled.checked = settings.autoTimelapse?.enabled || false;
    if (elements.autoTimelapseInterval) elements.autoTimelapseInterval.value = settings.autoTimelapse?.interval || 24;
    if (elements.autoTimelapseMode) elements.autoTimelapseMode.value = settings.autoTimelapse?.mode || 'replace';
    if (elements.autoTimelapseUpload) elements.autoTimelapseUpload.checked = settings.autoTimelapse?.upload !== false;
    if (elements.autoTimelapseFps) elements.autoTimelapseFps.value = settings.autoTimelapse?.fps || 30;
    if (elements.autoTimelapseQuality) elements.autoTimelapseQuality.value = settings.autoTimelapse?.quality || 'high';

    toggleFtpSettings();
    toggleWatermarkSettings();
    toggleWatermarkType();
    toggleAutoTimelapseSettings();
    updateSaveLocationDisplay();
    updateWatermarkPreview();
}

async function saveSettings() {
    try {
        const interval = parseInt(elements.defaultInterval?.value) || 30;
        const jpegQuality = parseInt(elements.jpegQuality?.value) || 85;
        const ftpPort = parseInt(elements.ftpPort?.value) || 21;
        const cleanupDays = parseInt(elements.cleanupDays?.value) || 30;
        const maxStorage = parseInt(elements.maxStorage?.value) || 10;
        const fps = parseInt(elements.defaultFps?.value) || 30;
        const watermarkOpacity = parseInt(elements.watermarkOpacity?.value) || 80;
        
        if (isNaN(interval) || !Number.isInteger(Number(interval)) || interval < 1 || interval > 86400) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.interval_range'), 'error');
            return;
        }
        if (isNaN(jpegQuality) || !Number.isInteger(Number(jpegQuality)) || jpegQuality < 1 || jpegQuality > 100) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.jpeg_quality_range'), 'error');
            return;
        }
        if (isNaN(ftpPort) || !Number.isInteger(Number(ftpPort)) || ftpPort < 1 || ftpPort > 65535) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.ftp_port_range'), 'error');
            return;
        }
        if (isNaN(cleanupDays) || !Number.isInteger(Number(cleanupDays)) || cleanupDays < 1 || cleanupDays > 365) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.cleanup_days_range'), 'error');
            return;
        }
        if (isNaN(maxStorage) || !Number.isInteger(Number(maxStorage)) || maxStorage < 1 || maxStorage > 1000) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.max_storage_range'), 'error');
            return;
        }
        if (isNaN(fps) || !Number.isInteger(Number(fps)) || fps < 1 || fps > 120) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.fps_range'), 'error');
            return;
        }
        if (isNaN(watermarkOpacity) || !Number.isInteger(Number(watermarkOpacity)) || watermarkOpacity < 0 || watermarkOpacity > 100) {
            showToast(i18n.t('toast.invalid_input') + ': ' + i18n.t('validation.opacity_range'), 'error');
            return;
        }
        
        const settings = {
            cameraSettings: {
                defaultResolution: elements.defaultResolution?.value || '1920x1080',
                defaultInterval: interval,
                imageFormat: elements.imageFormat?.value || 'jpeg',
                jpegQuality: jpegQuality,
                autoStart: elements.autoStart?.checked || false
            },
            ftpSettings: {
                enabled: elements.ftpEnabled?.checked || false,
                protocol: elements.uploadProtocol?.value || 'ftp',
                server: elements.ftpServer?.value || '',
                port: ftpPort,
                username: elements.ftpUsername?.value || '',
                password: elements.ftpPassword?.value || '',
                directory: elements.ftpDirectory?.value || '/timelapse/',
                autoUploadImages: elements.autoUploadCaptured?.checked || false,
                autoUploadVideos: elements.autoUploadVideos?.checked || false
            },
            storageSettings: {
                location: elements.storageLocation?.value || '',
                autoCleanup: elements.autoCleanup?.checked || false,
                cleanupDays: cleanupDays,
                maxStorage: maxStorage
            },
            videoSettings: {
                defaultFps: fps,
                defaultQuality: elements.defaultVideoQuality?.value || 'high',
                hardwareAcceleration: elements.hardwareAcceleration?.checked !== false,
                preserveAspectRatio: elements.preserveAspectRatio?.checked !== false
            },
            notifications: {
                show: elements.showNotifications?.checked !== false,
                sound: elements.soundNotifications?.checked || false,
                captureStart: elements.notifyCaptureStart?.checked !== false,
                captureComplete: elements.notifyCaptureComplete?.checked !== false,
                videoComplete: elements.notifyVideoComplete?.checked !== false,
                uploadComplete: elements.notifyUploadComplete?.checked !== false
            },
            watermark: {
                enabled: elements.addWatermark?.checked || false,
                type: elements.watermarkType?.value || 'text',
                text: elements.watermarkText?.value || '',
                position: elements.watermarkPosition?.value || 'bottom-right',
                imagePath: elements.watermarkImagePath?.value || '',
                imageSize: elements.watermarkSize?.value || 'medium',
                imageOpacity: watermarkOpacity
            },
            updater: {
                autoCheck: elements.autoCheckUpdates?.checked !== false,
                lastCheck: appState.settings.updater?.lastCheck || null,
                skippedVersion: appState.settings.updater?.skippedVersion || null
            },
            autoTimelapse: {
                enabled: elements.autoTimelapseEnabled?.checked || false,
                interval: parseInt(elements.autoTimelapseInterval?.value) || 24,
                mode: elements.autoTimelapseMode?.value || 'replace',
                upload: elements.autoTimelapseUpload?.checked !== false,
                fps: parseInt(elements.autoTimelapseFps?.value) || 30,
                quality: elements.autoTimelapseQuality?.value || 'high'
            }
        };

        const result = await ipcRenderer.invoke('save-settings', settings);
        if (result.success) {
            appState.settings = settings;
            if (!isInitializing) {
                showToast(i18n.t('toast.settings_saved'), 'success');
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.settings_save_failed'), 'error');
    }
}

async function loadCameras() {
    try {
        const result = await ipcRenderer.invoke('get-cameras');
        if (result.success) {
            appState.cameras = result.cameras;
            updateCameraSelect();
            if (appState.cameras.length > 0) {
                setTimeout(() => {
                    initializeCameraPreview(appState.cameras[0].deviceId);
                }, 100);
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function initializeCameraPreview(deviceId) {
    try {
        const video = elements.cameraPreview;
        if (!video) return;

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        const resolution = elements.resolutionSelect?.value || appState.settings.cameraSettings?.defaultResolution || '1920x1080';
        const [width, height] = resolution.split('x').map(Number);
        
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: width },
                height: { ideal: height }
            },
            audio: false
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        
        video.onloadedmetadata = function() {
            video.play();
        };
        
        if (elements.cameraOverlay) {
            elements.cameraOverlay.style.display = 'none';
        }
        if (elements.noCameraMessage) {
            elements.noCameraMessage.style.display = 'none';
        }
    } catch (error) {
        if (elements.cameraOverlay) {
            elements.cameraOverlay.style.display = 'flex';
        }
        if (elements.noCameraMessage) {
            elements.noCameraMessage.style.display = 'block';
            elements.noCameraMessage.innerHTML = '<i class="fas fa-video-slash"></i><p>' + i18n.t('capture.camera_error') + '</p>';
        }
    }
}

function updateCameraSelect() {
    if (!elements.cameraSelect) return;

    elements.cameraSelect.innerHTML = '';
    
    if (appState.cameras.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = i18n.t('capture.no_cameras_available');
        elements.cameraSelect.appendChild(option);
    } else {
        appState.cameras.forEach(function(camera) {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label;
            elements.cameraSelect.appendChild(option);
        });
    }
}

async function startCapture() {
    try {
        const settings = {
            camera: elements.cameraSelect?.value,
            resolution: elements.resolutionSelect?.value || '1920x1080',
            interval: parseInt(elements.intervalValue?.value) || 30,
            unit: elements.intervalUnit?.value || 'seconds'
        };

        const result = await ipcRenderer.invoke('start-capture', settings);
        if (result.success) {
            appState.isCapturing = true;
            appState.isPaused = false;
            updateCaptureUI();
            if (appState.settings.notifications?.captureStart) {
                showToast(i18n.t('toast.capture_started'), 'success');
            }
        } else {
            showToast(translateError(result.error) || i18n.t('toast.capture_start_failed'), 'error');
        }
    } catch (error) {
        showToast(i18n.t('toast.capture_start_failed'), 'error');
    }
}

async function pauseCapture() {
    try {
        const result = await ipcRenderer.invoke('pause-capture');
        if (result.success) {
            appState.isPaused = true;
            updateCaptureUI();
            showToast(i18n.t('toast.capture_paused'), 'success');
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function resumeCapture() {
    try {
        const result = await ipcRenderer.invoke('resume-capture');
        if (result.success) {
            appState.isPaused = false;
            updateCaptureUI();
            showToast(i18n.t('toast.capture_resumed'), 'success');
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function stopCapture() {
    try {
        const result = await ipcRenderer.invoke('stop-capture');
        if (result.success) {
            appState.isCapturing = false;
            appState.isPaused = false;
            updateCaptureUI();
            if (appState.settings.notifications?.captureComplete) {
                showToast(i18n.t('toast.capture_stopped'), 'success');
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function updateCaptureUI() {
    if (elements.startCaptureBtn) {
        elements.startCaptureBtn.style.display = appState.isCapturing ? 'none' : 'block';
    }
    
    if (elements.pauseCaptureBtn) {
        elements.pauseCaptureBtn.style.display = appState.isCapturing && !appState.isPaused ? 'block' : 'none';
        elements.pauseCaptureBtn.onclick = pauseCapture;
        elements.pauseCaptureBtn.innerHTML = '<i class="fas fa-pause"></i><span>' + i18n.t('capture.pause_capture') + '</span>';
        
        if (appState.isPaused) {
            elements.pauseCaptureBtn.innerHTML = '<i class="fas fa-play"></i><span>' + i18n.t('capture.resume_capture') + '</span>';
            elements.pauseCaptureBtn.onclick = resumeCapture;
        }
    }
    
    if (elements.stopCaptureBtn) {
        elements.stopCaptureBtn.style.display = appState.isCapturing ? 'block' : 'none';
    }

    updateCaptureStatus();
}

function updateCaptureStatus() {
    let statusText = 'capture.status_stopped';
    let statusClass = 'stopped';

    if (appState.isCapturing) {
        if (appState.isPaused) {
            statusText = 'capture.status_paused';
            statusClass = 'paused';
        } else {
            statusText = 'capture.status_running';
            statusClass = 'running';
        }
    }

    if (elements.captureStatusText) {
        elements.captureStatusText.setAttribute('data-i18n', statusText);
        elements.captureStatusText.textContent = i18n.t(statusText);
    }

    if (elements.statusIndicator) {
        elements.statusIndicator.className = 'status-indicator ' + statusClass;
    }
}

function startStatusUpdates() {
    appState.statusTimer = setInterval(async function() {
        try {
            const result = await ipcRenderer.invoke('get-capture-status');
            if (result.success) {
                const status = result.status;
                appState.isCapturing = status.isRunning;
                appState.isPaused = status.isPaused;
                appState.imageCount = status.imageCount;
                appState.elapsedTime = status.elapsedTime;
                appState.captureStartTime = status.startTime;
                
                updateCaptureStats();
                updateCaptureStatus();
            }
        } catch (error) {
        }
    }, 1000);
}

function updateCaptureStats() {
    if (elements.imagesCapturedCount) {
        elements.imagesCapturedCount.textContent = appState.imageCount.toString();
    }

    if (elements.elapsedTime) {
        elements.elapsedTime.textContent = formatTime(appState.elapsedTime);
    }

    if (elements.estimatedLength) {
        const fps = parseInt(elements.timelapseFps?.value) || 30;
        const estimatedSeconds = Math.floor(appState.imageCount / fps);
        elements.estimatedLength.textContent = formatDuration(estimatedSeconds * 1000);
    }

    if (elements.nextCapture && appState.isCapturing && !appState.isPaused) {
        const interval = parseInt(elements.intervalValue?.value) || 30;
        const unit = elements.intervalUnit?.value || 'seconds';
        const intervalMs = interval * (unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 1000);
        
        const nextCaptureTime = new Date(Date.now() + intervalMs);
        elements.nextCapture.textContent = nextCaptureTime.toLocaleTimeString();
    } else if (elements.nextCapture) {
        elements.nextCapture.textContent = '--:--';
    }
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
        .map(function(num) { return num.toString().padStart(2, '0'); })
        .join(':');
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
        return seconds + i18n.t('common.second_short');
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) {
        return minutes + i18n.t('common.minute_short') + ' ' + secs + i18n.t('common.second_short');
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + i18n.t('common.hour_short') + ' ' + mins + i18n.t('common.minute_short');
}

async function browseSaveLocation() {
    try {
        const result = await ipcRenderer.invoke('select-folder', i18n.t('dialog.select_save_location'));
        if (result.success && !result.canceled) {
            if (elements.saveLocation) {
                elements.saveLocation.value = result.path;
            }
            if (elements.storageLocation) {
                elements.storageLocation.value = result.path;
            }
            updateSaveLocationDisplay();
            await saveSettings();
            showToast(i18n.t('toast.save_location_set'), 'success');
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function browseStorageLocation() {
    try {
        const result = await ipcRenderer.invoke('select-folder', i18n.t('dialog.select_storage_location'));
        if (result.success && !result.canceled) {
            if (elements.storageLocation) {
                elements.storageLocation.value = result.path;
            }
            if (elements.saveLocation) {
                elements.saveLocation.value = result.path;
            }
            await saveSettings();
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function updateSaveLocationDisplay() {
    if (elements.saveLocation && !elements.saveLocation.value) {
        const defaultLocation = appState.settings.storageSettings?.location;
        if (defaultLocation) {
            elements.saveLocation.value = defaultLocation;
        }
    }
}

function toggleWatermarkSettings() {
    if (elements.watermarkSettings) {
        elements.watermarkSettings.style.display = elements.addWatermark?.checked ? 'block' : 'none';
    }
    updateWatermarkPreview();
}

function toggleWatermarkType() {
    if (!elements.watermarkType) return;
    
    const isTextType = elements.watermarkType.value === 'text';
    
    if (elements.watermarkTextSettings) {
        elements.watermarkTextSettings.style.display = isTextType ? 'block' : 'none';
    }
    
    if (elements.watermarkImageSettings) {
        elements.watermarkImageSettings.style.display = isTextType ? 'none' : 'block';
    }
    
    updateWatermarkPreview();
}

async function browseWatermarkImage() {
    try {
        const result = await ipcRenderer.invoke('select-watermark-image', i18n.t('dialog.select_watermark_image'));
        if (result.success && !result.canceled) {
            if (elements.watermarkImagePath) {
                elements.watermarkImagePath.value = result.path;
            }
            updateWatermarkPreview();
            showToast(i18n.t('toast.watermark_image_set'), 'success');
        } else if (result.error) {
            showToast(i18n.t('toast.watermark_image_error'), 'error');
        }
    } catch (error) {
        showToast(i18n.t('toast.watermark_image_error'), 'error');
    }
}

function updateWatermarkPreview() {
    if (!elements.watermarkPreview && !elements.watermarkImagePreview) return;

    const isEnabled = elements.addWatermark?.checked;
    const watermarkType = elements.watermarkType?.value || 'text';
    const position = elements.watermarkPosition?.value || 'bottom-right';

    if (elements.watermarkPreview) {
        elements.watermarkPreview.style.display = 'none';
    }
    if (elements.watermarkImagePreview) {
        elements.watermarkImagePreview.style.display = 'none';
    }

    if (!isEnabled) return;

    if (watermarkType === 'text' && elements.watermarkText?.value) {
        const text = elements.watermarkText.value;
        elements.watermarkPreview.textContent = text;
        elements.watermarkPreview.className = 'watermark-preview ' + position;
        elements.watermarkPreview.style.display = 'block';
    } else if (watermarkType === 'image' && elements.watermarkImagePath?.value) {
        const imagePath = elements.watermarkImagePath.value;
        const size = elements.watermarkSize?.value || 'medium';
        const opacity = (elements.watermarkOpacity?.value || 80) / 100;
        
        elements.watermarkImagePreview.src = 'file://' + imagePath;
        elements.watermarkImagePreview.className = 'watermark-image-preview ' + position + ' ' + size;
        elements.watermarkImagePreview.style.opacity = opacity;
        elements.watermarkImagePreview.style.display = 'block';
        
        elements.watermarkImagePreview.onerror = function() {
            elements.watermarkImagePreview.style.display = 'none';
        };
    }
}

function updateWatermarkOpacityDisplay() {
    if (elements.watermarkOpacityValue && elements.watermarkOpacity) {
        elements.watermarkOpacityValue.textContent = elements.watermarkOpacity.value + '%';
    }
    updateWatermarkPreview();
}

function toggleFtpSettings() {
    if (elements.ftpSettingsGroup) {
        elements.ftpSettingsGroup.style.display = elements.ftpEnabled?.checked ? 'block' : 'none';
    }
}

function handleProtocolChange() {
    const protocol = elements.uploadProtocol?.value || 'ftp';
    const defaultPort = protocol === 'sftp' ? 22 : 21;
    
    if (elements.ftpPort && elements.ftpPort.value == (protocol === 'sftp' ? 21 : 22)) {
        elements.ftpPort.value = defaultPort;
    }
    
    if (!isInitializing && !isProgrammaticChange) {
        saveSettings();
    }
}

function toggleAutoTimelapseSettings() {
    if (elements.autoTimelapseSettings) {
        elements.autoTimelapseSettings.style.display = elements.autoTimelapseEnabled?.checked ? 'block' : 'none';
    }
}

async function testFtpConnection() {
    try {
        if (elements.testFtpBtn) {
            elements.testFtpBtn.disabled = true;
            elements.testFtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>' + i18n.t('ftp.testing') + '</span>';
        }

        await saveSettings();
        const result = await ipcRenderer.invoke('test-ftp-connection');
        
        if (result.success) {
            showToast(i18n.t('toast.ftp_connected'), 'success');
        } else {
            showToast(translateError(result.error) || i18n.t('toast.ftp_error'), 'error');
        }
    } catch (error) {
        showToast(i18n.t('toast.ftp_error'), 'error');
    } finally {
        if (elements.testFtpBtn) {
            elements.testFtpBtn.disabled = false;
            elements.testFtpBtn.innerHTML = '<i class="fas fa-plug"></i><span>' + i18n.t('settings.ftp_test') + '</span>';
        }
    }
}

function updateJpegQualityDisplay() {
    if (elements.jpegQualityValue && elements.jpegQuality) {
        elements.jpegQualityValue.textContent = elements.jpegQuality.value + '%';
    }
}

function updateMusicVolumeDisplay() {
    if (elements.musicVolumeValue && elements.musicVolume) {
        elements.musicVolumeValue.textContent = elements.musicVolume.value + '%';
    }
}

function toggleMusicSettings() {
    if (elements.musicSettings) {
        elements.musicSettings.style.display = elements.addMusic?.checked ? 'block' : 'none';
    }
}

function openTimelapseModal() {
    if (elements.timelapseModal) {
        elements.timelapseModal.style.display = 'flex';
        appState.createVideoModal.isOpen = true;
    }
}

function closeTimelapseModal() {
    if (elements.timelapseModal) {
        elements.timelapseModal.style.display = 'none';
        appState.createVideoModal.isOpen = false;
    }
}

async function browseImages() {
    try {
        const result = await ipcRenderer.invoke('select-files', {
            title: i18n.t('dialog.select_images'),
            multiple: true,
            filters: [
                { name: i18n.t('dialog.image_files'), extensions: ['jpg', 'jpeg', 'png', 'bmp'] },
                { name: i18n.t('dialog.all_files'), extensions: ['*'] }
            ]
        });
        
        if (result.success && !result.canceled) {
            appState.createVideoModal.selectedImages = result.paths;
            if (elements.timelapseImages) {
                elements.timelapseImages.value = result.paths.length + ' ' + i18n.t('timelapse.images_selected');
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function browseMusic() {
    try {
        const result = await ipcRenderer.invoke('select-files', {
            title: i18n.t('dialog.select_music_file'),
            multiple: false,
            filters: [
                { name: i18n.t('dialog.audio_files'), extensions: ['mp3', 'wav', 'aac', 'm4a'] },
                { name: i18n.t('dialog.all_files'), extensions: ['*'] }
            ]
        });
        
        if (result.success && !result.canceled) {
            appState.createVideoModal.musicPath = result.paths[0];
            if (elements.musicFile) {
                elements.musicFile.value = result.paths[0];
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

async function createTimelapse() {
    try {
        if (appState.createVideoModal.selectedImages.length === 0) {
            showToast(i18n.t('toast.select_images_first'), 'error');
            return;
        }

        const outputName = elements.timelapseOutputName?.value || 'timelapse_video';
        const fps = parseInt(elements.timelapseFps?.value) || 30;
        const quality = elements.timelapseQuality?.value || 'high';
        const effects = elements.videoEffects?.value || 'none';
        
        const firstImagePath = appState.createVideoModal.selectedImages[0];
        const separator = firstImagePath.includes('\\') ? '\\' : '/';
        const inputPath = firstImagePath.split(separator).slice(0, -1).join(separator);
        
        if (!inputPath || inputPath.trim() === '') {
            showToast('Invalid image directory path', 'error');
            return;
        }
        
        
        const options = {
            name: outputName,
            inputPath: inputPath,
            fps: fps,
            quality: quality,
            effects: effects,
            totalFrames: appState.createVideoModal.selectedImages.length
        };

        if (elements.addMusic?.checked && appState.createVideoModal.musicPath) {
            options.musicPath = appState.createVideoModal.musicPath;
            options.musicVolume = parseInt(elements.musicVolume?.value) || 50;
        }

        closeTimelapseModal();
        showProgressModal();

        const result = await ipcRenderer.invoke('create-timelapse', options);
        
        hideProgressModal();

        if (result.success) {
            await loadVideos();
        } else {
            showToast(translateError(result.error) || i18n.t('toast.video_creation_failed'), 'error');
        }
    } catch (error) {
        hideProgressModal();
        showToast(i18n.t('toast.video_creation_failed'), 'error');
    }
}

function showProgressModal() {
    if (elements.progressModal) {
        elements.progressModal.style.display = 'flex';
    }
}

function hideProgressModal() {
    if (elements.progressModal) {
        elements.progressModal.style.display = 'none';
    }
}

async function loadVideos() {
    try {
        const result = await ipcRenderer.invoke('get-videos');
        if (result.success) {
            appState.videos = result.videos;
            updateVideoList();
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
}

function updateVideoList() {
    if (!elements.videoList || !elements.videoCount) return;

    elements.videoCount.textContent = appState.videos.length.toString();

    if (appState.videos.length === 0) {
        elements.videoEmptyState.style.display = 'block';
        elements.videoList.innerHTML = '';
        return;
    }

    elements.videoEmptyState.style.display = 'none';
    elements.videoList.innerHTML = '';

    appState.videos.forEach(function(video) {
        const videoItem = createVideoItem(video);
        elements.videoList.appendChild(videoItem);
    });
}

function createVideoItem(video) {
    const item = document.createElement('div');
    item.className = 'video-item';

    const formattedSize = formatFileSize(video.size);
    const formattedDate = new Date(video.created).toLocaleDateString();

    item.innerHTML =
        '<div class="video-item-header">' +
            '<div class="video-info">' +
                '<div class="video-icon">' +
                    '<i class="fas fa-film"></i>' +
                '</div>' +
                '<div class="video-details">' +
                    '<div class="video-name">' + escapeHtml(video.name) + '</div>' +
                    '<div class="video-meta">' + formattedSize + ' • ' + formattedDate + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="video-actions">' +
            '<button class="btn btn-sm btn-outline" onclick="playVideo(\'' + escapeJsString(video.path) + '\')" title="' + i18n.t('timelapse.play') + '">' +
                '<i class="fas fa-play"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline" onclick="uploadVideo(\'' + escapeJsString(video.path) + '\')" title="' + i18n.t('timelapse.upload') + '">' +
                '<i class="fas fa-upload"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline" onclick="exportVideo(\'' + escapeJsString(video.path) + '\')" title="' + i18n.t('timelapse.export') + '">' +
                '<i class="fas fa-download"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline btn-danger" onclick="deleteVideo(\'' + escapeJsString(video.path) + '\', \'' + escapeJsString(video.name) + '\')" title="' + i18n.t('timelapse.delete') + '">' +
                '<i class="fas fa-trash"></i>' +
            '</button>' +
        '</div>';

    return item;
}

window.playVideo = async function(videoPath) {
    try {
        const result = await ipcRenderer.invoke('play-video', videoPath);
        
        if (!result.success) {
            showToast(`Failed to play video: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
};

window.uploadVideo = async function(videoPath) {
    try {
        const ftpSettings = appState.settings.ftpSettings;
        if (!ftpSettings || !ftpSettings.enabled) {
            showToast(i18n.t('toast.ftp_not_configured'), 'error');
            return;
        }
        
        showToast(i18n.t('toast.uploading_video'), 'info');
        
        const filename = videoPath.split('\\').pop().split('/').pop();
        const result = await ipcRenderer.invoke('upload-video-ftp', videoPath, filename);
        
        if (result.success) {
            showToast(i18n.t('toast.video_uploaded'), 'success');
        } else {
            showToast(i18n.t('toast.video_upload_failed') + ': ' + result.error, 'error');
        }
    } catch (error) {
        showToast(i18n.t('toast.video_upload_failed'), 'error');
    }
};

window.exportVideo = async function(videoPath) {
    try {
        const result = await ipcRenderer.invoke('export-video', videoPath, i18n.t('dialog.export_video'));
        if (result.success && !result.canceled) {
            showToast(i18n.t('toast.video_exported'), 'success');
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
};

window.deleteVideo = function(videoPath, videoName) {
    appState.deleteModal.videoPath = videoPath;
    appState.deleteModal.videoName = videoName;
    
    if (elements.deleteItemName) {
        elements.deleteItemName.textContent = videoName;
    }
    
    if (elements.deleteModal) {
        elements.deleteModal.style.display = 'flex';
        appState.deleteModal.isOpen = true;
    }
};

function closeDeleteModal() {
    if (elements.deleteModal) {
        elements.deleteModal.style.display = 'none';
        appState.deleteModal.isOpen = false;
    }
}

async function confirmDeleteVideo() {
    try {
        const result = await ipcRenderer.invoke('delete-video', appState.deleteModal.videoPath);
        if (result.success) {
            showToast(i18n.t('toast.video_deleted'), 'success');
            await loadVideos();
        }
        closeDeleteModal();
    } catch (error) {
        showToast(i18n.t('toast.video_delete_failed'), 'error');
    }
}

function translateError(error) {
    if (!error) return '';
    if (error.startsWith('error.')) {
        return i18n.t(error);
    }
    return error;
}

function formatFileSize(bytes) {
    const sizes = [
        i18n.t('file.size_units_b'),
        i18n.t('file.size_units_kb'),
        i18n.t('file.size_units_mb'),
        i18n.t('file.size_units_gb')
    ];
    if (bytes === 0) return '0 ' + sizes[0];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function showToast(message, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML =
        '<div class="toast-content">' +
            '<i class="fas ' + (icons[type] || icons.info) + '"></i>' +
            '<div class="toast-message">' + message + '</div>' +
        '</div>';

    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);

        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);

        toast.addEventListener('click', function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
    
    if (appState.settings.notifications?.show && 'Notification' in window) {
        if (Notification.permission === 'granted') {
            sendNotification(message, type);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(permission) {
                if (permission === 'granted') {
                    sendNotification(message, type);
                }
            });
        }
    }
}

function sendNotification(message, type) {
    const options = {
        body: message,
        icon: './assets/icon.png',
        badge: './assets/icon.png',
        silent: !appState.settings.notifications?.sound
    };
    
    const notification = new Notification(i18n.t('app.title'), options);
    
    notification.onclick = function() {
        ipcRenderer.invoke('window-focus');
        notification.close();
    };
    
    setTimeout(function() {
        notification.close();
    }, 5000);
}

ipcRenderer.on('update-checking', function() {
    updateStatus(i18n.t('updater.checking'), 'info');
});

ipcRenderer.on('update-available', function(event, updateInfo) {
    updateStatus(i18n.t('updater.available'), 'success');
    showToast(i18n.t('toast.update_available'), 'info');
    openUpdateModal(updateInfo);
});

ipcRenderer.on('update-not-available', function() {
    updateStatus(i18n.t('updater.no_updates'), 'success');
    showToast(i18n.t('toast.no_updates'), 'info');
});

ipcRenderer.on('update-error', function(event, error) {
    updateStatus(i18n.t('updater.update_error'), 'error');
    showToast(i18n.t('toast.update_error'), 'error');
});

ipcRenderer.on('update-download-progress', function(event, progressInfo) {
    appState.updateModal.downloadProgress = progressInfo.percent;
    
    if (elements.downloadPercentage) {
        elements.downloadPercentage.textContent = progressInfo.percent + '%';
    }
    
    if (elements.downloadProgressFill) {
        elements.downloadProgressFill.style.width = progressInfo.percent + '%';
    }
});

ipcRenderer.on('update-downloaded', function(event, info) {
    appState.updateModal.isDownloading = false;
    appState.updateModal.updateInfo.downloaded = true;
    
    if (elements.installUpdate) {
        elements.installUpdate.innerHTML = '<i class="fas fa-download"></i><span>' + i18n.t('updater.install_now') + '</span>';
        elements.installUpdate.disabled = false;
    }
    
    updateStatus(i18n.t('updater.update_ready'), 'success');
    showToast(i18n.t('toast.update_downloaded'), 'success');
});

ipcRenderer.on('image-captured', function(event, data) {
    appState.imageCount = data.count;
    updateCaptureStats();
    if (appState.settings.notifications?.show) {
        showToast(i18n.t('toast.image_captured'), 'success');
    }
});

ipcRenderer.on('ftp-upload-complete', function(event, data) {
    if (appState.settings.notifications?.show && appState.settings.notifications?.uploadComplete) {
        showToast(i18n.t('toast.ftp_uploaded'), 'success');
    }
});

ipcRenderer.on('ftp-upload-error', function(event, data) {
    showToast(i18n.t('toast.ftp_upload_failed') + ': ' + data.error, 'error');
});

ipcRenderer.on('timelapse-progress', function(event, data) {
    if (elements.creationProgressPercentage) {
        elements.creationProgressPercentage.textContent = data.progress + '%';
    }
    if (elements.creationProgressFill) {
        elements.creationProgressFill.style.width = data.progress + '%';
    }
    if (elements.framesProcessed) {
        elements.framesProcessed.textContent = data.frame + ' / ' + data.total;
    }
});

window.addEventListener('error', function(e) {
    showToast(i18n.t('toast.unexpected_error') + ': ' + (e.error ? e.error.message : i18n.t('common.unknown_error')), 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    showToast(i18n.t('toast.promise_error') + ': ' + (e.reason ? e.reason.message : i18n.t('common.unknown_error')), 'error');
});

window.addEventListener('focus', function() {
    if (appState.currentTab === 'capture' && appState.cameras.length > 0 && elements.cameraSelect) {
        const selectedDeviceId = elements.cameraSelect.value || appState.cameras[0].deviceId;
        initializeCameraPreview(selectedDeviceId);
    }
});

window.addEventListener('beforeunload', function() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    if (appState.statusTimer) {
        clearInterval(appState.statusTimer);
    }
    
    ipcRenderer.removeAllListeners('update-checking');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('image-captured');
    ipcRenderer.removeAllListeners('ftp-upload-complete');
    ipcRenderer.removeAllListeners('ftp-upload-error');
    ipcRenderer.removeAllListeners('timelapse-progress');
    ipcRenderer.removeAllListeners('timelapse-complete');
    ipcRenderer.removeAllListeners('timelapse-error');
    ipcRenderer.removeAllListeners('capture-error');
    ipcRenderer.removeAllListeners('capture-warning');
    ipcRenderer.removeAllListeners('storage-limit-reached');
    ipcRenderer.removeAllListeners('auto-timelapse-created');
    ipcRenderer.removeAllListeners('auto-timelapse-uploaded');
    ipcRenderer.removeAllListeners('auto-timelapse-error');
    ipcRenderer.removeAllListeners('auto-timelapse-upload-error');
});

ipcRenderer.on('storage-limit-reached', function(event, data) {
    appState.isCapturing = false;
    updateCaptureUI();
    showToast(i18n.t('toast.storage_limit_reached'), 'error');
});

ipcRenderer.on('auto-timelapse-created', function(event, data) {
    showToast(i18n.t('toast.auto_timelapse_created', { filename: data.filename, imageCount: data.imageCount }), 'success');
    loadVideos();
});

ipcRenderer.on('auto-timelapse-uploaded', function(event, data) {
    showToast(i18n.t('toast.auto_timelapse_uploaded', { filename: data.filename }), 'success');
});

ipcRenderer.on('auto-timelapse-error', function(event, data) {
    showToast(i18n.t('toast.auto_timelapse_error', { error: data.error }), 'error');
});

ipcRenderer.on('auto-timelapse-upload-error', function(event, data) {
    showToast(i18n.t('toast.auto_timelapse_upload_error', { error: data.error }), 'error');
});

ipcRenderer.on('timelapse-complete', function(event, data) {
    if (!data.isAutoTimelapse) {
        showToast(i18n.t('toast.video_created'), 'success');
    }
    closeTimelapseModal();
    loadVideos();
});

ipcRenderer.on('timelapse-error', function(event, data) {
    showToast(i18n.t('toast.video_creation_failed') + ': ' + data.error, 'error');
});

