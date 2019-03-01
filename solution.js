const fs = require("fs");

const files = [
  "a_example.txt",
  "b_lovely_landscapes.txt",
  "c_memorable_moments.txt",
  "d_pet_pictures.txt",
  "e_shiny_selfies.txt"
];

var allScore = 0;
for (i = 0; i < files.length; i++) {
  solveFile(files[i]);
}

function solveFile(filename) {
  fs.readFile(filename, "utf-8", function read(err, data) {
    if (err) {
      throw err;
    }

    var photos = parseData(data);
    var slideShow = solve(photos);
    writeSolutionFile(filename, slideShow);
  });
}

function solve(photos) {
  const slideShow = photos
    .filter(p => p.position === "H")
    .map(p => ({ id: p.id, tags: p.tags, tagLength: p.tags.size }))
    .sort((a, b) => b.tagLength - a.tagLength);

  const verticals = photos.filter(p => p.position === "V");

  if (verticals.length % 2) {
    verticals = verticals.splice(0, -1);
  }
  let slide = [];
  let verticalmask = new Array(verticals.length).fill(true);
  for (let i = 0; i < verticals.length; i++) {
    if (i % 2) {
      slide.push(verticals[i]);
    } else {
      if (slide.length) {
        const tagSet = new Set([...slide[0].tags, ...slide[1].tags]);
        slideShow.push({
          id: `${slide[0].id} ${slide[1].id}`,
          tags: tagSet,
          tagLength: tagSet.size
        });
      }
      slide = [verticals[i]];
    }
  }
  if (slide.length) {
    const tagSet = new Set([...slide[0].tags, ...slide[1].tags]);
    slideShow.push({
      id: `${slide[0].id} ${slide[1].id}`,
      tags: tagSet,
      tagLength: tagSet.size
    });
  }

  var sorted = mySort(slideShow);

  return sorted;
}

function mySort(slideShow) {
  var sorted = [slideShow[0]];
  var mask = new Array(slideShow.length).fill(true);
  mask[0] = false;

  for (var j = 1; j < slideShow.length; j++) {
    let max;
    let maxScore = 0;
    let maxIndx;
    let sat = Math.floor(sorted[j - 1].tagLength / 2);
    if (j % 1000 === 0) {
      console.log(`${j}/${slideShow.length}`);
    }
    for (var i = 1; i < slideShow.length; i++) {
      if (mask[i]) {
        if (!max) {
          max = slideShow[i];
          maxIndx = i;
          maxScore = computeScore(sorted[j - 1], max);
        } else {
          if (sat === maxScore) {
            break;
          }
          const currScore = computeScore(sorted[j - 1], slideShow[i]);
          if (currScore > maxScore) {
            max = slideShow[i];
            maxScore = currScore;
            maxIndx = i;
          }
        }
      }
    }
    mask[maxIndx] = false;
    sorted.push(max);
  }
  return sorted;
}

function computeScore(a, b) {
  const tagsA = a.tags;
  const tagsB = b.tags;
  const intersection = new Set([...tagsA].filter(x => tagsB.has(x)));

  return Math.min(
    intersection.size,
    tagsA.size - intersection.size,
    tagsB.size - intersection.size
  );
}

function writeSolutionFile(filename, solution) {
  var filenameOutput = `output_${filename}`;
  var file = fs.openSync(filenameOutput, "w");
  fs.appendFileSync(filenameOutput, `${solution.length}\n`);
  for (let i = 0; i < solution.length; i++) {
    var sol = solution[i];
    fs.appendFileSync(filenameOutput, `${sol.id}\n`);
  }
}

function parseData(data) {
  var lines = data.split("\n").slice(0, -1);
  var N = Number(lines[0]);
  var photos = lines.slice(1).map((photo, id) => {
    var [position, M, ...tags] = photo.split(" ");
    M = Number(M);
    return {
      id,
      position,
      tags: new Set(tags)
    };
  });
  return photos;
}
