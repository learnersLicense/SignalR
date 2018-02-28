import { ChildProcess, spawn, spawnSync } from "child_process";
import * as path from "path";

function failPrereq(name, error) {
    console.log(`Skipping Functional Tests because '${name}' failed with error: ${error.toString()}`);

    // Zero exit code because we don't want to fail the build.
    process.exit(0);
}

// Check prerequisites
try {
    const javaResult = spawnSync("java", ["-version"]);
    if (javaResult.status !== 0) {
        failPrereq("java", `returned exit code ${javaResult.status}`);
    }
} catch (e) {
    failPrereq("java", e.toString());
}
console.log("Java is available.");

// Launch the tests
spawnSync("npm", ["test"], { stdio: "inherit", cwd: path.resolve(__dirname, "..") });