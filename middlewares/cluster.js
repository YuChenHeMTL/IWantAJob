const {Cluster} = require("puppeteer-cluster");
const cookie = "liap=true; _ga=GA1.2.1418266606.1529266441; visit=\"v=1&M\"; AMCV_14215E3D5995C57C0A495C55%40AdobeOrg=-1303530583%7CMCIDTS%7C18122%7CMCMID%7C01346391825387179440489033432663156410%7CMCAAMLH-1564890753%7C7%7CMCAAMB-1565665153%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1565672354s%7CNONE%7CMCCIDH%7C-98269647%7CvVersion%7C3.3.0; bcookie=v=2&28874735-a6dd-48ce-8f47-1aaf4630f9d8; bscookie=v=1&20180608225947f863dad0-39e1-4e4e-8fb1-9322005b73f1AQFFrOu29QKBTV7sNiUG_brVDp0RwpQ1; lissc=1; lang=v=2&lang=en-us; li_at=AQEDASJiY_UB1OxcAAABaFjAi2YAAAFxxksIMlYAVH3FpsSYZQs52SoklZoIhkYITUQ5bNiE4SJJYTKHvCeU-ts27mHsfWzBxz0uYfdBjc_uX2gawHD2bDI7gos_wwtv8L7ELqQ1KlXa9bylu5z2gZUK; sl=\"v=1&-s0Be\"; JSESSIONID=\"ajax:-6047855709065408860\"; li_cc=AQGw0cxRUvfOPgAAAXGn4RmchaSLMyPCvMfwIWT5MLOXYD_w0Foa0wZkpHBxAn09MUksmCzelSdm; lidc=\"b=OB61:s=O:r=O:g=2100:u=223:i=1587659922:t=1587725991:v=1:sig=AQFPbGoTZ3G84eEdUtHElHElRmiaDK2c\"; UserMatchHistory=AQKb6j7bZXrqMwAAAXGn6L9VotgqGxLmntLuEQPr57SITKJzY0IzoWdPpNro_IvrSgqMyFCl2Q9V60g_7TJxsienRZD92MJD4hM3_j8J3jgQv6kVWrw3D0QEidCUrYfTmYYPIVVWvkVpDBvaPm7VfXKiJ3rGOkf3Znu4zKMWk6mrJJjw5mNMGZvmgtl7aqN0cZKWVQ"
const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36";

function getCookies() {
    let domain = "www.linkedin.com"
    return cookie.split(';').map(
        pair => {
            let name = pair.trim().slice(0, pair.trim().indexOf('='));
            let value = pair.trim().slice(pair.trim().indexOf('=') + 1);
            return {name, value, domain}
        }
    )
}

async function createBrowser() {
    return await Cluster.launch({
        puppeteerOptions: {
                headless:true,
                args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-zygote'],
                defaultViewport:{
                    width:1100,
                    height:1080,
                }
        },
        concurrency:Cluster.CONCURRENCY_PAGE,
        maxConcurrency: process.env.MAX_CONCURRENCY || 2
    });
}

async function initPage(page) {
    await Promise.all([
        page.coverage.startJSCoverage(),
        page.coverage.startCSSCoverage(),
        page.setJavaScriptEnabled(true),
        page.setUserAgent(ua),
        getCookies().map(
            pair => {
                return page.setCookie(pair)
            }
        )
    ]);
    //
    await page.evaluateOnNewDocument(() => {
        const newProto = navigator.__proto__;
        delete newProto.webdriver;
        navigator.__proto__ = newProto;
    });
}

module.exports = {
    createCluster: async () => {
        const cluster = await createBrowser();
        const url = "https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=Canada";
        const jobUrl = "https://www.linkedin.com/jobs/view/1832488034/"
        await cluster.task(async ({page, data:url}) => {
            await initPage(page);
            await page.goto(url).catch(err => console.log(err));
            await page.waitFor(2500);
            let result = await page.evaluate(() => {
                let allJobIds = [];
                let allJobs = document.querySelectorAll(".job-result-card");
                for (let i = 0; i < allJobs.length; i++){
                    let jobId = allJobs[i].dataset.id;
                    if (jobId) allJobIds.push(jobId);
                }
                return allJobIds;
                // return document.querySelector(".results-context-header__job-count").innerHTML;
                let jobTitles = [];
                let companies = [];
                let places = [];
                let allJobCards = document.querySelectorAll(".job-result-card");
                for (let i = 0; i < allJobCards.length; i++){
                    let jobTitle = allJobCards[i].querySelector("a");
                    let company = allJobCards[i].querySelector("h4 > a");
                    let place = allJobCards[i].querySelector(".job-result-card__location");
                    if (jobTitle) jobTitles.push(jobTitle.innerText);
                    if (company) companies.push(company.innerText);
                    if (place) places.push(place.innerText);
                }
                return {jobTitles:jobTitles, companies:companies, places:places}
            });
            console.log(result);
            return "success";
        });
        await cluster.queue(url);
        await cluster.idle();
        await cluster.close();
        return;
    }
}