package utils

import "github.com/shirou/gopsutil/cpu"

func CheckCPUUsage(maxCPUUsage float64) (bool, float64) {
	usage, err := cpu.Percent(0, false)
	if err != nil {
		return false, 0
	}
	return usage[0] <= maxCPUUsage, usage[0]
}
