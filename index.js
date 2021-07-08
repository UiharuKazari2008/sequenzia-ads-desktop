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
const pageres = require('pageres');
const moment = require('moment');
let syncedTimer = false;
let syncedInterval = undefined;

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
    .option('wallpaperStorage', {
        alias: 'w',
        type: 'string',
        description: 'Alternative Path for wallpaper storage, useful for environments where relative path is not available'
    })
    .argv

console.log(`Sequenzia uADS for NodeJS - "Its Simple"\n`);

let configFileLocation = path.join(path.resolve(process.cwd(), './config.json'));
const wallpaperLocation = path.join(path.resolve((cliArgs.wallpaperStorage) ? cliArgs.wallpaperStorage : process.cwd(), './.ads-wallpaper'));
const cookieLocation = path.join(path.resolve((cliArgs.wallpaperStorage) ? cliArgs.wallpaperStorage : process.cwd(), './.ads-cookie.json'));
if (cliArgs.config) { configFileLocation = path.join(path.resolve(process.cwd(), `./${cliArgs.config}`)) }
const config = require(configFileLocation);
const baseURL = `https://${config.sequenziaHost}`;

async function loginValidate (key, cb) {
    try {
        if (fs.existsSync(cookieLocation)) {
            const cookieJarStored = JSON.parse(fs.readFileSync(cookieLocation).toString("utf8"));
            CookieJar.fromJSON(cookieJarStored).getCookiesSync(baseURL).forEach((cookie) => {
                cookieJar.setCookieSync(cookie.toString(), baseURL);
            })
        }
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
                fs.writeFileSync(cookieLocation, JSON.stringify(cookieJar.toJSON()));
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
    if (config.slave === undefined) {
        if (params.location) { if (params.location.includes(":")) { _opts.push(['folder', params.location]) ;} else { _opts.push(['channel', params.location]); } }
        if (params.albumId) { _opts.push(['album', params.albumId]); }
        if (params.searchQuery) { _opts.push(['search', params.searchQuery]); }
        if (params.favoritesOnly) { _opts.push(['pins', `true`]); }
        if (params.enableNSFW) { _opts.push(['nsfw', `true`]); }
        if (params.numberOfDaysToSearch) { _opts.push(['numdays', params.numberOfDaysToSearch]); }
        if (params.ratioQuery) { _opts.push(['ratio', params.ratioQuery]); } else if (params.wideScreenOnly) { _opts.push(['ratio', `0.01-1`]); }
        if (params.minimumResolution) { _opts.push(['minres', params.minimumResolution]); }
        if (params.minimumHeight) { _opts.push(['minhres', params.minimumHeight]); }
        if (params.minimumWidth) { _opts.push(['minwres', params.minimumWidth]); }
        if (params.colorQuery) { _opts.push(['color', params.colorQuery]); } else if (params.onlyDarkImages) { _opts.push(['dark', 'true']); } else if (params.onlyLightImages) { _opts.push(['dark', 'false']); }
        if (params.extraOptions && params.extraOptions.length > 2) { _opts.push(params.extraOptions); }
    }
    if (params.displayName) { _opts.push(['displayname', (config.webMode && config.slave !== undefined) ? params.displayName : `ADSMicro-${params.displayName}`]); } else if (config.displayName) { _opts.push(['displayname', (config.webMode && config.slave !== undefined) ? config.displayName : `ADSMicro-${config.displayName}`]); } else { _opts.push(['displayname', (config.webMode && config.slave !== undefined) ? 'Untitled' : 'ADSMicro-Untitled']); }
    if (config.slave !== undefined && config.webMode) { _opts.push(['displaySlave', `${config.slave}`]); }
    _opts.push(['nocds', 'true']);
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
                            if (cliArgs.disableTimer) {
                                process.exit(0);
                            } else if (config.refreshTimeMin) {
                                setTimeout(async () => {
                                    await getNextImage(config)
                                }, refreshTimer);
                            } else {
                                process.exit(0);
                            }
                        } else {
                            await wallpaper.set(_wallpaperPath);
                            files.forEach(f => { rimraf.sync(f) });
                            if (cliArgs.disableTimer) {
                                process.exit(0);
                            } else if (config.refreshTimeMin) {
                                setTimeout(async () => {
                                    await getNextImage(config)
                                }, refreshTimer);
                            } else {
                                process.exit(0);
                            }
                        }
                    })
                }
            } catch (e) {
                console.error(`Failed to download image from Sequenzia!`)
                console.error(e.response.body);
                if (cliArgs.disableTimer) {
                    process.exit(0);
                } else if (config.refreshTimeMin) {
                    setTimeout(async () => {
                        await getNextImage(config)
                    }, refreshTimer);
                } else {
                    process.exit(0);
                }
            }
        } else {
            console.error('Did not a valid response for the server, please report this!');
            if (cliArgs.disableTimer) {
                process.exit(0);
            } else if (config.refreshTimeMin) {
                setTimeout(async () => {
                    await getNextImage(config)
                }, refreshTimer);
            } else {
                process.exit(0);
            }
        }
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error.response.body);
        if (cliArgs.disableTimer) {
            process.exit(0);
        } else if (config.refreshTimeMin) {
            setTimeout(async () => {
                await getNextImage(config)
            }, refreshTimer);
        } else {
            process.exit(0);
        }
    }
}
async function getWebCapture(opts) {
    try {
        const refreshURL = `${baseURL}/ads-micro`;
        let queryString = '';
        if (opts) { await opts.forEach((q,i,a) => { queryString += `${q[0]}=${q[1]}${(i !== a - 1) ? '&' : ''}` }); }
        const _url = `${refreshURL}?${queryString}`
        try {
            const files = await glob.sync(`${wallpaperLocation}*`)
            const _filename = `./.ads-wallpaper_${new Date().getTime()}`

            const cookies = cookieJar.getCookiesSync(baseURL).map(c => c.toString());
            const pageRequest = new pageres({
                delay: 1,
                timeout: 15,
                cookies: cookies,
                filename: _filename
            })
            pageRequest.src(_url, [`${(config.webWidth) ? config.webWidth : 3840}x${(config.webHeight) ? config.webHeight : 2160}`], {crop: true});
            pageRequest.dest((cliArgs.wallpaperStorage) ? cliArgs.wallpaperStorage : process.cwd());
            pageRequest.run()
                .then(async sc => {
                    await wallpaper.set(path.join((cliArgs.wallpaperStorage) ? cliArgs.wallpaperStorage : process.cwd(), sc[0].filename));
                    files.forEach(f => { rimraf.sync(f) });
                    console.log("Wallpaper updated!");
                    if (cliArgs.disableTimer) {
                        process.exit(0);
                    } else if (config.webMode && config.slave && !syncedTimer && !config.schedule) {
                        const response = await got(`${baseURL}/ambient-history?command=timeSync&screen=0&json=true&${queryString}`, { cookieJar, dnsLookupIpVersion: 'ipv4' });
                        if (response.body && response.body.includes('delta')) {
                            const json = JSON.parse(response.body);
                            if (json.delta && json.interval && (Math.abs(json.delta) < parseInt(json.interval.toString()) * 60000)) {
                                let nextRefreshTime = (json.interval * 60000) + json.delta;
                                console.log(`Got Sync Pulse : ${(nextRefreshTime / 60000).toFixed(2)} Min, Remote Interval is ${json.interval} Min`);
                                syncedTimer = true;
                                syncedInterval = json.interval * 60000;
                                setTimeout(async () => {
                                    await getNextImage(config)
                                }, nextRefreshTime + 2000);
                            } else {
                                console.log("Failed to get time sync or master is not responding");
                                syncedTimer = false;
                                syncedInterval = undefined;
                                setTimeout(async () => {
                                    await getNextImage(config)
                                }, refreshTimer);
                            }
                        } else {
                            console.log("Failed to get time sync response");
                            syncedTimer = false;
                            syncedInterval = undefined;
                            setTimeout(async () => {
                                await getNextImage(config)
                            }, refreshTimer);
                        }
                    } else if (config.webMode && config.slave && !config.schedule && syncedInterval) {
                        setTimeout(async () => {
                            await getNextImage(config)
                        }, syncedInterval);
                    } else if (config.refreshTimeMin) {
                        setTimeout(async () => {
                            await getNextImage(config)
                        }, refreshTimer);
                    } else {
                        process.exit(0);
                    }
                })
                .catch(e => {
                    console.log(`Failed to capture image from Sequenzia! - ${e.message}`)
                    if (cliArgs.disableTimer) {
                        process.exit(0);
                    } else if (config.refreshTimeMin) {
                        setTimeout(async () => {
                            await getNextImage(config)
                        }, refreshTimer);
                    } else {
                        process.exit(0);
                    }
                })
        } catch (e) {
            console.error(`Failed to capture image from Sequenzia!`)
            console.error(e);
            if (cliArgs.disableTimer) {
                process.exit(0);
            } else if (config.refreshTimeMin) {
                setTimeout(async () => {
                    await getNextImage(config)
                }, refreshTimer);
            } else {
                process.exit(0);
            }
        }
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error);
        if (cliArgs.disableTimer) {
            process.exit(0);
        } else if (config.refreshTimeMin) {
            setTimeout(async () => {
                await getNextImage(config)
            }, refreshTimer);
        } else {
            process.exit(0);
        }
    }
}
async function getNextImage (_config) {
    await loginValidate(config.staticLoginKey, (async ok => {
        if (ok) {
            if (config.displaySwap) {
                const swapTimes = config.displaySwap
                let _dssT1 = undefined;
                let _dssT2 = undefined;
                let _dssT1B = undefined;
                let _dssT2B = undefined;
                let _selectedIndex = 0;
                let _dsT1_1 = (swapTimes[0].swapTime.toString().includes('.')) ? parseInt(swapTimes[0].swapTime.toString().split(".")[0]) : swapTimes[0].swapTime;
                let _dsT2_1 = (swapTimes[1].swapTime.toString().includes('.')) ? parseInt(swapTimes[1].swapTime.toString().split(".")[0]) : swapTimes[1].swapTime;
                let _dsT1_2 = (swapTimes[0].swapTime.toString().includes('.')) ? ((parseFloat(swapTimes[0].swapTime) - _dsT1_1) * 60).toFixed(0) : 0;
                let _dsT2_2 = (swapTimes[1].swapTime.toString().includes('.')) ? ((parseFloat(swapTimes[1].swapTime) - _dsT2_1) * 60).toFixed(0) : 0;

                _dssT1B = moment().hours(_dsT1_1).minutes(_dsT1_2).seconds(0).milliseconds(0).valueOf();
                _dssT2B = moment().hours(_dsT2_1).minutes(_dsT2_2).seconds(0).milliseconds(0).valueOf();

                if (Date.now() >= _dssT1B) {
                    _dssT1 = moment().add(1, 'day').hours(_dsT1_1).minutes(_dsT1_2).seconds(0).milliseconds(0).valueOf();
                    _dssT2 = moment().add(1, 'day').hours(_dsT2_1).minutes(_dsT2_2).seconds(0).milliseconds(0).valueOf();
                } else {
                    _dssT1 = moment().hours(_dsT1_1).minutes(_dsT1_2).seconds(0).milliseconds(0).valueOf();
                    _dssT2 = moment().add(1, 'day').hours(_dsT2_1).minutes(_dsT2_2).seconds(0).milliseconds(0).valueOf();
                }

                if (_dssT1 && _dssT2) {
                    if (Date.now() >= _dssT1B || Date.now() <= _dssT2B) { _selectedIndex = 1; }
                } else {
                    console.error(`Failed to setup display auto swap : No time setup`);
                }

                if (config.webMode) {
                    await getWebCapture(requestBuilder(swapTimes[_selectedIndex]));
                } else {
                    await getImage(requestBuilder(swapTimes[_selectedIndex]));
                }
            } else {
                if (config.webMode) {
                    await getWebCapture(requestBuilder(_config));
                } else {
                    await getImage(requestBuilder(_config));
                }
            }
        } else if (!config.schedule && !cliArgs.disableTimer && (config.refreshTimeMin || (config.webMode && config.slave !== undefined))) {
            console.log('Sorry, Failed to Login, Will try again later');
            setTimeout(() => { getNextImage(config); }, 60000);
        } else {
            console.log('Sorry, Failed to Login');
            process.exit(1);
        }
    }));
}

