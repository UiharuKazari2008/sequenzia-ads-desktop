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
const { hideBin } = require('yargs/helpers');
const cron = require('node-cron');
const glob = require('glob');
const rimraf = require('rimraf');

const cliArgs = yargs(hideBin(process.argv))
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Configuration File'
    })
    .option('runJob', {
        alias: 'j',
        type: 'number',
        description: 'Cron Schedule Index to Single Run'
    })
    .option('disableTimer', {
        alias: 'd',
        type: 'boolean',
        description: 'Disable Automatic Refresh'
    })
    .argv

let configFileLocation = path.join(path.resolve(process.cwd(), './config.json'));
const wallpaperLocation = path.join(path.resolve(process.cwd(), './.ads-wallpaper'));
if (cliArgs.config) { configFileLocation = path.join(path.resolve(process.cwd(), `./${cliArgs.config}`)) }
const config = require(configFileLocation);
const baseURL = `https://${config.sequenziaHost}`;

async function loginValidate (key, cb) {
    try {
        const test = await got(`${baseURL}/ping`, {cookieJar, dnsLookupIpVersion: 'ipv4'});
        if (test.body && test.body.includes('Pong')) {
            cb(true);
        } else if (key) {
            console.log('Logging in...');
            const login = await got(`${baseURL}/ping?key=${key}`, {cookieJar, dnsLookupIpVersion: 'ipv4'});
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
        console.log(error);
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
        const _url = `${refreshURL}?${queryString}`
        const response = await got(_url, { cookieJar, dnsLookupIpVersion: 'ipv4' });
        if (response.body && response.body.includes('randomImage')) {
            const json = JSON.parse(response.body);
            console.log(`${json.randomImage[8]} - ${json.randomImage[7]} - ${json.randomImage[4].join('/')} - ${json.randomImage[3]}`);
            try {
                const response = await got(json.randomImage[1], {cookieJar, dnsLookupIpVersion: 'ipv4'});
                if (response.body) {
                    const _wallpaperPath = `${wallpaperLocation}-${json.randomImage[8]}`
                    const files = await glob.sync(`${wallpaperLocation}*`)
                    fs.writeFile(_wallpaperPath, response.rawBody, async err => {
                        if (err) {
                            console.log(`Failed to save image : ${err.message}`)
                        } else {
                            await wallpaper.set(_wallpaperPath);
                            files.forEach(f => { rimraf.sync(f) });
                        }
                    })
                }
            } catch (e) {
                console.error(`Failed to download image from Sequenzia!`)
                console.error(e.response.body);
            }
        } else {
            console.error('Did not a valid resonse for the server, please report this!');
        }
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error.response.body);
    }
}
async function getNextImage (_config) {
    await loginValidate(config.staticLoginKey, (async ok => {
        if (ok) {
            await getImage(requestBuilder(_config));
        } else {
            console.log('Sorry, Failed to Login')
        }
    }))
}

let refreshTimer;
if (config.schedule && !cliArgs.disableTimer) {
    if ((cliArgs.runJob || cliArgs.runJob === 0) && config.schedule.length !== 0 && cliArgs.runJob <= config.schedule.length - 1) {
        console.error(`On-Demand Running Schedule #${cliArgs.runJob}...`)
        getNextImage(config.schedule[cliArgs.runJob])
    } else {
        config.schedule.forEach((j, i) => {
            if (cron.validate(j.cron)) {
                console.error(`Cron Schedule #${i} Registered!`)
                cron.schedule(j.cron, () => {
                    getNextImage(j)
                })
            } else {
                console.error(`Cron Schedule #${i} is Invalid, Please correct to use this job!`)
            }
        })
    }
} else if (cliArgs.disableTimer) {
    console.error(`On-Demand Running...`)
    getNextImage(config)
} else if (config.refreshTimeMin) {
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
    if (refreshTimer) {
        getNextImage(config).then(r => {
            setInterval(() => {
                getNextImage(config)
            }, refreshTimer);
            console.log(`Registered Enabled, Every ${config.refreshTimeMin} Minutes`);
        });
    }
} else {
    console.error(`No Schedule or Refresh Timer Found!`)
}

