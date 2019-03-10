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
    fs.readFile(`another_reverse_output_${filename}`, "utf-8", function(
      err,
      outData
    ) {
      outData = outData.split("\n").slice(0, -1);
      outData = outData.slice(1).map(l => l.split(" ").map(Number));
      var slideShow = parseOutput(photos, outData);
      for (var it = 0; it < 26; it++) {
        improve(slideShow, it);
        console.log("iteration: ".concat(it));
        writeSolutionFile(filename.concat(it), slideShow, outData.length);
      }
    });
  });
}

function improve(slideShow, it) {
  // var totalScore = computeTotalScore(slideShow);

  var minNode = findMinNode(slideShow, it);

  while (minNode) {
    var nextToImprove = findPotentialImproveNode(slideShow, minNode);
    if (nextToImprove) {
      doSwap(nextToImprove, minNode);
      // var newScore = computeTotalScore(slideShow);
      // console.log({ totalScore, newScore });
      console.log("improved");
    }
    minNode = findMinNode(minNode.next, it);
  }
  return slideShow;
}

function findMinNode(slideShow, it) {
  var currNode = slideShow;
  var currScore = 0;
  while (currNode) {
    currScore = currNode.lscore + currNode.rscore;
    if (currScore === it) {
      return currNode;
    }
    currNode = currNode.next;
  }
  return null;
}

function findPotentialImproveNode(slideShow, minNode) {
  var currNode = slideShow;
  var potentialNode = null;
  var potentialImproveValue = 0;

  const minNodeHalfTagLength = Math.floor(minNode.tagLength / 2);
  var breakCost = -(minNode.lscore + minNode.rscore);
  if (minNode.prev && minNode.next) {
    breakCost += computeScore(minNode.prev, minNode.next);
  }

  while (currNode) {
    var currNodeHalfTagLength = Math.floor(currNode.tagLength / 2);

    if (
      (currNodeHalfTagLength > currNode.lscore ||
        currNodeHalfTagLength > currNode.rscore) &&
      (minNodeHalfTagLength > currNode.lscore ||
        minNodeHalfTagLength > currNode.rscore)
    ) {
      var currPotential = computeScore(currNode, minNode) - currNode.rscore;
      if (currNode.next) {
        currPotential += computeScore(currNode.next, minNode);
      }
      if (breakCost + currPotential > potentialImproveValue) {
        potentialImproveValue = breakCost + currPotential;
        potentialNode = currNode;
      }
    }

    currNode = currNode.next;
  }
  return potentialNode;
}

function doSwap(nextToImprove, minNode) {
  // Actualizar scores
  const minNodeBreakScore =
    minNode.prev && minNode.next ? computeScore(minNode.prev, minNode.next) : 0;

  if (minNode.prev) {
    minNode.prev.next = minNode.next;
    minNode.prev.rscore = minNodeBreakScore;
  }

  if (minNode.next) {
    minNode.next.lscore = minNodeBreakScore;
    minNode.next.prev = minNode.prev;
  }

  const nextRScore = computeScore(nextToImprove, minNode);
  const minRScore = nextToImprove.next
    ? computeScore(minNode, nextToImprove.next)
    : 0;

  minNode.rscore = minRScore;
  minNode.next = nextToImprove.next;
  if (nextToImprove.next) {
    nextToImprove.prev = minNode;
    nextToImprove.lscore = minRScore;
  }
  nextToImprove.next = minNode;
  nextToImprove.rscore = nextRScore;
  minNode.lscore = nextRScore;
  minNode.prev = nextToImprove;
}

function parseOutput(photos, outData) {
  var currPhoto = getPhoto(photos, outData[0]);
  var headNode = { lscore: 0, rscore: 0, prev: null, next: null, ...currPhoto }; // Meter breakCost de cada nodo?
  var currNode = headNode;
  for (var i = 1; i < outData.length; i++) {
    var nextPhoto = getPhoto(photos, outData[i]);
    var scoreBetween = computeScore(currNode, nextPhoto);
    var nextNode = {
      lscore: scoreBetween,
      rscore: 0,
      prev: currNode,
      next: null,
      ...nextPhoto
    };
    currNode.rscore = scoreBetween;
    currNode.next = nextNode;
    currNode = nextNode;
  }

  return headNode;
}

function getPhoto(photos, ids) {
  if (ids.length === 1) {
    return photos[ids[0]];
  }
  const a = photos[ids[0]];
  const b = photos[ids[1]];
  const tagSet = new Set([...a.tags, ...b.tags]);
  return {
    id: `${a.id} ${b.id}`,
    tags: tagSet,
    tagLength: tagSet.size
  };
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

function computeTotalScore(slideShow) {
  var currNode = slideShow;
  var totalScore = 0;
  while (currNode) {
    totalScore += currNode.rscore;
    currNode = currNode.next;
  }
  return totalScore;
}

function writeSolutionFile(filename, solution, solutionLength) {
  var filenameOutput = `new_another_reverse_output_${filename}`;
  var file = fs.openSync(filenameOutput, "w");
  fs.appendFileSync(filenameOutput, `${solutionLength}\n`);
  var currNode = solution;
  while (currNode) {
    fs.appendFileSync(filenameOutput, `${currNode.id}\n`);
    currNode = currNode.next;
  }
}

function parseData(data) {
  var lines = data.split("\n").slice(0, -1);
  var N = Number(lines[0]);
  var photos = lines.slice(1).map((photo, id) => {
    var [position, M, ...tags] = photo.split(" ");
    M = Number(M);
    const tagSet = new Set(tags);
    return {
      id,
      position,
      tags: tagSet,
      tagLength: tagSet.size
    };
  });
  return photos;
}
