var mut Mutex
var wg WaitGroup
var bal int = 100

wg.Add(2)

func test1(x) {
  defer wg.Done()
  mut.Lock()
  if bal > 0 {
    bal = bal - x
  }
  print(bal)
  mut.Unlock()
}

go test1(60)
go test1(70)

wg.Wait()
print("done")
