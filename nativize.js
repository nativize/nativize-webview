/**
 * @param {string} service
 */
const waitForService = async (service) => {
  while (true) {
    const commandOutput = await new Deno.Command("adb", {
      args: ["shell", "service", "check", service],
    }).output();

    if (
      commandOutput.success &&
      !new TextDecoder().decode(commandOutput.stdout).includes("not")
    ) {
      Deno.stdout.write(commandOutput.stdout);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1234));
  }
};

export const check = async () => {
  //check if following command is available right away:
  //adb: to run
  //emulator: to emulate android
  //gradlew (well, not necessarily since it (should) already exists on root)
};

export const prepare = async () => {
  console.log("Preparing webview...");
  //install packages?
};

export const build = async ({ identifier, url }) => {
  console.log("Building webview...");

  await new Deno.Command(
    `${import.meta.dirname}/gradlew.bat`,
    {
      args: [
        "assembleDebug",
        "-PnativizeIdentifier=" +
            identifier ??
          "com.nativize.placeholder",
        "-PnativizeURL=" + url ?? "about:blank",
      ],
      cwd: import.meta.dirname,
    },
  ).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          `${import.meta.dirname}/gradlew.bat assembleDebug ... failed.`,
        );
      }
    });
};

export const run = async ({ identifier, avd }) => {
  let emulatorProcess;

  if (avd) {
    emulatorProcess = new Deno.Command("emulator", {
      args: ["-avd", avd, "-no-snapshot-load", "-no-boot-anim"],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    emulatorProcess.stdout.pipeTo(
      new WritableStream({
        write(chunk) {
          Deno.stdout.write(chunk);
        },
      }),
      {
        preventClose: true,
      },
    );

    emulatorProcess.stderr.pipeTo(
      new WritableStream({
        write(chunk) {
          Deno.stderr.write(chunk);
        },
      }),
      {
        preventClose: true,
      },
    );
  }

  await new Deno.Command("adb", {
    args: ["wait-for-device"],
  }).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          `adb wait-for-device .. failed.`, //TODO: change error message
        );
      }
    });

  await waitForService("activity");
  await waitForService("package");

  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("BOOTEDDDDDDDDDD!!!!!!!!");

  await new Deno.Command(`${import.meta.dirname}/gradlew.bat`, {
    args: [
      "uninstallAll",
      `-PnativizeIdentifier=${
        identifier ??
          "com.nativize.placeholder"
      }`,
    ],
    cwd: import.meta.dirname,
  }).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          `${import.meta.dirname}/gradlew.bat uninstallAll ... failed.`, //TODO: change error message
        );
      }
    });

  await new Deno.Command(`${import.meta.dirname}/gradlew.bat`, {
    args: [
      "installDebug",
      `-PnativizeIdentifier=${
        identifier ??
          "com.nativize.placeholder"
      }`,
    ],
    cwd: import.meta.dirname,
  }).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          `${import.meta.dirname}/gradlew.bat installDebug ... failed.`, //TODO: change error message
        );
      }
    });

  await new Deno.Command("adb", {
    args: [
      "shell",
      "am",
      "start",
      "-n",
      //             any way to customize? check app/src/main/java/com/nativize/nativize_webview/MainActivity.kt line 1
      //             vvvvvvvvvvvvvvvvvvvvvvvvvvvvv
      `${identifier}/com.nativize.nativize_webview.MainActivity`,
    ],
  }).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          "adb shell am start -n ... failed", //TODO: better Error message plz
        );
      }
    });

  if (emulatorProcess) {
    await emulatorProcess.status;
  }
};

export const clean = async () => {
  await new Deno.Command(
    `${import.meta.dirname}/gradlew.bat`,
    {
      //TODO: this -Pidentifier is hardcoded, idk if it cleans project anyway
      // I guess it does
      args: ["clean", "-PnativizeIdentifier=com.nativize.placeholder"],
      cwd: import.meta.dirname,
    },
  ).spawn()
    .status
    .then(({ success }) => {
      if (!success) {
        throw new Error(
          "gradlew.bat clean ... failed", //TODO: better Error message plz
        );
      }
    });
};
