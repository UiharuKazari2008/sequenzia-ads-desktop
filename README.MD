# Sequenzia ADS Micro
Simple and Lightweight way to get random wallpapers from Sequenzia (Requires Login)
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
ads-micro -c ../../day.json
Logging in...
Login successful!
Registered Enabled, Every 5 Minutes
726784923150712832 - false - Cosplay/General/seq - June 28, 2020
```

## Configuration - config.json
### Web Mode
This mode will request a micro version of the standard ADS Lite system, this will generate an image to allow for portrait images to be displayed correctly
#### Independent Mode
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINKEY",
  "displayName": "Untitled",
  "webMode": true,

  "refreshTimeMin": 5,

  "location": "Seq1:Art:*",
  "numberOfDaysToSearch": "365",

  "extraOptions": "",
  "favoritesOnly": false,
  "enableNSFW": false,
  "minimumResolution": "1080",
  "wideScreenOnly": true,
  "onlyDarkImages": false,
  "onlyLightImages": false
}
```
#### Master/Slave Mode
In a master / slave relationship you can set a display as the master with `slave: false` and this instance will be we the display that generates the actual request and will write to the history. <br>
All Slave instances will retrieve the image that has been set on the master, effectively synchronising all displays.<br>
<b>NOTE: Just like ADS Lite if the master is offline or has failed, the slaves will not get new images . At this time there is no reelection support. Using this mode only makes sense if you have a ADS Lite display always running or is active using the time this instance is running. <br></b>
For example: you have ADS Lite display connected to your monitor and its used as the standby display when your computer is not awake or is disconnected from the monitor, if you run your computer as a slave the image on the standby display will be displayed on your computer.<br>
<b>NOTE: when using slave mode, the `refreshTimeMin` is ignored and will get in sync with the master timer, only in cron mode will the sync pulse be ignored</b> 
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
#### Appearance Settings
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
```
padding: [left, right, bottom, none] // Used to add extra padding for taskbar or dock
padding_value: [valid css mesument] // Manual Adjustment of the padding
overlay: [left, right, bottom, none] // Added classic overlay gradiant from ADS Lite
color: [CSS Color Name, hex, rgb()] // Change the color of the text, will overide auto coloring based on background
info: [true, false] // Removed the image location data and move the logo to the right, you can also remove this property to do the same as true  
```
### Standard Mode
This will use the standard request and download the image for your wallpaper
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "YOURLOGINKEY",
  "displayName": "Untitled",

  "refreshTimeMin": 5,

  "location": "Seq1:Art:*",
  "numberOfDaysToSearch": "365",

  "extraOptions": "",
  "favoritesOnly": false,
  "enableNSFW": false,
  "minimumResolution": "1080",
  "wideScreenOnly": true,
  "onlyDarkImages": false,
  "onlyLightImages": false
}
```
###Extra Options
#### Resolutions
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
You can set a minimum height and or width as well if you want strict minimum resolutions instead of the lose "minimumResolution"<br>
#### Ratio (Overrides wideScreenOnly)
```json
{
  "ratioQuery": "0.01-0.9"
}
```
#### Album
```json
{
  "albumId": "10"
}
```
You can also set a album ID to only get images from an album<br>
#### Search Query
```json
{
  "searchQuery": "text:Twitter Image"
}
```
#### Color Query (Overrides onlyDarkImages and onlyLightImages)
```json
{
  "colorQuery": "0-195:0-199:0-200"
}
```
You can use the new color range or color selection, use the "color=" string directly from the URL in Sequenzia Web
#### Manual Options
```json
{
  "extraOptions": "options=value&option2=value"
}
```
Allows for additional options that have not been yet implemented

## Cron Schedules
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
      "location": "seq:art:*",
      "numberOfDaysToSearch": "365",

      "extraOptions": "",
      "favoritesOnly": false,
      "enableNSFW": false,
      "minimumResolution": "1080",
      "wideScreenOnly": true,
      "onlyDarkImages": false,
      "onlyLightImages": false
    },
    {
      "displayName": "PC Night",
      "cron": "*/15 18-23,0-6 * * *",
      "location": "seq:cosplay:*",
      "numberOfDaysToSearch": "365",

      "extraOptions": "",
      "favoritesOnly": false,
      "enableNSFW": false,
      "minimumResolution": "1080",
      "wideScreenOnly": true,
      "onlyDarkImages": false,
      "onlyLightImages": false
    }
  ]
}
```
## Timed Swap
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

Note: use -c configfile.json to overide the default config.json and use -d to disable the automatic refresh
## Command Line Options
### -c or --config
Specify a alternative config file, location is based from the current working directory
### -d or --disableTimer
Run On-Demand, will use the config options and will not start the interval run.
There is a 2-minute max timeout, so if it gets stuck in the background it will be killed after 2 minutes
### -j (index) or --runJob (index)
Run On-Demand Cron Schedule, The (index) number is the cron job in the "schedule" that will be run.
### -w path or --wallpaperStorage path
Use an alternative path for storage of wallpapers that are being set this is useful for environments where you are not given a relative path, The cookies file will also be stored there aswell.