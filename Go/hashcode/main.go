package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"stringutil"
)

type photo struct {
	ID          int
	Orientation string
	TagsLength  int
	Tags        []string
}

type slide struct {
	id         string
	tagsLength int
	tags       []string
}

type candidate struct {
	index int
	score int
	slide slide
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())

	arguments := os.Args[1:]

	photos := parsePhotoFile(arguments[0])
	fmt.Println("Length of photos:", len(photos))
	hPhotos, vPhotos := filterPhotos(photos)
	fmt.Println("Length of horizontal photos:", len(hPhotos))
	fmt.Println("Length of vertical photos:", len(vPhotos))
	hSlides := processHPhotos(hPhotos)
	fmt.Println("Horizontal processed")
	vSlides := processVPhotos(vPhotos)
	fmt.Println("Length of horizontal slides:", len(hSlides))
	fmt.Println("Length of vertical slides:", len(vSlides))
	rawSlideShow := append(hSlides, vSlides...)
	solution := optimizeSlideShow(rawSlideShow)
	fmt.Println("Writing solution")
	writeSolution(arguments[1], solution)
	fmt.Println("Done")

}

// Photos manipulation

func filterPhotos(photos []photo) (hPhotos, vPhotos []photo) {
	filterByOrientation := func(orientation string) (result []photo) {
		for _, photo := range photos {
			if photo.Orientation == orientation {
				result = append(result, photo)
			}
		}
		return
	}
	hPhotos = filterByOrientation("H")
	vPhotos = filterByOrientation("V")
	return
}

func hPhotoToSlide(hPhoto photo) (hSlide slide) {
	return slide{
		fmt.Sprint(hPhoto.ID),
		hPhoto.TagsLength,
		hPhoto.Tags}
}

func processHPhotos(hPhotos []photo) []slide {
	hSlides := make([]slide, len(hPhotos))
	for index, photo := range hPhotos {
		hSlides[index] = hPhotoToSlide(photo)
	}
	return hSlides
}

func vPhotosToSlide(vPhotoA, vPhotoB photo) (hSlide slide) {

	tags := stringutil.Deduplicate(append(vPhotoA.Tags, vPhotoB.Tags...))
	return slide{
		fmt.Sprint(vPhotoA.ID, vPhotoB.ID),
		len(tags),
		tags}
}

func vPhotoScore(vPhotoA, vPhotoB photo) int {
	return len(stringutil.IntersectString(vPhotoA.Tags, vPhotoB.Tags))
}

func processVPhotos(vPhotos []photo) []slide {
	var vSlides []slide
	mask := make([]bool, len(vPhotos))

	for index, currentPhoto := range vPhotos {
		if !mask[index] {
			var bestCandidate photo
			var bestIndex int
			var bestScore int
			for cindex := index + 1; cindex < len(vPhotos); cindex++ {
				if !mask[cindex] {
					candidate := vPhotos[cindex]
					currentScore := vPhotoScore(currentPhoto, candidate)
					if bestCandidate.Orientation != "" {
						if currentScore < bestScore {
							bestCandidate = candidate
							bestScore = currentScore
							bestIndex = cindex
						}
					} else {
						bestCandidate = candidate
						bestScore = currentScore
						bestIndex = cindex
					}
					if bestScore == 0 {
						break
					}
				}
			}
			if bestCandidate.Orientation != "" {
				mask[index] = true
				mask[bestIndex] = true
				vSlides = append(vSlides, vPhotosToSlide(currentPhoto, bestCandidate))
			}
		}
	}
	return vSlides
}

// ------------------------------------------------------

