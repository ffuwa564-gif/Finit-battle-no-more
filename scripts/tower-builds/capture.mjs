import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
const out = "artifacts/tower-builds", url = "http://127.0.0.1:4192";
mkdirSync(out + "/capture", { recursive: true });
const rows = JSON.parse(readFileSync(out + "/search.json", "utf8")).filter((x) => x.representative);
const wanted = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  for (const r of rows.filter((x) => !wanted.length || wanted.includes(x.id))) {
    if (existsSync(out + "/capture/" + r.id + ".mp4")) continue;
    const proof = JSON.parse(readFileSync(out + "/proofs/" + r.id + ".json", "utf8"));
    const context = await browser.newContext({ viewport: { width: 390, height: 720 }, locale: "ja-JP", deviceScaleFactor: 1 });
    await context.addInitScript("window.__name=(fn)=>fn;");
    await context.addInitScript(() => {
      localStorage.setItem("stillveil-language", "ja");
      localStorage.setItem("stillveil-fairy-tutorial-v1", JSON.stringify({ version: 2, enrolled: false, dismissed: true, seen: [] }));
      const original = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(destination, ...args) {
        if (destination instanceof AudioDestinationNode && this.context instanceof AudioContext) {
          const dest = this.context.createMediaStreamDestination();
          original.call(this, dest);
          window.__seCapture = { dest, ctx: this.context };
        }
        return original.call(this, destination, ...args);
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(2e4);
    async function waitPhase(phases) {
      for (let i = 0; i < 600; i++) {
        const phase = await page.evaluate(async () => {
          const { loadSave } = await import("/src/platform/save.ts");
          return (await loadSave())?.battle?.phase;
        });
        if (phases.includes(phase)) return;
        const snap = await page.evaluate(async () => {
          const { loadSave } = await import("/src/platform/save.ts");
          const b = (await loadSave())?.battle;
          return b ? { round: b.round, event: b.events[b.cursor]?.id, phase: b.phase } : null;
        });
        if (snap?.phase === "playing" && snap.round > 5 && snap.round < proof.rounds - 1 && snap.event) {
          await page.evaluate(async (id) => {
            await window.__view?.().command({ type: "replay" }, id);
          }, snap.event);
          await page.waitForTimeout(35);
        } else await page.waitForTimeout(200);
      }
      throw Error("Battle phase timeout");
    }
    await page.goto(url);
    await page.locator(".title-screen__start").waitFor();
    await page.evaluate(async (fixture) => {
      const { loadSave, persistSave } = await import("/src/platform/save.ts");
      const previous = await loadSave();
      fixture.revision = (previous?.revision ?? 0) + 1;
      await persistSave(fixture, previous?.revision);
    }, proof.fixture);
    await page.reload();
    await page.getByRole("button", { name: "\u30BF\u30C3\u30D7\u3057\u3066\u306F\u3058\u3081\u308B", exact: true }).click();
    await page.locator(".battle-layout").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      const { enableAudio } = await import("/src/platform/audio.ts");
      await enableAudio();
      window.__view = () => {
        const el = document.querySelector(".battle-layout,.result-panel");
        let f = el[Object.keys(el).find((k) => k.startsWith("__reactFiber$"))];
        const opts = [];
        while (f) {
          for (const x of [f, f.alternate]) if (x?.memoizedProps?.save && x.memoizedProps.command) opts.push(x.memoizedProps);
          f = f.return;
        }
        return opts.sort((a, b) => b.save.revision - a.save.revision)[0];
      };
    });
    await waitPhase(["ready"]);
    await page.waitForTimeout(300);
    await page.screenshot({ path: out + "/capture/" + r.id + "-start.png" });
    const dir = out + "/capture/frames-" + r.id;
    mkdirSync(dir, { recursive: true });
    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", (e) => {
      const file = "frame-" + String(frames.length).padStart(6, "0") + ".jpg";
      writeFileSync(dir + "/" + file, Buffer.from(e.data, "base64"));
      frames.push({ time: e.metadata.timestamp, file });
      void cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId });
    });
    await page.evaluate(() => {
      const w = window;
      w.__chunks = [];
      w.__nativeEvents = [];
      w.__recordStart = performance.now();
      window.addEventListener("game:se", ((e) => w.__nativeEvents.push({ time: (performance.now() - w.__recordStart) / 1e3, ...e.detail })));
      w.__recorder = new MediaRecorder(w.__seCapture.dest.stream, { mimeType: "audio/webm;codecs=opus" });
      w.__recorder.ondataavailable = (e) => {
        if (e.data.size) w.__chunks.push(e.data);
      };
      w.__battleEvents = [];
      let last = "";
      const monitor = () => {
        try {
          const b = w.__view().save.battle;
          const e = b?.phase === "playing" ? b.events[b.cursor] : null;
          if (e && e.id !== last) {
            last = e.id;
            w.__battleEvents.push({ time: (performance.now() - w.__recordStart) / 1e3, round: b.round - 1, event: e });
          }
        } catch {
        }
        w.__monitor = requestAnimationFrame(monitor);
      };
      monitor();
      w.__recorder.start();
    });
    const audioZero = Date.now() / 1e3;
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 390, maxHeight: 720, everyNthFrame: 2 });
    const marks = [];
    for (const group of proof.groups) {
      await waitPhase(["ready"]);
      await page.waitForTimeout(160);
      marks.push({ round: group.round, kind: group.kind, time: Date.now() / 1e3 - audioZero });
      for (const cmd of group.commands) {
        await page.waitForTimeout(120);
        const ok = await page.evaluate(async (cmd2) => await window.__view().command(cmd2), cmd);
        if (!ok) {
          await page.screenshot({ path: out + "/capture/error.png" });
          console.log(await page.locator("body").innerText());
          console.log(await page.evaluate(async () => {
            const { loadSave } = await import("/src/platform/save.ts");
            return await loadSave();
          }));
          throw Error(r.id + " command rejected " + JSON.stringify(cmd));
        }
      }
      if (group.kind === "round") console.log(r.id, "round", group.round, "at", Math.round(Date.now() / 1e3 - audioZero));
    }
    await waitPhase(["reward", "failed"]);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: out + "/capture/" + r.id + "-result.png" });
    await cdp.send("Page.stopScreencast");
    const audio = await page.evaluate(async () => {
      const w = window;
      await new Promise((resolve) => {
        w.__recorder.onstop = resolve;
        w.__recorder.stop();
      });
      const data2 = Array.from(new Uint8Array(await new Blob(w.__chunks).arrayBuffer()));
      const { loadSave } = await import("/src/platform/save.ts");
      const save = await loadSave();
      return { data: data2, events: w.__nativeEvents, battleEvents: w.__battleEvents, duration: (performance.now() - w.__recordStart) / 1e3, phase: save?.battle?.phase, units: save?.battle?.units.map((u) => [u.uid, u.hp, u.ultimateCharge ?? 0]) };
    });
    if (audio.phase !== "reward" || JSON.stringify(audio.units) !== JSON.stringify(proof.final.battle.units.map((u) => [u.uid, u.hp, u.ultimateCharge ?? 0]))) throw Error(r.id + " browser proof mismatch");
    writeFileSync(out + "/capture/" + r.id + ".webm", Buffer.from(audio.data));
    let concat = "ffconcat version 1.0\n";
    for (let i = 0; i < frames.length; i++) concat += `file '${frames[i].file}'
duration ${i + 1 < frames.length ? Math.max(5e-3, frames[i + 1].time - frames[i].time) : 0.05}
`;
    concat += `file '${frames.at(-1).file}'
`;
    writeFileSync(dir + "/frames.ffconcat", concat);
    const offset = frames[0].time - audioZero;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-safe", "0", "-i", dir + "/frames.ffconcat", "-ss", String(Math.max(0, offset)), "-i", out + "/capture/" + r.id + ".webm", "-map", "0:v", "-map", "1:a", "-vf", "fps=30,setsar=1", "-c:v", "libx264", "-threads", "2", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out + "/capture/" + r.id + ".mp4"]);
    const { data, ...meta } = audio;
    writeFileSync(out + "/capture/" + r.id + ".json", JSON.stringify({ ...meta, marks, offset, firstFrame: frames[0], frameCount: frames.length, nativeBrowserVerified: true }, null, 2));
    rmSync(dir, { recursive: true });
    rmSync(out + "/capture/" + r.id + ".webm");
    console.log(r.id, "CAPTURE VERIFIED", audio.duration, frames.length);
    await context.close();
  }
} finally {
  await browser.close();
}
