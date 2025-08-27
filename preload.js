const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
        const validChannels = [
            'get-cameras',
            'get-screen-sources',
            'detect-motion',
            'save-project',
            'load-project',
            'get-export-presets',
            'start-capture',
            'stop-capture',
            'pause-capture',
            'resume-capture',
            'get-settings',
            'save-settings',
            'select-folder',
            'select-files',
            'select-watermark-image',
            'create-timelapse',
            'get-videos',
            'play-video',
            'upload-video',
            'export-video',
            'delete-video',
            'get-storage-info',
            'cleanup-old-files',
            'check-for-updates',
            'download-update',
            'install-update',
            'skip-update-version',
            'get-app-version',
            'get-update-settings',
            'save-update-settings',
            'get-capture-status',
            'test-ftp-connection',
            'upload-video-ftp',
            'window-focus',
            'window-minimize',
            'window-maximize',
            'window-close',
            'add-motion-zone',
            'remove-motion-zone',
            'get-motion-zones',
            'add-cron-pattern',
            'add-seasonal-rule',
            'add-schedule-exception'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Invalid channel: ${channel}`);
    },
    
    on: (channel, callback) => {
        const validChannels = [
            'update-checking',
            'update-available',
            'update-not-available',
            'update-error',
            'update-download-progress',
            'update-downloaded',
            'capture-started',
            'capture-stopped',
            'capture-paused',
            'capture-resumed',
            'image-captured',
            'capture-error',
            'auto-start-capture',
            'auto-stop-capture',
            'ftp-upload-complete',
            'ftp-upload-error',
            'camera-error',
            'ffmpeg-not-available',
            'process-error',
            'promise-error',
            'storage-info-update',
            'storage-limit-reached',
            'cleanup-completed',
            'auto-timelapse-created',
            'auto-timelapse-uploaded',
            'auto-timelapse-error',
            'auto-timelapse-upload-error',
            'timelapse-complete',
            'timelapse-progress',
            'timelapse-error'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        } else {
            throw new Error(`Invalid channel: ${channel}`);
        }
    },
    
    removeAllListeners: (channel) => {
        const validChannels = [
            'update-checking',
            'update-available',
            'update-not-available',
            'update-error',
            'update-download-progress',
            'update-downloaded',
            'capture-started',
            'capture-stopped',
            'capture-paused',
            'capture-resumed',
            'image-captured',
            'capture-error',
            'auto-start-capture',
            'auto-stop-capture',
            'ftp-upload-complete',
            'ftp-upload-error',
            'camera-error',
            'ffmpeg-not-available',
            'process-error',
            'promise-error',
            'storage-info-update',
            'storage-limit-reached',
            'cleanup-completed',
            'auto-timelapse-created',
            'auto-timelapse-uploaded',
            'auto-timelapse-error',
            'auto-timelapse-upload-error',
            'timelapse-complete',
            'timelapse-progress',
            'timelapse-error'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    }
});