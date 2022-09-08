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
const sharp = require('sharp');
let syncedTimer = false;
let syncedInterval = undefined;
let syncedIndex = undefined;
let _selectedIndex = 0;

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

console.log(`Sequenzia uDWS for NodeJS - "Its Simple"\n`);

let configFileLocation = path.join(path.resolve(process.cwd(), './config.json'));
const wallpaperLocation = (cliArgs.wallpaperStorage) ? cliArgs.wallpaperStorage : process.cwd();
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
        const test = await (async () => {
            try {
                return await got(`${baseURL}/ping`, {cookieJar,  headers: { 'User-Agent': 'SequenziaADS/1.0' }, dnsLookupIpVersion: 'ipv4'});
            } catch (e) {
                console.log(e);
                return false;
            }
        })()
        if (test && test.body && test.body.includes('Pong')) {
            cb(true);
        } else if (key) {
            console.log('Logging in...');
            const login = await (async () => {
                try {
                    return await got(`${baseURL}/ping?key=${key}`, {cookieJar,  headers: { 'User-Agent': 'SequenziaADS/1.0' }, dnsLookupIpVersion: 'ipv4'});
                } catch (e) {
                    console.log(e);
                    return false;
                }
            })()
            if (login && login.body && login.body.includes('Pong')) {
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
    if (config.slave === undefined || config.slave === false) {
        if (params.query) {
            if (params.query.includes('=')) {
                _opts = params.query.split('&').filter(e => e.includes('=') && !e.includes('setscreen=')).map(a => a.split('=')).map(a => ([`${a[0]}`, `${a[1]}`]))
            } else {
                console.error("Invalid query: " + params.query);
                process.exit(1);
            }
        }
        if (params.location) { if (params.location.includes(":")) { _opts.push(['folder', params.location]) ;} else { _opts.push(['channel', params.location]); } }
        if (params.albumId) { _opts.push(['album', params.albumId]); }
        if (params.searchQuery) { _opts.push(['search', params.searchQuery]); }
        if (params.favoritesOnly) { _opts.push(['pins', `true`]); }
        if (params.enableNSFW) { _opts.push(['nsfw', `${params.enableNSFW}`]); }
        if (params.numberOfDaysToSearch) { _opts.push(['numdays', params.numberOfDaysToSearch]); }
        if (params.ratioQuery) { _opts.push(['ratio', params.ratioQuery]); } else if (params.wideScreenOnly) { _opts.push(['ratio', `0.01-1`]); } else if (params.portraitOnly) { _opts.push(['ratio', `1.5-3`]); }
        if (params.minimumResolution) { _opts.push(['minres', params.minimumResolution]); }
        if (params.minimumHeight) { _opts.push(['minhres', params.minimumHeight]); }
        if (params.minimumWidth) { _opts.push(['minwres', params.minimumWidth]); }
        if (params.colorQuery) { _opts.push(['color', params.colorQuery]); } else if (params.onlyDarkImages) { _opts.push(['dark', 'true']); } else if (params.onlyLightImages) { _opts.push(['dark', 'false']); }
        if (params.extraOptions && params.extraOptions.length > 2) { _opts.push(params.extraOptions); }
    }
    _opts.push(['displayname', `${(config.webMode && config.slave !== undefined) ? '' : 'ADSMicro-'}${(params.displayName) ? params.displayName : (config.displayName) ? config.displayName : 'Untitled'}` ]);
    if (config.slave !== undefined) { _opts.push(['displaySlave', `${(config.slave) ? 'true' : 'false'}`]); }
    if (params.nohistory) { _opts.push(['nohistory', 'true']); } else { _opts.push(['nohistory', 'false']); }
    if (params.screen) { _opts.push(['screen', params.screen]); } else { _opts.push(['screen', '0']); }
    _opts.push(['nocds', 'true']);
    return _opts;
}
async function getImage(opts, extra) {
    try {
        const refreshURL = `${baseURL}/ambient-refresh`;
        let queryString = '';
        if (opts) { await opts.forEach((q,i,a) => { queryString += `${encodeURIComponent(q[0])}=${encodeURIComponent(q[1])}${(i !== a - 1) ? '&' : ''}` }); }
        if (extra && extra.count) { queryString += `num=${extra.count}` }
        const _url = `${refreshURL}?${queryString}`
        const response = await got(_url, { cookieJar,  headers: { 'User-Agent': 'SequenziaADS/1.0' }, dnsLookupIpVersion: 'ipv4' });
        if (response.body && response.body.includes('randomImagev2')) {
            const json = JSON.parse(response.body);
            let indexCount = 0;
            for (const item in json.randomImagev2) {
                if (extra && extra.incimentalFileNames) { indexCount++ };
                console.log(`${json.randomImagev2[item].eid} - ${json.randomImagev2[item].pinned} - ${json.randomImagev2[item].serverName.toUpperCase()}:/${json.randomImagev2[item].className}/${json.randomImagev2[item].channelName} - ${json.randomImagev2[item].date}`);
                try {
                    const response = await got(json.randomImagev2[item].fullImage, { headers: {
                            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                            'accept-language': 'en-US,en;q=0.9',
                            'cache-control': 'max-age=0',
                            'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Microsoft Edge";v="92"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-fetch-dest': 'document',
                            'sec-fetch-mode': 'navigate',
                            'sec-fetch-site': 'none',
                            'sec-fetch-user': '?1',
                            'upgrade-insecure-requests': '1',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.73'
                        }, cookieJar, dnsLookupIpVersion: 'ipv4'});
                    if (response.body) {
                        let fileExt = 'jpg';
                        const _wallpaperPath = path.join(path.resolve(wallpaperLocation), (extra && extra.path) ? extra.path : '', `./ads-wallpaper_${(indexCount > 0) ? 'index' + indexCount: json.randomImagev2[item].eid}.${fileExt}`)
                        const files = (!extra) ? await glob.sync(`${path.join(path.resolve(wallpaperLocation), './ads-wallpaper')}*`) : undefined;
                        await sharp(response.rawBody)
                            .toFormat(fileExt)
                            .toFile(_wallpaperPath, async err => {
                                if (err) {
                                    console.log(`Failed to save image : ${err.message}`)
                                    if (!extra) {
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
                                    if (!extra) {
                                        await wallpaper.set(_wallpaperPath);
                                        files.forEach(file => {
                                            rimraf.sync(file)
                                        });
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
                            })
                    }
                } catch (e) {
                    console.error(`Failed to download image from Sequenzia!`)
                    console.error(e.response.body);
                    if (!extra) {
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
            }

        } else {
            console.error('Did not a valid response for the server, please report this!');
            if (!extra) {
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
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error);
        if (!extra) {
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
}
async function getWebCapture(opts, filename, extra) {
    try {
        const refreshURL = `${baseURL}/ads-micro`;
        let queryString = '';
        if (opts) { await opts.forEach((q,i,a) => { queryString += `${encodeURIComponent(q[0])}=${encodeURIComponent(q[1])}${(i !== a - 1) ? '&' : ''}` }); }
        if (extra && extra.count) { queryString += `${(!queryString.endsWith('&') ? '&' : '')}reqCount=${encodeURIComponent(extra.count)}`; }
        const _url = `${refreshURL}?${queryString}`
        console.log(`Requesting URL "${_url}"`);
        try {
            const files = (!extra) ? await glob.sync(`${path.join(path.resolve(wallpaperLocation), './ads-wallpaper')}*`) : undefined;
            const _filename = (!filename) ? `ads-wallpaper_${new Date().getTime()}` : filename;

            const cookies = cookieJar.getCookiesSync(baseURL).map(c => c.toString());
            const pageRequest = new pageres({
                delay: 5,
                timeout: 15,
                cookies: cookies,
                filename: _filename
            })
            let extraCss = '';
            let apperance = {};
            if (extra && extra.appearance !== undefined) {
                apperance = extra.appearance;
            } else if (config && config.appearance !== undefined) {
                apperance = config.appearance;
            }
            if (apperance.padding) {
                switch (apperance.padding.toLowerCase()) {
                    case "bottom":
                        extraCss += `#BottomSestion { padding-bottom: ${(apperance.padding_value) ? apperance.padding_value : "1.25em"}; } `;
                        break;
                    case "left":
                        extraCss += `#BottomSestion { padding-left: ${(apperance.padding_value) ? apperance.padding_value : "1.25em"}; } `;
                        break;
                    case "right":
                        extraCss += `#BottomSestion { padding-right: ${(apperance.padding_value) ? apperance.padding_value : "1.25em"}; } `;
                        break;
                }
            }
            if (apperance.overlay) {
                switch (apperance.overlay.toLowerCase()) {
                    case "bottom":
                        extraCss += `#dataInfo { opacity: 0.35; } #overlayBg { display: block!important; } #overlayRight { display: none!important; } #overlayLeft { display: none!important; } `;
                        break;
                    case "left":
                        extraCss += `#dataInfo { opacity: 0.35; } #overlayBg { display: none!important; } #overlayRight { display: none!important; } #overlayLeft { display: block!important; } .shadow-txt { text-shadow: 0 0 18px #00000082; } `;
                        break;
                    case "right":
                        extraCss += `#dataInfo { opacity: 0.35; } #overlayBg { display: none!important; } #overlayRight { display: block!important; } #overlayLeft { display: none!important; } .shadow-txt { text-shadow: 0 0 18px #00000082; } `;
                        break;
                    default:
                        extraCss += `#overlayBg { display: none!important; } #overlayRight { display: none!important; } #overlayLeft { display: none!important; } .shadow-txt { text-shadow: 0 0 18px #00000082; } `;
                        break;
                }
            }
            if (apperance.color) {
                extraCss += `#content-wrapper { color: ${apperance.color}; }`;
            }
            if (apperance.info !== undefined && apperance.info === false) {
                extraCss += `#dataInfo { display: none!important; } #logoStart { margin-left: auto; flex-grow: unset!important; }`;
            }
            const _adj  =`saturate(${(apperance.saturate !== undefined) ? apperance.saturate : '2' }) brightness(${(apperance.brightness !== undefined) ? apperance.brightness : '1.2' }) contrast(${(apperance.contrast !== undefined) ? apperance.contrast : '0.6' })`
            const _blur = (apperance.blur !== undefined && apperance.blur === false) ? '' : `filter: url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='a' x='0' y='0' width='10' height='1'%3E%3CfeGaussianBlur stdDeviation='${(apperance.blur !== undefined) ? apperance.blur : '10' }' result='b'/%3E%3CfeMorphology operator='dilate' radius='4'/%3E %3CfeMerge%3E%3CfeMergeNode/%3E%3CfeMergeNode in='b'/%3E%3C/feMerge%3E%3C/filter%3E%3C/svg%3E#a) `
            extraCss += `.blur-this { ${_blur}${_adj}!important; -webkit-filter: ${_blur}${_adj}!important;}`;
            if (apperance.shadow !== undefined && apperance.shadow === false) {
                extraCss += `.portait-overlay {box-shadow: none!important;}`;
            }

            pageRequest.src(_url, [`${(config.webWidth) ? config.webWidth : 3840}x${(config.webHeight) ? config.webHeight : 2160}`], { crop: true, css: extraCss });
            pageRequest.dest(path.join(path.resolve(wallpaperLocation), (extra && extra.path) ? extra.path : ''));
            await pageRequest.run()
                .then(async sc => {
                    if (!extra) {
                        await wallpaper.set(path.join(path.resolve(wallpaperLocation), sc[0].filename));
                        files.forEach(file => {
                            rimraf.sync(file)
                        });
                        console.log("Wallpaper updated!");
                        if (cliArgs.disableTimer) {
                            process.exit(0);
                        } else if (config.webMode && config.slave && (!syncedTimer || syncedIndex !== _selectedIndex) && !config.schedule) {
                            const response = await got(`${baseURL}/ambient-history?command=timeSync&json=true&${queryString}`, {
                                cookieJar,
                                dnsLookupIpVersion: 'ipv4'
                            });
                            if (response.body && response.body.includes('delta')) {
                                const json = JSON.parse(response.body);
                                if (json.delta && json.interval && (Math.abs(json.delta) < parseInt(json.interval.toString()) * 60000)) {
                                    let nextRefreshTime = (json.interval * 60000) + json.delta;
                                    console.log(`Got Sync Pulse : ${(nextRefreshTime / 60000).toFixed(2)} Min, Remote Interval is ${json.interval} Min`);
                                    if (syncedIndex !== _selectedIndex) {
                                        syncedIndex = _selectedIndex;
                                    }
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
                    }
                })
                .catch(e => {
                    console.log(`Failed to capture image from Sequenzia! - ${e.message}`)
                    if (!extra) {
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
        } catch (e) {
            console.error(`Failed to capture image from Sequenzia!`)
            console.error(e);
            if (!extra) {
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
    } catch (error) {
        console.error(`Failed to get response from Sequenzia!`)
        console.error(error);
        if (!extra) {
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

                let _dsT1_1 = (swapTimes[0].swapTime.toString().includes('.')) ? parseInt(swapTimes[0].swapTime.toString().split(".")[0]) : swapTimes[0].swapTime;
                let _dsT2_1 = (swapTimes[1].swapTime.toString().includes('.')) ? parseInt(swapTimes[1].swapTime.toString().split(".")[0]) : swapTimes[1].swapTime;
                let _dsT1_2 = (swapTimes[0].swapTime.toString().includes('.')) ? ((parseFloat(swapTimes[0].swapTime) - _dsT1_1) * 60).toFixed(0) : 0;
                let _dsT2_2 = (swapTimes[1].swapTime.toString().includes('.')) ? ((parseFloat(swapTimes[1].swapTime) - _dsT2_1) * 60).toFixed(0) : 0;

                _dssT1B = moment().hours(_dsT1_1).minutes(_dsT1_2).seconds(0).milliseconds(0).valueOf();
                _dssT2B = moment().hours(_dsT2_1).minutes(_dsT2_2).seconds(0).milliseconds(0).valueOf();

                if (Date.now() >= _dssT1B) {
                    _selectedIndex = 1;
                } else if (Date.now() <= _dssT2B) {
                    _selectedIndex = 1;
                } else {
                    _selectedIndex = 0;
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
if (config.folders) {
    console.log('Updating Folders...')
    loginValidate(config.staticLoginKey, (async ok => {
        if (ok) {
            for (const f of config.folders) {
                const files = (!f.keepItems && !f.incimentalFileNames) ? await glob.sync(`${path.join(path.resolve(wallpaperLocation), f.path, './ads-wallpaper')}*`) : [];
                const num = (f.count) ? parseInt(f.count.toString()) : 5;
                if (!fs.existsSync(path.join(path.resolve(wallpaperLocation), f.path))){
                    fs.mkdirSync(path.join(path.resolve(wallpaperLocation), f.path));
                }
                if (f.webMode) {
                    let indexCount = 0;
                    for (let i = 0; i < num; i++) {
                        if (f.incimentalFileNames) {
                            indexCount++
                        }
                        await getWebCapture(requestBuilder(f), (indexCount > 0) ? `ads-wallpaper_index${indexCount}` : undefined, f);
                    }
                } else {
                    let opts = {};
                    opts = f;
                    opts.count = num;
                    await getImage(requestBuilder(f), opts);
                }
                if (!f.keepItems && !f.incimentalFileNames) {
                    files.forEach(file => {
                        rimraf.sync(file)
                    });
                }
            }
            console.log('Download Complete!')
            setTimeout(() => {
                process.exit(0);
            }, 15000)
        } else {
            console.log('Sorry, Failed to Login');
            process.exit(1);
        }
    }));
} else if (config.schedule && !cliArgs.disableTimer) {
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
