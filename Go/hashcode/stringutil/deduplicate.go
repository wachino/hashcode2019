package stringutil

import (
	"sort"
)

// Deduplicate returns unique members
func Deduplicate(x []string) []string {

	sort.Strings(x)
	j := 0
	for i := 1; i < len(x); i++ {
		if x[j] == x[i] {
			continue
		}
		j++
		// preserve the original data
		// in[i], in[j] = in[j], in[i]
		// only set what is required
		x[j] = x[i]
	}
	result := x[:j+1]
	return result
}
