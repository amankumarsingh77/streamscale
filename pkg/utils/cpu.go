package utils

import (
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
)

func CheckCPUUsage(maxCPUUsage float64) (bool, float64) {
	usage, err := cpu.Percent(0, false)
	if err != nil {
		return false, 0
	}
	return usage[0] <= maxCPUUsage, usage[0]
}

func CheckMemoryUsage() float64 {
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return 0
	}
	return memInfo.UsedPercent
}
