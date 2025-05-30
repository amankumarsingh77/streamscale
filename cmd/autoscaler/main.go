package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// Configuration from environment variables
type Config struct {
	MetricsURL        string
	ServiceName       string
	MinReplicas       int
	MaxReplicas       int
	QueueThreshold    int
	ScaleUpCooldown   time.Duration
	ScaleDownCooldown time.Duration
	PollInterval      time.Duration
}

func loadConfig() Config {
	getEnvOrDefault := func(key, defaultValue string) string {
		if value := os.Getenv(key); value != "" {
			return value
		}
		return defaultValue
	}

	getEnvIntOrDefault := func(key string, defaultValue int) int {
		if value := os.Getenv(key); value != "" {
			if intValue, err := strconv.Atoi(value); err == nil {
				return intValue
			}
		}
		return defaultValue
	}

	getEnvDurationOrDefault := func(key string, defaultValue time.Duration) time.Duration {
		if value := os.Getenv(key); value != "" {
			if intValue, err := strconv.Atoi(value); err == nil {
				return time.Duration(intValue) * time.Second
			}
		}
		return defaultValue
	}

	return Config{
		MetricsURL:        getEnvOrDefault("METRICS_URL", "http://metrics-exporter:9090/metrics"),
		ServiceName:       getEnvOrDefault("SERVICE_NAME", "worker"),
		MinReplicas:       getEnvIntOrDefault("MIN_REPLICAS", 0),
		MaxReplicas:       getEnvIntOrDefault("MAX_REPLICAS", 10),
		QueueThreshold:    getEnvIntOrDefault("QUEUE_THRESHOLD", 1),
		ScaleUpCooldown:   getEnvDurationOrDefault("SCALE_UP_COOLDOWN", 10*time.Second),
		ScaleDownCooldown: getEnvDurationOrDefault("SCALE_DOWN_COOLDOWN", 300*time.Second),
		PollInterval:      getEnvDurationOrDefault("POLL_INTERVAL", 5*time.Second),
	}
}

func main() {
	config := loadConfig()
	log.Printf("Starting autoscaler with config: %+v", config)

	lastScaleUp := time.Now().Add(-config.ScaleUpCooldown)
	lastScaleDown := time.Now().Add(-config.ScaleDownCooldown)

	ticker := time.NewTicker(config.PollInterval)
	defer ticker.Stop()

	for range ticker.C {
		// Get current queue length
		queueLength, err := getQueueLength(config.MetricsURL)
		if err != nil {
			log.Printf("Error getting queue length: %v", err)
			continue
		}

		// Get current number of replicas
		currentReplicas, err := getCurrentReplicas(config.ServiceName)
		if err != nil {
			log.Printf("Error getting current replicas: %v", err)
			continue
		}

		log.Printf("Current state: queue_length=%d, replicas=%d", queueLength, currentReplicas)

		// Determine if scaling is needed
		if queueLength > 0 && currentReplicas < config.MaxReplicas && time.Since(lastScaleUp) > config.ScaleUpCooldown {
			// Scale up
			targetReplicas := min(currentReplicas+1, config.MaxReplicas)
			log.Printf("Scaling up from %d to %d replicas", currentReplicas, targetReplicas)
			
			if err := scaleService(config.ServiceName, targetReplicas); err != nil {
				log.Printf("Error scaling up: %v", err)
				continue
			}
			
			lastScaleUp = time.Now()
		} else if queueLength == 0 && currentReplicas > config.MinReplicas && time.Since(lastScaleDown) > config.ScaleDownCooldown {
			// Scale down
			targetReplicas := max(currentReplicas-1, config.MinReplicas)
			log.Printf("Scaling down from %d to %d replicas", currentReplicas, targetReplicas)
			
			if err := scaleService(config.ServiceName, targetReplicas); err != nil {
				log.Printf("Error scaling down: %v", err)
				continue
			}
			
			lastScaleDown = time.Now()
		}
	}
}

func getQueueLength(metricsURL string) (int, error) {
	resp, err := http.Get(metricsURL)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	// Parse the metrics output to find the queue length
	lines := strings.Split(string(body), "\n")
	for _, line := range lines {
		if strings.Contains(line, "redis_queue_length") && !strings.HasPrefix(line, "#") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				return strconv.Atoi(parts[1])
			}
		}
	}

	return 0, fmt.Errorf("queue length metric not found")
}

func getCurrentReplicas(serviceName string) (int, error) {
	cmd := exec.Command("docker", "compose", "ps", serviceName, "--format", "json")
	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}

	var containers []map[string]interface{}
	if err := json.Unmarshal(output, &containers); err != nil {
		return 0, err
	}

	return len(containers), nil
}

func scaleService(serviceName string, replicas int) error {
	cmd := exec.Command("docker", "compose", "up", "-d", "--scale", fmt.Sprintf("%s=%d", serviceName, replicas), serviceName)
	return cmd.Run()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a < b {
		return b
	}
	return a
}
