import { describe, expect, it } from 'vitest';
import { currentTrack, skipTrack, TRACKS } from '../src/client/audio';
import fs from 'node:fs';
import path from 'node:path';

describe('music playlist and looping', () => {
  it('contains every mp3 file from public/music directory', () => {
    const musicDir = path.resolve(__dirname, '../public/music');
    const files = fs.readdirSync(musicDir).filter((f) => f.endsWith('.mp3'));

    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      const url = `/music/${file}`;
      const found = TRACKS.find((t) => t.url === url);
      expect(found, `Expected ${file} to be in TRACKS`).toBeDefined();
    }
  });

  it('cycles through all tracks in a loop when skipped', () => {
    const startTrack = currentTrack();
    const visited: string[] = [startTrack.url];

    for (let i = 0; i < TRACKS.length; i++) {
      const next = skipTrack();
      visited.push(next.url);
    }

    // After TRACKS.length skips, we should be back at the start track
    expect(currentTrack().url).toBe(startTrack.url);
    // Every track in TRACKS was visited
    for (const t of TRACKS) {
      expect(visited).toContain(t.url);
    }
  });
});
