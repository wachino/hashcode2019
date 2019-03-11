package stringutil

// IntersectString returns the intersection between two collections of string.
func IntersectString(x []string, y []string) []string {
	if len(x) == 0 || len(y) == 0 {
		return []string{}
	}

	set := []string{}
	hash := map[string]struct{}{}

	for _, v := range x {
		hash[v] = struct{}{}
	}

	for _, v := range y {
		_, ok := hash[v]
		if ok {
			set = append(set, v)
		}
	}

	return set
}
