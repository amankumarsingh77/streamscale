package worker

//func GetCPUUsage() (float64, error) {
//	//var kernelTime, userTime, idleTime uint64
//	k32 := syscall.NewLazyDLL("kernel32.dll")
//	getSystemTimes := k32.NewProc("GetSystemTimes")
//
//	readTimes := func() (idle, total uint64, err error) {
//		var idleTime, kernelTime, userTime syscall.Filetime
//		r1, _, err := getSystemTimes.Call(
//			uintptr(unsafe.Pointer(&idleTime)),
//			uintptr(unsafe.Pointer(&kernelTime)),
//			uintptr(unsafe.Pointer(&userTime)),
//		)
//		if r1 == 0 {
//			return 0, 0, err
//		}
//
//		idle = uint64(idleTime.LowDateTime) | (uint64(idleTime.HighDateTime) << 32)
//		kernel := uint64(kernelTime.LowDateTime) | (uint64(kernelTime.HighDateTime) << 32)
//		user := uint64(userTime.LowDateTime) | (uint64(userTime.HighDateTime) << 32)
//
//		return idle, kernel + user, nil
//	}
//
//	idle1, total1, err := readTimes()
//	if err != nil {
//		return 0, err
//	}
//
//	time.Sleep(1 * time.Second)
//
//	idle2, total2, err := readTimes()
//	if err != nil {
//		return 0, err
//	}
//
//	idleDelta := idle2 - idle1
//	totalDelta := total2 - total1
//
//	if totalDelta == 0 {
//		return 0.0, nil
//	}
//
//	return (1.0 - float64(idleDelta)/float64(totalDelta)) * 100, nil
//}
