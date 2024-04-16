func f(x int) int {
	return x + 3
}
var i int = 0
while i < 5 {
	print(f(i))
	i = i + 2
}