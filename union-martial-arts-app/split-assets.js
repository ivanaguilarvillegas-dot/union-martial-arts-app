#!/usr/bin/env node

/*
  Usage:
  node split-assets.js \
    --source assets/sheets/belts-master.png \
    --cols 6 \
    --rows 3 \
    --names names-belts.json \
    --out assets/belts/home
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = val;
  }
  return args;
}

function absFromCwd(p) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

async function main() {
  const args = parseArgs(process.argv);

  const source = args.source;
  const cols = Number(args.cols);
  const rows = Number(args.rows);
  const namesFile = args.names;
  const outDir = args.out;

  if (!source || !namesFile || !outDir || !Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
    console.error('Missing required args.');
    console.error('Required: --source <file> --cols <n> --rows <n> --names <json> --out <folder>');
    process.exit(1);
  }

  const sourcePath = absFromCwd(source);
  const namesPath = absFromCwd(namesFile);
  const outPath = absFromCwd(outDir);

  if (!fs.existsSync(sourcePath)) {
    console.error('Source file not found:', sourcePath);
    process.exit(1);
  }
  if (!fs.existsSync(namesPath)) {
    console.error('Names JSON not found:', namesPath);
    process.exit(1);
  }

  const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
  if (!Array.isArray(names) || names.length === 0) {
    console.error('Names JSON must be a non-empty array.');
    process.exit(1);
  }

  const maxCells = cols * rows;
  if (names.length > maxCells) {
    console.error(`Names (${names.length}) exceed grid capacity (${maxCells}).`);
    process.exit(1);
  }

  fs.mkdirSync(outPath, { recursive: true });

  const img = sharp(sourcePath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    console.error('Could not read source dimensions.');
    process.exit(1);
  }

  const cellW = Math.floor(meta.width / cols);
  const cellH = Math.floor(meta.height / rows);

  if (cellW <= 0 || cellH <= 0) {
    console.error('Invalid cell size computed. Check rows/cols vs source size.');
    process.exit(1);
  }

  const jobs = [];
  names.forEach((fileName, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * cellW;
    const top = row * cellH;
    const outputFile = path.join(outPath, fileName);

    jobs.push(
      sharp(sourcePath)
        .extract({ left, top, width: cellW, height: cellH })
        .png()
        .toFile(outputFile)
    );
  });

  await Promise.all(jobs);

  console.log('Done.');
  console.log('Source:', sourcePath);
  console.log('Grid:', `${cols}x${rows}`, 'Cell:', `${cellW}x${cellH}`);
  console.log('Files written:', names.length);
  console.log('Output:', outPath);
}

main().catch((err) => {
  console.error('Split failed:', err.message || err);
  process.exit(1);
});
