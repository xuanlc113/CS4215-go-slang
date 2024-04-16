var mut Mutex
var wg WaitGroup
var bal int = 100

wg.Add(2)

func test1(x, time) {
  defer wg.Done()
  mut.Lock()
  sleep(time)
  if bal > 0 {
    bal = bal - x
  }
  print(bal)
  mut.Unlock()
}

go test1(60, 100)
go test1(70, 200)

wg.Wait()
print("done")
