var mut Mutex
var wg WaitGroup
var bal int = 100

wg.Add(2)

func test(x int) {
	if x > 5 {
		return 5
	}
	return 100
}

func test1(x, time) {
  defer wg.Done()
  mut.Lock()
  sleep(time)

  defer print(test(5))

  if bal > 0 {
    bal = bal - x
  }
  print(bal)
  mut.Unlock()
}

go test1(test(10), 100)
go test1(test(1), 200)

wg.Wait()
print("done")
