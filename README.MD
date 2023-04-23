# Sequenzia Dynamic Wallpaper Service (microDWS)
Simple and Lightweight way to get random wallpapers from Sequenzia (Requires Login)<br>
New to Sequenzia? Create your own deployment https://docs.acr.moe/index.php?title=Build_Sequenzia_2_Server

## M1 Mac Support
Due to issues with Puppeteer please prefix your commands with `arch -x86_64 npx` to launch as Intel

## Authentication
You must get a static Login Key from Sequenzia<br>
Got to the user menu > Authentication > Static Login Key > Generate or Copy the key<br>
Place it in the Config file
## Install
`npm install -g sequenzia-ads-micro`<br>
Once Installed you can run from PowerShell or Terminal<br>
`ads-micro -c config.json`<br>
Example Output:<br>
```shell
ads-micro
Sequenzia uDWS for NodeJS - "Its Simple"

Logging in...
Login successful!
Registered Enabled, Every 5 Minutes
726784923150712832 - false - Cosplay/General/seq - June 28, 2020
```
## Automation
Current best practice is to use "Unmanaged Folder Mode" and use the folder with the operating systems built in wallpaper slideshow feature<br>
Unless you are using slave display mode or care about things happening on in a specific way
### Windows
Use Task Scheduler and add Task like so...
* Program/script: `PowerShell.exe`
* Add arguments: `-nologo -noninteractive  -WindowStyle Hidden -command "& {Start-Transcript run.txt; Get-Process -Name node | Stop-Process; npx ads-micro}"`
  * Your Start in folder should be a folder that will contain your config files and will store temporary files and will store images in folder mode.
  * You can also options like `-c` to use an alternative config file: `...; npx ads-micro -c night.json}"`
* Start in: `C:\Users\ykaza\Pictures\SeqADS`
### MacOS / Linux
Both MacOS and Linux users are suggested to use cron<br>
`*/5 0-2,9-23 * * * cd /Users/kazari/Documents/SeqADS/; pkill -f "sequenzia-ads-micro"; /usr/local/bin/npx ads-micro -d > /dev/null 2>&1`
<b>Cron Warning: You should absolute paths or append `cd /folder/folder; ...`</b>

# Configuration - config.json
## WebKit Mode
This mode will request a micro version of the standard ADS Lite system, this will generate an image to allow for portrait images to be displayed correctly
### Independent Mode
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINKEY",
  "displayName": "Untitled",
  "webMode": true,

  "refreshTimeMin": 5,
  "query" : "folder=art%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000"
}
```
### Master/Slave Mode
In a master / slave relationship you can set a display as the master with `slave: false` and this instance will be we the display that generates the actual request and will write to the history. <br>
All Slave instances will retrieve the image that has been set on the master, effectively synchronising all displays.<br>
<b>NOTE: Just like ADS Lite if the master is offline or has failed, the slaves will not get new images. At this time there is no reelection support. Using this mode only makes sense if you have a ADS Lite display always running or is active using the time this instance is running. <br></b>
For example: you have ADS Lite display connected to your monitor and its used as the standby display when your computer is not awake or is disconnected from the monitor, if you run your computer as a slave the image on the standby display will be displayed on your computer.<br>
<b>NOTE: when using slave mode, the `refreshTimeMin` and all other options are ignored and will get in sync with the master configuration and timer, only in cron / on-demand mode will the sync pulse be bypassed</b> 
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINKEY",
  "displayName": "Desk Left",
  "refreshTimeMin" : 5,
  "webMode": true,
  "slave": true
}
```
You can use this with cron tasks, `webMode: true` and `slave: ` must be outside the schedule block!****
### Appearance Options
```json
{
"appearance": {
    "padding": "bottom",
    "padding_value": "1.25em",
    "overlay": "none",
    "color": "#7d0b00",
    "info": false
  }
}
```

* padding: [left, right, bottom, none]
    * Used to add extra padding for taskbar or dock
* padding_value: [valid css measurement]
  * Manual Adjustment of the padding
* overlay: [left, right, bottom, none]
  * Adds classic overlay gradiant from ADS Lite
* shadow: [true, false]
  * Add/Remove Dropshadow on portrait images over the blurred background
* blur: '10' or 'false'
  * Blur Value for Filter on Backgrounds or portrait images
* saturate: 2
    * Saturation Value for Filter on Backgrounds or portrait images
* brightness: 1.1
  * Brightness Value for Filter on Backgrounds or portrait images
* contrast: 1
  * Contrast Value for Filter on Backgrounds or portrait images
* color: [CSS Color Name, hex, rgb()]
  * Change the color of the text, will override auto coloring based on background
* info: [true, false]
  * Removed the image location data and move the logo to the right, you can also remove this property to do the same as true

### Banner Options
Allows you to add a banner to the top of all images (Useful for identifying a computer or classification)<br/>
**NOTE: Banner settings are sent in the the URL hash and therfore are only read by the browser, the server will never receive your settings!**
```json
{
  "banner": {
    "text": "MacBook",
    "color": "black",
    "background": "white",
    "size": "24px"
  }
}
```
* text: Text that is displayed on the banner
* color: Text Color [CSS Color Name, hex, rgb()] 
* background: Background Color [CSS Color Name, hex, rgb()]
* size: Size of the text [px, pt, em, etc.]

