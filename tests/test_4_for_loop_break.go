func f(x int) int {
	return x
}

for i := 0; i < 5; i++ {
	if i == 4 {
		break
	}
	print(f(i))
}