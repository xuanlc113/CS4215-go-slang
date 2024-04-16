func f(x int) int {
	return x + 3
}
var i int = 0
while i < 100 {
	if i == 2 {
	    i = i + 2
		continue
	}	
	print(f(i))
	i = i + 2
}