## Direct Mode
This will use the standard request and download the image for your wallpaper or folder
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINKEY",
  "displayName": "Untitled",
  "refreshTimeMin": 5,
  "query" : "folder=art%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000"

}
```
# Options
## Sequenzia Shortcut Query (Recommended)
Use a exported text from the "Send to App" / "Export Results" Option from Sequenzia Web<br>
This URI is used for Apple Shortcuts and can be used here aswell
```json
{
  "query" : "folder=art%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000"
} 
```
## Manual Options (Advanced)
### Location (Folder or Channel)
```json
{
  "location": "Seq1:Art:*"
} 
```
or
```json
{
  "location": "678258482266"
} 
```
### Album
```json
{
  "albumId": "10"
}
```
You can also set a album ID to only get images from an album<br>
### Search Query
```json
{
  "searchQuery": "text:Twitter Image"
}
```
### Favorites
Get only your favorite images
```json
{
  "favoritesOnly": true
}
```
### Maximum Age
Maximum Age of a image
```json
{
  "numberOfDaysToSearch": "365"
}
```
### Resolutions
```json
{
  "minimumResolution": "1080"
}
```
or
```json
{
  "minimumHeight": "1080"
}
```
or
```json
{
  "minimumWidth": "1920"
}
```
You can set a minimum height and or width as well if you want strict minimum resolutions instead of the loose "minimumResolution"<br>
### Widescreen or Portrait Only
```json
{
  "wideScreenOnly": true
}
```
or
```json
{
  "portraitOnly": true
}
```
### Ratio (Advanced)
```json
{
  "ratioQuery": "0.01-0.9"
}
```
### Image Brightness
```json
{
  "onlyDarkImages": true
}
```
or
```json
{
  "onlyLightImages": true
}
```
### Color Query  (Advanced)
```json
{
  "colorQuery": "0-195:0-199:0-200"
}
```
You can use the new color range or color selection, use the "color=" string directly from the URL in Sequenzia Web
### NSFW Filter
```json
{
  "enableNSFW": false
}
```
or
```json
{
  "enableNSFW": true
}
```
or
```json
{
  "enableNSFW": "only"
}
```
This will only work if the results contain nsfw images
### Extra Options (Advanced)
```json
{
  "extraOptions": "options=value&option2=value"
}
```
Allows for additional options that have not been yet implemented

# Unmanaged Folder Mode
Using "folders" options will allow you to download/generate wallpapers that are saved to a folder without any further action.<br>
This can be used with your operating systems build in slideshow options or other applications

You can use webkit or direct mode and webkit appearance options like normal, you must specify webMode inside the folder. Appearance options can be placed in a folder to be applied to all images in that folder.
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINEY",
  "displayName": "My PC",
  
  "folders": [
    {
      "path": "Wallpapers",
      "webMode": true,
      "screen": "0",
      "query" : "folder=art%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000"
    }
  ]
}
```
## Options
* path: String
    * Folder Name in relation to the current directory or wallpaper path option
* count: Interget
  * Number of Images to download / create
* nohistory: [true, false]
  * Disables Adding Images to the Display History
* screen: Interger
  * Screen/Monitor Number, 0 = Wallpaper/Main or 1 = Lockscreen/Secoundary
* keepItems: [true, false]
  * Do not delete any old images after new images are added
* incimentalFileNames: [true, false]
  * Ensured that all files names are the same and will overwrite old files
  * Mainly for OSs that are not smart about file management, **cough** Windows  

# Cron Schedules
Please use [Cron Guru](https://crontab.guru/) for formatting, Incorrect cron job definitions can and will be disastrous!<br>
```text
From 5AM to 5PM
    Display Images From Art
From 6PM to 6AM
    Display Images from Cosplay
```
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINEY",
  
  "schedule": [
    {
      "displayName": "PC Day",
      "cron": "*/15 5-17 * * *",
      "query" : "folder=art%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000&numdays=360"
    },
    {
      "displayName": "PC Night",
      "cron": "*/15 18-23,0-6 * * *",
      "query" : "folder=cosplay%3A*&nsfw=true&ratio=0.01-0.9&minwres=1000&numdays=360"
    }
  ]
}
```
# Timed Swap
This uses the ADS Lite displaySwap system, more useful if your use webMode and master/slave but is compatible will all modes.<br>
<b>NOTE: You must only have 2 items, Timed Swap only supports 2 display names</b>
```text
Until 6:30PM
    Display Images From the "Desk Right" device
Until 5AM
    Display Images From the "Desk Left" device
```
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINEY",
  "refreshTimeMin" : 5,
  "webMode": true,
  "slave": true,
  
  "displaySwap": [
    {
      "displayName": "Desk Right",
      "swapTime": 18.5
    },
    {
      "displayName": "Desk Left",
      "swapTime": 5
    }
  ]
}
```

## Command Line Options
Note: use -c configfile.json to overide the default config.json and use -d to disable the automatic refresh
### -c or --config
Specify a alternative config file, location is based from the current working directory
### -d or --disableTimer
Run On-Demand, will use the config options and will not start the interval run.
There is a 2-minute max timeout, so if it gets stuck in the background it will be killed after 2 minutes
### -j (index) or --runJob (index)
Run On-Demand Cron Schedule, The (index) number is the cron job in the "schedule" that will be run.
### -w path or --wallpaperStorage path
Use an alternative path for storage of wallpapers that are being set this is useful for environments where you are not given a relative path, The cookies file will also be stored there aswell.
