import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import { EOL } from "os";
import * as path from "path";
import { Readable } from "stream";

import { run } from "../../selenium-tap-runner/lib";

process.on("unhandledRejection", (reason) => {
    console.error(`Unhandled promise rejection: ${reason}`);
    process.exit(1);
});

let configuration = "Debug";
if (process.argv.indexOf("--release") >= 0) {
    configuration = "Release";
}

// Don't let us hang the build. If this process takes more than 10 minutes, we're outta here
setTimeout(() => {
    console.error("Bail out! Tests took more than 10 minutes to run. Aborting.");
    process.exit(1);
}, 1000 * 60 * 10);

function waitForMatch(command: string, process: ChildProcess, regex: RegExp): Promise<RegExpMatchArray> {
    return new Promise<RegExpMatchArray>((resolve, reject) => {
        try {
            let lastLine = "";

            async function onData(this: Readable, chunk: string | Buffer): Promise<void> {
                try {
                    chunk = chunk.toString();

                    // Process lines
                    let lineEnd = chunk.indexOf(EOL);
                    while (lineEnd >= 0) {
                        const chunkLine = lastLine + chunk.substring(0, lineEnd);
                        lastLine = "";

                        chunk = chunk.substring(lineEnd + EOL.length);

                        const results = regex.exec(chunkLine);
                        if (results && results.length > 0) {
                            this.removeAllListeners("data");
                            resolve(results);
                            return;
                        }
                        lineEnd = chunk.indexOf(EOL);
                    }
                    lastLine = chunk.toString();
                } catch (e) {
                    this.removeAllListeners("data");
                    reject(e);
                }
            }

            process.on("close", async (code, signal) => {
                console.log(`${command} process exited with code: ${code}`);
                global.process.exit(1);
            });

            process.stdout.on("data", onData.bind(process.stdout));
            process.stderr.on("data", (chunk) => {
                onData.bind(process.stderr)(chunk);
                console.error(`${command} | ${chunk.toString()}`);
            });
        } catch (e) {
            reject(e);
        }
    });
}

(async () => {
    try {
        console.log("TAP version 13");
        console.log("# SignalR Browser Functional Tests");

        const serverPath = path.resolve(__dirname, "..", "bin", configuration, "netcoreapp2.1", "FunctionalTests.dll");

        const dotnet = spawn("dotnet", [serverPath]);

        function cleanup() {
            if (dotnet && !dotnet.killed) {
                console.log("Terminating dotnet process");
                dotnet.kill();
            }
        }

        process.on("SIGINT", cleanup);
        process.on("exit", cleanup);

        const results = await waitForMatch("dotnet", dotnet, /Now listening on: (http:\/\/localhost:[\d]+)/);

        const failureCount = await run({
            browser: "chrome",
            headless: true,
            seleniumDir: path.resolve(__dirname, "..", "..", "selenium-tap-runner", "node_modules", "selenium-standalone", ".selenium"),
            seleniumPort: "4444",
            url: results[1],
        });
        process.exit(failureCount);
    } catch (e) {
        console.error("Error: " + e.toString());
        process.exit(1);
    }
})();
