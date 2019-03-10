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
    console.log(`solving: ${filename}`);
    var slideShow = solve(photos);
    writeSolutionFile(filename, slideShow);
  });
}

function solve(photos) {
  const slideShow = photos
    .filter(p => p.position === "H")
    .map(p => ({ id: p.id, tags: p.tags, tagLength: p.tags.size }));

  const verticals = photos.filter(p => p.position === "V");

  if (verticals.length % 2) {
    verticals = verticals.splice(0, -1);
  }

  for (let i = 0; i < verticals.length / 2; i++) {
    let aV = verticals[i];
    let bV = verticals[verticals.length - 1 - i];
    const tagSet = new Set([...aV.tags, ...bV.tags]);
    slideShow.push({
      id: `${aV.id} ${bV.id}`,
      tags: tagSet,
      tagLength: tagSet.size
    });
  }

  var sorted = mySort(slideShow.sort((a, b) => b.tagLength - a.tagLength));

  return sorted;
}

function mySort(slideShow) {
  var mask = new Array(slideShow.length).fill(true);
  var maxAindx = 0;
  var [maxBIndx] = findBestMatch(slideShow, mask, slideShow[0]);
  var sortedA = [slideShow[maxAindx]];
  var sortedB = [slideShow[maxBIndx]];
  var maxAScore = 0;
  var maxBScore = 0;
  mask[maxAindx] = false;
  mask[maxBIndx] = false;

  for (var j = 2; j < slideShow.length; j++) {
    // let sat = Math.floor(sorted[j - 1].tagLength / 2);
    if (j % 1000 === 0) {
      console.log(`${j}/${slideShow.length}`);
    }
    var [maxAIndx, maxAScore] = findBestMatch(
      slideShow,
      mask,
      sortedA[sortedA.length - 1]
    );

    var [maxBIndx, maxBScore] = findBestMatch(
      slideShow,
      mask,
      sortedB[sortedB.length - 1]
    );

    if (maxBScore > maxAScore) {
      mask[maxBIndx] = false;
      sortedB.push(slideShow[maxBIndx]);
    } else {
      mask[maxAIndx] = false;
      sortedA.push(slideShow[maxAIndx]);
    }
  }
  return sortedA.reverse().concat(sortedB);
}
function findBestMatch(slideShow, mask, slide) {
  let max;
  let maxScore = 0;
  let maxIndx;
  for (var i = 1; i < slideShow.length; i++) {
    if (mask[i]) {
      if (!max) {
        max = slideShow[i];
        maxIndx = i;
        maxScore = computeScore(slide, slideShow[i]);
      } else {
        if (Math.floor(slideShow[i].tagLength / 2) <= maxScore) {
          break;
        }
        const currScore = computeScore(slide, slideShow[i]);
        if (currScore > maxScore) {
          max = slideShow[i];
          maxScore = currScore;
          maxIndx = i;
        }
      }
    }
  }
  return [maxIndx, maxScore];
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
  var filenameOutput = `another_output_${filename}`;
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
  return photos.sort((a, b) => a.tags.size - b.tags.size);
}
