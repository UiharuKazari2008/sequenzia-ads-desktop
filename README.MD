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
### Example config.json
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
Note: use -c configfile.json to overide the default config.json and use -d to disable the automatic refresh
## Command Line Options
### -c or --config
Specify a alternative config file, location is based from the current working directory
### -d or --disableTimer
Run On-Demand, will use the config options and will not start the interval run
### -j (index) or --runJob (index)
Run On-Demand Cron Schedule, The (index) number is the cron job in the "schedule" that will be ran.