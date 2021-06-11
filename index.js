#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const got = require('got');
const wallpaper = require('wallpaper');
const {promisify} = require('util');
const {CookieJar} = require('tough-cookie');
const cookieJar = new CookieJar();
const setCookie = promisify(cookieJar.setCookie.bind(cookieJar));
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const cliArgs = yargs(hideBin(process.argv))
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Configuration File'
    })
    .option('disableTimer', {
        alias: 'd',
        type: 'boolean',
        description: 'Disable Automatic Refresh'
    })
    .argv

let configFileLocation = path.join(path.resolve(process.cwd(), './config.json'));
const wallpaperLocation = path.join(path.resolve(__dirname, './wallpaper'));
if (cliArgs.config) { configFileLocation = path.join(path.resolve(process.cwd(), `./${cliArgs.config}`)) }
let enableTimer = true;
if (cliArgs.disableTimer) { enableTimer = false }
const config = require(configFileLocation);
const baseURL = `https://${config.sequenziaHost}`;

async function loginValidate (key, cb) {
    try {
        const test = await got(`${baseURL}/ping`, {cookieJar});
        if (test.body && test.body.includes('Pong')) {
            console.log('Login successful!');
            cb(true);
        } else if (key) {
            console.log('Logging in...');
            const login = await got(`${baseURL}/ping?key=${key}`, {cookieJar});
            if (login.body && login.body.includes('Pong')) {
                await login.headers["set-cookie"].forEach(c => {
                    setCookie(c, baseURL);
                });
                console.log('Login successful!');
                cb(true);
            } else {
                console.log('Login Failed!')
                cb(false);
            }
        } else {
            console.log('Login Failed! No Key!')
            cb(false);
        }
    } catch (error) {
        console.log(error.response.body);
        cb(false);
    }
}
function requestBuilder(params) {
    let _opts = [];
    if (params.location) { if (params.location.includes(":")) { _opts.push(['folder', params.location]) ;} else { _opts.push(['channel', params.location]); } }
    if (params.favoritesOnly) { _opts.push(['pins', `true`]); }
    if (params.enableNSFW) { _opts.push(['nsfw', `true`]); }
    if (params.numberOfDaysToSearch) { _opts.push(['numdays', params.numberOfDaysToSearch]); }
    if (params.wideScreenOnly) { _opts.push(['ratio', `0.01-1`]); }
    if (params.minimumResolution) { _opts.push(['minres', params.minimumResolution]); }
    if (params.onlyDarkImages) { _opts.push(['dark', 'true']); } else if (params.onlyLightImages) { _opts.push(['dark', 'false']); }
    if (params.displayName) { _opts.push(['displayname', `ADSMicro-${params.displayName}`]); } else { _opts.push(['displayname', 'ADSMicro-Untitled']); }
    _opts.push(['nocds', 'true'])
    if (params.extraOptions && params.extraOptions.length > 2) { _opts.push(params.extraOptions); }
    return _opts;
}
async function getImage(opts) {
    try {
        const refreshURL = `${baseURL}/ambient-refresh`;
        let queryString = '';
        if (opts) { await opts.forEach((q,i,a) => { queryString += `${q[0]}=${q[1]}${(i !== a - 1) ? '&' : ''}` }); }
        const response = await got(`${refreshURL}?${queryString}`, { cookieJar });
        if (response.body && response.body.includes('randomImage')) {
            const json = JSON.parse(response.body);
            console.log(`${json.randomImage[8]} - ${json.randomImage[7]} - ${json.randomImage[4].join('/')} - ${json.randomImage[3]}`);
            try {
                const response = await got(json.randomImage[1], {cookieJar});
                if (response.body) {
                    fs.writeFile(wallpaperLocation, response.rawBody, async err => {
                        if (err) { console.log(`Failed to save image : ${err.message}`) } else { await wallpaper.set(wallpaperLocation); }
                    })
                }
            } catch (e) {
                console.error(`Failed to download image from Sequenzia!`)
                console.error(e.response.body);
            }
        }
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error.response.body);
    }
}
async function getNextImage () {
    await loginValidate(config.staticLoginKey, (async ok => {
        if (ok) {
            await getImage(requestBuilder(config));
        } else {
            console.log('Sorry, Failed to Login')
        }
    }))
}

let refreshTimer;
if (config.refreshTimeMin) {
    if (!isNaN(config.refreshTimeMin)) {
        refreshTimer = config.refreshTimeMin * 60 * 1000;
    } else if (typeof config.refreshTimeMin === 'string') {
        const _t = parseInt(config.refreshTimeMin.toString());
        if (!isNaN(_t)) {
            refreshTimer = _t * 60 * 1000;
        } else {
            console.error('Can not parse timer, Should be Number (: 5) or String (: "5") : String can not parsed!');
        }
    } else {
        console.error('Can not parse timer, Should be Number (: 5) or String (: "5")');
    }
}

if (refreshTimer) {
    getNextImage().then(r => {
        if (enableTimer) {
            setInterval(getNextImage, refreshTimer);
            console.log(`Registered Enabled, Every ${config.refreshTimeMin} Minutes`);
        }
    });
}