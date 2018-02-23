import * as path from "path";
import { promisify } from "util";

import { ChildProcess, SpawnOptions } from "child_process";
import { EOL } from "os";
import * as selenium from "selenium-standalone";
import { Builder, logging, WebDriver, WebElement } from "selenium-webdriver";
import { Options as ChromeOptions } from "selenium-webdriver/chrome";
import { Readable, Writable } from "stream";

import { delay, flushEntries, getEntryContent, getLogEntry, isComplete, waitForElement } from "./utils";

import * as _debug from "debug";
const debug = _debug("selenium-tap-runner:bin");

export interface RunnerOptions {
    browser: string;
    headless: boolean;
    seleniumDir: string;
    seleniumPort: string;
    url: string;
    chromeDriverLogFile?: string;
    chromeVerboseLogging?: boolean;
    output?: Writable;
}

function applyBrowserSettings(options: RunnerOptions, builder: Builder) {
    if (options.browser === "chrome") {
        const chromeOptions = new ChromeOptions();

        if (options.headless) {
            chromeOptions.headless();
        }

        builder.setChromeOptions(chromeOptions);
    }
}

function generateJavaArgs(options: RunnerOptions): string[] {
    const results = [];

    if (options.chromeDriverLogFile) {
        results.push(`-Dwebdriver.chrome.logfile=${options.chromeDriverLogFile}`);
    }

    if (options.chromeVerboseLogging) {
        results.push("-Dwebdriver.chrome.verboseLogging=true");
    }

    return results;
}

export async function run(runName: string, options: RunnerOptions): Promise<number> {
    const output = options.output || (process.stdout as Writable);

    debug("Starting selenium server...");
    debug(`Using selenium dir: ${options.seleniumDir}`);
    debug(`Using selenium port: ${options.seleniumPort}`);

    output.write(`TAP version 13${EOL}`);
    output.write(`# ${runName}${EOL}`);

    const seleniumProcess = await promisify(selenium.start)({
        baseDir: options["selenium-dir"],
        javaArgs: generateJavaArgs(options),
        seleniumArgs: ["-port", options.seleniumPort],
    });

    debug("Started selenium server");

    // Shut selenium down when we shut down.
    process.on("exit", () => {
        if (seleniumProcess && !seleniumProcess.killed) {
            debug(`Stopping selenium server (PID: ${seleniumProcess.pid})`);
            seleniumProcess.kill();
        }
    });

    // Build WebDriver
    const builder = new Builder()
        .usingServer(`http://localhost:${options.seleniumPort}/wd/hub`);

    // Set the browser
    debug(`Using '${options.browser}' browser`);
    builder.forBrowser(options.browser);

    applyBrowserSettings(options, builder);

    // Build driver
    const driver = builder.build();

    let failureCount = 0;
    try {
        // Navigate to the URL
        debug(`Navigating to ${options.url}`);
        await driver.get(options.url);

        // Wait for the TAP results list
        const listElement = await waitForElement(driver, "__tap_list");

        // Process messages until the test run is complete
        let index = 0;
        while (!await isComplete(listElement)) {
            const entry = await getLogEntry(index, listElement);
            if (entry) {
                index += 1;
                const content = await getEntryContent(entry);
                if (content.startsWith("not ok")) {
                    failureCount += 1;
                }
                output.write(content + EOL);
            }
        }

        // Flush any remaining messages
        await flushEntries(index, listElement, (entry) => {
            if (entry.startsWith("not ok")) {
                failureCount += 1;
            }
            output.write(entry + EOL);
        });

    } finally {
        // Shut down
        debug("Shutting WebDriver down...");
        await driver.quit();
    }

    // Kill the server
    debug("Shutting Selenium server down...");
    seleniumProcess.kill();

    // We're done!
    debug("Test run complete");
    return failureCount;
}