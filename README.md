Timelapse Webcam
=======

Webcam software that takes pictures from your webcam and creates a timelapse video.


### Usage

Start Timelapse Webcam and click on the "Settings" button.

Select the webcam you wish to use and change the settings.


### Features

- Takes pictures from your webcam based on a custom interval.

- Automatically uploads the pictures to your FTP server.

- Automatically creates a timelapse video and uploads it to your FTP server.

- Adds a watermark/overlay and text to your pictures.

- Adds music, effects and a watermark/overlay to your timelapse videos.


### Troubleshooting - Building on windows

If you are having trouble building Timelapse Webcam on windows, then please check out [Build issues caused by downstream dependencies](https://github.com/Hackzzila/node-ffmpeg-binaries/issues/20) to resolve the problem. 

The problem is that lzma-native fails to build due to an outdated version being required by decompress-tarxz. 

You must update the dependencies as done in [this commit](https://github.com/kevva/decompress-tarxz/pull/11/commits/c5fc28f00e43e8b8dff7a65f489b264acb064693).

Then run ```sh electron-builder install-app-deps ```


### Update

04/26/2019	0.0.1, Initial release

This software uses code of [FFmpeg](http://ffmpeg.org) licensed under the [LGPLv2.1](http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html) and its source can be downloaded [here](https://github.com/bavamont/timelapse-webcam).