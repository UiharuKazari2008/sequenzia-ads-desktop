# Sequenzia ADS Micro
Simple and Lightweight way to get random wallpapers from Sequenzia (Requires Login)
## Authentication
You must get a static Login Key from Sequenzia<br>
Got to the user menu > Authenticataion > Genreate or Copy the key<br>
Place it in the Config file
## Install
`npm install -g sequenzia-ads-micro`<br>
Once Installed you can setup a scheduled event in Windows
## Configuration
Example Configuration - config.json
```json
{
  "sequenziaHost": "seq.moe",
  "staticLoginKey": "",
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
Note: use -c configfile.json to overide the default config.json and use -d to disable the automatic refresh