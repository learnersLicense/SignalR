import * as path from "path";

import * as yargs from "yargs";

import * as _debug from "debug";
import { run } from "./lib";
const debug = _debug("selenium-tap-runner:bin");

const argv = yargs
    .option("url", { demand: true, description: "The URL of the server to test against" })
    .option("name", { demand: true, description: "The name of the test run" })
    .option("browser", { alias: "b", default: "chrome", description: "The browser to launch" })
    .option("headless", { alias: "h" })
    .option("chrome-driver-log", { })
    .option("chrome-driver-log-verbose", { })
    .option("selenium-port", {
        alias: "p",
        default: "4444",
        description: "The port on which to launch the Selenium server",
    })
    .option("selenium-dir", {
        default: path.resolve(__dirname, "node_modules", "selenium-standalone", ".selenium"),
        description: "The directory containing Selenium binaries",
    })
    .argv;

run(argv.name, {
    browser: argv.browser,
    chromeDriverLogFile: argv["chrome-driver-log"],
    chromeVerboseLogging: !!argv["chrome-driver-log-verbose"],
    headless: !!argv.headless,
    seleniumDir: argv["selenium-dir"],
    seleniumPort: argv["selenium-port"],
    url: argv.url,
}).then((failures) => process.exit(failures));
