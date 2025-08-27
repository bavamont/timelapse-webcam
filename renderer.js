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

/**
 * Safely invokes an IPC channel with error handling
 * @param {string} channel - IPC channel name
 * @param {...any} args - Arguments to pass to the channel
 * @returns {Promise<any>} Channel response or error
 */
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
    
    saveProjectBtn: document.getElementById('save-project-btn'),
    loadProjectBtn: document.getElementById('load-project-btn'),
    
    captureStatusText: document.getElementById('capture-status-text'),
    statusIndicator: document.getElementById('status-indicator'),
    languageSelector: document.getElementById('language-selector'),
    
    checkUpdatesBtn: document.getElementById('check-updates-btn'),
    manualCheckUpdatesBtn: document.getElementById('manual-check-updates'),
    autoCheckUpdates: document.getElementById('auto-check-updates'),
    currentVersion: document.getElementById('current-version'),
    updateStatus: document.getElementById('update-status'),
    
    sourceType: document.getElementById('source-type'),
    cameraSelection: document.getElementById('camera-selection'),
    screenSelection: document.getElementById('screen-selection'),
    cameraSelect: document.getElementById('camera-select'),
    screenSelect: document.getElementById('screen-select'),
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
    timelapsePreset: document.getElementById('timelapse-preset'),
    presetDescription: document.getElementById('preset-description'),
    timelapseResolution: document.getElementById('timelapse-resolution'),
    timelapseFps: document.getElementById('timelapse-fps'),
    timelapseQuality: document.getElementById('timelapse-quality'),
    timelapseFormat: document.getElementById('timelapse-format'),
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
    autoTimelapseQuality: document.getElementById('auto-timelapse-quality'),
    
    motionDetectionEnabled: document.getElementById('motion-detection-enabled'),
    motionDetectionSettings: document.getElementById('motion-detection-settings'),
    motionSensitivity: document.getElementById('motion-sensitivity'),
    motionSensitivityValue: document.getElementById('motion-sensitivity-value'),
    motionCooldown: document.getElementById('motion-cooldown'),
    motionOnlyCapture: document.getElementById('motion-only-capture'),
    
    smartSchedulingEnabled: document.getElementById('smart-scheduling-enabled'),
    smartSchedulingSettings: document.getElementById('smart-scheduling-settings'),
    scheduleStartTime: document.getElementById('schedule-start-time'),
    scheduleEndTime: document.getElementById('schedule-end-time'),
    
    exportPresets: document.getElementById('export-presets')
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initializes the application by setting up UI and loading initial data
 */
async function initializeApp() {
    if (!ipcRenderer) {
        if (typeof showToast === 'function') {
            showToast(i18n.t('errors.critical_ipc_error'), 'error');
        }
        return;
    }
    
    setupEventListeners();
    setupWindowControls();
    setupUpdateEventListeners();
    await loadSettings();
    await loadCameras();
    await loadScreenSources();
    await loadVideos();
    await loadAppVersion();
    await loadExportPresets();
    setupLanguageHandling();
    startStatusUpdates();
    
    isInitializing = false;
    
    if (appState.settings.cameraSettings?.autoStart) {
        setTimeout(() => {
            startCapture();
        }, 1000);
    }
}

/**
 * Sets up language handling and selector functionality
 */
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

/**
 * Sets up all event listeners for UI interactions
 */
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
    
    if (elements.timelapsePreset) elements.timelapsePreset.addEventListener('change', function(e) {
        const presetKey = e.target.value;
        if (presetKey && currentPresets[presetKey]) {
            applyPresetToModal(presetKey, currentPresets[presetKey]);
        } else {
            updatePresetDescription(null);
        }
    });

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
    
    if (elements.sourceType) elements.sourceType.addEventListener('change', toggleSourceType);
    if (elements.saveProjectBtn) elements.saveProjectBtn.addEventListener('click', saveProject);
    if (elements.loadProjectBtn) elements.loadProjectBtn.addEventListener('click', loadProject);
    
    if (elements.motionDetectionEnabled) elements.motionDetectionEnabled.addEventListener('change', toggleMotionDetectionSettings);
    if (elements.motionSensitivity) elements.motionSensitivity.addEventListener('input', updateMotionSensitivityDisplay);
    if (elements.smartSchedulingEnabled) elements.smartSchedulingEnabled.addEventListener('change', toggleSmartSchedulingSettings);
    
    setupDayCheckboxes();

    setupSettingsEventListeners();
    setupModalEventListeners();
}

