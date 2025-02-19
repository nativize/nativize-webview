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
  //gradlew (well, not necessarily since it already exists on root)
};

export const prepare = async () => {
  console.log("Preparing webview...");
  //install packages?
};

export const build = async ({ identifier, device }) => {
  console.log("Building webview...");
  //and we can pass identifier using -Pidentifier=${identifier}
  //we must check if device if connected. or if avd is given, we need to emulate it as well..

  try {
    await new Deno.Command(
      `${import.meta.dirname}/gradlew.bat`,
      {
        args: ["assembleDebug", `-Pidentifier=${identifier}`],
        cwd: import.meta.dirname,
      },
    ).spawn().status;
  } catch (error) {
    console.error(error);
  }
};

export const run = async ({ identifier, avd }) => {
  try {
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
    }).spawn().status;

    await waitForService("activity");
    await waitForService("package");


    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("BOOTEDDDDDDDDDD!!!!!!!!")

    await new Deno.Command(
      "adb",
      {
        args: [
          "install",
          "-r",
          //TODO: change file name?
          `./app/build/outputs/apk/debug/app-debug.apk`,
        ],
        cwd: import.meta.dirname,
      },
    ).spawn().status;

    await new Deno.Command("adb", {
      args: ["shell", "am", "start", "-n", `${identifier}/.MainActivity`],
    }).spawn().status;

    if (emulatorProcess) {
      await emulatorProcess.status;
    }
  } catch (error) {
    console.error(error);
  }
};

export const clean = async () => {
  try {
    const process = new Deno.Command(
      `${import.meta.dirname}/gradlew.bat`,
      {
        args: ["clean"],
        cwd: import.meta.dirname,
      },
    ).spawn();

    await process.status;
  } catch (error) {
    console.error(error);
  }
};
