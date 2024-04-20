func f() {
  sleep(5)
  print("sleep done")
  print(<- a)
}

a := make(chan int, 1)
go f()
a <- 234
print("sent")
sleep(10)