/**
 * Sets up event listeners for update checking functionality
 */
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

async function loadScreenSources() {
    try {
        const result = await ipcRenderer.invoke('get-screen-sources');
        if (result.success) {
            appState.screenSources = result.sources;
            updateScreenSelect();
        }
    } catch (error) {
    }
}

async function loadExportPresets() {
    try {
        const result = await ipcRenderer.invoke('get-export-presets');
        if (result.success) {
            currentPresets = result.presets;
            updateExportPresetsUI(result.presets);
        }
    } catch (error) {
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
        
        const zonesVideo = document.getElementById('zones-camera-preview');
        if (zonesVideo) {
            zonesVideo.srcObject = currentStream;
        }
        
        video.onloadedmetadata = function() {
            video.play();
            if (zonesVideo) {
                zonesVideo.play();
            }
        };
        
        if (elements.cameraOverlay) {
            elements.cameraOverlay.style.display = 'none';
        }
        
        const zonesOverlay = document.getElementById('zones-camera-overlay');
        if (zonesOverlay) {
            zonesOverlay.style.display = 'none';
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
    
    if (elements.ftpPort && elements.ftpPort.value == (protocol === 'sftp' ? 22 : 21)) {
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
        const resolution = elements.timelapseResolution?.value || '1920x1080';
        const fps = parseInt(elements.timelapseFps?.value) || 30;
        const quality = elements.timelapseQuality?.value || 'high';
        const format = elements.timelapseFormat?.value || 'mp4';
        const effects = elements.videoEffects?.value || 'none';
        const presetKey = elements.timelapsePreset?.value;
        
        const firstImagePath = appState.createVideoModal.selectedImages[0];
        const separator = firstImagePath.includes('\\') ? '\\' : '/';
        const inputPath = firstImagePath.split(separator).slice(0, -1).join(separator);
        
        if (!inputPath || inputPath.trim() === '') {
            showToast(i18n.t('errors.invalid_image_path'), 'error');
            return;
        }
        
        
        const options = {
            name: outputName,
            inputPath: inputPath,
            resolution: resolution,
            fps: fps,
            quality: quality,
            format: format,
            effects: effects,
            totalFrames: appState.createVideoModal.selectedImages.length,
            preset: presetKey && currentPresets[presetKey] ? currentPresets[presetKey] : null
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

ipcRenderer.on('auto-start-capture', function(event, data) {
    if (appState.settings.cameraSettings?.autoStart) {
        startCapture();
        if (appState.settings.notifications?.show) {
            showToast(i18n.t('toast.auto_capture_started'), 'info');
        }
    }
});

ipcRenderer.on('auto-stop-capture', function(event, data) {
    if (appState.isCapturing) {
        stopCapture();
        if (appState.settings.notifications?.show) {
            showToast(i18n.t('toast.auto_capture_stopped'), 'info');
        }
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

function toggleSourceType() {
    const sourceType = elements.sourceType?.value;
    
    if (elements.cameraSelection && elements.screenSelection) {
        if (sourceType === 'camera') {
            elements.cameraSelection.style.display = 'block';
            elements.screenSelection.style.display = 'none';
        } else if (sourceType === 'screen') {
            elements.cameraSelection.style.display = 'none';
            elements.screenSelection.style.display = 'block';
            loadScreenSources();
        }
    }
}

function updateScreenSelect() {
    if (!elements.screenSelect || !appState.screenSources) return;

    elements.screenSelect.innerHTML = '';
    
    if (appState.screenSources.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = i18n.t('capture.no_screens_available');
        elements.screenSelect.appendChild(option);
    } else {
        appState.screenSources.forEach(function(source) {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = source.name;
            elements.screenSelect.appendChild(option);
        });
    }
}

function toggleMotionDetectionSettings() {
    if (elements.motionDetectionSettings) {
        elements.motionDetectionSettings.style.display = elements.motionDetectionEnabled?.checked ? 'block' : 'none';
    }
}

function updateMotionSensitivityDisplay() {
    if (elements.motionSensitivityValue && elements.motionSensitivity) {
        elements.motionSensitivityValue.textContent = elements.motionSensitivity.value + '%';
    }
}

/**
 * Toggles the visibility of smart scheduling settings
 */
function toggleSmartSchedulingSettings() {
    if (elements.smartSchedulingSettings) {
        elements.smartSchedulingSettings.style.display = elements.smartSchedulingEnabled?.checked ? 'block' : 'none';
    }
}

/**
 * Sets up event listeners and styling for day selection checkboxes
 */
function setupDayCheckboxes() {
    const dayCheckboxes = document.querySelectorAll('.day-label input[type="checkbox"]');
    
    dayCheckboxes.forEach(function(checkbox) {
        updateDayLabelState(checkbox);
        
        checkbox.addEventListener('change', function() {
            updateDayLabelState(this);
        });
    });
}

/**
 * Updates the visual state of a day label based on checkbox state
 * @param {HTMLElement} checkbox - The checkbox element
 */
function updateDayLabelState(checkbox) {
    const dayLabel = checkbox.closest('.day-label');
    if (dayLabel) {
        if (checkbox.checked) {
            dayLabel.classList.add('checked');
        } else {
            dayLabel.classList.remove('checked');
        }
    }
}

function updateExportPresetsUI(presets) {
    if (!elements.exportPresets) return;
    
    elements.exportPresets.innerHTML = '';
    
    Object.keys(presets).forEach(key => {
        const preset = presets[key];
        const presetCard = document.createElement('div');
        presetCard.className = 'preset-card';
        presetCard.innerHTML = `
            <div class="preset-header">
                <h4>${preset.name}</h4>
                <p class="preset-description">${preset.description}</p>
                <div class="preset-details">
                    <span><i class="fas fa-expand-arrows-alt"></i> ${preset.resolution}</span>
                    <span><i class="fas fa-tachometer-alt"></i> ${preset.fps}fps</span>
                    <span><i class="fas fa-adjust"></i> ${preset.quality}</span>
                    <span><i class="fas fa-video"></i> ${preset.codec.toUpperCase()}</span>
                </div>
                <div class="preset-specs">
                    <small>${preset.aspectRatio} • ${preset.bitrate/1000}k bitrate</small>
                </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="applyExportPreset('${key}')">
                <i class="fas fa-magic"></i> Use Preset
            </button>
        `;
        elements.exportPresets.appendChild(presetCard);
    });
    
    if (elements.timelapsePreset) {
        while (elements.timelapsePreset.options.length > 1) {
            elements.timelapsePreset.remove(1);
        }
        
        Object.keys(presets).forEach(key => {
            const preset = presets[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            elements.timelapsePreset.appendChild(option);
        });
    }
}

let currentPresets = {};

window.applyExportPreset = async function(presetKey) {
    try {
        const result = await ipcRenderer.invoke('get-export-presets');
        if (result.success) {
            currentPresets = result.presets;
            const preset = currentPresets[presetKey];
            if (preset) {
                if (elements.timelapseModal && elements.timelapseModal.style.display !== 'none') {
                    applyPresetToModal(presetKey, preset);
                } else {
                    openTimelapseModal();
                    setTimeout(() => applyPresetToModal(presetKey, preset), 100);
                }
                showToast(i18n.t('toast.preset_applied', { name: preset.name }) || `Applied ${preset.name} preset`, 'success');
            }
        }
    } catch (error) {
        showToast(i18n.t('toast.unexpected_error'), 'error');
    }
};

function applyPresetToModal(presetKey, preset) {
    if (elements.timelapsePreset) {
        elements.timelapsePreset.value = presetKey;
        updatePresetDescription(preset);
    }
    
    if (elements.timelapseResolution && preset.resolution) {
        elements.timelapseResolution.value = preset.resolution;
    }
    
    if (elements.timelapseFps && preset.fps) {
        elements.timelapseFps.value = preset.fps.toString();
    }
    
    if (elements.timelapseQuality && preset.quality) {
        elements.timelapseQuality.value = preset.quality;
    }
    
    if (elements.timelapseFormat && preset.codec) {
        if (preset.codec === 'h265') {
            elements.timelapseFormat.value = 'mp4_h265';
        } else if (preset.format === 'webm') {
            elements.timelapseFormat.value = 'webm';
        } else {
            elements.timelapseFormat.value = 'mp4';
        }
    }
}

function updatePresetDescription(preset) {
    if (elements.presetDescription && preset) {
        elements.presetDescription.innerHTML = `
            <small class="preset-info">
                <i class="fas fa-info-circle"></i> 
                ${preset.description} • ${preset.aspectRatio} • ${preset.bitrate/1000}k bitrate
            </small>
        `;
    } else if (elements.presetDescription) {
        elements.presetDescription.innerHTML = '';
    }
}

async function saveProject() {
    try {
        const projectData = {
            name: 'Current Project',
            camera: elements.cameraSelect?.value,
            resolution: elements.resolutionSelect?.value,
            interval: elements.intervalValue?.value,
            watermark: {
                enabled: elements.addWatermark?.checked,
                text: elements.watermarkText?.value,
                position: elements.watermarkPosition?.value
            },
            motionDetection: {
                enabled: elements.motionDetectionEnabled?.checked,
                sensitivity: elements.motionSensitivity?.value
            },
            scheduling: {
                enabled: elements.smartSchedulingEnabled?.checked,
                startTime: elements.scheduleStartTime?.value,
                endTime: elements.scheduleEndTime?.value
            },
            totalImages: appState.imageCount,
            estimatedDuration: 0
        };

        const result = await ipcRenderer.invoke('save-project', projectData);
        if (result.success && !result.canceled) {
            showToast(i18n.t('project.save_success'), 'success');
        }
    } catch (error) {
        showToast(i18n.t('project.save_failed'), 'error');
    }
}

async function loadProject() {
    try {
        const result = await ipcRenderer.invoke('load-project');
        if (result.success && !result.canceled) {
            const project = result.project;
            
            if (elements.cameraSelect && project.settings?.camera) elements.cameraSelect.value = project.settings.camera;
            if (elements.resolutionSelect && project.settings?.resolution) elements.resolutionSelect.value = project.settings.resolution;
            if (elements.intervalValue && project.settings?.interval) elements.intervalValue.value = project.settings.interval;
            
            if (project.settings?.watermark) {
                if (elements.addWatermark) elements.addWatermark.checked = project.settings.watermark.enabled;
                if (elements.watermarkText && project.settings.watermark.text) elements.watermarkText.value = project.settings.watermark.text;
                if (elements.watermarkPosition && project.settings.watermark.position) elements.watermarkPosition.value = project.settings.watermark.position;
            }
            
            if (project.settings?.motionDetection) {
                if (elements.motionDetectionEnabled) elements.motionDetectionEnabled.checked = project.settings.motionDetection.enabled;
                if (elements.motionSensitivity && project.settings.motionDetection.sensitivity) elements.motionSensitivity.value = project.settings.motionDetection.sensitivity;
            }
            
            if (project.settings?.scheduling) {
                if (elements.smartSchedulingEnabled) elements.smartSchedulingEnabled.checked = project.settings.scheduling.enabled;
                if (elements.scheduleStartTime && project.settings.scheduling.startTime) elements.scheduleStartTime.value = project.settings.scheduling.startTime;
                if (elements.scheduleEndTime && project.settings.scheduling.endTime) elements.scheduleEndTime.value = project.settings.scheduling.endTime;
            }
            
            toggleMotionDetectionSettings();
            toggleSmartSchedulingSettings();
            toggleWatermarkSettings();
            updateMotionSensitivityDisplay();
            
            showToast(`Project "${project.name}" loaded successfully`, 'success');
        }
    } catch (error) {
        showToast(i18n.t('project.load_failed'), 'error');
    }
}

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


let motionZones = [];
let cronPatterns = [];
let seasonalRules = [];
let holidayExceptions = [];

document.getElementById('noise-filter')?.addEventListener('input', async function(e) {
    const value = e.target.value;
    document.getElementById('noise-filter-value').textContent = value;
    
    try {
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.motionDetection) currentSettings.motionDetection = {};
        currentSettings.motionDetection.noiseFilter = parseInt(value);
        await safeInvoke('save-settings', currentSettings);
    } catch (error) {
    }
});

document.getElementById('advanced-scheduling-mode')?.addEventListener('change', async function(e) {
    const advancedOptions = document.getElementById('advanced-scheduling-options');
    if (e.target.checked) {
        advancedOptions.style.display = 'block';
    } else {
        advancedOptions.style.display = 'none';
    }
    
    try {
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        currentSettings.scheduling.advancedMode = e.target.checked;
        await safeInvoke('save-settings', currentSettings);
    } catch (error) {
    }
});

let isAddingZone = false;
let zoneDrawing = null;

document.getElementById('add-motion-zone-btn')?.addEventListener('click', function() {
    if (isAddingZone) {
        cancelZoneDrawing();
        return;
    }
    
    startZoneDrawing();
});

function startZoneDrawing() {
    isAddingZone = true;
    const btn = document.getElementById('add-motion-zone-btn');
    if (btn) {
        btn.textContent = 'Cancel';
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-outline');
    }
    
    const previewContainer = document.getElementById('zones-camera-preview-container');
    if (previewContainer) {
        previewContainer.style.cursor = 'crosshair';
        previewContainer.addEventListener('mousedown', startDrawingZone);
        previewContainer.addEventListener('mousemove', drawingZone);
        previewContainer.addEventListener('mouseup', finishDrawingZone);
    }
    
    showToast('Click and drag on the camera preview to define a motion zone', 'info');
}

function cancelZoneDrawing() {
    isAddingZone = false;
    const btn = document.getElementById('add-motion-zone-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-plus"></i><span data-i18n="advanced.add_zone">Add Zone</span>';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-outline');
    }
    
    const previewContainer = document.getElementById('zones-camera-preview-container');
    if (previewContainer) {
        previewContainer.style.cursor = 'default';
        previewContainer.removeEventListener('mousedown', startDrawingZone);
        previewContainer.removeEventListener('mousemove', drawingZone);
        previewContainer.removeEventListener('mouseup', finishDrawingZone);
    }
    
    if (zoneDrawing) {
        zoneDrawing.remove();
        zoneDrawing = null;
    }
}

function startDrawingZone(e) {
    if (!isAddingZone) return;
    
    const container = document.getElementById('zones-camera-preview-container');
    const rect = container.getBoundingClientRect();
    
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    zoneDrawing = document.createElement('div');
    zoneDrawing.className = 'zone-drawing';
    zoneDrawing.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        width: 0px;
        height: 0px;
        border: 2px dashed var(--primary-color);
        background: rgba(0, 212, 255, 0.1);
        pointer-events: none;
        z-index: 15;
    `;
    
    container.appendChild(zoneDrawing);
    zoneDrawing.startX = startX;
    zoneDrawing.startY = startY;
    zoneDrawing.isDrawing = true;
}

function drawingZone(e) {
    if (!isAddingZone || !zoneDrawing || !zoneDrawing.isDrawing) return;
    
    const container = document.getElementById('zones-camera-preview-container');
    const rect = container.getBoundingClientRect();
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const left = Math.min(zoneDrawing.startX, currentX);
    const top = Math.min(zoneDrawing.startY, currentY);
    const width = Math.abs(currentX - zoneDrawing.startX);
    const height = Math.abs(currentY - zoneDrawing.startY);
    
    zoneDrawing.style.left = left + 'px';
    zoneDrawing.style.top = top + 'px';
    zoneDrawing.style.width = width + 'px';
    zoneDrawing.style.height = height + 'px';
}

async function finishDrawingZone(e) {
    if (!isAddingZone || !zoneDrawing || !zoneDrawing.isDrawing) return;
    
    const container = document.getElementById('zones-camera-preview-container');
    const rect = container.getBoundingClientRect();
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const left = Math.min(zoneDrawing.startX, currentX);
    const top = Math.min(zoneDrawing.startY, currentY);
    const width = Math.abs(currentX - zoneDrawing.startX);
    const height = Math.abs(currentY - zoneDrawing.startY);
    
    if (width < 20 || height < 20) {
        showToast('Zone too small. Please draw a larger area.', 'warning');
        cancelZoneDrawing();
        return;
    }
    
    const zone = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
        name: `Zone ${motionZones.length + 1}`
    };
    
    try {
        const result = await safeInvoke('add-motion-zone', zone);
        if (result.success) {
            await loadMotionZones();
            showToast(i18n.t('toast.motion_zone_added'), 'success');
        } else {
            showToast('Failed to add motion zone: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error adding motion zone: ' + error.message, 'error');
    }
    
    cancelZoneDrawing();
}

document.getElementById('clear-motion-zones-btn')?.addEventListener('click', async function() {
    try {
        for (const zone of motionZones) {
            await safeInvoke('remove-motion-zone', zone.id);
        }
        await loadMotionZones();
        showToast(i18n.t('toast.motion_zones_cleared'), 'success');
    } catch (error) {
        showToast('Error clearing motion zones: ' + error.message, 'error');
    }
});

async function loadMotionZones() {
    try {
        motionZones = await safeInvoke('get-motion-zones');
        renderMotionZones();
    } catch (error) {
    }
}

function renderMotionZones() {
    const zonesList = document.getElementById('motion-zones-list');
    if (!zonesList) return;
    
    if (motionZones.length === 0) {
        zonesList.innerHTML = '<div class="zones-empty" data-i18n="advanced.no_zones">No motion zones defined. Click \'Add Zone\' to create detection areas.</div>';
        clearVisualZones();
        return;
    }
    
    zonesList.innerHTML = motionZones.map(zone => `
        <div class="zone-item" data-zone-id="${zone.id}">
            <div>
                <div class="zone-name">${zone.name}</div>
                <div class="zone-coords">Position: ${zone.x}, ${zone.y} | Size: ${zone.width}×${zone.height}</div>
            </div>
            <button class="item-remove" onclick="removeMotionZone(${zone.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    renderVisualZones();
}

function renderVisualZones() {
    clearVisualZones();
    
    const previewContainer = document.getElementById('zones-camera-preview-container');
    if (!previewContainer) return;
    
    motionZones.forEach((zone, index) => {
        const zoneElement = document.createElement('div');
        zoneElement.className = 'motion-zone-overlay';
        zoneElement.style.cssText = `
            position: absolute;
            left: ${zone.x}px;
            top: ${zone.y}px;
            width: ${zone.width}px;
            height: ${zone.height}px;
            border: 2px solid var(--primary-color);
            background: rgba(0, 212, 255, 0.15);
            pointer-events: none;
            z-index: 10;
        `;
        
        const label = document.createElement('div');
        label.className = 'zone-label';
        label.textContent = zone.name;
        label.style.cssText = `
            position: absolute;
            top: -25px;
            left: 0;
            background: var(--primary-color);
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 12px;
            white-space: nowrap;
        `;
        
        zoneElement.appendChild(label);
        previewContainer.appendChild(zoneElement);
    });
}

function clearVisualZones() {
    const previewContainer = document.getElementById('zones-camera-preview-container');
    if (!previewContainer) return;
    
    const existingZones = previewContainer.querySelectorAll('.motion-zone-overlay');
    existingZones.forEach(zone => zone.remove());
}

async function removeMotionZone(zoneId) {
    try {
        const result = await safeInvoke('remove-motion-zone', zoneId);
        if (result.success) {
            await loadMotionZones();
            showToast('Motion zone removed', 'success');
        } else {
            showToast('Failed to remove motion zone: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error removing motion zone: ' + error.message, 'error');
    }
}

document.getElementById('add-cron-pattern-btn')?.addEventListener('click', async function() {
    const input = document.getElementById('cron-pattern-input');
    const pattern = input.value.trim();
    
    if (!pattern) {
        showToast(i18n.t('toast.please_enter_cron_pattern'), 'warning');
        return;
    }
    
    try {
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        if (!currentSettings.scheduling.cronPatterns) currentSettings.scheduling.cronPatterns = [];
        
        try {
            const parts = pattern.split(' ');
            if (parts.length < 5) {
                throw new Error('Cron pattern must have at least 5 parts');
            }
        } catch (validationError) {
            showToast(i18n.t('toast.invalid_cron_pattern') + ': ' + validationError.message, 'error');
            return;
        }
        
        currentSettings.scheduling.cronPatterns.push(pattern);
        await safeInvoke('save-settings', currentSettings);
        
        input.value = '';
        await loadCronPatterns();
        showToast(i18n.t('toast.cron_pattern_added'), 'success');
    } catch (error) {
        showToast('Error adding cron pattern: ' + error.message, 'error');
    }
});

async function loadCronPatterns() {
    try {
        const settings = await safeInvoke('get-settings');
        if (settings && settings.scheduling) {
            cronPatterns = settings.scheduling.cronPatterns || [];
        } else {
            cronPatterns = [];
        }
        renderCronPatterns();
    } catch (error) {
        cronPatterns = [];
        renderCronPatterns();
    }
}

function renderCronPatterns() {
    const patternsList = document.getElementById('cron-patterns-list');
    if (!patternsList) return;
    
    if (cronPatterns.length === 0) {
        patternsList.innerHTML = '<div class="patterns-empty" data-i18n="advanced.no_patterns">No cron patterns defined. Add patterns for advanced scheduling.</div>';
        return;
    }
    
    patternsList.innerHTML = cronPatterns.map((pattern, index) => `
        <div class="pattern-item" data-pattern-index="${index}">
            <div>
                <div class="pattern-text">${pattern}</div>
                <div class="pattern-desc">${getCronDescription(pattern)}</div>
            </div>
            <button class="item-remove" onclick="removeCronPattern(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function getCronDescription(pattern) {
    const parts = pattern.split(' ');
    if (parts.length >= 6) {
        return `Every ${parts[1]} min, ${parts[2]} hour`;
    }
    return 'Custom pattern';
}

async function removeCronPattern(index) {
    try {
        cronPatterns.splice(index, 1);
        
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        currentSettings.scheduling.cronPatterns = cronPatterns;
        await safeInvoke('save-settings', currentSettings);
        
        renderCronPatterns();
        showToast(i18n.t('toast.cron_pattern_removed'), 'success');
    } catch (error) {
        showToast('Error removing cron pattern: ' + error.message, 'error');
    }
}

document.getElementById('add-seasonal-rule-btn')?.addEventListener('click', function() {
    showSeasonalRuleDialog();
});

function showSeasonalRuleDialog() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
        <div class="seasonal-dialog-backdrop"></div>
        <div class="seasonal-dialog">
            <h4>Add Seasonal Rule</h4>
            <div class="form-group">
                <label>Select Months:</label>
                <div class="months-selector">
                    ${Array.from({length: 12}, (_, i) => `
                        <div class="month-checkbox" data-month="${i + 1}">
                            <input type="checkbox" id="month-${i + 1}" value="${i + 1}">
                            <span class="checkbox-custom"></span>
                            <label for="month-${i + 1}">${new Date(2000, i, 1).toLocaleDateString('en', {month: 'short'})}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label for="seasonal-start">Start Time:</label>
                <input type="time" id="seasonal-start" value="07:00">
            </div>
            <div class="form-group">
                <label for="seasonal-end">End Time:</label>
                <input type="time" id="seasonal-end" value="19:00">
            </div>
            <div class="seasonal-dialog-actions">
                <button class="btn btn-outline" onclick="closeSeasonalDialog()">Cancel</button>
                <button class="btn btn-primary" onclick="saveSeasonalRule()">Add Rule</button>
            </div>
        </div>
    `;
    
    dialog.querySelectorAll('.month-checkbox').forEach(checkboxDiv => {
        checkboxDiv.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            
            const input = this.querySelector('input[type="checkbox"]');
            input.checked = !input.checked;
            
            input.dispatchEvent(new Event('change'));
        });
        
        const input = checkboxDiv.querySelector('input[type="checkbox"]');
        input.addEventListener('change', function() {
        });
    });
    
    document.body.appendChild(dialog);
}

async function saveSeasonalRule() {
    const selectedMonths = Array.from(document.querySelectorAll('.month-checkbox input[type="checkbox"]:checked')).map(input => parseInt(input.value));
    const startTime = document.getElementById('seasonal-start').value;
    const endTime = document.getElementById('seasonal-end').value;
    
    if (selectedMonths.length === 0) {
        showToast(i18n.t('toast.please_select_months'), 'warning');
        return;
    }
    
    const rule = {
        months: selectedMonths,
        startTime: startTime,
        endTime: endTime
    };
    
    try {
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        if (!currentSettings.scheduling.seasonalRules) currentSettings.scheduling.seasonalRules = [];
        
        currentSettings.scheduling.seasonalRules.push(rule);
        await safeInvoke('save-settings', currentSettings);
        
        await loadSeasonalRules();
        closeSeasonalDialog();
        showToast(i18n.t('toast.seasonal_rule_added'), 'success');
    } catch (error) {
        showToast('Error adding seasonal rule: ' + error.message, 'error');
    }
}

function closeSeasonalDialog() {
    const dialog = document.querySelector('.seasonal-dialog-backdrop').parentElement;
    if (dialog) {
        dialog.remove();
    }
}

async function loadSeasonalRules() {
    try {
        const settings = await safeInvoke('get-settings');
        if (settings && settings.scheduling) {
            seasonalRules = settings.scheduling.seasonalRules || [];
        } else {
            seasonalRules = [];
        }
        renderSeasonalRules();
    } catch (error) {
        seasonalRules = [];
        renderSeasonalRules();
    }
}

function renderSeasonalRules() {
    const rulesList = document.getElementById('seasonal-rules-list');
    if (!rulesList) return;
    
    if (seasonalRules.length === 0) {
        rulesList.innerHTML = '<div class="rules-empty" data-i18n="advanced.no_seasonal">No seasonal rules defined. Add rules for different months/seasons.</div>';
        return;
    }
    
    rulesList.innerHTML = seasonalRules.map((rule, index) => `
        <div class="rule-item" data-rule-index="${index}">
            <div>
                <div class="rule-text">Months: ${rule.months.join(', ')}</div>
                <div class="rule-desc">${rule.startTime} - ${rule.endTime}</div>
            </div>
            <button class="item-remove" onclick="removeSeasonalRule(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function removeSeasonalRule(index) {
    try {
        seasonalRules.splice(index, 1);
        
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        currentSettings.scheduling.seasonalRules = seasonalRules;
        await safeInvoke('save-settings', currentSettings);
        
        renderSeasonalRules();
        showToast(i18n.t('toast.seasonal_rule_removed'), 'success');
    } catch (error) {
        showToast('Error removing seasonal rule: ' + error.message, 'error');
    }
}

document.getElementById('add-exception-btn')?.addEventListener('click', async function() {
    const input = document.getElementById('exception-date-input');
    const date = input.value;
    
    if (!date) {
        showToast(i18n.t('toast.please_select_date'), 'warning');
        return;
    }
    
    const exception = {
        date: date,
        action: 'skip'
    };
    
    try {
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        if (!currentSettings.scheduling.exceptions) currentSettings.scheduling.exceptions = [];
        
        currentSettings.scheduling.exceptions.push(exception);
        await safeInvoke('save-settings', currentSettings);
        
        input.value = '';
        await loadHolidayExceptions();
        showToast(i18n.t('toast.exception_added'), 'success');
    } catch (error) {
        showToast('Error adding exception: ' + error.message, 'error');
    }
});

async function loadHolidayExceptions() {
    try {
        const settings = await safeInvoke('get-settings');
        if (settings && settings.scheduling) {
            holidayExceptions = settings.scheduling.exceptions || [];
        } else {
            holidayExceptions = [];
        }
        renderHolidayExceptions();
    } catch (error) {
        holidayExceptions = [];
        renderHolidayExceptions();
    }
}

function renderHolidayExceptions() {
    const exceptionsList = document.getElementById('exceptions-list');
    if (!exceptionsList) return;
    
    if (holidayExceptions.length === 0) {
        exceptionsList.innerHTML = '<div class="exceptions-empty" data-i18n="advanced.no_exceptions">No exceptions defined. Add dates to skip capture.</div>';
        return;
    }
    
    exceptionsList.innerHTML = holidayExceptions.map((exception, index) => `
        <div class="exception-item" data-exception-index="${index}">
            <div>
                <div class="exception-text">${exception.date}</div>
                <div class="exception-desc">Skip capture</div>
            </div>
            <button class="item-remove" onclick="removeHolidayException(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function removeHolidayException(index) {
    try {
        holidayExceptions.splice(index, 1);
        
        const currentSettings = await safeInvoke('get-settings');
        if (!currentSettings.scheduling) currentSettings.scheduling = {};
        currentSettings.scheduling.exceptions = holidayExceptions;
        await safeInvoke('save-settings', currentSettings);
        
        renderHolidayExceptions();
        showToast(i18n.t('toast.exception_removed'), 'success');
    } catch (error) {
        showToast('Error removing exception: ' + error.message, 'error');
    }
}

async function initializeAdvancedFeatures() {
    try {
        const settings = await safeInvoke('get-settings');
        const motionSettings = settings.motionDetection || {};
        const schedulingSettings = settings.scheduling || {};
        
        const noiseFilter = document.getElementById('noise-filter');
        if (noiseFilter) {
            noiseFilter.value = motionSettings.noiseFilter || 15;
            const valueDisplay = document.getElementById('noise-filter-value');
            if (valueDisplay) {
                valueDisplay.textContent = noiseFilter.value;
            }
        }
        
        const advancedMode = document.getElementById('advanced-scheduling-mode');
        if (advancedMode) {
            advancedMode.checked = schedulingSettings.advancedMode || false;
            const advancedOptions = document.getElementById('advanced-scheduling-options');
            if (advancedOptions) {
                advancedOptions.style.display = advancedMode.checked ? 'block' : 'none';
            }
        }
        
        await loadMotionZones();
        await loadCronPatterns();
        await loadSeasonalRules();
        await loadHolidayExceptions();
    } catch (error) {
    }
}

window.removeMotionZone = removeMotionZone;
window.removeCronPattern = removeCronPattern;
window.removeSeasonalRule = removeSeasonalRule;
window.removeHolidayException = removeHolidayException;
window.saveSeasonalRule = saveSeasonalRule;
window.closeSeasonalDialog = closeSeasonalDialog;

setTimeout(() => {
    initializeAdvancedFeatures();
}, 1000);

