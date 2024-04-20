var wg WaitGroup
var bal int = 100

wg.Add(2)

func test1(x) {
  defer wg.Done()
  if bal > 0 {
    bal = bal - x
    bal = bal - x
  }
  print(bal)
}

go test1(60)
go test1(70)

print(bal)

wg.Wait()
print("done")

// Cloning of environment/instructions for new go routines is not recommended
