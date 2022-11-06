const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// /api/v1?url=https://xaoxuu.com
var https = require('https');
var cache = {};

export default function handler(req, res) {
    const url = req.query['url'];
    console.log('url >>', url);
    if (cache[url]) {
        console.log('cache >>', cache);
        res.send(cache[url]);
    } else {
        main(url, (data) => {
            data.url = url;
            cache[url] = data;
            res.send(data);
        });
    }
}

function main(url, callback) {
    const request = https.get(url, (response) => {
        let html = '';
        response.on('data', (chunk) => {
            html = html + chunk.toString();
        });
        response.on('end', () => {
            console.log('end >>', response.statusCode);
            if (response.statusCode != 200) {
                let location = response.headers['location'];
                let isRedirect = [301,302,303,307,308].includes(response.statusCode);
                console.log('isRedirect >>>', isRedirect);
                console.log('location >>>', location);
                if (isRedirect && location && location != url) {
                    main(location, callback);
                    return;
                }
            }
            getInfo(url, html, (data) => {
                console.log('data >>', data);
                callback(data);
            });
        });
    });
    request.on('error', error => {
        console.log('error >>', error);
        callback({});
    })
    request.end();
}

/**
 * Determine if it is a ['https://', 'http://', '//'] protocol
 * @param {String} url Website url
 * @returns {Boolean}
 */
function isHttp(url) {
    return /^(https?:)?\/\//g.test(url)
}

function getInfo(link, html, callback) {
    try {
        let data = {};
        let title, icon, desc;
        const { document } = (new JSDOM(html)).window;
        
        // title
        let elTitle = document.querySelector('title');
        if (!elTitle) {
            elTitle = document.querySelector('head meta[property="og:title"]');
        }
        if (!elTitle) {
            elTitle = document.querySelector('head meta[property="og:site_name"]');
        }
        console.log('elTitle >>', elTitle);
        if (elTitle) {
            title = elTitle.text || elTitle.content;
        }
        if (title) {
            data.title = title;
        }

        // desc
        let elDesc = document.querySelector('head meta[name="description"]');
        if (!elDesc) {
            elDesc = document.querySelector('head meta[property="og:description"]');
        }
        if (elDesc) {
            desc = elDesc.content;
        }
        console.log('elDesc >>', elDesc);
        if (desc) {
            data.desc = desc;
        }

        // icon
        let elIcon = document.querySelector('head link[rel="apple-touch-icon"]');
        if (!elIcon) {
            elIcon = document.querySelector('head link[rel="icon"]')
        }
        if (elIcon) {
            icon = elIcon && elIcon.getAttribute('href');
        } else {
            elIcon = document.querySelector('head meta[property="og:image"]');
            if (!elIcon) {
                elIcon = document.querySelector('head meta[property="twitter:image"]');
            }
            if (elIcon) {
                icon = elIcon.content;
            }
        }
        
        if (/^data:image/.test(icon)) {
            icon = '';
        }

        // If there is no src then get the site icon
        if (!icon) {
            const links = [].slice.call(document.querySelectorAll('link[rel][href]'))
            elIcon = links.find((_el) => _el.rel.includes('icon'))
            icon = elIcon && elIcon.getAttribute('href')
        }

        // If `icon` is not the ['https://', 'http://', '//'] protocol, splice on the `origin` of the a tag
        if (icon && !isHttp(icon)) {
            icon = new URL(link).origin + icon;
        }
        if (icon) {
            data.icon = icon;
        }

        callback(data);
    } catch (error) {
        console.log('error >>', error);
        callback({});
    }
}