import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
const out = "artifacts/tower-builds", url = "http://127.0.0.1:4192";
mkdirSync(out + "/capture", { recursive: true });
const rows = JSON.parse(readFileSync(out + "/search.json", "utf8")).filter((r) => r.representative);
const wanted = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
function core(id, e) {
  const s = e.skillId ?? "";
  if(id==='area')return e.ultimate&&e.actorId==='party:lunette-awakened';
  const keys = { initial: "ultimate", echo: "echo-shard", shield: "shield-break", drain: "night-dew", dawn: "dawn-crown", area: "area", sleep: "dream-lace", cleanse: "clear-tear", rewind: "rewind-thread", battery: "star-furnace", execute: "dawn-crown", dream6: "dream-lace", recycle: "barrier-mend", rally: "rally", regen: "regen", accel: "ultimate" };
  if (["confuse", "paralysis", "charm"].includes(id)) return e.ailment === { confuse: "confusion", paralysis: "paralysis", charm: "charm" }[id] && e.statusAction === (id === "paralysis" ? "skip" : "friendly_fire") && (id === "paralysis" || e.actorId?.startsWith("enemy:"));
  return e.actorId?.startsWith("party:") && (keys[id] === "ultimate" ? e.ultimate : s.includes(keys[id]) || e.kind === keys[id]);
}
try {
  for (const row of rows.filter((r) => !wanted.length || wanted.includes(r.id))) {
    const id = row.id;
    if (existsSync(out + "/capture/" + id + ".mp4") && existsSync(out + "/capture/" + id + ".json")) continue;
    const proof = JSON.parse(readFileSync(out + "/proofs/" + id + ".json", "utf8"));
    const rounds = proof.groups.filter((g) => g.kind === "round");
    const key = rounds.find((g) => g.round > 1 && g.after.battle.events.some((e) => core(id, e))) ?? rounds[1];
    const extra=id==='battery'?rounds.find(g=>g.after.battle.events.some(e=>e.ultimate&&e.actorId==='party:lunette-awakened')):undefined;
    const selected = [...new Set([rounds[0], key, extra, rounds.at(-1)].filter(Boolean))];
    const pieces = [];
    const marks = [];
    const cues = [];
    const battleEvents = [];
    let elapsed = 0;
    for (let part = 0; part < selected.length; part++) {
      const group = selected[part];
      const context = await browser.newContext({ viewport: { width: 390, height: 720 }, locale: "ja-JP" });
      await context.addInitScript("window.__name=(fn)=>fn;");
      await context.addInitScript(() => {
        localStorage.setItem("stillveil-language", "ja");
        localStorage.setItem("stillveil-fairy-tutorial-v1", JSON.stringify({ version: 2, enrolled: false, dismissed: true, seen: [] }));
        const original = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function(dest, ...args) {
          if (dest instanceof AudioDestinationNode && this.context instanceof AudioContext) {
            const tap = this.context.createMediaStreamDestination();
            original.call(this, tap);
            window.__tap = tap;
          }
          return original.call(this, dest, ...args);
        };
      });
      const page = await context.newPage();
      page.setDefaultTimeout(2e4);
      await page.goto(url);
      await page.locator(".title-screen__start").waitFor();
      await page.evaluate(async (fixture) => {
        const { loadSave, persistSave } = await import("/src/platform/save.ts");
        const prev = await loadSave();
        fixture.revision = (prev?.revision ?? 0) + 1;
        await persistSave(fixture, prev?.revision);
      }, group.before);
      await page.reload();
      await page.getByRole("button", { name: "\u30BF\u30C3\u30D7\u3057\u3066\u306F\u3058\u3081\u308B", exact: true }).click();
      await page.locator(".battle-layout").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await page.evaluate(async () => {
        await (await import("/src/platform/audio.ts")).enableAudio();
        const w = window;
        w.__view = () => {
          const el = document.querySelector(".battle-layout,.result-panel");
          let f = el[Object.keys(el).find((k) => k.startsWith("__reactFiber$"))];
          const options = [];
          while (f) {
            for (const x of [f, f.alternate]) if (x?.memoizedProps?.save && x.memoizedProps.command) options.push(x.memoizedProps);
            f = f.return;
          }
          return options.sort((a, b) => b.save.revision - a.save.revision)[0];
        };
      });
      if (part === 0) await page.screenshot({ path: out + "/capture/" + id + "-start.png" });
      const dir = out + "/capture/frames-" + id + "-" + part;
      mkdirSync(dir, { recursive: true });
      const frames = [];
      const cdp = await context.newCDPSession(page);
      cdp.on("Page.screencastFrame", (e) => {
        const name = String(frames.length).padStart(6, "0") + ".jpg";
        writeFileSync(dir + "/" + name, Buffer.from(e.data, "base64"));
        frames.push({ name, time: e.metadata.timestamp });
        void cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId });
      });
      const audioEpoch = await page.evaluate(() => {
        const w = window;
        w.__audio = [];
        w.__cues = [];
        w.__events = [];
        w.__zero = performance.now();
        w.__rec = new MediaRecorder(w.__tap.stream, { mimeType: "audio/webm;codecs=opus" });
        w.__rec.ondataavailable = (e) => {
          if (e.data.size) w.__audio.push(e.data);
        };
        window.addEventListener("game:se", ((e) => w.__cues.push({ time: (performance.now() - w.__zero) / 1e3, ...e.detail })));
        w.__rec.start();
        let last = "";
        const monitor = () => {
          const b = w.__view()?.save.battle;
          const e = b?.phase === "playing" ? b.events[b.cursor] : void 0;
          if (e && e.id !== last) {
            last = e.id;
            w.__events.push({ time: (performance.now() - w.__zero) / 1e3, round: b.round - 1, event: e });
          }
          w.__frame = requestAnimationFrame(monitor);
        };
        monitor();
        return performance.timeOrigin / 1e3 + w.__zero / 1e3;
      });
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 390, maxHeight: 720, everyNthFrame: 2 });
      await page.waitForTimeout(250);
      for (const cmd of group.commands) {
        await page.waitForTimeout(120);
        if (!await page.evaluate(async (c) => await window.__view().command(c), cmd)) throw Error(id + " rejected " + JSON.stringify(cmd));
      }
      const roundStarted = Date.now();
      let coreAt = 0;
      for (let i = 0; i < 600; i++) {
        await page.waitForTimeout(150);
        if (part < selected.length - 1) {
          const current = await page.evaluate(() => window.__events.map((e) => ({ event: { kind: e.event.kind, skillId: e.event.skillId, actorId: e.event.actorId, ailment: e.event.ailment, statusAction: e.event.statusAction, ultimate: e.event.ultimate } })));
          if (current.some((e) => core(id, e.event)) && !coreAt) coreAt = Date.now();
          if (part === 0 && Date.now() - roundStarted > 8500 || part > 0 && coreAt && Date.now() - coreAt > (id==='area'?5500:3500)) break;
        }
        const state = await page.evaluate(async () => {
          const { loadSave } = await import("/src/platform/save.ts");
          const b = (await loadSave())?.battle;
          return { phase: b?.phase, round: b?.round };
        });
        if (state.phase !== "playing") break;
        if (i === 599) throw Error("Replay timeout " + id);
      }
      await page.waitForTimeout(650);
      if (part === selected.length - 1) await page.screenshot({ path: out + "/capture/" + id + "-result.png" });
      await cdp.send("Page.stopScreencast");
      const result = await page.evaluate(async () => {
        const w = window;
        cancelAnimationFrame(w.__frame);
        await new Promise((resolve) => {
          w.__rec.onstop = resolve;
          w.__rec.stop();
        });
        const { loadSave } = await import("/src/platform/save.ts");
        return { data: Array.from(new Uint8Array(await new Blob(w.__audio).arrayBuffer())), events: w.__events, cues: w.__cues, save: await loadSave(), duration: (performance.now() - w.__zero) / 1e3 };
      });
      for (let i = 0; result.save?.battle?.phase === "playing" && i < 300; i++) {
        const b = result.save.battle;
        await page.evaluate(async (id2) => {
          await window.__view().command({ type: "replay" }, id2);
        }, b.events[b.cursor]?.id);
        await page.waitForTimeout(35);
        result.save = await page.evaluate(async () => await (await import("/src/platform/save.ts")).loadSave());
      }
      const extract = (s) => s.battle.units.map((u) => [u.uid, u.hp, u.ultimateCharge ?? 0]);
      if (JSON.stringify(extract(result.save)) !== JSON.stringify(extract(group.after)) || result.save.battle.phase !== group.after.battle.phase) throw Error(id + " round " + group.round + " browser diverged");
      let concat = "ffconcat version 1.0\n";
      for (let i = 0; i < frames.length; i++) concat += `file '${frames[i].name}'
duration ${i + 1 < frames.length ? Math.max(5e-3, frames[i + 1].time - frames[i].time) : 0.1}
`;
      concat += `file '${frames.at(-1).name}'
`;
      writeFileSync(dir + "/frames.ffconcat", concat);
      writeFileSync(dir + "/audio.webm", Buffer.from(result.data));
      const offset = frames[0].time - audioEpoch;
      const clip = out + "/capture/" + id + "-part" + part + ".mp4";
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-safe", "0", "-i", dir + "/frames.ffconcat", "-ss", String(Math.max(0, offset)), "-i", dir + "/audio.webm", "-map", "0:v", "-map", "1:a", "-vf", "fps=30,setsar=1", "-c:v", "libx264", "-threads", "1", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "128k", "-shortest", clip]);
      const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip]).toString());
      pieces.push(clip);
      marks.push({ round: group.round, kind: "round", time: elapsed, duration: dur, checkpoint: true, nativeBrowserVerified: true });
      for (const e of result.events) battleEvents.push({ ...e, time: e.time - offset + elapsed });
      for (const c of result.cues) cues.push({ ...c, time: c.time - offset + elapsed });
      elapsed += dur;
      await context.close();
      rmSync(dir, { recursive: true });
      console.log(id, "native round verified", group.round, dur, flush());
    }
    const list = out + "/capture/" + id + "-parts.txt";
    writeFileSync(list, pieces.map((p) => `file '${p.split("/").at(-1)}'
`).join(""));
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out + "/capture/" + id + ".mp4"]);
    writeFileSync(out + "/capture/" + id + ".json", JSON.stringify({ duration: elapsed, phase: "reward", offset: 0, marks, events: cues, battleEvents, nativeBrowserVerified: true, recordingMethod: "Excerpts from exact native full-run round checkpoints; unfilmed round remainders advanced with native NEXT; main game code unmodified; normal App commands and automatic replay; clip boundaries are time jumps, not consecutive rounds." }, null, 2));
    for (const p of pieces) rmSync(p);
    rmSync(list);
    console.log(id, "CAPTURE VERIFIED", elapsed);
  }
} finally {
  await browser.close();
}
function flush() {
  return "";
}
