import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'images', 'maps');
const TARGET = path.join(ROOT, 'public', 'img', 'maps');
const GEO = path.join(ROOT, 'src', 'data', 'geo');

const maps = {
  Ascent: '7EAECC1B-4337-BBF6-6AB9-04B8F06B3319',
  Bind: '2C9D57EC-4431-9C5E-2939-8F9EF6DD5CBA',
  Haven: '2BEE0DC9-4FFE-519B-1CBD-7FBE763A6047',
  Split: 'D960549E-485C-E861-8D71-AA9D1AED12A2',
  Lotus: '2FE4ED3A-450A-948B-6D6B-E89A78E680A9',
  Sunset: '92584FBE-486A-B1B2-9FAA-39B0F486B498',
  Icebox: 'E2AD5C54-4114-A870-9641-8EA21279579A',
};

// Tactical PNGs use the same gray fill for some solid interior structures and
// walkable floor. These small masks preserve manually verified collision walls.
const manualBlockers = {
  Ascent: [
    { x1: 48.5, y1: 54.3, x2: 52.0, y2: 56.3, id: 'mid-courtyard-link-wall-left' },
    { x1: 54.3, y1: 54.3, x2: 56.3, y2: 56.3, id: 'mid-courtyard-link-wall-right' },
  ],
};
const pointSegmentDistance=(point,from,to)=>{const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;if(!length2)return Math.hypot(point.x-from.x,point.y-from.y);const t=Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.y-from.y)*dy)/length2));return Math.hypot(point.x-(from.x+t*dx),point.y-(from.y+t*dy));};

await mkdir(TARGET, { recursive: true });
await mkdir(GEO, { recursive: true });

const manifest = { schemaVersion: 1, maps: {} };
for (const [name, uuid] of Object.entries(maps)) {
  const slug = name.toLowerCase();
  const files = {
    tactical: `${slug}.png`,
    listView: `${slug}-listview.webp`,
    splash: `${slug}-splash.webp`,
  };
  await copyFile(path.join(SOURCE, `${uuid}.png`), path.join(TARGET, files.tactical));
  await sharp(path.join(SOURCE, `${uuid}_listview.png`)).resize(912,200,{fit:'cover'}).webp({quality:82}).toFile(path.join(TARGET,files.listView));
  await sharp(path.join(SOURCE, `${uuid}_splash.png`)).resize(1600,900,{fit:'cover',position:'centre',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(TARGET,files.splash));

  // Transparency is outside the map; near-white outlines are solid walls.
  // Excluding both keeps pathfinding and semantic overlays inside floor space.
  const { data, info } = await sharp(path.join(SOURCE, `${uuid}.png`))
    .ensureAlpha()
    .resize(160, 160, { fit: 'fill', kernel: 'nearest' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let cells = '';
  for (let i = 0; i < info.width * info.height; i += 1) {
    const offset=i*info.channels,r=data[offset],g=data[offset+1],b=data[offset+2],a=data[offset+3];
    const wallOutline=r>=185&&g>=185&&b>=185;
    const x=(i%info.width+.5)/info.width*100,y=(((i/info.width)|0)+.5)/info.height*100;
    const manuallyBlocked=(manualBlockers[name]||[]).some(block=>block.from&&block.to?pointSegmentDistance({x,y},block.from,block.to)<=(block.width??.8)/2:x>=block.x1&&x<=block.x2&&y>=block.y1&&y<=block.y2);
    cells += a>=32&&!wallOutline&&!manuallyBlocked ? '1' : '0';
  }
  await writeFile(path.join(GEO, `${slug}-navgrid.json`), `${JSON.stringify({ w: 160, h: 160, cells })}\n`);
  manifest.maps[name] = {
    id: slug,
    uuid: uuid.toLowerCase(),
    tactical: `/img/maps/${files.tactical}`,
    listView: `/img/maps/${files.listView}`,
    splash: `/img/maps/${files.splash}`,
  };
}

await writeFile(path.join(TARGET, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${Object.keys(maps).length} map asset sets and navigation grids.`);