let refreshTimer = 15 * 60 * 1000;
if (config.schedule && !cliArgs.disableTimer) {
    if ((cliArgs.runJob || cliArgs.runJob === 0) && config.schedule.length !== 0 && cliArgs.runJob <= config.schedule.length - 1) {
        console.error(`On-Demand Running Schedule #${cliArgs.runJob}...`)
        getNextImage(config.schedule[cliArgs.runJob])
    } else {
        config.schedule.forEach((j, i) => {
            if (cron.validate(j.cron)) {
                console.error(`Cron Schedule #${i} Registered!`)
                cron.schedule(j.cron, async () => {
                    await getNextImage(j);
                })
            } else {
                console.error(`Cron Schedule #${i} is Invalid, Please correct to use this job!`)
            }
        })
    }
} else if (cliArgs.disableTimer) {
    console.error(`On-Demand Running...`);
    getNextImage(config);
    setTimeout(() => { process.exit(0) }, 60 * 1000);
} else if (config.refreshTimeMin || (config.webMode && config.slave !== undefined)) {
    if (!isNaN(config.refreshTimeMin)) {
        refreshTimer = config.refreshTimeMin * 60 * 1000;
    } else if (typeof config.refreshTimeMin === 'string') {
        const _t = parseInt(config.refreshTimeMin.toString());
        if (!isNaN(_t)) {
            refreshTimer = _t * 60 * 1000;
        } else {
            console.error('Can not parse timer, Should be Number (: 5) or String (: "5") : String can not parsed!');
        }
    } else if (config.refreshTimeMin) {
        console.error('Can not parse timer, Should be Number (: 5) or String (: "5")');
    } else {
        console.log("No Refresh Timer or Remote Sync")
    }
    getNextImage(config)
} else {
    console.error(`No Schedule or Refresh Timer Found!`)
}