// SlideShow optimization
// ------------------------------------------------------
func optimizeSlideShow(rawSlideShow []slide) []slide {

	// Preprocessing raw slideshow
	// Sort by numtags
	sort.Slice(rawSlideShow, func(i, j int) bool {
		return rawSlideShow[i].tagsLength < rawSlideShow[j].tagsLength
	})

	chunks := runtime.NumCPU()
	numSlides := len(rawSlideShow)
	currentSlide := rawSlideShow[0]
	optimizedSlideShow := []slide{currentSlide}
	mask := make([]bool, numSlides)
	mask[0] = true
	channel := make(chan candidate)

	// Batching the fitness computation workload
	for i := 1; i < numSlides; i++ {
		//Setting goroutines
		for j := 1; j <= chunks; j++ {
			inf := (j - 1) * (numSlides / chunks)
			sup := (j) * (numSlides / chunks)
			if j == chunks {
				sup = numSlides
			}
			go findBatchCandidate(inf, currentSlide, mask[inf:sup], rawSlideShow[inf:sup], channel)
		}
		// Collecting candidate per batch
		candidates := make([]candidate, chunks)
		for j := 0; j < chunks; j++ {
			candidate := <-channel
			candidates[j] = candidate
		}
		// Choosing among the fittest
		bestCandidate := findBestCandidate(candidates)

		// Appending to the slideShow
		if bestCandidate.index != -1 {
			optimizedSlideShow = append(optimizedSlideShow, bestCandidate.slide)
			currentSlide = bestCandidate.slide
			mask[bestCandidate.index] = true
		}
		if i%100 == 0 {
			fmt.Println(i, " slides added")
		}
	}

	close(channel)
	return optimizedSlideShow
}

func findBestCandidate(selectedCandidates []candidate) candidate {

	sort.Slice(selectedCandidates, func(i, j int) bool {
		return selectedCandidates[i].index < selectedCandidates[j].index
	})
	bestCandidate := selectedCandidates[0]
	for _, candidate := range selectedCandidates[1:] {
		if (candidate.score > bestCandidate.score) || (bestCandidate.index == -1) {
			bestCandidate = candidate
		}
	}
	return bestCandidate
}

func findBatchCandidate(offset int, currentEnd slide, mask []bool, batch []slide, c chan candidate) {
	var bestOfBatch slide
	var bestScore int
	var bestIndex = -1
	for index, currentSlide := range batch {
		if !mask[index] {
			currentScore := slideScore(currentEnd, currentSlide)
			if bestOfBatch.id != "" {
				if currentScore > bestScore {
					bestOfBatch = currentSlide
					bestScore = currentScore
					bestIndex = index
				}
			} else {
				bestOfBatch = currentSlide
				bestScore = currentScore
				bestIndex = index
			}
			if bestScore >= currentEnd.tagsLength/2 {
				break
			}
		}
	}
	if bestIndex != -1 {
		bestIndex += offset
	}
	final := candidate{bestIndex, bestScore, bestOfBatch}

	c <- final
}

func slideScore(slideA, slideB slide) int {
	intersectionSize := len(stringutil.IntersectString(slideA.tags, slideB.tags))
	return min((slideB.tagsLength - intersectionSize), min(intersectionSize, (slideA.tagsLength-intersectionSize)))
}

// ------------------------------------------------------

// Aux
// ------------------------------------------------------

func min(x, y int) int {
	if x > y {
		return y
	}
	return x
}

// ------------------------------------------------------

// File parsing/writing
// ------------------------------------------------------

func parsePhotoFile(filepath string) (photos []photo) {
	return photosFromData(readFile(filepath))
}

func readFile(filename string) []byte {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		fmt.Println("File reading error", err)
		return []byte{}
	}
	return data
}

func photosFromData(data []byte) []photo {
	if len(data) <= 0 {
		fmt.Println("No data")
		return []photo{}
	}

	var photos []photo
	completeFile := string(data)
	lines := strings.Split(completeFile, "\n")
	lines = lines[:len(lines)-1]

	for index, line := range lines[1:] {
		var attributes = strings.Split(line, " ")
		tagsNumber, _ := strconv.Atoi(attributes[1])
		var photo = photo{
			index,
			attributes[0],
			tagsNumber,
			attributes[2:]}
		photos = append(photos, photo)
	}

	return photos
}

func writeSolution(filename string, slideShow []slide) {
	file, err := os.Create("output_" + filename)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Fprintln(file, strconv.Itoa(len(slideShow)))
	for _, slide := range slideShow {
		fmt.Fprintln(file, slide.id)
	}
	file.Close()
}

// ------------------------------------------------------
